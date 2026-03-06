from statistics import mean


def aggregate_product_stats(products, total_units_sold):
    total_products = len(products)
    prices = []
    inventories = []

    for p in products:
        prices.append(p.price)
        inventories.append(p.inventory)

    average_product_price = mean(prices) if prices else 0
    price_range = {"min": min(prices), "max": max(prices)} if prices else {"min":0,"max":0}

    most_expensive_product = max(products, key=lambda p: p.price) if products else None
    cheapest_product = min(products, key=lambda p: p.price) if products else None

    inventory_value = 0
    for p in products:
        inventory_value += p.price * p.inventory

    avg_inventory = mean(inventories) if inventories else 0
    stock_turnover_rate = total_units_sold / avg_inventory if avg_inventory else 0

    low_stock_threshold = 5
    low_stock_products = []

    for p in products:
        if p.inventory < low_stock_threshold:
            low_stock_products.append({
                "title": p.title,
                "stock": p.inventory
            })

    return {
        "total_products": total_products,
        "average_product_price": average_product_price,
        "price_range": price_range,
        "most_expensive_product": most_expensive_product,
        "cheapest_product": cheapest_product,
        "inventory_value": inventory_value,
        "stock_turnover_rate": stock_turnover_rate,
        "low_stock_products": low_stock_products
    }