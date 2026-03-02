# 🎟 Product Reservation Configuration

Defines how a **ticket-type product** behaves operationally when purchased.

This determines:

* Whether reservations are created
* How capacity is consumed
* Validity model (slot vs rolling vs open)
* Usage model (single entry / multi-entry / time-limited)
* Waiver requirement

---

# 🧠 Conceptual Model

| Product     | Reservation Type | Usage Type   |
| ----------- | ---------------- | ------------ |
| Laser Tag   | slot_based       | single_use   |
| 1 Hr Jump   | rolling_duration | time_limited |
| Museum Pass | open_access      | multi_entry  |
| 3 Day Pass  | open_access      | per_day      |

---

# 🧱 Table: `product_reservation_config`

---

| Column              | Type                                                           | Required        | Description                |
| ------------------- | -------------------------------------------------------------- | --------------- | -------------------------- |
| id                  | UUID (PK)                                                      | ✅               | Config ID                  |
| product_id          | UUID FK → products.id                                          | ✅               | Product                    |
| reservation_type    | ENUM('slot_bound','duration_bound','access_bound','multi_day') | ✅               | Validity model             |
| usage_type          | ENUM('single_use','multi_entry','time_limited','per_day')      | ✅               | Scan behavior              |
| duration_minutes    | INT                                                            | ❌               | Required if duration_bound |
| requires_waiver     | BOOLEAN                                                        | ✅ default true  | Waiver needed              |
| allows_reentry      | BOOLEAN                                                        | ✅ default false | Re-entry                   |
| entry_limit_per_day | INT                                                            | ❌               | Required if per_day        |
| valid_days          | INT                                                            | ❌               | Multi-day validity         |
| is_active           | BOOLEAN                                                        | ✅ default true  | Active                     |
| created_at          | TIMESTAMPTZ                                                    | ✅               | Created                    |
| created_by          | UUID FK → users.id                                             | ❌               | Creator                    |

---

---

# 🧠 Reservation Types

| Type           | Meaning           |
| -------------- | ----------------- |
| slot_bound     | Fixed session     |
| duration_bound | Rolling admission |
| access_bound   | Day access        |
| multi_day      | Multi-day pass    |

---

# 🧠 Usage Types

| Type         | Meaning         |
| ------------ | --------------- |
| single_use   | One entry       |
| multi_entry  | Unlimited       |
| time_limited | Within duration |
| per_day      | One/day         |

---

# 📌 Examples

---

### Laser Tag Ticket

```
reservation_type = slot_bound
usage_type = single_use
```

---

### 1 Hr Jump

```
reservation_type = duration_bound
usage_type = time_limited
duration_minutes = 60
```

---

### Weekend Pass

```
reservation_type = multi_day
usage_type = per_day
valid_days = 2
entry_limit_per_day = 1
```

---

# 🔗 Used By

| Table                    | Purpose         |
| ------------------------ | --------------- |
| product_resource_mapping | Resource access |
| reservations             | Creation logic  |
| gate_validation          | Scan logic      |

---

Defines:

✔ Reservation creation
✔ Duration validity
✔ Entry rules
✔ Waiver requirement

---

---

# 🎟 Product to Resource Mapping

Defines which **resource(s)** a ticket-type product grants access to.

This mapping is used to:

* Perform availability checks
* Deduct capacity
* Create reservations
* Validate entry at gates
* Evaluate combo products

---

# 🧠 Conceptual Model

| Product            | Resource       |
| ------------------ | -------------- |
| 1 Hr Jump Pass     | Jump Arena     |
| Laser Tag Game     | Laser Tag Room |
| Escape Room Ticket | Escape Room 1  |
| Birthday Party     | Party Room     |

A product:

* Must map to at least one resource if reservation is required
* May map to multiple resources (combo)

---

# 🧱 Table: `product_resource_mapping`

---

| Column      | Type                   | Required        | Description      |
| ----------- | ---------------------- | --------------- | ---------------- |
| id          | UUID (PK)              | ✅               | Mapping ID       |
| product_id  | UUID FK → products.id  | ✅               | Product          |
| resource_id | UUID FK → resources.id | ✅               | Resource         |
| is_primary  | BOOLEAN                | ✅ default false | Primary resource |
| created_at  | TIMESTAMPTZ            | ✅               | Created          |
| created_by  | UUID FK → users.id     | ❌               | Creator          |

