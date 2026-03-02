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

# 🧱 Table: `product_tax_structures`

Maps products to applicable tax structure.

---

| Column           | Type                        | Required       | Description |
| ---------------- | --------------------------- | -------------- | ----------- |
| id               | UUID (PK)                   | ✅              | Mapping ID  |
| product_id       | UUID FK → products.id       | ✅              | Product     |
| tax_structure_id | UUID FK → tax_structures.id | ✅              | GST 18%     |
| effective_from   | DATE                        | ❌              | Start       |
| effective_until  | DATE                        | ❌              | End         |
| is_active        | BOOLEAN                     | ✅ default true | Active      |
| created_at       | TIMESTAMPTZ                 | ✅              | Created     |
| created_by       | UUID FK → users.id          | ❌              | Creator     |

---

# 📌 Checkout Behavior

At order creation:

1. Product → Tax Structure
2. Tax Structure → Components
3. Snapshot components into:

```text
order_item_tax_components
```

This ensures:

* Invoice immutability
* Accurate refund calculations
* Historical reporting integrity

---

# 🔗 Used By

| Table              | Purpose            |
| ------------------ | ------------------ |
| order_items        | Tax calculation    |
| invoice_generation | GST breakup        |
| reporting          | Liability tracking |

---

---

**Pricing Engine Backbone**.

Because:

* `product_prices` = Base price
* But actual selling price depends on:

  * Weekend
  * Bulk
  * Early bird
  * Membership
  * Channel
  * Promo
  * B2G1
  * etc

All of this must be rule-driven.

---

# 💰 Pricing Rules Engine

Pricing rules allow dynamic modification of product pricing based on:

* Date
* Time
* Visitor Type
* Quantity
* Channel
* Membership
* Booking lead time
* Promo eligibility

Rules are evaluated during checkout and applied in a defined priority order.

---

# 🧠 Conceptual Model

| Entity       | Role                       |
| ------------ | -------------------------- |
| Pricing Rule | Discount / Surcharge logic |
| Conditions   | When to apply              |
| Actions      | What to do                 |

---

# 🧱 Table: `pricing_rules`

Defines a pricing rule.

---

| Column          | Type                                                     | Required       | Description      |
| --------------- | -------------------------------------------------------- | -------------- | ---------------- |
| id              | UUID (PK)                                                | ✅              | Rule ID          |
| venue_id        | UUID FK → venues.id                                      | ❌              | Venue            |
| name            | TEXT                                                     | ✅              | Rule name        |
| rule_type       | ENUM('discount','surcharge','set_price','bogo','bundle') | ✅              | Rule behavior    |
| priority        | INT                                                      | ✅              | Evaluation order |
| is_stackable    | BOOLEAN                                                  | ✅ default true | Allow stacking   |
| effective_from  | TIMESTAMPTZ                                              | ❌              | Start            |
| effective_until | TIMESTAMPTZ                                              | ❌              | End              |
| is_active       | BOOLEAN                                                  | ✅ default true | Active           |
| created_at      | TIMESTAMPTZ                                              | ✅              | Created          |
| created_by      | UUID FK → users.id                                       | ❌              | Creator          |

---

---

# 🧱 Table: `pricing_rule_conditions`

Defines when the rule applies.

---

| Column          | Type                                                                                  | Required | Description     |
| --------------- | ------------------------------------------------------------------------------------- | -------- | --------------- |
| id              | UUID (PK)                                                                             | ✅        | Condition ID    |
| pricing_rule_id | UUID FK → pricing_rules.id                                                            | ✅        | Rule            |
| condition_type  | ENUM('product','visitor_type','channel','day_of_week','quantity','booking_lead_time') | ✅        | Condition       |
| operator        | ENUM('=','>','<','>=','<=','IN')                                                      | ✅        | Logic           |
| value           | TEXT                                                                                  | ✅        | Condition value |

---

Example:

Weekend rule:

| Type        | Operator | Value |
| ----------- | -------- | ----- |
| day_of_week | IN       | [6,7] |

---

---

# 🧱 Table: `pricing_rule_actions`

Defines what to do when rule applies.

---

