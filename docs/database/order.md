# VenuePlus — Order System

## Overview

The Order System represents the **financial transaction layer** of VenuePlus.

Orders support mixed cart purchases including:

* Tickets
* Memberships
* Retail
* Food & Beverage
* Wallet Loads
* Gift Cards
* Event Packages

Operational fulfillment occurs **after successful payment**.

Examples:

| Product       | Fulfillment           |
| ------------- | --------------------- |
| Ticket        | reservation           |
| Membership    | membership_activation |
| Retail        | inventory_transaction |
| Wallet Load   | wallet_transaction    |
| Event Package | event creation        |

---

# Core Design Principles

1. **Orders are immutable after payment**
2. Refunds create **separate refund orders**
3. **One order_item represents one sellable unit**
4. Taxes are **snapshotted**
5. Discounts are **stored as adjustments**
6. Fulfillment tables reference `order_item_id`

---

# Entity Relationship

```
orders
   ↓
order_items
   ↓
order_item_price_components
order_item_adjustments
order_item_tax_components

orders
   ↓
order_payments
   ↓
payment_transactions

orders
   ↓
order_status_history
```

Operational tables referencing order items:

```
reservations
memberships
inventory_transactions
wallet_transactions
```

---

# Table: orders

Represents a financial transaction.

| Column          | Type                                          | Required | Description      |
| --------------- | --------------------------------------------- | -------- | ---------------- |
| id              | UUID (PK)                                     | YES      | Order ID         |
| order_number    | TEXT                                          | YES      | Human readable   |
| venue_id        | UUID                                          | YES      | Venue            |
| account_id      | UUID                                          | NO       | Customer         |
| order_type      | ENUM('sale','refund')                         | YES      | Transaction type |
| status          | ENUM('pending','paid','refunded','cancelled') | YES      | Lifecycle        |
| currency_code   | TEXT                                          | YES      | Currency         |
| subtotal_amount | NUMERIC(12,2)                                 | YES      | Before tax       |
| discount_amount | NUMERIC(12,2)                                 | YES      | Total discount   |
| tax_amount      | NUMERIC(12,2)                                 | YES      | Total tax        |
| total_amount    | NUMERIC(12,2)                                 | YES      | Final total      |
| source_channel  | ENUM('pos','online','kiosk')                  | YES      | Channel          |
| parent_order_id | UUID                                          | NO       | For refunds      |
| created_at      | TIMESTAMPTZ                                   | YES      | Created          |
| created_by      | UUID                                          | NO       | Staff            |

---

# Table: order_items

Each row represents **one sellable unit**.

| Column           | Type               | Required | Description |
| ---------------- | ------------------ | -------- | ----------- |
| id               | UUID (PK)          | YES      |             |
| order_id         | UUID FK → orders   | YES      |             |
| product_id       | UUID FK → products | YES      |             |
| visitor_type_id  | UUID               | NO       |             |
| unit_price       | NUMERIC(12,2)      | YES      |             |
| discount_amount  | NUMERIC(12,2)      | YES      |             |
| tax_amount       | NUMERIC(12,2)      | YES      |             |
| total_amount     | NUMERIC(12,2)      | YES      |             |
| price_overridden | BOOLEAN            | YES      |             |
| created_at       | TIMESTAMPTZ        | YES      |             |

---

# Table: order_item_price_components

Stores **base pricing structure** before discounts.

| Column         | Type                                                                       | Description |
| -------------- | -------------------------------------------------------------------------- | ----------- |
| id             | UUID                                                                       |             |
| order_item_id  | UUID                                                                       |             |
| component_type | ENUM('base_price','dynamic_pricing','visitor_modifier','channel_modifier') |             |
| source_id      | UUID                                                                       |             |
| amount         | NUMERIC                                                                    |             |
| created_at     | TIMESTAMP                                                                  |             |

---

# Table: order_item_adjustments

Stores **discounts or surcharges** applied.

| Column            | Type                                                |
| ----------------- | --------------------------------------------------- |
| id                | UUID                                                |
| order_item_id     | UUID                                                |
| adjustment_source | ENUM('pricing_rule','promo_code','bundle','manual') |
| source_id         | UUID                                                |
| adjustment_type   | ENUM('discount','surcharge')                        |
| amount            | NUMERIC                                             |
| created_at        | TIMESTAMP                                           |

---

# Table: order_item_tax_components

Stores tax breakdown.

Supports GST component structure.