---

## 🔐 Unique Constraint

```sql
UNIQUE(product_id, resource_id)
```

---

# 🧠 Behavior

---

## Single Resource Product

1 Hr Jump Pass:

```text
product → Jump Arena
```

Creates:

* One reservation per quantity purchased

---

## Multi Resource Product

Adventure Combo:

```text
product → Jump Arena
product → Ninja Course
```

Creates:

* Two reservations per quantity purchased
  (one per mapped resource)

---

## Availability Check

If product maps to:

Multiple hard-capacity resources:

> Sale must be blocked if ANY mapped resource has no availability

---

# 📌 Reservation Impact

For each:

```text
order_item.quantity
```

System creates:

```text
quantity × mapped resources
```

reservations.

---

Example:

Buy:

```text
Adventure Combo × 2
```

Mapped to:

* Jump Arena
* Ninja Course

Creates:

```text
4 reservations
```

---

# 🔗 Used By

| Table                      | Purpose  |
| -------------------------- | -------- |
| product_reservation_config | Behavior |
| reservations               | Capacity |
| device_resource_mapping    | Gate     |

---

Ensures:

✔ Capacity deduction
✔ Combo entitlement
✔ Entry validation

---

---

# 🎟 Reservations

Represents a **single unit of access entitlement** created when a ticket-type product is purchased.

Each reservation:

* Consumes capacity from a resource
* May be assigned to a person later
* Is validated at entry
* May be linked to a slot or duration

Reservations are created based on:

```text id="3f5v6y"
product_reservation_config
+
product_resource_mapping
```

---

# 🧠 Conceptual Model

At purchase:

Customer buys:

```text id="pqlbqz"
3 Child Jump Tickets
```

System creates:

```text id="f0w50s"
3 reservations
```

Each reservation represents:

> One capacity entitlement

---

# 🧱 Table: `reservations`

---

| Column              | Type                                                           | Required    | Description        |
| ------------------- | -------------------------------------------------------------- | ----------- | ------------------ |
| id                  | UUID (PK)                                                      | ✅           | Reservation ID     |
| order_item_id       | UUID FK → order_items.id                                       | ✅           | Origin item        |
| product_id          | UUID FK → products.id                                          | ✅           | Product            |
| resource_id         | UUID FK → resources.id                                         | ✅           | Resource           |
| resource_slot_id    | UUID FK → resource_slots.id                                    | ❌           | Slot if slot_bound |
| visitor_type_id     | UUID FK → visitor_types.id                                     | ✅           | Visitor type       |
| person_id           | UUID FK → persons.id                                           | ❌           | Assigned later     |
| reservation_type    | ENUM('slot_bound','duration_bound','access_bound','multi_day') | ✅           | Validity           |
| reservation_group_id| UUID FK → reservation_groups.id                                | ❌           | Group              |
| usage_type          | ENUM('single_use','multi_entry','time_limited','per_day')      | ✅           | Entry logic        |
| duration_minutes    | INT                                                            | ❌           | Rolling admission  |
| valid_from          | TIMESTAMPTZ                                                    | ❌           | Valid start        |
| valid_until         | TIMESTAMPTZ                                                    | ❌           | Valid expiry       |
| entry_limit_per_day | INT                                                            | ❌           | Per-day passes     |
| entries_used        | INT                                                            | ✅ default 0 | Entry count        |
| status              | ENUM('confirmed','consumed','cancelled','expired')             | ✅           | Lifecycle          |
| created_at          | TIMESTAMPTZ                                                    | ✅           | Created            |

---

---

# 🧠 Behavior

---

## Slot-Bound

Laser Tag:

```text id="slux24"
resource_slot_id = SLOT_2PM
valid_from = slot start
valid_until = slot end
```

---

## Duration-Bound

Jump Pass:

```text id="4ps3o0"
duration_minutes = 60
valid_from = purchase time
valid_until = purchase time + duration
```

---

## Access-Bound

Museum:

```text id="gsuokg"
valid_from = visit date 00:00
valid_until = visit date 23:59
```

---

## Multi-Day

Weekend Pass:

```text id="n3q9qk"
valid_until = valid_from + valid_days
entry_limit_per_day = 1
```

---

# 📌 Person Assignment

At purchase:

