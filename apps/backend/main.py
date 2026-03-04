import calendar
from itertools import combinations
from statistics import mean

from fastapi import FastAPI, Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List
from collections import Counter
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


def calculate_revenue(current_transactions):
    total_revenue = 0
    revenue_today = 0
    revenue_week = 0
    revenue_month = 0
    revenue_mom = {f"{calendar.month_abbr[i]} {today.year}": 0 for i in range(1, today.month + 1)}
    
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday()) 
    start_of_month = today.replace(day=1) 
        
    for t in current_transactions:
        if not t.created_at:
            continue
        tx_date = t.created_at.date()
        total_revenue += t.total_amount

        if tx_date == today:
            revenue_today += t.total_amount

        if tx_date >= start_of_week:
            revenue_week += t.total_amount

        if tx_date >= start_of_month:
            revenue_month += t.total_amount

        if tx_date.year == today.year and 1 <= tx_date.month <= today.month:
            month_label = f"{calendar.month_abbr[tx_date.month]} {tx_date.year}"
            revenue_mom[month_label] += t.total_amount
            
    return total_revenue, revenue_today, revenue_week, revenue_month, revenue_mom



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
    
    total_revenue, revenue_today, revenue_week, revenue_month = calculate_revenue(current_transactions)
    
    total_transactions = len(current_transactions)
    average_order_value = total_revenue / total_transactions
    transactions_today = [transaction for transaction in current_transactions if transaction.created_at.date() == date.today()]

    hourly_revenue = {i: 0 for i in range(24)}
    weekday_revenue = {i: 0 for i in range(7)}
    for transaction in current_transactions:
        if not transaction.created_at:
            continue
        tx_date = transaction.created_at
        hourly_revenue[tx_date.hour] += transaction.total_amount
        weekday_revenue[tx_date.weekday] += transaction.total_amount
    busiest_hour = max(hourly_revenue, key=hourly_revenue.get)
    busiest_weekday = max(weekday_revenue, key=weekday_revenue.get)


    total_units_sold = 0
    all_products = {}
    for transaction in current_transactions:
        current_transaction: List[TransactionItem] = transaction.items
        
        for item in current_transaction:
            current_product: Product = item.product
            total_units_sold += item.quantity
            
            if current_product.title not in all_products:
                all_products[current_product.title] = [0, 0, current_product.price]
                            
            all_products[current_product.title][0] += item.quantity                  # units sold
            all_products[current_product.title][1] += item.quantity * item.price_at_time  # revenue
            
            
    average_items_per_transaction = total_units_sold / total_transactions        
    top_products_list = sorted(all_products.items(), key=lambda x: x[1][0], reverse=True)[:5]
    top_products = {}
    for index, (title, data) in enumerate(top_products_list, start=1):
        top_products[index] = {
            "title": title,
            "units_sold": data[0],
            "revenue_generated": data[1],
            "current_price": data[2]
        }
        
    bottom_products_list = sorted(all_products.items(), key=lambda x: x[1][0], reverse=False)[:5]
    bottom_products = {}
    for index, (title, data) in enumerate(bottom_products_list, start=1):
        bottom_products[index] = {
            "title": title,
            "units_sold": data[0],
            "revenue_generated": data[1],
            "current_price": data[2]
        }
    
    most_revenue_product_title, data = max(all_products.items(), key=lambda x:x[1][1])
    most_revenue_product = {"title": most_revenue_product_title, "revenue_generated": data[1], "units_sold": data[0], "current_price": data[2]}
    average_product_price = mean([p.price for p in current_products]) if current_products else 0
    prices = [p.price for p in current_products]
    price_range = {"min": min(prices), "max": max(prices)}

    most_expensive_product = max(current_products, key=lambda p: p.price)
    cheapest_product = min(current_products, key=lambda p: p.price)
    
    largest_single_transaction = max(current_transactions, key=lambda t: t.total_amount)
    smallest_single_transaction = min(current_transactions, key=lambda t: t.total_amount)
    
    transaction_days = [t.created_at.date() for t in current_transactions]
    day_counts = Counter(transaction_days)
    repeat_transaction_days = [day for day, count in day_counts.items() if count > 1]
    
    avg_inventory = mean([p.inventory for p in current_products])
    stock_turnover_rate = total_units_sold / avg_inventory 
    
    inventory_value = sum(p.price * p.inventory for p in current_products)

    low_stock_threshold = 5
    low_stock_products = [
        {"title": p.title, "stock": p.inventory} 
        for p in current_products 
        if p.inventory < low_stock_threshold
    ]
    
    today = date.today()
    last_30_days = [today - timedelta(days=i) for i in range(29, -1, -1)]  # ascending

    daily_revenue = {d: 0 for d in last_30_days}
    for t in current_transactions:
        if t.created_at:
            t_date = t.created_at.date()
            if t_date in daily_revenue:
                daily_revenue[t_date] += t.total_amount

    revenue_trend = [{"date": d, "revenue": daily_revenue[d]} for d in last_30_days]
    
    daily_count = {d: 0 for d in last_30_days}
    for t in current_transactions:
        if t.created_at:
            t_date = t.created_at.date()
            if t_date in daily_count:
                daily_count[t_date] += 1

    transaction_trend = [{"date": d, "count": daily_count[d]} for d in last_30_days]
    
    first_rev = revenue_trend[0]["revenue"]
    last_rev = revenue_trend[-1]["revenue"]
    delta_per_day = (last_rev - first_rev) / (len(revenue_trend)-1)
    predicted_revenue_next_month = sum(
        revenue_trend[-1]["revenue"] + delta_per_day*(i+1) for i in range(30)
    )


    pair_counter = Counter()
    for t in current_transactions:
        products_in_tx = [item.product.title for item in t.items if item.product]
        for combo in combinations(sorted(products_in_tx), 2):  # all pairs
            pair_counter[combo] += 1
    top_product_combo_pair, frequency = pair_counter.most_common(1)[0]
    top_product_combo = {
        "product_a": top_product_combo_pair[0],
        "product_b": top_product_combo_pair[1],
        "frequency": frequency
    }
    
    return {"business_name": current_business.business_name,
            "business_desc": current_business.business_desc,
            "business_logo": current_business.business_logo,
            "business_banner": current_business.business_banner,
            "slug": current_business.slug}