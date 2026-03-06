from datetime import date, timedelta
from itertools import combinations
from typing import Counter


def aggregate_graph_and_patterns(transactions):

    today = date.today()
    last_30_days = []

    for i in range(29, -1, -1):
        last_30_days.append(today - timedelta(days=i))

    daily_revenue = {}
    daily_count = {}

    for d in last_30_days:
        daily_revenue[d] = 0
        daily_count[d] = 0

    for t in transactions:

        if not t.created_at:
            continue

        t_date = t.created_at.date()

        if t_date in daily_revenue:
            daily_revenue[t_date] += t.total_amount
            daily_count[t_date] += 1

    revenue_trend = []
    transaction_trend = []

    for d in last_30_days:

        revenue_trend.append({
            "date": d,
            "revenue": daily_revenue[d]
        })

        transaction_trend.append({
            "date": d,
            "count": daily_count[d]
        })

    first_rev = revenue_trend[0]["revenue"]
    last_rev = revenue_trend[-1]["revenue"]

    delta_per_day = (last_rev - first_rev) / (len(revenue_trend) - 1)

    predicted_revenue_next_month = 0

    for i in range(30):
        predicted_revenue_next_month += revenue_trend[-1]["revenue"] + delta_per_day * (i + 1)

    pair_counter = Counter()

    for t in transactions:

        products_in_tx = []

        for item in t.items:
            if item.product:
                products_in_tx.append(item.product.title)

        for combo in combinations(sorted(products_in_tx), 2):
            pair_counter[combo] += 1

    top_product_combo_pair, frequency = pair_counter.most_common(1)[0]

    top_product_combo = {
        "product_a": top_product_combo_pair[0],
        "product_b": top_product_combo_pair[1],
        "frequency": frequency
    }

    transaction_days = []
    for t in transactions:
        if t.created_at:
            transaction_days.append(t.created_at.date())

    day_counts = Counter(transaction_days)
    repeat_transaction_days = []

    for day, count in day_counts.items():
        if count > 1:
            repeat_transaction_days.append(day)

    largest_single_transaction = max(transactions, key=lambda t: t.total_amount)
    smallest_single_transaction = min(transactions, key=lambda t: t.total_amount)

    return {
        "revenue_trend": revenue_trend,
        "transaction_trend": transaction_trend,
        "predicted_revenue_next_month": predicted_revenue_next_month,
        "top_product_combo": top_product_combo,
        "repeat_transaction_days": repeat_transaction_days,
        "largest_single_transaction": largest_single_transaction,
        "smallest_single_transaction": smallest_single_transaction
    }