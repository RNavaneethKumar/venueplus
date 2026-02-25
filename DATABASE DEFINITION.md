# 📘 VenuePlus

## Platform Governance – Database Design

*(Per-Customer Database Model)*

---

# 1. Users

## `users`

Represents internal staff accounts across venues.

Users authenticate using:

```
username + numeric PIN
```

Users are shared across venues and assigned roles via `user_roles`.

| Column        | Type               | Required        | Description          |
| ------------- | ------------------ | --------------- | -------------------- |
| id            | UUID (PK)          | ✅               | Unique user ID       |
| username      | TEXT (UNIQUE)      | ✅               | Login username       |
| display_name  | TEXT               | ✅               | Staff display name   |
| pin_hash      | TEXT               | ✅               | Hashed numeric PIN   |
| mobile_number | TEXT               | ❌               | Optional contact     |
| email         | TEXT               | ❌               | Optional             |
| is_active     | BOOLEAN            | ✅ default true  | Active user          |
| is_locked     | BOOLEAN            | ✅ default false | Locked after retries |
| last_login_at | TIMESTAMPTZ        | ❌               | Last login           |
| created_at    | TIMESTAMPTZ        | ✅               | Created timestamp    |
| created_by    | UUID FK → users.id | ❌               | Who created          |

---

# 2. Roles

## `roles`

System-defined job roles.
Venues cannot create custom roles.

| Column      | Type                   | Required       | Description |
| ----------- | ---------------------- | -------------- | ----------- |
| id          | UUID (PK)              | ✅              | Role ID     |
| name        | TEXT (UNIQUE)          | ✅              | Role name   |
| description | TEXT                   | ❌              | Description |
| scope_type  | ENUM('venue','global') | ✅              | Role scope  |
| is_active   | BOOLEAN                | ✅ default true | Active      |
| created_at  | TIMESTAMPTZ            | ✅              | Created     |

---

# 3. Permissions

## `permissions`

Atomic actions in system.

| Column       | Type          | Required        | Description         |
| ------------ | ------------- | --------------- | ------------------- |
| id           | UUID (PK)     | ✅               | Permission ID       |
| key          | TEXT (UNIQUE) | ✅               | e.g order.refund    |
| module       | TEXT          | ✅               | pos / ticketing etc |
| description  | TEXT          | ❌               | Description         |
| is_sensitive | BOOLEAN       | ✅ default false | Needs override      |
| created_at   | TIMESTAMPTZ   | ✅               | Created             |

---

# 4. Role Permissions

## `role_permissions`

Mapping between roles and permissions.

| Column        | Type                     | Required       | Description |
| ------------- | ------------------------ | -------------- | ----------- |
| role_id       | UUID FK → roles.id       | ✅              | Role        |
| permission_id | UUID FK → permissions.id | ✅              | Permission  |
| granted       | BOOLEAN                  | ✅ default true | Active      |
| created_at    | TIMESTAMPTZ              | ✅              | Created     |

PK:

```
(role_id, permission_id)
```

---

# 5. User Roles

## `user_roles`

Assigns roles to users per venue.

| Column      | Type                | Required        | Description |
| ----------- | ------------------- | --------------- | ----------- |
| id          | UUID (PK)           | ✅               | Row ID      |
| user_id     | UUID FK → users.id  | ✅               | User        |
| role_id     | UUID FK → roles.id  | ✅               | Role        |
| venue_id    | UUID FK → venues.id | ❌ NULL = global |             |
| assigned_at | TIMESTAMPTZ         | ✅               | Assigned    |
| assigned_by | UUID FK → users.id  | ❌               | Assigned by |
| is_active   | BOOLEAN             | ✅ default true  | Active      |

---

# 6. Venues

## `venues`

Represents a physical operating location.

| Column                  | Type                               | Required | Description      |
| ----------------------- | ---------------------------------- | -------- | ---------------- |
| id                      | UUID (PK)                          | ✅        | Venue ID         |
| name                    | TEXT                               | ✅        | Venue name       |
| legal_name              | TEXT                               | ❌        | Legal entity     |
| timezone                | TEXT                               | ✅        | e.g Asia/Kolkata |
| currency_code           | TEXT                               | ✅        | INR              |
| country_code            | TEXT                               | ✅        | IN               |
| tax_regime              | TEXT                               | ❌        | GST/VAT          |
| tax_registration_number | TEXT                               | ❌        | GSTIN            |
| registered_address      | TEXT                               | ❌        | Address          |
| status                  | ENUM('active','inactive','closed') | ✅        | Status           |
| created_at              | TIMESTAMPTZ                        | ✅        | Created          |
| created_by              | UUID FK → users.id                 | ❌        | Creator          |

