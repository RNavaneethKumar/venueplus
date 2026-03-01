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
