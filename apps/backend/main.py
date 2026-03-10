import calendar
from itertools import combinations
from statistics import mean
from uuid import UUID
from fastapi import FastAPI, Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List, Optional
from collections import Counter
from dashboard.additional import calculate_additional_metrics
from dashboard.forecasting import aggregate_graph_and_patterns
from dashboard.inventory import aggregate_product_stats
from dashboard.products import aggregate_product_sales
from dashboard.revenue import aggregate_revenue_data
from schemes.dashboard_schema import BusinessDashboardResponse
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
    business_name: str
    slug: str
    business_desc: str | None
    business_logo: str | None
    business_banner: str | None
    
    model_config = ConfigDict(from_attributes=True)

class ProductCreate(BaseModel):
    title: str
    price: float
    sku: Optional[str]
    barcode_number: Optional[str]
    description: Optional[str]
    keywords: Optional[str]
    image_url: Optional[str]
    inventory: int

class ProductUpdate(BaseModel):
    title: str
    price: float
    description: Optional[str]
    sku: Optional[str]
    barcode_number: Optional[str]
    keywords: Optional[str]
    image_url: Optional[str]
    inventory: int
        
class ProductOut(BaseModel):
    id: UUID
    title: str
    price: float
    sku: Optional[str]
    barcode_number: Optional[str]
    description: Optional[str]
    keywords: Optional[str]
    image_url: Optional[str]
    inventory: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TransactionItemCreate(BaseModel):
    product_id: UUID
    quantity: int
    price_at_time: float
    
class TransactionCreate(BaseModel):
    total_amount: float
    items: List[TransactionItemCreate] 
    
    
class TransactionItemOut(BaseModel):
    product_id: UUID
    title: str
    price_at_time: float
    quantity: float
    inventory: int
    
class TransactionOut(BaseModel):
    total_amount: float
    id: UUID
    created_at: datetime
    items: List[TransactionItemOut]
     
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
    return businesses
        
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
# Velocity at which low stock products will run out based on history
# Price optimization suggestion
# Current product recommendation (to stock more)
# New prodcut recommendation (from similar businesses, what product could be added)
@app.get("/{slug}/dashboard", response_model=BusinessDashboardResponse)
def business_dashboard(slug: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=404, detail="Test user not found")
    
    businesses: List[Business] = current_user.businesses
    current_business = next((business for business in businesses if business.slug == slug), None)        
    if not current_business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    current_products: List[Product] = current_business.products
    current_transactions: List[Transaction] = current_business.transactions
    
    ###### bring this back later
    # transactions_today = [
    #     t for t in current_transactions
    #     if t.created_at and t.created_at.date() == date.today()
    # ]
    
    revenue_data = aggregate_revenue_data(current_transactions)
    product_sales = aggregate_product_sales(current_transactions)
    product_stats = aggregate_product_stats(current_products, product_sales["total_units_sold"])
    graph_data = aggregate_graph_and_patterns(current_transactions)
    additional_metrics = calculate_additional_metrics(current_transactions, current_products)

    return {
        "business": {
            "business_name": current_business.business_name,
            "business_desc": current_business.business_desc,
            "business_logo": current_business.business_logo,
            "business_banner": current_business.business_banner,
            "slug": current_business.slug
        },

        "revenue_metrics": revenue_data,
        "product_sales_metrics": product_sales,
        "product_stats_metrics": product_stats,
        "graph_metrics": graph_data,
        "additional_metrics": additional_metrics,
    }
    


@app.get("/{slug}/products", response_model=List[ProductOut])
def get_products(slug: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=404, detail="Test user not found")
    
    businesses: List[Business] = current_user.businesses
    current_business = next((business for business in businesses if business.slug == slug), None)        
    if not current_business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    current_products: List[Product] = current_business.products

    return current_products