---

# 7. Venue Settings

## `venue_settings`

Configurable business rules per venue.

| Column        | Type                | Required | Description |
| ------------- | ------------------- | -------- | ----------- |
| id            | UUID (PK)           | ✅        | Row ID      |
| venue_id      | UUID FK → venues.id | ✅        | Venue       |
| setting_key   | TEXT                | ✅        | Config key  |
| setting_value | JSONB               | ✅        | Value       |
| updated_at    | TIMESTAMPTZ         | ✅        | Updated     |
| updated_by    | UUID FK → users.id  | ❌        | Who updated |

UNIQUE:

```
(venue_id, setting_key)
```

---

# 8. Venue Feature Flags

## `venue_feature_flags`

Enable/disable modules per venue.

| Column      | Type                | Required | Description      |
| ----------- | ------------------- | -------- | ---------------- |
| id          | UUID (PK)           | ✅        | Row ID           |
| venue_id    | UUID FK → venues.id | ✅        | Venue            |
| feature_key | TEXT                | ✅        | module.ticketing |
| is_enabled  | BOOLEAN             | ✅        | Enabled          |
| enabled_at  | TIMESTAMPTZ         | ❌        | Enabled          |
| disabled_at | TIMESTAMPTZ         | ❌        | Disabled         |
| updated_by  | UUID FK → users.id  | ❌        | Who updated      |

UNIQUE:

```
(venue_id, feature_key)
```

---

# 9. Devices

## `devices`

Hardware endpoints.

| Column            | Type                                             | Required | Description   |
| ----------------- | ------------------------------------------------ | -------- | ------------- |
| id                | UUID (PK)                                        | ✅        | Device ID     |
| venue_id          | UUID FK → venues.id                              | ✅        | Venue         |
| name              | TEXT                                             | ✅        | Friendly name |
| device_type       | ENUM('pos','gate','kiosk','kds','arcade_reader') | ✅        | Type          |
| identifier        | TEXT                                             | ❌        | MAC/Serial    |
| auth_token_hash   | TEXT                                             | ❌        | Device auth   |
| status            | ENUM('active','inactive','maintenance')          | ✅        | Status        |
| last_heartbeat_at | TIMESTAMPTZ                                      | ❌        | Last ping     |
| last_ip_address   | TEXT                                             | ❌        | IP            |
| created_at        | TIMESTAMPTZ                                      | ✅        | Created       |
| created_by        | UUID FK → users.id                               | ❌        | Creator       |

---

# 10. Device Resource Mapping

## `device_resource_mapping`

Controls which devices can access which resources.

| Column         | Type                   | Required        | Description |
| -------------- | ---------------------- | --------------- | ----------- |
| id             | UUID (PK)              | ✅               | Row ID      |
| device_id      | UUID FK → devices.id   | ✅               | Device      |
| resource_id    | UUID FK → resources.id | ✅               | Resource    |
| is_entry_point | BOOLEAN                | ✅ default true  | Entry       |
| is_exit_point  | BOOLEAN                | ✅ default false | Exit        |
| created_at     | TIMESTAMPTZ            | ✅               | Created     |
| created_by     | UUID FK → users.id     | ❌               | Creator     |

UNIQUE:

```
(device_id, resource_id)
```

---

# 11. Notification Templates

## `notification_templates`

Email/SMS/WhatsApp templates.

| Column       | Type                           | Required       | Description          |
| ------------ | ------------------------------ | -------------- | -------------------- |
| id           | UUID (PK)                      | ✅              | Template ID          |
| venue_id     | UUID FK → venues.id            | ❌ NULL=default |                      |
| channel      | ENUM('email','sms','whatsapp') | ✅              | Channel              |
| template_key | TEXT                           | ✅              | booking.confirmation |
| subject      | TEXT                           | ❌              | Email subject        |
| body         | TEXT                           | ✅              | Template             |
| is_active    | BOOLEAN                        | ✅              | Active               |
| created_at   | TIMESTAMPTZ                    | ✅              | Created              |
| updated_at   | TIMESTAMPTZ                    | ✅              | Updated              |
| updated_by   | UUID FK → users.id             | ❌              | Editor               |

---

# 12. API Keys

## `api_keys`

External system access.