| Column            | Type                                                                                                  | Required | Description |
| ----------------- | ----------------------------------------------------------------------------------------------------- | -------- | ----------- |
| id                | UUID (PK)                                                                                             | ✅        | Action ID   |
| pricing_rule_id   | UUID FK → pricing_rules.id                                                                            | ✅        | Rule        |
| action_type       | ENUM('flat_discount','percent_discount','flat_surcharge','percent_surcharge','set_price','free_item') | ✅        | Action      |
| value             | NUMERIC(12,2)                                                                                         | ❌        | Amount      |
| target_product_id | UUID FK → products.id                                                                                 | ❌        | Free item   |

---

---

# 🧠 Example

Weekend Surcharge:

* Condition:

  ```
  day_of_week IN [6,7]
  ```
* Action:

  ```
  flat_surcharge = 100
  ```

---

# 🔄 Evaluation Order

Rules are applied in ascending:

```text
priority
```

Final price is calculated before:

* Tax
* Reservation creation

---

# 🔗 Used By

| Table       | Purpose          |
| ----------- | ---------------- |
| order_items | Final price      |
| promo_codes | Campaign pricing |
| reporting   | Attribution      |

---

Supports:

✔ Weekend pricing
✔ Early bird
✔ Bulk discount
✔ B2G1
✔ Channel-based pricing

---

---

**Promo Codes**.

Because:

* `pricing_rules` = Automatic logic
* `promo_codes` = Manually applied campaigns

Promo Codes must:

* Be entered by customer / staff
* Optionally override membership
* Be restricted by product
* Have usage limits
* Support stacking control

---

# 🎟 Promo Codes

Promo Codes allow manual application of discounts during checkout.

Unlike pricing rules:

* Promo Codes require user input
* May be campaign-specific
* May override other discounts
* May apply to specific products or visitor types

---

# 🧱 Table: `promo_codes`

---

| Column                | Type                   | Required        | Description  |
| --------------------- | ---------------------- | --------------- | ------------ |
| id                    | UUID (PK)              | ✅               | Promo ID     |
| venue_id              | UUID FK → venues.id    | ❌               | Venue        |
| code                  | TEXT (UNIQUE)          | ✅               | e.g SUMMER10 |
| description           | TEXT                   | ❌               | Description  |
| discount_type         | ENUM('flat','percent') | ✅               | Type         |
| discount_value        | NUMERIC(12,2)          | ✅               | Amount       |
| max_uses              | INT                    | ❌               | Total usage  |
| max_uses_per_customer | INT                    | ❌               | Per user     |
| is_stackable          | BOOLEAN                | ✅ default false | Stackable    |
| effective_from        | TIMESTAMPTZ            | ❌               | Start        |
| effective_until       | TIMESTAMPTZ            | ❌               | End          |
| is_active             | BOOLEAN                | ✅ default true  | Active       |
| created_at            | TIMESTAMPTZ            | ✅               | Created      |
| created_by            | UUID FK → users.id     | ❌               | Creator      |

---

---

# 🧱 Table: `promo_code_applicability`

Defines where promo applies.

---

| Column          | Type                         | Required | Description |
| --------------- | ---------------------------- | -------- | ----------- |
| id              | UUID (PK)                    | ✅        | Mapping ID  |
| promo_code_id   | UUID FK → promo_codes.id     | ✅        | Promo       |
| product_id      | UUID FK → products.id        | ❌        | Product     |
| visitor_type_id | UUID FK → visitor_types.id   | ❌        | Visitor     |
| sales_channel   | ENUM('online','pos','kiosk') | ❌        | Channel     |

---

---

# 🧠 Behavior

Example:

Promo:

```text id="t0g0xk"
KIDS20
```

Applicability:

* Product = Jump Pass
* Visitor Type = Child

Discount:

```text id="v55zt0"
20%
```

---

Promo is applied:

After:

* Membership discount
  Before:

* Manual override

As per earlier rule order.

---

# 📌 Checkout Behavior

On promo entry:

1. Validate:

   * Code active
   * Usage limit
   * Applicability

2. Apply discount to matching order_items

3. Snapshot into:

```text id="m4o1fi"
order_item_pricing_adjustments
```

---

# 🔗 Used By

