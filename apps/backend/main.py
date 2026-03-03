from fastapi import FastAPI, Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List
from database import get_db, Base
from models import User, Business, Product, Transaction, TransactionItem
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, ConfigDict
from auth import hash_password, create_access_token, decode_access_token, verify_password
from fastapi.middleware.cors import CORSMiddleware

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



@app.get("/dashboard")
def business_dashboard(business: BusinessOut, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pass

###business data to send ahead starter pack;;;
# business_name, business_desc, business_logo, business_banner, slug
# created_at — how long in business
# total_products — count of all products
# active_products — products with stock > 0
# out_of_stock_products — count
# Revenue
# 6. total_revenue — all time sum of all transaction totals
# 7. revenue_today — today only
# 8. revenue_this_week
# 9. revenue_this_month
# 10. revenue_last_month — for comparison
# 11. revenue_growth_pct — month over month % change
# 12. average_order_value — total_revenue / total_transactionsTransactions
# 13. total_transactions — all time count
# 14. transactions_today
# 15. transactions_this_week
# 16. transactions_this_month
# 17. busiest_hour — hour of day with most transactions (0-23)
# 18. busiest_day_of_week — e.g. "Friday"
# 19. average_items_per_transactionProducts
# 20. top_products — list of top 5 by units sold: {name, slug, units_sold, revenue_generated, price}
# 21. worst_products — bottom 5 by units sold
# 22. most_revenue_product — single product generating most total revenue
# 23. average_product_price — mean price across all products
# 24. price_range — {min, max}
# 25. most_expensive_product, cheapest_productML / Insights
# 26. revenue_trend — list of last 30 days {date, revenue} for a chart
# 27. transaction_trend — list of last 30 days {date, count}
# 28. predicted_revenue_next_month — simple linear projection
# 29. revenue_7day_moving_avg — smoothed revenue signal
# 30. top_product_combo — most frequently bought together pair {product_a, product_b, frequency}Inventory / Health
# 31. low_stock_products — products below threshold e.g. qty < 5: {name, stock}
# 32. inventory_value — sum of (price × stock) across all products
# 33. stock_turnover_rate — units sold / avg inventory (rough)Customer-ish (transaction-derived)
# 34. repeat_transaction_days — days where more than 1 transaction happened (loyalty proxy)
# 35. largest_single_transaction — max value transaction ever
# 36. smallest_single_transaction — min value
# 37. total_units_sold — all time across all transaction items