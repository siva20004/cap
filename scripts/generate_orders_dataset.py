import os
import hashlib
import random
from pathlib import Path
import pandas as pd
from datetime import datetime, timedelta

def generate_orders_dataset(output_path: str = "data/raw/orders.csv", num_records: int = 500, random_seed: int = 42):
    random.seed(random_seed)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    start_date = datetime(2026, 9, 10)
    customer_ids = [f"CUST_{i:04d}" for i in range(1, 80)]
    product_catalog = [
        ("PROD_LAPTOP", 1200.0),
        ("PROD_MOUSE", 25.0),
        ("PROD_KEYBOARD", 75.0),
        ("PROD_MONITOR", 350.0),
        ("PROD_HEADSET", 85.0),
        ("PROD_DESK_PAD", 20.0),
        ("PROD_USB_HUB", 45.0),
        ("PROD_WEBCAM", 95.0)
    ]

    records = []
    for i in range(1, num_records + 1):
        order_id = 100000 + i
        customer_id = random.choice(customer_ids)
        product_id, base_price = random.choice(product_catalog)
        quantity = random.randint(1, 5)
        # Add slight realistic price variance
        price = round(base_price * (1.0 + random.uniform(-0.05, 0.05)), 2)
        day_offset = random.randint(0, 5)  # spans 2026-09-10 to 2026-09-15
        order_date = (start_date + timedelta(days=day_offset)).strftime("%Y-%m-%d")

        records.append({
            "order_id": order_id,
            "customer_id": customer_id,
            "product_id": product_id,
            "quantity": quantity,
            "price": price,
            "order_date": order_date
        })

    df = pd.DataFrame(records)
    df.to_csv(output_path, index=False)

    # Compute SHA-256
    with open(output_path, "rb") as f:
        sha256_hash = hashlib.sha256(f.read()).hexdigest()

    print(f"Generated {len(df)} orders at {output_path}")
    print(f"SHA-256: {sha256_hash}")
    return df, sha256_hash

if __name__ == "__main__":
    generate_orders_dataset()
