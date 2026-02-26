# 🎟 Ticketing & Resource Management

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
