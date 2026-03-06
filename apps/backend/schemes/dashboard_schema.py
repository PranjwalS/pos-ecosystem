from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import date

from apps.backend.models import Product, TransactionItem


class ProductSalesEntry(BaseModel):
    title: str
    units_sold: int
    revenue_generated: float
    current_price: float


class PriceRange(BaseModel):
    min: float
    max: float


class LowStockProduct(BaseModel):
    title: str
    stock: int


class RevenueTrendPoint(BaseModel):
    date: date
    revenue: float


class TransactionTrendPoint(BaseModel):
    date: date
    count: int


class ProductCombo(BaseModel):
    product_a: str
    product_b: str
    frequency: int


class TransactionSummary(BaseModel):
    total_amount: float
    created_at: date


class RevenueMetrics(BaseModel):
    total_revenue: float
    revenue_today: float
    revenue_week: float
    revenue_month: float
    revenue_mom: Dict[str, float]
    busiest_hour: int
    busiest_weekday: int
    average_revenue: float


class ProductSalesMetrics(BaseModel):
    total_units_sold: int
    top_products: Dict[int, ProductSalesEntry]
    bottom_products: Dict[int, ProductSalesEntry]
    most_revenue_product: ProductSalesEntry


class ProductStatsMetrics(BaseModel):
    total_products: int
    average_product_price: float
    price_range: PriceRange
    most_expensive_product: Optional[ProductSalesEntry]
    cheapest_product: Optional[ProductSalesEntry]
    inventory_value: float
    stock_turnover_rate: float
    low_stock_products: List[LowStockProduct]


class GraphMetrics(BaseModel):
    revenue_trend: List[RevenueTrendPoint]
    transaction_trend: List[TransactionTrendPoint]
    predicted_revenue_next_month: float
    top_product_combo: Optional[ProductCombo]
    repeat_transaction_days: List[date]
    largest_single_transaction: Optional[TransactionSummary]
    smallest_single_transaction: Optional[TransactionSummary]


class BusinessInfo(BaseModel):
    business_name: str
    business_desc: Optional[str]
    business_logo: Optional[str]
    business_banner: Optional[str]
    slug: str


class FastestGrowingProduct(BaseModel):
    title: Optional[str]
    velocity_per_day: float


class AdditionalMetrics(BaseModel):
    percent_change_week: float
    percent_change_month: float
    revenue_growth_rate: float
    fastest_growing_product: Optional[FastestGrowingProduct]
    
    
class BusinessDashboardResponse(BaseModel):
    business: BusinessInfo
    revenue_metrics: RevenueMetrics
    product_sales_metrics: ProductSalesMetrics
    product_stats_metrics: ProductStatsMetrics
    graph_metrics: GraphMetrics
    additional_metrics: AdditionalMetrics 