| Column           | Type    |
| ---------------- | ------- |
| id               | UUID    |
| order_item_id    | UUID    |
| tax_component_id | UUID    |
| tax_rate_percent | NUMERIC |
| tax_amount       | NUMERIC |

---

# Table: order_payments

Tracks payment methods used.

| Column         | Type                                            |
| -------------- | ----------------------------------------------- |
| id             | UUID                                            |
| order_id       | UUID                                            |
| payment_method | ENUM('cash','card','upi','wallet','gift_card')  |
| amount         | NUMERIC                                         |
| status         | ENUM('pending','completed','failed','refunded') |
| created_at     | TIMESTAMP                                       |

---

# Table: payment_transactions

External payment gateway responses.

| Column                 | Type                                          |
| ---------------------- | --------------------------------------------- |
| id                     | UUID                                          |
| order_payment_id       | UUID                                          |
| gateway                | TEXT                                          |
| gateway_transaction_id | TEXT                                          |
| status                 | ENUM('success','failed','pending','refunded') |
| response_payload       | JSONB                                         |
| created_at             | TIMESTAMP                                     |

---

# Table: order_status_history

Audit log of order status changes.

| Column          | Type      |
| --------------- | --------- |
| id              | UUID      |
| order_id        | UUID      |
| previous_status | TEXT      |
| new_status      | TEXT      |
| changed_by      | UUID      |
| changed_at      | TIMESTAMP |

---

# Example Transaction

Customer purchases:

```
3 Adult Jump Tickets
2 Child Jump Tickets
2 Socks
1 Membership
```

Applied:

```
Weekend pricing
Promo code FAMILY10
Bundle discount on socks
Cashier override on child ticket
```

---

# Base Price Calculation

```
Adult Jump = 500 + 100
Child Jump = 450 + 100
Socks = 150
Membership = 2000
```

Base subtotal:

```
5200
```

---

# Discounts

| Discount | Amount |
| -------- | ------ |
| Promo    | 290    |
| Bundle   | 100    |
| Override | 100    |

Total discount:

```
490
```

Subtotal after discount:

```
4710
```

---

# GST

```
4710 × 18% = 847.8
```

Split:

```
CGST 423.9
SGST 423.9
```

---

# Final Total

```
5557.8
```

---

# orders Example

| id | order_number | subtotal | discount | tax   | total  |
| -- | ------------ | -------- | -------- | ----- | ------ |
| O1 | ORD1021      | 4710     | 490      | 847.8 | 5557.8 |

---

# Partial Refund Flow

Customer returns:

```
1 Child Ticket
1 Socks
```

---

# Refund Order

New order created:

| id | order_number | type   | parent_order_id |
| -- | ------------ | ------ | --------------- |
| O2 | ORD1021-R1   | refund | O1              |

---

# Refund Items

| id   | order_id | product      | price |
| ---- | -------- | ------------ | ----- |
| ROI1 | O2       | Child Ticket | -450  |
| ROI2 | O2       | Socks        | -100  |

---

# Refund Taxes

| order_item | tax  | amount |
| ---------- | ---- | ------ |
| ROI1       | CGST | -40.5  |
| ROI1       | SGST | -40.5  |
| ROI2       | CGST | -9     |
| ROI2       | SGST | -9     |

Refund total:

```
649
```

---

# Operational Updates

### Reservation

```
reservation.status = cancelled
```

### Inventory

```
inventory_transactions.qty = +1
```

---

# Full Order Cancellation Flow

If the entire order is cancelled:

1️⃣ create refund order

```
ORD1021-RFULL
```

2️⃣ copy all order_items as negative rows

3️⃣ reverse taxes

4️⃣ cancel reservations

5️⃣ restore inventory

6️⃣ deactivate memberships

7️⃣ refund payment

---

# Example Refund Order

| id | order_number  | subtotal | tax    | total   |
| -- | ------------- | -------- | ------ | ------- |
| O3 | ORD1021-RFULL | -4710    | -847.8 | -5557.8 |

---

# Advantages of This Design

| Feature         | Supported |
| --------------- | --------- |
| Mixed products  | ✔         |
| Promo codes     | ✔         |
| Bundles         | ✔         |
| Overrides       | ✔         |
| GST compliance  | ✔         |
| Split payments  | ✔         |
| Partial refunds | ✔         |
| Audit trail     | ✔         |

---

# Final Architecture

```
orders
   ↓
order_items
   ↓
price_components
adjustments
tax_components
   ↓
payments
   ↓
operational fulfillment
```

---
