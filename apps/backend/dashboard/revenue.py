import calendar
from datetime import date, timedelta
from typing import List

from apps.backend.models import Product, TransactionItem


def aggregate_revenue_data(transactions):

    total_revenue = 0
    revenue_today = 0
    revenue_week = 0
    revenue_month = 0

    today = date.today()

    revenue_mom = {f"{calendar.month_abbr[i]} {today.year}": 0 for i in range(1, today.month + 1)}
    hourly_revenue = {i: 0 for i in range(24)}
    weekday_revenue = {i: 0 for i in range(7)}

    start_of_week = today - timedelta(days=today.weekday())
    start_of_month = today.replace(day=1)

    for t in transactions:

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

        if tx_date.year == today.year and tx_date.month <= today.month:
            month_label = f"{calendar.month_abbr[tx_date.month]} {tx_date.year}"
            revenue_mom[month_label] += t.total_amount

        hourly_revenue[t.created_at.hour] += t.total_amount
        weekday_revenue[t.created_at.weekday()] += t.total_amount

    busiest_hour = max(hourly_revenue, key=hourly_revenue.get)
    busiest_weekday = max(weekday_revenue, key=weekday_revenue.get)

    total_transactions = len(transactions)
    average_revenue = total_revenue / total_transactions if total_transactions else 0

    return {
        "total_revenue": total_revenue,
        "revenue_today": revenue_today,
        "revenue_week": revenue_week,
        "revenue_month": revenue_month,
        "revenue_mom": revenue_mom,
        "busiest_hour": busiest_hour,
        "busiest_weekday": busiest_weekday,
        "average_revenue": average_revenue
    }