| Column             | Type                               | Required      | Description |
| ------------------ | ---------------------------------- | ------------- | ----------- |
| id                 | UUID (PK)                          | ✅             | Key ID      |
| venue_id           | UUID FK → venues.id                | ❌ NULL=global |             |
| name               | TEXT                               | ✅             | Friendly    |
| key_hash           | TEXT                               | ✅             | Stored hash |
| scopes             | JSONB                              | ✅             | Permissions |
| rate_limit_per_min | INT                                | ❌             | Limit       |
| status             | ENUM('active','revoked','expired') | ✅             | Status      |
| expires_at         | TIMESTAMPTZ                        | ❌             | Expiry      |
| last_used_at       | TIMESTAMPTZ                        | ❌             | Last used   |
| created_at         | TIMESTAMPTZ                        | ✅             | Created     |
| created_by         | UUID FK → users.id                 | ❌             | Creator     |

---

# 13. Audit Logs

## `audit_logs`

Immutable record of sensitive actions.

| Column               | Type                 | Required | Description |
| -------------------- | -------------------- | -------- | ----------- |
| id                   | UUID (PK)            | ✅        | Entry ID    |
| timestamp            | TIMESTAMPTZ          | ✅        | Action time |
| user_id              | UUID FK → users.id   | ❌        | Actor       |
| impersonated_user_id | UUID FK → users.id   | ❌        | Override    |
| venue_id             | UUID FK → venues.id  | ❌        | Venue       |
| device_id            | UUID FK → devices.id | ❌        | Device      |
| action_type          | TEXT                 | ✅        | Action      |
| entity_type          | TEXT                 | ❌        | order       |
| entity_id            | UUID                 | ❌        | Target      |
| metadata             | JSONB                | ❌        | Context     |
| ip_address           | TEXT                 | ❌        | Source      |

---

# 14. Waitlist Entries

## `waitlist_entries`

Queue for full slots.

| Column             | Type                                          | Required | Description |
| ------------------ | --------------------------------------------- | -------- | ----------- |
| id                 | UUID (PK)                                     | ✅        | Entry ID    |
| venue_id           | UUID FK → venues.id                           | ✅        | Venue       |
| resource_slot_id   | UUID FK → resource_slots.id                   | ✅        | Slot        |
| account_id         | UUID                                          | ❌        | Customer    |
| visitor_type       | TEXT                                          | ❌        | adult/child |
| quantity_requested | INT                                           | ✅        | Qty         |
| status             | ENUM('waiting','notified','booked','expired') | ✅        | Status      |
| notified_at        | TIMESTAMPTZ                                   | ❌        | Notified    |
| expires_at         | TIMESTAMPTZ                                   | ❌        | Expiry      |
| created_at         | TIMESTAMPTZ                                   | ✅        | Created     |
| created_by         | UUID FK → users.id                            | ❌        | Staff       |

---

# 15. Alert Rules

## `alert_rules`

Monitoring thresholds.

| Column              | Type                        | Required | Description    |
| ------------------- | --------------------------- | -------- | -------------- |
| id                  | UUID (PK)                   | ✅        | Rule ID        |
| venue_id            | UUID FK → venues.id         | ✅        | Venue          |
| alert_type          | TEXT                        | ✅        | device.offline |
| threshold_value     | NUMERIC                     | ❌        | Limit          |
| comparison_operator | ENUM('>','<','=','>=','<=') | ❌        | Operator       |
| time_window_minutes | INT                         | ❌        | Window         |
| is_active           | BOOLEAN                     | ✅        | Active         |
| created_at          | TIMESTAMPTZ                 | ✅        | Created        |
| updated_at          | TIMESTAMPTZ                 | ❌        | Updated        |
| updated_by          | UUID FK → users.id          | ❌        | Editor         |

---

# 16. Alerts Log

## `alerts_log`

Triggered alerts.

| Column          | Type                                     | Required | Description |
| --------------- | ---------------------------------------- | -------- | ----------- |
| id              | UUID (PK)                                | ✅        | Entry ID    |
| alert_rule_id   | UUID FK → alert_rules.id                 | ✅        | Rule        |
| venue_id        | UUID FK → venues.id                      | ✅        | Venue       |
| triggered_at    | TIMESTAMPTZ                              | ✅        | Time        |
| resolved_at     | TIMESTAMPTZ                              | ❌        | Resolved    |
| status          | ENUM('active','acknowledged','resolved') | ✅        | Status      |
| entity_type     | TEXT                                     | ❌        | device      |
| entity_id       | UUID                                     | ❌        | Target      |
| details         | JSONB                                    | ❌        | Context     |
| acknowledged_by | UUID FK → users.id                       | ❌        | Staff       |

---

Ready?
