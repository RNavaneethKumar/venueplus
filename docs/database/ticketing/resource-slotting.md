# 🎟 Resource Slotting System

Slotting is applicable for resources where access is granted for a **fixed session window**.

Examples:

* Laser Tag
* Escape Room
* Party Room
* Fitness Class
* Workshop

For such resources, availability must be managed across:

* Date
* Time
* Capacity

This is achieved using:

1. `resource_slot_templates` (Recurring patterns)
2. `resource_slots` (Dated inventory instances)

---

# 🧠 Conceptual Model

| Entity        | Role                        |
| ------------- | --------------------------- |
| Resource      | Physical capacity pool      |
| Slot Template | Recurring availability rule |
| Slot          | Sellable inventory          |
| Reservation   | Capacity consumption        |

---

# 🧱 Slot Templates

## Table: `resource_slot_templates`

Defines recurring availability patterns used to generate actual slots.

Templates are:

* Configurable per resource
* Versioned
* Used for forward slot generation

Any modification to a template:

> Must create a new version

This ensures:

* Previously generated slots remain unchanged
* Reservations tied to those slots remain valid
* Gate validation and reporting remain consistent

---

| Column                | Type                   | Required       | Description           |
| --------------------- | ---------------------- | -------------- | --------------------- |
| id                    | UUID (PK)              | ✅              | Template ID           |
| resource_id           | UUID FK → resources.id | ✅              | Resource              |
| version               | INT                    | ✅              | Template version      |
| name                  | TEXT                   | ❌              | Label                 |
| start_time            | TIME                   | ✅              | Slot generation start |
| end_time              | TIME                   | ✅              | Slot generation end   |
| slot_duration_minutes | INT                    | ✅              | Slot size             |
| recurrence_type       | ENUM('daily','weekly') | ✅              | Pattern               |
| days_of_week          | INT[]                  | ❌              | Required if weekly    |
| effective_from        | DATE                   | ✅              | Valid from            |
| effective_until       | DATE                   | ❌              | Valid until           |
| is_active             | BOOLEAN                | ✅ default true | Active                |
| created_at            | TIMESTAMPTZ            | ✅              | Created               |
| created_by            | UUID FK → users.id     | ❌              | Creator               |

---

## Unique Constraint

```sql
UNIQUE(resource_id, version)
```

---

# 🧱 Resource Slots

## Table: `resource_slots`

Represents a dated, time-bound unit of capacity for a resource.

Each slot:

* Is tied to a resource
* Has a start and end time
* Has a capacity
* Can accept reservations
* May be generated from template or manually created

---

| Column                | Type                                 | Required       | Description      |
| --------------------- | ------------------------------------ | -------------- | ---------------- |
| id                    | UUID (PK)                            | ✅              | Slot ID          |
| resource_id           | UUID FK → resources.id               | ✅              | Resource         |
| slot_template_id      | UUID FK → resource_slot_templates.id | ❌              | Source template  |
| slot_template_version | INT                                  | ❌              | Template version |
| slot_date             | DATE                                 | ✅              | Slot date        |
| start_time            | TIME                                 | ✅              | Slot start       |
| end_time              | TIME                                 | ✅              | Slot end         |
| capacity              | INT                                  | ❌              | Override         |
| is_active             | BOOLEAN                              | ✅ default true | Active           |
| created_at            | TIMESTAMPTZ                          | ✅              | Created          |
| created_by            | UUID FK → users.id                   | ❌              | Creator          |

---

## Capacity Behavior

If:

```text
capacity IS NULL
```

System uses:

```text
resources.capacity
```

---

# 🧮 Capacity Consumption

Reservations consume capacity from:

```text
resource_slots
```

Availability is calculated as:

```
available_capacity =
slot_capacity
- confirmed_reservations
```

Confirmed reservations are derived from:

```sql
reservations
WHERE resource_slot_id = X
AND status = 'confirmed'
```

Slot availability is **not stored** and must always be derived.

---

# 🔄 Slot Generation

Slots may be:

* Generated automatically from template
* Created manually by admin
* Modified before reservations exist

Once reservations exist:

> Slot must be treated as committed inventory

Mutability of slot is determined dynamically by:

```sql
reservation_count = 0
```

If reservation_count > 0:

* Slot timing should not be altered
* Slot duration should not be altered
* Slot capacity should not be reduced below reservation count

---

# 📅 Template Versioning

Template changes:

* Do not affect previously generated slots
* Affect only future slot generation

Future slots may be:

| Reservation Count | Action             |
| ----------------- | ------------------ |
| 0                 | Can be regenerated |

> 0 | Must remain unchanged |

---

# 🔗 Used By

| Module      | Dependency            |
| ----------- | --------------------- |
| Ticketing   | Session booking       |
| Events      | Party room allocation |
| Waitlist    | Slot-level queue      |
| Gate Access | Entry validation      |
| Reporting   | Utilization           |

---

# 🚦 Applicability

Slotting applies only for:

```text
resources.admission_mode = slot_based
```

---

This now documents the slotting system from:

* Capacity
* Booking
* Inventory
* Reservation
* Reporting
* Template lifecycle

---