```text id="zzs70k"
person_id = NULL
```

Later assigned before entry.

---

# 🔗 Used By

| Table             | Purpose    |
| ----------------- | ---------- |
| entry_logs        | Scan       |
| waiver_validation | Compliance |
| reporting         | Occupancy  |

---

Ensures:

✔ Capacity tracking
✔ Gate validation
✔ Deferred assignment
✔ Multi-entry logic

---

---

# 🚪 Reservation Usage Logs

Tracks **entry and exit events** against a reservation.

Used for:

* Gate validation
* Occupancy tracking
* Duration-based expiry
* Re-entry validation
* Live headcount reporting

Each scan event creates a usage log entry.

---

# 🧱 Table: `reservation_usage_logs`

---

| Column         | Type                      | Required | Description |
| -------------- | ------------------------- | -------- | ----------- |
| id             | UUID (PK)                 | ✅        | Usage ID    |
| reservation_id | UUID FK → reservations.id | ✅        | Reservation |
| device_id      | UUID FK → devices.id      | ❌        | Gate device |
| usage_type     | ENUM('entry','exit')      | ✅        | Scan type   |
| timestamp      | TIMESTAMPTZ               | ✅        | Scan time   |
| created_at     | TIMESTAMPTZ               | ✅        | Logged      |

---

---

# 🧠 Behavior

---

## Entry Scan

On successful scan:

```text id="r6y1cg"
usage_type = entry
```

System checks:

* Reservation valid
* Waiver exists
* Entry limit not exceeded

If valid:

* Entry allowed
* `entries_used` updated

---

## Exit Scan (Optional)

On exit gate scan:

```text id="h9l40e"
usage_type = exit
```

Used for:

* Live occupancy
* Duration-based expiry analytics

---

# 📊 Live Headcount

Real-time occupancy is calculated as:

```text id="dz3h89"
entries - exits
```

derived from:

```text id="74m1kq"
reservation_usage_logs
```

---

# ⏱ Duration-Based Usage

For:

```text id="l7n1xk"
usage_type = time_limited
```

First entry scan sets:

* actual_start_time
* actual_end_time

Subsequent scans allowed only if:

```text id="h09m2p"
current_time <= actual_end_time
```

---

# 🔗 Used By

| Module             | Purpose          |
| ------------------ | ---------------- |
| Gate Access        | Entry validation |
| Reporting          | Headcount        |
| Reservation expiry | Duration logic   |

---

Supports:

✔ Multi-entry
✔ Rolling admission
✔ Occupancy tracking
✔ Exit-based analytics

---

---

---

# 👥 Reservation Groups

Represents a logical grouping of multiple reservations belonging to the same booking context.

Used for:

* Party bookings
* School visits
* Event packages
* Bulk ticket purchases

Allows:

* Batch assignment of persons
* Group rebooking
* Collective cancellation
* Group-level reporting

---

# 🧠 Conceptual Model

Customer books:

```text
Birthday Party
Includes:
- 10 Jump Tickets
- 1 Party Room
```

System creates:

```text
10 reservations (Jump)
1 reservation (Party Room)
```

All linked under:

```text
reservation_group_id
```

---

# 🧱 Table: `reservation_groups`

---

| Column        | Type                     | Required | Description  |
| ------------- | ------------------------ | -------- | ------------ |
| id            | UUID (PK)                | ✅        | Group ID     |
| order_item_id | UUID FK → order_items.id | ❌        | Origin item  |
| event_id      | UUID FK → events.id      | ❌        | Linked event |
| name          | TEXT                     | ❌        | Group label  |
| created_at    | TIMESTAMPTZ              | ✅        | Created      |
| created_by    | UUID FK → users.id       | ❌        | Creator      |

---

---

# 🧠 Behavior

---

## Party Booking

Reservations linked to:

```text
event_id
```

Allows:

* Assign children later
* Track attendance
* Move group to new slot

---

## School Visit

All:

```text
50 reservations
```

Grouped for:

* Entry
* Reporting
* Liability tracking

---

# 🔗 Used By

| Module     | Purpose          |
| ---------- | ---------------- |
| Events     | Party linkage    |
| Reporting  | Group analytics  |
| Assignment | Batch assignment |

---

Supports:

✔ Party packages
✔ Bulk booking
✔ School visits
✔ Event-level reservations

---
