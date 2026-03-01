# 🎟 Visitor Types

Visitor Types are used to classify:

* Ticket pricing
* Reservation entitlement
* Capacity consumption
* Reporting

Examples:

* Adult
* Child
* Senior
* Toddler
* Spectator

Visitor Type:

* Is selected at time of purchase
* Determines pricing
* May affect waiver requirement
* May be assigned to a person later

---

## 🧠 Conceptual Model

| Entity       | Role                      |
| ------------ | ------------------------- |
| Visitor Type | Commercial classification |
| Person       | Real-world individual     |

At purchase:

Customer may buy:

```
3 Child Tickets
```

Reservation created with:

```
visitor_type = Child
person_id = NULL
```

Later:

Customer may assign:

```
Child A
Child B
Child C
```

to those reservations.

---

# 🧱 Table: `visitor_types`

---

| Column          | Type                | Required        | Description     |
| --------------- | ------------------- | --------------- | --------------- |
| id              | UUID (PK)           | ✅               | Visitor Type ID |
| venue_id        | UUID FK → venues.id | ❌ NULL = global |                 |
| name            | TEXT                | ✅               | e.g Adult       |
| code            | TEXT                | ✅               | adult / child   |
| description     | TEXT                | ❌               | Optional        |
| is_minor        | BOOLEAN             | ✅ default false | Minor flag      |
| requires_waiver | BOOLEAN             | ✅ default true  | Waiver needed   |
| is_active       | BOOLEAN             | ✅ default true  | Active          |
| created_at      | TIMESTAMPTZ         | ✅               | Created         |
| created_by      | UUID FK → users.id  | ❌               | Creator         |

---

## 🔐 Unique Constraint

```sql
UNIQUE(venue_id, code)
```

---

## 🧠 Behavior

Visitor Type is used in:

* Product pricing
* Reservation creation
* Waiver validation
* Reporting

Example:

| Visitor Type | Minor | Waiver |
| ------------ | ----- | ------ |
| Adult        | No    | Yes    |
| Child        | Yes   | Yes    |
| Spectator    | No    | No     |

---

---

# 🧾 Taxation Model

VenuePlus supports multi-component tax regimes such as:

* GST (India)
* VAT (EU)
* Sales Tax (US)

In regimes like GST, a tax is composed of multiple components such as:

* CGST
* SGST
* IGST

Products must therefore map to a **Tax Structure** rather than directly to a tax percentage.

---

# 🧠 Conceptual Model

| Entity          | Role                    |
| --------------- | ----------------------- |
| Tax Component   | Individual tax (CGST)   |
| Tax Structure   | Composite tax (GST 18%) |
| Product Mapping | Product → GST 18%       |

---

Example:

GST 18% consists of:

| Component | Rate |
| --------- | ---- |
| CGST      | 9%   |
| SGST      | 9%   |

---

# 🧱 Table: `tax_components`

Defines individual tax types applicable under the venue’s tax regime.

---

| Column     | Type        | Required       | Description        |
| ---------- | ----------- | -------------- | ------------------ |
| id         | UUID (PK)   | ✅              | Component ID       |
| code       | TEXT        | ✅              | cgst / sgst / igst |
| name       | TEXT        | ✅              | CGST               |
| is_active  | BOOLEAN     | ✅ default true | Active             |
| created_at | TIMESTAMPTZ | ✅              | Created            |

---

Examples:

| Code | Name           |
| ---- | -------------- |
| cgst | Central GST    |
| sgst | State GST      |
| igst | Integrated GST |

---

# 🧱 Table: `tax_structures`

Represents invoice-level tax groupings.

Examples:

* GST 18%
* GST 5%
* Zero Rated
* VAT 20%

---

