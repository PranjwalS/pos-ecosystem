from datetime import date, timedelta


def calculate_additional_metrics(transactions, products):
    today = date.today()
    start_of_week = today - timedelta(days=7)
    start_of_last_week = today - timedelta(days=14)
    start_of_month = today.replace(day=1)
    start_of_last_month = (start_of_month - timedelta(days=1)).replace(day=1)
    
    rev_this_week = sum(t.total_amount for t in transactions if t.created_at and t.created_at.date() >= start_of_week)
    rev_last_week = sum(t.total_amount for t in transactions if t.created_at and start_of_last_week <= t.created_at.date() < start_of_week)
    rev_this_month = sum(t.total_amount for t in transactions if t.created_at and t.created_at.date() >= start_of_month)
    rev_last_month = sum(t.total_amount for t in transactions if t.created_at and start_of_last_month <= t.created_at.date() < start_of_month)

    percent_change_week = ((rev_this_week - rev_last_week)/rev_last_week*100) if rev_last_week else 0
    percent_change_month = ((rev_this_month - rev_last_month)/rev_last_month*100) if rev_last_month else 0
    revenue_growth_rate = (rev_this_month - rev_last_month) / (rev_last_month if rev_last_month else 1)

    product_velocity = {}
    for p in products:
        total_sold = sum(
            item.quantity
            for t in transactions
            for item in t.items
            if item.product_id == p.id
        )
        days_active = max((today - p.created_at.date()).days, 1)
        product_velocity[p.title] = total_sold / days_active

    fastest_growing_product = max(product_velocity.items(), key=lambda x: x[1], default=(None, 0))

    return {
        "percent_change_week": percent_change_week,
        "percent_change_month": percent_change_month,
        "revenue_growth_rate": revenue_growth_rate,
        "fastest_growing_product": {
            "title": fastest_growing_product[0],
            "velocity_per_day": fastest_growing_product[1]
        }
    }