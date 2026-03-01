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
