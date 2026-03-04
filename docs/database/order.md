Orders must support **mixed cart purchases**, like:

Example cart:

```
3 × Jump Tickets
1 × Membership
2 × Grip Socks
1 × Arcade Card Load
```

So the order system must support:

| Module        | Trigger               |
| ------------- | --------------------- |
| Tickets       | reservations          |
| Membership    | membership_activation |
| Retail        | inventory_deduction   |
| Wallet Load   | wallet_transactions   |
| Event Package | event creation        |

---

# 🧠 Order Architecture

We need these tables:

```
orders
order_items
order_item_price_components
order_item_tax_components
order_payments
payment_transactions
```

Optional but recommended:

```
order_status_history
order_item_adjustments
```

---

# 1️⃣ Orders

Place in Git:

```
/docs/database/commerce/orders.md
```

---

## Table: `orders`

Represents a single checkout transaction.

| Column          | Type                                          | Description    |
| --------------- | --------------------------------------------- | -------------- |
| id              | UUID (PK)                                     | Order ID       |
| venue_id        | UUID FK                                       | Venue          |
| order_number    | TEXT                                          | Human readable |
| account_id      | UUID FK                                       | Customer       |
| status          | ENUM('pending','paid','cancelled','refunded') | Order state    |
| currency_code   | TEXT                                          | Currency       |
| subtotal_amount | NUMERIC                                       | Before tax     |
| discount_amount | NUMERIC                                       | Total discount |
| tax_amount      | NUMERIC                                       | Total tax      |
| total_amount    | NUMERIC                                       | Final          |
| source_channel  | ENUM('pos','online','kiosk')                  | Source         |
| created_at      | TIMESTAMP                                     | Created        |
| created_by      | UUID FK users                                 | Staff          |

---

# 2️⃣ Order Items

Place in Git:

```
/docs/database/commerce/order-items.md
```

---

## Table: `order_items`

Each product added to cart.

| Column          | Type                    | Description           |
| --------------- | ----------------------- | --------------------- |
| id              | UUID (PK)               | Item ID               |
| order_id        | UUID FK → orders        | Order                 |
| product_id      | UUID FK → products      | Product               |
| visitor_type_id | UUID FK → visitor_types | Visitor               |
| quantity        | INT                     | Quantity              |
| unit_price      | NUMERIC                 | Price before discount |
| discount_amount | NUMERIC                 | Discount applied      |
| tax_amount      | NUMERIC                 | Tax                   |
| total_amount    | NUMERIC                 | Final                 |
| created_at      | TIMESTAMP               | Created               |

---

# 3️⃣ Order Item Pricing Adjustments

Tracks discounts applied.

Place in Git:

```
/docs/database/commerce/order-item-adjustments.md
```

---

## Table: `order_item_adjustments`

| Column            | Type                                                | Description     |
| ----------------- | --------------------------------------------------- | --------------- |
| id                | UUID                                                | Adjustment ID   |
| order_item_id     | UUID FK                                             | Item            |
| adjustment_source | ENUM('pricing_rule','promo_code','bundle','manual') |                 |
| source_id         | UUID                                                | Rule / promo id |
| adjustment_type   | ENUM('discount','surcharge')                        |                 |
| amount            | NUMERIC                                             | Adjustment      |
| created_at        | TIMESTAMP                                           |                 |

---

# 4️⃣ Order Item Tax Components

Supports GST breakup.

Place in Git:

```
/docs/database/commerce/order-item-tax-components.md
```

---

## Table: `order_item_tax_components`

| Column           | Type    | Description |
| ---------------- | ------- | ----------- |
| id               | UUID    | Row ID      |
| order_item_id    | UUID FK | Item        |
| tax_component_id | UUID FK | CGST/SGST   |
| tax_rate_percent | NUMERIC | Rate        |
| tax_amount       | NUMERIC | Amount      |

---

# 5️⃣ Order Payments

One order may have multiple payments.

Example:

```
₹500 wallet
₹300 card
```

Place in Git:

```
/docs/database/commerce/order-payments.md
```

---

## Table: `order_payments`

| Column         | Type                                            | Description |
| -------------- | ----------------------------------------------- | ----------- |
| id             | UUID                                            | Payment ID  |
| order_id       | UUID FK                                         | Order       |
| payment_method | ENUM('cash','card','upi','wallet','gift_card')  |             |
| amount         | NUMERIC                                         | Amount      |
| status         | ENUM('pending','completed','failed','refunded') |             |
| created_at     | TIMESTAMP                                       |             |

---

# 6️⃣ Payment Transactions

Gateway tracking.

Place in Git:

```
/docs/database/commerce/payment-transactions.md
```

---

## Table: `payment_transactions`

| Column                 | Type                               | Description       |
| ---------------------- | ---------------------------------- | ----------------- |
| id                     | UUID                               | Transaction ID    |
| order_payment_id       | UUID FK                            | Payment           |
| gateway                | TEXT                               | Stripe / Razorpay |
| gateway_transaction_id | TEXT                               | External ref      |
| status                 | ENUM('success','failed','pending') |                   |
| response_payload       | JSONB                              | Gateway data      |
| created_at             | TIMESTAMP                          |                   |

---

# 🧠 Example Flow

Customer buys:

```
3 Adult Jump Tickets
2 Child Jump Tickets
1 Membership
2 Socks
```

Tables populated:

```
orders
order_items
order_item_adjustments
order_item_tax_components
order_payments
payment_transactions
```