| Column     | Type                | Required       | Description  |
| ---------- | ------------------- | -------------- | ------------ |
| id         | UUID (PK)           | ✅              | Structure ID |
| venue_id   | UUID FK → venues.id | ❌ NULL=global  |              |
| name       | TEXT                | ✅              | GST 18%      |
| code       | TEXT                | ❌              | gst_18       |
| is_active  | BOOLEAN             | ✅ default true | Active       |
| created_at | TIMESTAMPTZ         | ✅              | Created      |
| created_by | UUID FK → users.id  | ❌              | Creator      |

---

# 🧱 Table: `tax_structure_components`

Maps Tax Structure to its components.

---

| Column           | Type                        | Required | Description |
| ---------------- | --------------------------- | -------- | ----------- |
| id               | UUID (PK)                   | ✅        | Mapping ID  |
| tax_structure_id | UUID FK → tax_structures.id | ✅        | Structure   |
| tax_component_id | UUID FK → tax_components.id | ✅        | Component   |
| tax_rate_percent | NUMERIC(5,2)                | ✅        | Rate        |
| created_at       | TIMESTAMPTZ                 | ✅        | Created     |

---

Example:

GST 18% mapping:

| Structure | Component | Rate |
| --------- | --------- | ---- |
| GST 18%   | CGST      | 9    |
| GST 18%   | SGST      | 9    |

---

---

# Resource Management

## Resources

---

## 🧠 Purpose

A **Resource** represents a physical or logical capacity pool that:

* Reservations consume
* Gate devices validate against
* Events may reserve
* Waitlists may depend on

Examples:

| Resource       | Admission Mode   | Capacity Type |
| -------------- | ---------------- | ------------- |
| Jump Arena     | rolling_duration | hard          |
| Laser Tag Room | slot_based       | hard          |
| Party Room     | slot_based       | hard          |
| Arcade Floor   | open_access      | soft          |
| Museum Hall    | open_access      | soft          |

---

## 🧩 Admission Behavior

Defines how access is granted to the resource.

| admission_mode   | Meaning             |
| ---------------- | ------------------- |
| slot_based       | Fixed session entry |
| rolling_duration | Rolling admission   |
| open_access      | Full-day access     |

---

## 🔐 Capacity Behavior

| capacity_enforcement_type | Meaning               |
| ------------------------- | --------------------- |
| hard                      | Blocks sale when full |
| soft                      | Tracks occupancy only |

---

## 🧱 Table: `resources`

| Column                    | Type                                                | Required       | Description          |
| ------------------------- | --------------------------------------------------- | -------------- | -------------------- |
| id                        | UUID (PK)                                           | ✅              | Resource ID          |
| venue_id                  | UUID FK → venues.id                                 | ✅              | Venue                |
| name                      | TEXT                                                | ✅              | Resource name        |
| description               | TEXT                                                | ❌              | Optional             |
| admission_mode            | ENUM('slot_based','rolling_duration','open_access') | ✅              | Admission model      |
| capacity_enforcement_type | ENUM('hard','soft')                                 | ✅              | Capacity enforcement |
| capacity                  | INT                                                 | ❌              | Max occupancy        |
| is_active                 | BOOLEAN                                             | ✅ default true | Active               |
| created_at                | TIMESTAMPTZ                                         | ✅              | Created              |
| created_by                | UUID FK → users.id                                  | ❌              | Creator              |

---

## 📌 Example Configurations

---

### Laser Tag Room

```
admission_mode = slot_based
capacity_enforcement_type = hard
capacity = 12
```

---

### Jump Arena

```
admission_mode = rolling_duration
capacity_enforcement_type = hard
capacity = 50
```

---

### Museum Hall

```
admission_mode = open_access
capacity_enforcement_type = soft
capacity = NULL
```

---

## 🔗 Referenced By

| Table                    | Purpose              |
| ------------------------ | -------------------- |
| resource_slots           | Slot-based capacity  |
| product_resource_mapping | Product access       |
| device_resource_mapping  | Gate validation      |
| reservations             | Capacity consumption |

---

## 🚦 Notes

* `capacity` is required for:

  * slot_based
  * rolling_duration (if hard)

* `capacity` may be NULL for:

  * open_access
  * soft capacity tracking

---

---

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
