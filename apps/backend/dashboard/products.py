from typing import List

from apps.backend.models import Product, TransactionItem



def aggregate_product_sales(transactions):

    total_units_sold = 0
    all_products = {}

    for t in transactions:

        current_transaction: List[TransactionItem] = t.items

        for item in current_transaction:

            current_product: Product = item.product

            if not current_product:
                continue

            total_units_sold += item.quantity

            if current_product.title not in all_products:
                all_products[current_product.title] = [0, 0, current_product.price]

            all_products[current_product.title][0] += item.quantity
            all_products[current_product.title][1] += item.quantity * item.price_at_time

    top_products_list = sorted(all_products.items(), key=lambda x: x[1][0], reverse=True)[:5]
    bottom_products_list = sorted(all_products.items(), key=lambda x: x[1][0])[:5]

    top_products = {}
    bottom_products = {}

    index = 1
    for title, data in top_products_list:

        top_products[index] = {
            "title": title,
            "units_sold": data[0],
            "revenue_generated": data[1],
            "current_price": data[2]
        }

        index += 1

    index = 1
    for title, data in bottom_products_list:

        bottom_products[index] = {
            "title": title,
            "units_sold": data[0],
            "revenue_generated": data[1],
            "current_price": data[2]
        }

        index += 1

    most_revenue_product_title, data = max(all_products.items(), key=lambda x: x[1][1])

    most_revenue_product = {
        "title": most_revenue_product_title,
        "revenue_generated": data[1],
        "units_sold": data[0],
        "current_price": data[2]
    }

    return {
        "all_products": all_products,
        "total_units_sold": total_units_sold,
        "top_products": top_products,
        "bottom_products": bottom_products,
        "most_revenue_product": most_revenue_product
    }