import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    full_name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)

    # Relationships
    businesses = relationship("Business", back_populates="owner", cascade="all, delete")
    transactions = relationship("Transaction", back_populates="customer")


class Business(Base):
    __tablename__ = "businesses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    business_name = Column(String, nullable=False)
    business_desc = Column(String)
    business_logo = Column(String)
    business_banner = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    slug = Column(String, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="businesses")
    products = relationship("Product", back_populates="business", cascade="all, delete")
    transactions = relationship("Transaction", back_populates="business", cascade="all, delete")


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)

    title = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    sku = Column(String)
    barcode_number = Column(String)
    description = Column(String)
    keywords = Column(String)
    image_url = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Optional uniqueness within business
    __table_args__ = (
        UniqueConstraint("business_id", "sku", name="unique_sku_per_business"),
    )

    # Relationships
    business = relationship("Business", back_populates="products")
    transaction_items = relationship("TransactionItem", back_populates="product")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    total_amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    business = relationship("Business", back_populates="transactions")
    customer = relationship("User", back_populates="transactions")
    items = relationship("TransactionItem", back_populates="transaction", cascade="all, delete")


class TransactionItem(Base):
    __tablename__ = "transaction_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)

    quantity = Column(Integer, nullable=False)
    price_at_time = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    transaction = relationship("Transaction", back_populates="items")
    product = relationship("Product", back_populates="transaction_items")