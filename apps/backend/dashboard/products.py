def aggregate_product_sales(transactions):
    
    total_units_sold = 0
    all_products = {}

    for t in transactions:

        if not t or not t.items:
            continue

        for item in t.items:

            if not item or not item.product:
                continue

            product = item.product

            quantity = item.quantity or 0
            price = item.price_at_time or 0

            total_units_sold += quantity

            if product.title not in all_products:
                all_products[product.title] = [0, 0, product.price]

            all_products[product.title][0] += quantity
            all_products[product.title][1] += quantity * price

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

    if all_products:
        most_revenue_product_title, data = max(all_products.items(), key=lambda x: x[1][1])

        most_revenue_product = {
            "title": most_revenue_product_title,
            "revenue_generated": data[1],
            "units_sold": data[0],
            "current_price": data[2]
        }
    else:
        most_revenue_product = None

    return {
        "all_products": all_products,
        "total_units_sold": total_units_sold,
        "top_products": top_products,
        "bottom_products": bottom_products,
        "most_revenue_product": most_revenue_product
    }