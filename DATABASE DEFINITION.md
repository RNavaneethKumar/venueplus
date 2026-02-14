## 🧱 Table: `users`

| Field                     | Type          | Required        | Description                          |
| ------------------------- | ------------- | --------------- | ------------------------------------ |
| **id**                    | UUID          | ✅               | Unique internal user ID              |
| **username**              | text (unique) | ✅               | Login name (used at POS/gate/admin)  |
| **pin_hash**              | text          | ✅               | Secure hash of numeric PIN           |
| **display_name**          | text          | ✅               | Name shown in UI and receipts        |
| **email**                 | text          | ❌               | Optional, mainly for managers/HQ     |
| **phone**                 | text          | ❌               | Optional future contact/OTP use      |
| **status**                | enum          | ✅               | active / suspended / disabled        |
| **last_login_at**         | timestamptz   | ❌               | Last successful login                |
| **failed_login_attempts** | int           | ✅ default 0     | Security tracking                    |
| **locked_until**          | timestamptz   | ❌               | Temporary lock after failed attempts |
| **is_system_user**        | boolean       | ✅ default false | For automated/system actions         |
| **created_at**            | timestamptz   | ✅               | When user was created                |
| **created_by**            | FK → users.id | ❌               | Who created this user                |

---

## 🧱 Table: `roles`

| Field           | Type          | Required       | Description                              |
| --------------- | ------------- | -------------- | ---------------------------------------- |
| **id**          | UUID          | ✅              | Unique role ID                           |
| **name**        | text (unique) | ✅              | Role name (e.g., “Cashier”)              |
| **description** | text          | ❌              | Human-readable explanation               |
| **scope_type**  | enum          | ✅              | `venue` or `global`                      |
| **is_active**   | boolean       | ✅ default true | Allows role deprecation without deletion |
| **created_at**  | timestamptz   | ✅              | Creation time                            |

---

## 🧱 Table: `permissions`

| Field            | Type          | Required        | Description                                |
| ---------------- | ------------- | --------------- | ------------------------------------------ |
| **id**           | UUID          | ✅               | Unique permission ID                       |
| **key**          | text (unique) | ✅               | Machine-readable identifier, module.action |
| **description**  | text          | ❌               | Human-readable explanation                 |
| **module**       | text          | ✅               | System area this belongs to                |
| **is_sensitive** | boolean       | ✅ default false | Marks high-risk actions, for override check|
| **created_at**   | timestamptz   | ✅               | Creation time                              |

---

## 🧱 Table: `role_permissions`

| Field             | Type                | Required       | Description                |
| ----------------- | ------------------- | -------------- | -------------------------- |
| **role_id**       | FK → roles.id       | ✅              | Which role                 |
| **permission_id** | FK → permissions.id | ✅              | Which permission           |
| **granted**       | boolean             | ✅ default true | Allows future flexibility  |
| **created_at**    | timestamptz         | ✅              | When this link was created |

**Primary Key:** `(role_id, permission_id)`

---

## 🧱 Table: `user_roles`

| Field           | Type           | Required       | Description                      |
| --------------- | -------------- | -------------- | -------------------------------- |
| **id**          | UUID           | ✅              | Unique row ID                    |
| **user_id**     | FK → users.id  | ✅              | Which user                       |
| **role_id**     | FK → roles.id  | ✅              | Which role                       |
| **venue_id**    | FK → venues.id | ❌ (nullable)   | Which venue this applies to      |
| **assigned_at** | timestamptz    | ✅              | When role was assigned           |
| **assigned_by** | FK → users.id  | ❌              | Who granted this role            |
| **is_active**   | boolean        | ✅ default true | Allows revoking without deletion |

---

## 🧱 Table: `venues`

| Field                       | Purpose                    | Example (India)      |
| --------------------------- | -------------------------- | -------------------- |
| **id**                      | Venue ID                   | VENUE_01             |
| **name**                    | Business name              | JumpWorld Bangalore  |
| **legal_name**              | Legal entity name          | JumpWorld Pvt Ltd    |
| **timezone**                | Local time operations      | Asia/Kolkata         |
| **currency_code**           | Default currency           | INR                  |
| **country_code**            | Country of operation       | IN                   |
| **tax_regime**              | Type of tax system         | GST / VAT / SalesTax |
| **tax_registration_number** | Official tax ID            | GSTIN                |
| **registered_address**      | Legal address for invoices | Full postal address  |
| **status**                  | Operational status         | active               |

---

## 🧱 Table: `venue_settings`

| Field             | Type           | Required | Description                 |
| ----------------- | -------------- | -------- | --------------------------- |
| **id**            | UUID           | ✅        | Unique row ID               |
| **venue_id**      | FK → venues.id | ✅        | Which venue this applies to |
| **setting_key**   | text           | ✅        | Unique config identifier    |
| **setting_value** | jsonb          | ✅        | Value (flexible format)     |
| **updated_at**    | timestamptz    | ✅        | Last change time            |
| **updated_by**    | FK → users.id  | ❌        | Who changed it              |

**Unique constraint:** `(venue_id, setting_key)`

---
