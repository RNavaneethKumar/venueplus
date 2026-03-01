# 🛒 Products

---

## 🧠 Purpose

The `products` table represents all **sellable commercial items** that may be added to cart.

A product may represent:

* Ticket
* Membership
* Retail Item
* Wallet Load
* Gift Card
* Event Package
* Food & Beverage

This allows the system to support a **unified checkout experience** where a single order may contain items from multiple modules.

Operational behavior of the product (e.g. reservation creation, inventory deduction, wallet load) is defined in separate configuration tables based on the product type.

---

## 🧱 Table: `products`

---

| Column       | Type                                                                                           | Required        | Description            |
| ------------ | ---------------------------------------------------------------------------------------------- | --------------- | ---------------------- |
| id           | UUID (PK)                                                                                      | ✅               | Product ID             |
| venue_id     | UUID FK → venues.id                                                                            | ❌ NULL = global |                        |
| name         | TEXT                                                                                           | ✅               | Product name           |
| code         | TEXT                                                                                           | ❌               | SKU-like unique code   |
| product_type | ENUM('ticket','membership','retail','wallet_load','gift_card','event_package','food_beverage') | ✅               | Product classification |
| is_active    | BOOLEAN                                                                                        | ✅ default true  | Active                 |
| created_at   | TIMESTAMPTZ                                                                                    | ✅               | Created                |
| created_by   | UUID FK → users.id                                                                             | ❌               | Creator                |

---

## 🔐 Unique Constraint

```sql
UNIQUE(venue_id, code)
```

---

## 🧠 Product Types

| Product Type  | Example           |
| ------------- | ----------------- |
| ticket        | 1 Hr Jump Pass    |
| membership    | Monthly Play Pass |
| retail        | Grip Socks        |
| wallet_load   | Arcade Card Load  |
| gift_card     | ₹1000 Gift Card   |
| event_package | Birthday Party    |
| food_beverage | Pizza Combo       |

---

## 🧩 Operational Behavior

Product-specific operational behavior is defined in:

| Product Type  | Behavior Config Table      |
| ------------- | -------------------------- |
| ticket        | product_reservation_config |
| membership    | membership_plans           |
| retail        | inventory_items            |
| wallet_load   | wallet_load_config         |
| gift_card     | gift_card_config           |
| event_package | event_package_config       |
| food_beverage | recipe_config              |

These tables determine:

* Reservation creation
* Capacity consumption
* Inventory deduction
* Wallet load rules
* Membership allowance
* Event entitlements

---

## 🔗 Used By

| Table                      | Purpose        |
| -------------------------- | -------------- |
| order_items                | Cart line item |
| product_prices             | Pricing        |
| product_resource_mapping   | Capacity       |
| product_tax_mapping        | GST/VAT        |
| product_reservation_config | Ticket logic   |

---

## 🚦 Notes

* `product_type` determines operational configuration lookup
* Products do not store:

  * duration
  * inventory
  * wallet rules
  * membership allowance
* These must be defined in corresponding behavior tables

---

This enables:

* Unified checkout
* Cross-module orders
* Promotion engine compatibility
* Consistent reporting
* Modular operational logic

---

---

# 🧱 Table: `product_prices`

Defines base pricing for a product based on:

* Visitor Type
* Channel
* Validity window

All dynamic pricing such as:

* Weekend pricing
* Early bird
* Membership discount
* Bulk pricing
* Promo codes

are applied later via:

```
pricing_rules
```

---

| Column          | Type                         | Required       | Description             |
| --------------- | ---------------------------- | -------------- | ----------------------- |
| id              | UUID (PK)                    | ✅              | Price ID                |
| product_id      | UUID FK → products.id        | ✅              | Product                 |
| visitor_type_id | UUID FK → visitor_types.id   | ❌              | Applicable visitor type |
| base_price      | NUMERIC(12,2)                | ✅              | Base unit price         |
| currency_code   | TEXT                         | ✅              | Currency                |
| sales_channel   | ENUM('online','pos','kiosk') | ❌              | Channel                 |
| effective_from  | TIMESTAMPTZ                  | ❌              | Start time              |
| effective_until | TIMESTAMPTZ                  | ❌              | End time                |
| is_active       | BOOLEAN                      | ✅ default true | Active                  |
| created_at      | TIMESTAMPTZ                  | ✅              | Created                 |
| created_by      | UUID FK → users.id           | ❌              | Creator                 |

---

## 🧠 Behavior

Examples:

| Product   | Visitor | Channel | Base |
| --------- | ------- | ------- | ---- |
| Jump Pass | Adult   | POS     | 600  |
| Jump Pass | Child   | POS     | 500  |
| Jump Pass | Adult   | Online  | 550  |

---

## 🔐 Suggested Constraint

Prevent overlapping price windows:

```
(product_id, visitor_type_id, sales_channel, effective_from)
```

---

## 🔗 Used By

| Table         | Purpose     |
| ------------- | ----------- |
| order_items   | Unit price  |
| pricing_rules | Adjustments |
| reporting     | Revenue     |

---