@app.get("/{slug}/products/{product_id}", response_model=ProductOut)
def get_product(slug: str, product_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    businesses: List[Business] = current_user.businesses
    current_business = next((b for b in businesses if b.slug == slug), None)
    if not current_business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    product = next((p for p in current_business.products if p.id == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product




@app.put("/{slug}/products/{product_id}")
def edit_product(updated_product: ProductUpdate, product_id: UUID, db: Session = Depends(get_db)):
    curr_product = db.query(Product).filter(Product.id == product_id).first()
    if not curr_product:
        raise HTTPException(status_code=404, detail="Product not found")

    curr_product.title          = updated_product.title
    curr_product.price          = updated_product.price
    curr_product.description    = updated_product.description
    curr_product.sku            = updated_product.sku
    curr_product.barcode_number = updated_product.barcode_number
    curr_product.keywords       = updated_product.keywords
    curr_product.image_url      = updated_product.image_url
    curr_product.inventory      = updated_product.inventory
    
    try:
        db.commit()
        db.refresh(curr_product)
    except Exception as e:
        db.rollback()
        print("ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    
    return {"status":"success", "id": str(curr_product.id)}

@app.delete("/{slug}/products/{product_id}")
def edit_product(product_id: UUID, db: Session = Depends(get_db)):
    curr_product = db.query(Product).filter(Product.id == product_id).first()
    if not curr_product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        db.delete(curr_product)
        db.commit()
    except Exception as e:
        db.rollback()
        print("ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    
    return {"status":"success"}


@app.post("/{slug}/products")
def add_product(new_product: ProductCreate, slug: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    print(new_product)
    businesses: List[Business] = current_user.businesses
    current_business = next((business for business in businesses if business.slug == slug), None)   
    if not current_business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    curr_product = Product()
    curr_product.title          = new_product.title
    curr_product.price          = new_product.price
    curr_product.description    = new_product.description
    curr_product.sku            = new_product.sku
    curr_product.barcode_number = new_product.barcode_number
    curr_product.keywords       = new_product.keywords
    curr_product.image_url      = new_product.image_url
    curr_product.inventory      = new_product.inventory
    curr_product.business_id    = current_business.id
    
    try:
        db.add(curr_product)
        db.commit()
        db.refresh(curr_product)
    except Exception as e:
        db.rollback()
        print("ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
    
    return {"status":"success", "id": str(curr_product.id)}




@app.post("/{slug}/create_transaction")
def create_transaction(slug: str, transaction: TransactionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    businesses: List[Business] = current_user.businesses
    current_business = next((b for b in businesses if b.slug == slug), None)
    if not current_business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    try:

        new_transaction = Transaction(
            business_id=current_business.id,
            total_amount=transaction.total_amount
        )

        db.add(new_transaction)
        db.flush() 

        for item in transaction.items:
            new_item = TransactionItem(
                transaction_id=new_transaction.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price_at_time=item.price_at_time
            )

            db.add(new_item)
            product = db.query(Product).filter(Product.id == item.product_id).first()
            product.inventory -= item.quantity

        db.commit()

    except Exception as e:
        db.rollback()
        print("ERROR", e)
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "status": "success",
        "transaction_id": str(new_transaction.id)
    }
    
    
    
@app.get("/{slug}/transactions", response_model=List[TransactionOut])
def get_transactions(slug: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    businesses: List[Business] = current_user.businesses
    current_business = next((b for b in businesses if b.slug == slug), None)
    if not current_business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    
    output = []
    for transaction in current_business.transactions:
        curr_transaction = TransactionOut(
            id=transaction.id,
            created_at=transaction.created_at,
            total_amount=transaction.total_amount,
            items=[]
        )
        for item in transaction.items:
            product: Product = item.product
            item_info = TransactionItemOut(
                product_id=item.product_id,
                title=product.title,
                price_at_time=item.price_at_time,
                quantity=item.quantity,
                inventory=product.inventory
            )
            curr_transaction.items.append(item_info)
            
        output.append(curr_transaction)
        
    return output




### take a break from this for now