| Table       | Purpose              |
| ----------- | -------------------- |
| order_items | Price                |
| reporting   | Campaign attribution |

---

Supports:

✔ Campaigns
✔ Product-specific promos
✔ Customer-specific limits
✔ POS overrides

---

---

**Bundle Promotions**

This supports:

* B2G1
* Combo discount
* Set price bundles
* Included items (e.g Party Packages)
* Reservation-capacity consumption even for free items

---

# 🎁 Bundle Promotions

Bundle Promotions define relationships between products in the same cart.

Unlike:

* Pricing Rules (single-line modification)
* Promo Codes (manual discounts)

Bundles:

* May involve multiple products
* May add items automatically
* May override unit price
* May apply group-level pricing
* May create operational entitlements (e.g ticket reservations)

---

# 🧠 Conceptual Model

| Bundle Type    | Example                             |
| -------------- | ----------------------------------- |
| bogo           | Buy 2 Get 1 Free                    |
| combo_discount | Ticket + Socks ₹50 Off              |
| set_price      | Pizza + Drink ₹299                  |
| included_items | Party Package includes Jump Tickets |

---

# 🧱 Table: `bundle_promotions`

Defines a bundle promotion.

---

| Column                     | Type                                                       | Required       | Description     |
| -------------------------- | ---------------------------------------------------------- | -------------- | --------------- |
| id                         | UUID (PK)                                                  | ✅              | Bundle ID       |
| venue_id                   | UUID FK → venues.id                                        | ❌              | Venue           |
| name                       | TEXT                                                       | ✅              | Bundle name     |
| bundle_type                | ENUM('bogo','combo_discount','set_price','included_items') | ✅              | Bundle type     |
| max_applications_per_order | INT                                                        | ❌              | Limit per order |
| effective_from             | TIMESTAMPTZ                                                | ❌              | Start           |
| effective_until            | TIMESTAMPTZ                                                | ❌              | End             |
| is_active                  | BOOLEAN                                                    | ✅ default true | Active          |
| created_at                 | TIMESTAMPTZ                                                | ✅              | Created         |
| created_by                 | UUID FK → users.id                                         | ❌              | Creator         |

---

---

# 🧱 Table: `bundle_promotion_items`

Defines items involved in bundle.

---

| Column              | Type                           | Required | Description      |
| ------------------- | ------------------------------ | -------- | ---------------- |
| id                  | UUID (PK)                      | ✅        | Mapping ID       |
| bundle_promotion_id | UUID FK → bundle_promotions.id | ✅        | Bundle           |
| product_id          | UUID FK → products.id          | ✅        | Product          |
| role                | ENUM('qualifier','reward')     | ✅        | Role             |
| required_quantity   | INT                            | ❌        | Buy quantity     |
| reward_quantity     | INT                            | ❌        | Free quantity    |
| discount_value      | NUMERIC(12,2)                  | ❌        | Discount         |
| is_price_overridden | BOOLEAN                        | ❌        | Price replaced   |
| is_auto_added       | BOOLEAN                        | ❌        | Auto add to cart |
| is_removable        | BOOLEAN                        | ❌        | Allow removal    |

---

---

# 🧠 Behavior Examples

---

## B2G1

Buy 2 Jump Tickets:

| Product | Role      | Qty |
| ------- | --------- | --- |
| Jump    | qualifier | 2   |
| Jump    | reward    | 1   |

---

## Ticket + Socks

| Product | Role      | Discount |
| ------- | --------- | -------- |
| Jump    | qualifier | -        |
| Socks   | reward    | ₹50      |

---

## Party Package

| Product | Role      | Auto |
| ------- | --------- | ---- |
| Party   | qualifier | -    |
| Jump    | reward    | Yes  |
| Pizza   | reward    | Yes  |

---

# 📌 Checkout Behavior

Bundle may:

* Add reward product
* Override price
* Lock items
* Apply per quantity

Reservation must be created for:

* Ticket reward items
  Even if price = 0

---

# 🔗 Used By

| Table        | Purpose  |
| ------------ | -------- |
| order_items  | Price    |
| reservations | Capacity |
| inventory    | Stock    |

---

Supports:

✔ Party packages
✔ Combo offers
✔ B2G1
✔ Included entitlements

---
