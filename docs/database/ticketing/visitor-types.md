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
