from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Base
from models import User, Business, Product, Transaction, TransactionItem
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel


app = FastAPI()

class UserCreate(BaseModel):
    email:str
    password:str

@app.get("/")
def root():
    return {"status":"ok"}

@app.post("/create_user")
def root(user: UserCreate, db: Session = Depends(get_db)):
    new_user = User(email=user.email, hashed_password=user.password) ## not hashed the pw rn, do later dw
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        print("ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))

    return {"id": new_user.id, "email": new_user.email, "created_at": new_user.created_at}



## make jwt auth stuff now
# @app.get("/businesses")
# def root()