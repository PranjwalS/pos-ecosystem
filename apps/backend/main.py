from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from . import database, models
from sqlalchemy.exc import IntegrityError

app = FastAPI()


@app.get("/")
def root():
    return {"status":"ok"}

@app.post("/create_user")
def root():
    return {}

## just for testing rn
@app.get("/users")
def get_users(db: Session = Depends(database.get_db)):
    return db.query(models.User).all()