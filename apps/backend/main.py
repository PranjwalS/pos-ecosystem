import calendar
from itertools import combinations
from statistics import mean

from fastapi import FastAPI, Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List
from collections import Counter
from apps.backend.dashboard.forecasting import aggregate_graph_and_patterns
from apps.backend.dashboard.inventory import aggregate_product_stats
from apps.backend.dashboard.products import aggregate_product_sales
from apps.backend.dashboard.revenue import aggregate_revenue_data
from database import get_db, Base
from models import User, Business, Product, Transaction, TransactionItem
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, ConfigDict
from auth import hash_password, create_access_token, decode_access_token, verify_password
from fastapi.middleware.cors import CORSMiddleware
from datetime import date, datetime, timedelta

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UserCreate(BaseModel):
    full_name: str
    email:str
    password:str


class UserLogin(BaseModel):
    email: str
    password: str
    
    
class BusinessCreate(BaseModel):
    business_name: str
    business_desc: str | None
    business_logo: str | None
    # business_banner: str | None


class BusinessOut(BaseModel):
    name: str
    slug: str
    description: str | None
    logo: str | None
    banner: str | None
    
    model_config = ConfigDict(from_attributes=True)
    
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login") 



def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == payload.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user




## endpoints:
@app.get("/")
def root():
    return {"status":"ok"}

@app.post("/create_user")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    print("PASSWORD:", repr(user.password))
    hashed_pw = hash_password(password=user.password)
    gen_slug = "-".join([name.lower() for name in user.full_name.split()])
    new_user = User(email=user.email, hashed_password=hashed_pw, full_name=user.full_name, slug=gen_slug)

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        print("ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))

    token = create_access_token({"user_id": str(new_user.id)})
    return {"id": new_user.id, "email": new_user.email, "name": new_user.full_name, "created_at": new_user.created_at, "token": token}


@app.post("/login")
def approve_login(user: UserLogin, db: Session = Depends(get_db)):
    curr_user = db.query(User).filter(User.email == user.email).first()
    if not curr_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if not verify_password(user.password, curr_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")
    
    token = create_access_token({"user_id": str(curr_user.id)})
    return {"status": "success", "id": curr_user.id, "email": curr_user.email, "token": token} 


@app.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"email": current_user.email, "id": current_user.id, "slug": current_user.slug}


@app.get("/businesses", response_model=List[BusinessOut])
def get_businesses(current_user: User = Depends(get_current_user)):
    businesses: List[Business] = current_user.businesses
    return [
        BusinessOut(
            name=b.business_name,
            slug=b.slug,
            description=b.business_desc,
            logo=b.business_logo,
            banner=b.business_banner
        )
        for b in businesses
    ]
        
@app.post("/create_business")
def create_business(business: BusinessCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    businesses: List[Business] = current_user.businesses
    names = [b.business_name for b in businesses]
    if business.business_name in names:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Can't have duplicate names")
    
    slugs = [b.slug for b in businesses]
    slug = "-".join(business.business_name.lower().split())
    index = 1
    while (slug in slugs):
        slug = f"{slug}-{index}"
        index += 1
        
    new_business = Business(business_name=business.business_name, business_desc=business.business_desc, business_logo=business.business_logo, slug=slug)
    current_user.businesses.append(new_business)
    
    try:
        db.add(new_business)
        db.commit()
        db.refresh(new_business)
    except Exception as e:
        db.rollback()
        print("ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    
    return {"status":"success", "slug":new_business.slug}




### JUST GOTTA CLEAN UP ORDERING AND FIX THE RETURNS
## also see more data for graphs, and machine learning models to tell what products to stock more of, and any scraping to recommend products

# Percent change vs last week

# Percent change vs last month

# Revenue growth rate

# Fastest growing product (velocity change)

# Velocity at which low stock products will run out based on history

# Price optimization suggestion

# Current product recommendation (to stock more)

# New prodcut recommendation (from similar businesses, what product could be added)

@app.get("/{slug}/dashboard")
# def business_dashboard(slug: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
def business_dashboard(slug: str, db: Session = Depends(get_db)):
    current_user = db.query(User).filter(User.email == "singh@gmail.com").first()
    if not current_user:
        raise HTTPException(status_code=404, detail="Test user not found")
    
    businesses: List[Business] = current_user.businesses
    current_business = next((business for business in businesses if business.slug == slug), None)        
    if not current_business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    current_products: List[Product] = current_business.products
    current_transactions: List[Transaction] = current_business.transactions
    
    business_created_at = current_business.created_at.date()
    total_products = len(current_products)
    active_products = [active_prd for active_prd in current_products if active_prd.inventory > 0]
    out_of_stock_products = [out_prd for out_prd in current_products if out_prd.inventory <= 0]
    
    transactions_today = [transaction for transaction in current_transactions if transaction.created_at.date() == date.today()]

    revenue_data = aggregate_revenue_data(current_transactions)
    product_sales = aggregate_product_sales(current_transactions)
    product_stats = aggregate_product_stats(current_products, product_sales["total_units_sold"])
    graph_data = aggregate_graph_and_patterns(current_transactions)
    
    return {"business_name": current_business.business_name,
            "business_desc": current_business.business_desc,
            "business_logo": current_business.business_logo,
            "business_banner": current_business.business_banner,
            "slug": current_business.slug}