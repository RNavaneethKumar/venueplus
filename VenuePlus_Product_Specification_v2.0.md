# VenuePlus — Complete Product Specification

**Version:** 2.0  
**Classification:** Internal Technical Specification  
**Scope:** All modules — Ticketing, Membership, Wallet, Donations, Adoptions, Gift Cards, Redemption, F&B, Retail, CRM, Waivers, Reporting, Platform Governance

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture & Design Principles](#2-architecture--design-principles)
3. [Platform Governance](#3-platform-governance)
4. [Customer Identity](#4-customer-identity)
5. [Ticketing & Resource Management](#5-ticketing--resource-management)
6. [Order System](#6-order-system)
7. [Pricing Engine](#7-pricing-engine)
8. [Waivers](#8-waivers)
9. [Membership](#9-membership)
10. [Wallet System](#10-wallet-system)
11. [Gift Cards](#11-gift-cards)
12. [Redemption Cards](#12-redemption-cards)
13. [Donations](#13-donations)
14. [Adoptions](#14-adoptions)
15. [Food & Beverage](#15-food--beverage)
16. [Retail](#16-retail)
17. [CRM & Marketing](#17-crm--marketing)
18. [Reporting & Business Intelligence](#18-reporting--business-intelligence)
19. [Access Control & Security](#19-access-control--security)
20. [Venue Settings Registry](#20-venue-settings-registry)

---

# 1. Product Overview

## What is VenuePlus?

VenuePlus is an all-in-one SaaS platform for managing entertainment venues — indoor and outdoor. It replaces fragmented point solutions (ticketing, POS, CRM, waivers) with a unified system built around a single source of truth for every customer, transaction, and operational event.

## Target Venues

| Venue Type | Examples |
|------------|---------|
| Indoor Entertainment | Trampoline parks, laser tag arenas, escape rooms, soft play centres, arcades |
| Outdoor Recreation | Water parks, theme parks, zoos, safari parks, botanical gardens |
| Multi-Attraction | Family entertainment centres, sports complexes, museum campuses |
| Event Spaces | Birthday party venues, workshop spaces, performance halls |

## Core Modules

| Module | Purpose |
|--------|---------|
| Ticketing | Capacity-managed access to resources with flexible admission models |
| Membership | Recurring subscriptions with entitlement-based access |
| Wallet | Multi-currency venue wallet with restricted spend rules |
| Gift Cards | Issuance, balance management, and redemption |
| Redemption Cards | Visit-punch and credit-based cards for guest loyalty |
| Donations | One-time and recurring charitable contributions |
| Adoptions | Sponsor-an-animal or sponsor-an-exhibit programmes |
| F&B | Food and beverage POS with kitchen routing |
| Retail | Physical merchandise with inventory management |
| CRM | Customer 360 view, segmentation, and marketing automation |
| Waivers | Native digital waiver with legal compliance and OTP signing |
| Reporting | Real-time dashboards and nightly roll-up analytics |

## Channel Support

All transactional modules support two booking channels that share a single capacity pool:

| Channel | Description |
|---------|-------------|
| Online | Web browser or mobile app, self-service by customer |
| OTC (Over The Counter) | POS terminal operated by staff at the venue |
| Kiosk | Self-service terminal at the venue (subset of online flow) |

---

# 2. Architecture & Design Principles

## Deployment Model

VenuePlus is deployed as a **per-customer database** SaaS. Each venue (or venue group) operates on its own isolated database instance. There is no shared multi-tenant data store. This provides:

- Data isolation by default
- Simpler compliance posture (GDPR, data residency)
- Independent scaling per customer
- No risk of cross-venue data leakage

## Core Design Principles

**1. Immutable financial records**  
Orders are never edited after payment. Corrections are made through separate refund orders. All financial state is append-only.

**2. Snapshot-based pricing and tax**  
At the moment of sale, the applicable price, discount, and tax structure are snapshotted into the order. Subsequent changes to pricing rules or tax structures do not affect historical orders.

**3. Separation of commercial and operational concerns**  
A `product` represents what is sold. A `resource` represents what is physically consumed. They are linked, not merged. This allows multiple products to grant access to the same resource.

**4. Deferred person assignment**  
Tickets can be purchased without knowing the names of visitors. Person-to-reservation assignment happens after purchase, before entry. This reflects how families actually behave.

**5. Rule-driven configuration over code**  
Venue-specific behaviour (pricing, waiver policy, entry rules, notification channels) is driven by `venue_settings`. Developers never hardcode venue-specific logic.

**6. Shared capacity pool**  
Online and OTC channels draw from the same real-time capacity pool. No ring-fencing of inventory by channel. Capacity holds prevent overselling during concurrent checkout.

## Key Entity Relationships

```
venues
  ├── resources (physical capacity pools)
  │     ├── resource_slot_templates
  │     └── resource_slots (sellable inventory)
  ├── products (sellable items)
  │     ├── product_prices
  │     ├── product_reservation_config
  │     └── product_resource_mapping → resources
  ├── accounts (customers)
  │     └── persons (individual visitors)
  └── orders
        ├── order_items → products
        │     └── reservations → resource_slots
        └── order_payments
```

---

# 3. Platform Governance

Platform governance defines the infrastructure shared across all modules: users, roles, venues, devices, and system configuration.

## 3.1 Users

Staff accounts. Users authenticate with username + numeric PIN. A user may be assigned roles at multiple venues.

### Table: `users`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | User ID |
| username | TEXT UNIQUE | ✅ | Login username |
| display_name | TEXT | ✅ | Staff display name |
| pin_hash | TEXT | ✅ | Hashed numeric PIN |
| mobile_number | TEXT | ❌ | Contact |
| email | TEXT | ❌ | Contact |
| is_active | BOOLEAN | ✅ default true | Active |
| is_locked | BOOLEAN | ✅ default false | Locked after failed attempts |
| last_login_at | TIMESTAMPTZ | ❌ | Last login |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

## 3.2 Roles

System-defined job roles. Venues cannot create custom roles.

### Table: `roles`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Role ID |
| name | TEXT UNIQUE | ✅ | Role name |
| description | TEXT | ❌ | Description |
| scope_type | ENUM('venue','global') | ✅ | Scope |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |

**Standard roles:**

| Role | Scope | Description |
|------|-------|-------------|
| `super_admin` | global | Full system access |
| `venue_admin` | venue | Full venue access |
| `manager` | venue | Operational management |
| `cashier` | venue | POS transactions only |
| `gate_operator` | venue | Entry scanning only |
| `reporting_viewer` | venue | Reports, no transactions |

## 3.3 Permissions

Atomic, codified actions in the system.

### Table: `permissions`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Permission ID |
| key | TEXT UNIQUE | ✅ | e.g. `order.refund` |
| module | TEXT | ✅ | `pos`, `ticketing`, `gate` |
| description | TEXT | ❌ | Human description |
| is_sensitive | BOOLEAN | ✅ default false | Requires supervisor override |
| created_at | TIMESTAMPTZ | ✅ | Created |

**Examples:**

| Key | Module | Sensitive |
|-----|--------|-----------|
| `order.create` | pos | No |
| `order.refund` | pos | Yes |
| `order.price_override` | pos | Yes |
| `gate.manual_override` | gate | Yes |
| `waiver.edit` | waiver | Yes |
| `report.financial` | reporting | No |
| `product.manage` | admin | No |

### Table: `role_permissions`

| Column | Type | Required |
|--------|------|----------|
| role_id | UUID FK → roles.id | ✅ |
| permission_id | UUID FK → permissions.id | ✅ |
| granted | BOOLEAN default true | ✅ |
| created_at | TIMESTAMPTZ | ✅ |

PK: `(role_id, permission_id)`

### Table: `user_roles`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| user_id | UUID FK → users.id | ✅ | User |
| role_id | UUID FK → roles.id | ✅ | Role |
| venue_id | UUID FK → venues.id | ❌ NULL = global | Venue scope |
| assigned_at | TIMESTAMPTZ | ✅ | Assigned |
| assigned_by | UUID FK → users.id | ❌ | Assigned by |
| is_active | BOOLEAN | ✅ default true | Active |

## 3.4 Venues

A physical operating location.

### Table: `venues`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Venue ID |
| name | TEXT | ✅ | Venue name |
| legal_name | TEXT | ❌ | Legal entity |
| timezone | TEXT | ✅ | e.g. `Asia/Kolkata` |
| currency_code | TEXT | ✅ | e.g. `INR` |
| country_code | TEXT | ✅ | e.g. `IN` |
| tax_regime | TEXT | ❌ | `GST`, `VAT`, `Sales Tax` |
| tax_registration_number | TEXT | ❌ | GSTIN / VAT number |
| registered_address | TEXT | ❌ | Legal address |
| status | ENUM('active','inactive','closed') | ✅ | Status |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

## 3.5 Venue Settings

Key-value configuration store for per-venue business rules. Full registry in Section 20.

### Table: `venue_settings`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| setting_key | TEXT | ✅ | Dot-notation key |
| setting_value | JSONB | ✅ | Value |
| updated_at | TIMESTAMPTZ | ✅ | Last updated |
| updated_by | UUID FK → users.id | ❌ | Updated by |

UNIQUE: `(venue_id, setting_key)`

## 3.6 Venue Feature Flags

Enable or disable entire modules per venue.

### Table: `venue_feature_flags`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| feature_key | TEXT | ✅ | e.g. `module.ticketing` |
| is_enabled | BOOLEAN | ✅ | Enabled |
| enabled_at | TIMESTAMPTZ | ❌ | When enabled |
| disabled_at | TIMESTAMPTZ | ❌ | When disabled |
| updated_by | UUID FK → users.id | ❌ | Updated by |

UNIQUE: `(venue_id, feature_key)`

**Standard feature keys:**

| Key | Module |
|-----|--------|
| `module.ticketing` | Ticketing |
| `module.membership` | Membership |
| `module.wallet` | Wallet |
| `module.gift_card` | Gift Cards |
| `module.redemption` | Redemption Cards |
| `module.donations` | Donations |
| `module.adoptions` | Adoptions |
| `module.fnb` | Food & Beverage |
| `module.retail` | Retail |
| `module.crm` | CRM |
| `module.waivers` | Waivers |

## 3.7 Devices

Hardware endpoints registered to a venue.

### Table: `devices`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Device ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| name | TEXT | ✅ | Friendly name |
| device_type | ENUM('pos','gate','kiosk','kds','arcade_reader') | ✅ | Type |
| identifier | TEXT | ❌ | MAC / serial number |
| auth_token_hash | TEXT | ❌ | Device authentication |
| status | ENUM('active','inactive','maintenance') | ✅ | Status |
| last_heartbeat_at | TIMESTAMPTZ | ❌ | Last ping |
| last_ip_address | TEXT | ❌ | Last known IP |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

### Table: `device_resource_mapping`

Controls which gate devices validate which resources.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| device_id | UUID FK → devices.id | ✅ | Device |
| resource_id | UUID FK → resources.id | ✅ | Resource |
| is_entry_point | BOOLEAN | ✅ default true | Entry gate |
| is_exit_point | BOOLEAN | ✅ default false | Exit gate |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

UNIQUE: `(device_id, resource_id)`

## 3.8 Audit Logs

Immutable record of all sensitive system actions.

### Table: `audit_logs`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Entry ID |
| timestamp | TIMESTAMPTZ | ✅ | Action time |
| user_id | UUID FK → users.id | ❌ | Actor |
| impersonated_user_id | UUID FK → users.id | ❌ | Supervisor override |
| venue_id | UUID FK → venues.id | ❌ | Venue |
| device_id | UUID FK → devices.id | ❌ | Device |
| action_type | TEXT | ✅ | e.g. `order.refund` |
| entity_type | TEXT | ❌ | e.g. `order` |
| entity_id | UUID | ❌ | Target record |
| metadata | JSONB | ❌ | Context payload |
| ip_address | TEXT | ❌ | Source IP |

## 3.9 Notification Templates

### Table: `notification_templates`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Template ID |
| venue_id | UUID FK → venues.id | ❌ NULL = default | Venue override |
| channel | ENUM('email','sms','whatsapp') | ✅ | Channel |
| template_key | TEXT | ✅ | e.g. `booking.confirmation` |
| subject | TEXT | ❌ | Email subject |
| body | TEXT | ✅ | Template body with variables |
| is_active | BOOLEAN | ✅ | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| updated_at | TIMESTAMPTZ | ✅ | Updated |
| updated_by | UUID FK → users.id | ❌ | Editor |

## 3.10 API Keys

### Table: `api_keys`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Key ID |
| venue_id | UUID FK → venues.id | ❌ NULL = global | Scope |
| name | TEXT | ✅ | Friendly name |
| key_hash | TEXT | ✅ | Stored hash only |
| scopes | JSONB | ✅ | Permission scopes |
| rate_limit_per_min | INT | ❌ | Rate limit |
| status | ENUM('active','revoked','expired') | ✅ | Status |
| expires_at | TIMESTAMPTZ | ❌ | Expiry |
| last_used_at | TIMESTAMPTZ | ❌ | Last used |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

## 3.11 Alert Rules & Log

### Table: `alert_rules`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Rule ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| alert_type | TEXT | ✅ | e.g. `device.offline`, `capacity.threshold` |
| threshold_value | NUMERIC | ❌ | Numeric limit |
| comparison_operator | ENUM('>','<','=','>=','<=') | ❌ | Operator |
| time_window_minutes | INT | ❌ | Evaluation window |
| is_active | BOOLEAN | ✅ | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| updated_at | TIMESTAMPTZ | ❌ | Updated |
| updated_by | UUID FK → users.id | ❌ | Editor |

### Table: `alerts_log`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Entry ID |
| alert_rule_id | UUID FK → alert_rules.id | ✅ | Rule |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| triggered_at | TIMESTAMPTZ | ✅ | Time |
| resolved_at | TIMESTAMPTZ | ❌ | Resolved |
| status | ENUM('active','acknowledged','resolved') | ✅ | Status |
| entity_type | TEXT | ❌ | e.g. `device` |
| entity_id | UUID | ❌ | Target |
| details | JSONB | ❌ | Context |
| acknowledged_by | UUID FK → users.id | ❌ | Staff |

---

# 4. Customer Identity

The customer identity model separates two distinct concepts:

| Concept | What it is |
|---------|-----------|
| **Account** | The entity that logs in, pays, and owns bookings |
| **Person** | A real-world individual who physically visits the venue |

An account may represent a single adult, or a parent managing a family. One account, potentially many persons — each needing a waiver, a reservation, and an entry scan.

## 4.1 Accounts

### Table: `accounts`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Account ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| email | TEXT | ❌ | Login email |
| mobile_number | TEXT | ❌ | Login mobile (E.164) |
| display_name | TEXT | ✅ | Full name or handle |
| password_hash | TEXT | ❌ | NULL for OTP-only |
| auth_provider | ENUM('email','mobile','google','apple') | ✅ | Auth method |
| is_verified | BOOLEAN | ✅ default false | Verified |
| is_active | BOOLEAN | ✅ default true | Active |
| last_login_at | TIMESTAMPTZ | ❌ | Last login |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Staff-created (OTC) |

**Constraints:**
```sql
CHECK (email IS NOT NULL OR mobile_number IS NOT NULL)
UNIQUE(venue_id, email)
UNIQUE(venue_id, mobile_number)
```

## 4.2 Persons

Individual visitor profiles. May or may not have their own account.

### Table: `persons`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Person ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| first_name | TEXT | ✅ | First name |
| last_name | TEXT | ❌ | Last name |
| date_of_birth | DATE | ❌ | Used for minor verification |
| is_minor | BOOLEAN | ✅ default false | Minor flag |
| gender | ENUM('male','female','other','prefer_not_to_say') | ❌ | Optional |
| notes | TEXT | ❌ | Staff-only notes (never customer-facing) |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

## 4.3 Account–Person Relationship

### Table: `account_persons`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Mapping ID |
| account_id | UUID FK → accounts.id | ✅ | Account |
| person_id | UUID FK → persons.id | ✅ | Person |
| relationship | ENUM('self','child','spouse','guardian','other') | ✅ | Relationship |
| is_primary | BOOLEAN | ✅ default false | Account holder's own profile |
| can_manage | BOOLEAN | ✅ default true | Can assign reservations / sign waivers |
| created_at | TIMESTAMPTZ | ✅ | Created |

UNIQUE: `(account_id, person_id)`

**Behaviour:** When an account is created, a `person` record is auto-created for the account holder with `relationship = 'self'` and `is_primary = true`.

## 4.4 OTP Log

### Table: `account_otp_log`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Log ID |
| account_id | UUID FK → accounts.id | ❌ | NULL during registration |
| channel | ENUM('sms','email','whatsapp') | ✅ | Delivery channel |
| recipient | TEXT | ✅ | Phone or email |
| purpose | ENUM('login','registration','waiver','password_reset') | ✅ | Purpose |
| otp_hash | TEXT | ✅ | Hashed — never plain text |
| expires_at | TIMESTAMPTZ | ✅ | Expiry |
| verified_at | TIMESTAMPTZ | ❌ | When used |
| attempt_count | INT | ✅ default 0 | Failed attempts |
| is_used | BOOLEAN | ✅ default false | Consumed |
| created_at | TIMESTAMPTZ | ✅ | Issued |

---

# 5. Ticketing & Resource Management

Ticketing is the core module of VenuePlus. It manages capacity-controlled access to physical resources through a flexible product and reservation system.

## 5.1 Masters

### Visitor Types

Classify visitors for pricing, capacity, and waiver purposes.

#### Table: `visitor_types`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Visitor Type ID |
| venue_id | UUID FK → venues.id | ❌ NULL = global | Scope |
| name | TEXT | ✅ | e.g. `Adult` |
| code | TEXT | ✅ | e.g. `adult`, `child` |
| description | TEXT | ❌ | Optional |
| is_minor | BOOLEAN | ✅ default false | Minor flag |
| requires_waiver | BOOLEAN | ✅ default true | Waiver needed |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

UNIQUE: `(venue_id, code)`

**Standard visitor types:**

| Name | Code | Minor | Waiver |
|------|------|-------|--------|
| Adult | adult | No | Yes |
| Child | child | Yes | Yes |
| Senior | senior | No | Yes |
| Toddler | toddler | Yes | Yes |
| Spectator | spectator | No | No |

### Taxation

VenuePlus supports multi-component tax regimes (GST, VAT, Sales Tax).

#### Table: `tax_components`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Component ID |
| code | TEXT | ✅ | `cgst`, `sgst`, `igst`, `vat` |
| name | TEXT | ✅ | Display name |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |

#### Table: `tax_structures`

Groups tax components into a named structure (e.g. GST 18%).

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Structure ID |
| venue_id | UUID FK → venues.id | ❌ NULL = global | Scope |
| name | TEXT | ✅ | e.g. `GST 18%` |
| code | TEXT | ❌ | e.g. `gst_18` |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

#### Table: `tax_structure_components`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Mapping ID |
| tax_structure_id | UUID FK → tax_structures.id | ✅ | Structure |
| tax_component_id | UUID FK → tax_components.id | ✅ | Component |
| tax_rate_percent | NUMERIC(5,2) | ✅ | Rate |
| created_at | TIMESTAMPTZ | ✅ | Created |

**Example — GST 18%:**

| Structure | Component | Rate |
|-----------|-----------|------|
| GST 18% | CGST | 9% |
| GST 18% | SGST | 9% |

## 5.2 Resources

A resource represents a physical or logical capacity pool that reservations consume.

### Admission Modes

| Mode | Behaviour |
|------|-----------|
| `slot_based` | Fixed session with defined start/end time (e.g. Laser Tag 10:00–10:30) |
| `rolling_duration` | Rolling admission with duration (e.g. 1-hour Jump Pass) |
| `open_access` | Full-day or open entry (e.g. Museum, Water Park) |

### Capacity Enforcement

| Type | Behaviour |
|------|-----------|
| `hard` | Blocks sale when full |
| `soft` | Tracks occupancy for reporting only, never blocks |

### Table: `resources`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Resource ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| name | TEXT | ✅ | Resource name |
| description | TEXT | ❌ | Optional |
| admission_mode | ENUM('slot_based','rolling_duration','open_access') | ✅ | Admission model |
| capacity_enforcement_type | ENUM('hard','soft') | ✅ | Enforcement |
| capacity | INT | ❌ | Max occupancy |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

**Configuration examples:**

| Resource | Mode | Enforcement | Capacity |
|----------|------|-------------|----------|
| Jump Arena | rolling_duration | hard | 50 |
| Laser Tag Room | slot_based | hard | 12 |
| Escape Room | slot_based | hard | 6 |
| Arcade Floor | open_access | soft | NULL |
| Museum Hall | open_access | soft | NULL |

## 5.3 Resource Slotting

Applicable only for `slot_based` resources.

### Slot Templates

#### Table: `resource_slot_templates`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Template ID |
| resource_id | UUID FK → resources.id | ✅ | Resource |
| version | INT | ✅ | Template version |
| name | TEXT | ❌ | Label |
| start_time | TIME | ✅ | Generation start |
| end_time | TIME | ✅ | Generation end |
| slot_duration_minutes | INT | ✅ | Session length |
| recurrence_type | ENUM('daily','weekly') | ✅ | Pattern |
| days_of_week | INT[] | ❌ | Required if weekly (0=Sun) |
| effective_from | DATE | ✅ | Valid from |
| effective_until | DATE | ❌ | Valid until |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

UNIQUE: `(resource_id, version)`

**Versioning rule:** Any modification to a template must create a new version. Previously generated slots remain unchanged and all existing reservations remain valid.

### Resource Slots

#### Table: `resource_slots`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Slot ID |
| resource_id | UUID FK → resources.id | ✅ | Resource |
| slot_template_id | UUID FK → resource_slot_templates.id | ❌ | Source template |
| slot_template_version | INT | ❌ | Template version used |
| slot_date | DATE | ✅ | Slot date |
| start_time | TIME | ✅ | Slot start |
| end_time | TIME | ✅ | Slot end |
| capacity | INT | ❌ | Override (NULL = use resource.capacity) |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

**Mutability rule:** Once a slot has confirmed reservations, its timing and capacity may not be reduced below the reservation count.

### Capacity Calculation

Availability is always derived, never stored:

```
available_capacity =
  slot_capacity
  - confirmed_reservations (status = 'confirmed')
  - active_holds (expires_at > NOW())
```

## 5.4 Capacity Holds

Prevents overselling during concurrent checkout across online and OTC channels.

### Table: `capacity_holds`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Hold ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| resource_id | UUID FK → resources.id | ✅ | Resource held |
| resource_slot_id | UUID FK → resource_slots.id | ❌ | Slot (if slot_bound) |
| session_token | TEXT | ✅ | Checkout session identifier |
| account_id | UUID FK → accounts.id | ❌ | NULL for anonymous OTC |
| visitor_type_id | UUID FK → visitor_types.id | ✅ | Visitor type |
| quantity | INT | ✅ | Units held |
| hold_from | TIMESTAMPTZ | ✅ | Proposed window start |
| hold_until | TIMESTAMPTZ | ✅ | Proposed window end |
| expires_at | TIMESTAMPTZ | ✅ | Auto-release TTL |
| status | ENUM('active','converted','released','expired') | ✅ | Lifecycle |
| order_id | UUID FK → orders.id | ❌ | Set on conversion |
| created_at | TIMESTAMPTZ | ✅ | Created |
| released_at | TIMESTAMPTZ | ❌ | Released or expired |

**Hold lifecycle:**

```
ACTIVE → CONVERTED   (payment succeeded, reservation created)
ACTIVE → RELEASED    (customer abandoned or payment failed)
ACTIVE → EXPIRED     (TTL exceeded, background job cleans up)
```

**Multi-resource atomicity rule:** For combo products, all resource holds must be created or none. Partial holds must never occur.

**Background expiry:** A scheduled job marks expired holds every 60 seconds. Capacity is freed immediately when `expires_at < NOW()` in the availability query — the job is for record hygiene only.

## 5.5 Products

### Table: `products`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Product ID |
| venue_id | UUID FK → venues.id | ❌ NULL = global | Scope |
| name | TEXT | ✅ | Product name |
| code | TEXT | ❌ | SKU-like unique code |
| product_type | ENUM('ticket','membership','retail','wallet_load','gift_card','event_package','food_beverage','donation','adoption') | ✅ | Classification |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

UNIQUE: `(venue_id, code)`

**Operational behaviour by product type:**

| Product Type | Behaviour Config Table |
|-------------|----------------------|
| ticket | product_reservation_config |
| membership | membership_plans |
| retail | inventory_items |
| wallet_load | wallet_load_config |
| gift_card | gift_card_config |
| event_package | event_package_config |
| food_beverage | recipe_config |
| donation | donation_config |
| adoption | adoption_config |

### Table: `product_prices`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Price ID |
| product_id | UUID FK → products.id | ✅ | Product |
| visitor_type_id | UUID FK → visitor_types.id | ❌ | Visitor type |
| base_price | NUMERIC(12,2) | ✅ | Base unit price |
| currency_code | TEXT | ✅ | Currency |
| sales_channel | ENUM('online','pos','kiosk') | ❌ | Channel |
| effective_from | TIMESTAMPTZ | ❌ | Start |
| effective_until | TIMESTAMPTZ | ❌ | End |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

### Table: `product_tax_structures`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Mapping ID |
| product_id | UUID FK → products.id | ✅ | Product |
| tax_structure_id | UUID FK → tax_structures.id | ✅ | Tax structure |
| effective_from | DATE | ❌ | Start |
| effective_until | DATE | ❌ | End |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

## 5.6 Ticket Product Configuration

### Admission and Usage Models

| Reservation Type | Admission | Example |
|-----------------|-----------|---------|
| `slot_bound` | Fixed session | Laser Tag 10:00–10:30 |
| `duration_bound` | Rolling duration | 1-Hour Jump Pass |
| `access_bound` | All-day | Museum Day Pass |
| `multi_day` | Multi-day | 3-Day Ski Pass |

| Usage Type | Behaviour | Example |
|------------|-----------|---------|
| `single_use` | One entry | Laser Tag session |
| `multi_entry` | Unlimited | Museum pass |
| `time_limited` | Within duration | Jump pass |
| `per_day` | One entry per calendar day | Weekend pass |

### Table: `product_reservation_config`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Config ID |
| product_id | UUID FK → products.id | ✅ | Product |
| reservation_type | ENUM('slot_bound','duration_bound','access_bound','multi_day') | ✅ | Validity model |
| usage_type | ENUM('single_use','multi_entry','time_limited','per_day') | ✅ | Scan behaviour |
| duration_minutes | INT | ❌ | Required if duration_bound |
| requires_waiver | BOOLEAN | ✅ default true | Waiver needed |
| allows_reentry | BOOLEAN | ✅ default false | Re-entry permitted |
| entry_limit_per_day | INT | ❌ | Required if per_day |
| valid_days | INT | ❌ | Multi-day validity window |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

### Table: `product_resource_mapping`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Mapping ID |
| product_id | UUID FK → products.id | ✅ | Product |
| resource_id | UUID FK → resources.id | ✅ | Resource |
| is_primary | BOOLEAN | ✅ default false | Primary resource |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

UNIQUE: `(product_id, resource_id)`

**Combo rule:** A product mapped to multiple resources creates one reservation per resource per unit sold. All mapped hard-capacity resources must have availability for the sale to proceed.

## 5.7 Reservations

A single unit of access entitlement created when a ticket product is purchased.

### Table: `reservations`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Reservation ID |
| order_item_id | UUID FK → order_items.id | ✅ | Origin item |
| product_id | UUID FK → products.id | ✅ | Product |
| resource_id | UUID FK → resources.id | ✅ | Resource |
| resource_slot_id | UUID FK → resource_slots.id | ❌ | Slot (if slot_bound) |
| visitor_type_id | UUID FK → visitor_types.id | ✅ | Visitor type |
| person_id | UUID FK → persons.id | ❌ | Assigned before entry |
| reservation_type | ENUM('slot_bound','duration_bound','access_bound','multi_day') | ✅ | Validity model |
| reservation_group_id | UUID FK → reservation_groups.id | ❌ | Group booking |
| usage_type | ENUM('single_use','multi_entry','time_limited','per_day') | ✅ | Entry logic |
| duration_minutes | INT | ❌ | Rolling admission |
| valid_from | TIMESTAMPTZ | ❌ | Purchase-time window start |
| valid_until | TIMESTAMPTZ | ❌ | Purchase-time window end |
| actual_entry_time | TIMESTAMPTZ | ❌ | Set on first scan |
| actual_expiry_time | TIMESTAMPTZ | ❌ | Derived: actual_entry_time + duration |
| entry_limit_per_day | INT | ❌ | Per-day passes |
| entries_used | INT | ✅ default 0 | Entry count |
| status | ENUM('confirmed','consumed','cancelled','expired') | ✅ | Lifecycle |
| created_at | TIMESTAMPTZ | ✅ | Created |

**Validity window behaviour:**

| Type | valid_from / valid_until | actual_entry_time / actual_expiry_time |
|------|--------------------------|---------------------------------------|
| slot_bound | slot start / slot end | Set on scan / — |
| duration_bound | purchase time / purchase + duration | Set on scan / scan + duration |
| access_bound | visit date 00:00 / 23:59 | — / — |
| multi_day | first day 00:00 / last day 23:59 | — / — |

**Note on duration_bound:** `valid_from/valid_until` is the **capacity commitment window** used at purchase. `actual_entry_time/actual_expiry_time` is the **activated window** set at first scan and used by the gate.

### Table: `reservation_groups`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Group ID |
| order_item_id | UUID FK → order_items.id | ❌ | Origin item |
| event_id | UUID FK → events.id | ❌ | Linked event |
| name | TEXT | ❌ | Group label |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

### Table: `reservation_usage_logs`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Usage ID |
| reservation_id | UUID FK → reservations.id | ✅ | Reservation |
| device_id | UUID FK → devices.id | ❌ | Gate device |
| usage_type | ENUM('entry','exit') | ✅ | Scan type |
| timestamp | TIMESTAMPTZ | ✅ | Scan time |
| created_at | TIMESTAMPTZ | ✅ | Logged |

Live headcount per resource = entry scans − exit scans derived from this table.

## 5.8 Gate Validation Logic

```
1. Lookup reservation by QR/barcode
2. Check reservation.status = 'confirmed'
3. Check valid_from <= NOW() <= valid_until
   (or actual_expiry_time for time_limited after first scan)
4. Check entries_used < entry_limit (if applicable)
5. If reservation.person_id IS NOT NULL:
     → Check valid waiver exists for person
     → DENY if missing (if gate.strict_mode_enabled = true)
6. ALLOW entry
7. Insert reservation_usage_logs (usage_type = 'entry')
8. Increment reservations.entries_used
9. If time_limited and first entry:
     Set actual_entry_time = NOW()
     Set actual_expiry_time = NOW() + duration_minutes
```

Supervisor override: authenticated via PIN, logged to `audit_logs` with `action_type = 'gate.manual_override'`.

---

# 6. Order System

The financial transaction layer. All revenue flows through orders.

## 6.1 Design Principles

1. Orders are **immutable** after payment
2. Corrections via **separate refund orders**
3. One `order_item` = one sellable unit
4. Taxes **snapshotted** at time of sale
5. Discounts stored as **adjustment records**
6. All fulfilment tables reference `order_item_id`

## 6.2 Core Tables

### Table: `orders`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Order ID |
| order_number | TEXT | ✅ | Human-readable reference |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| account_id | UUID FK → accounts.id | ❌ | Customer (NULL = anonymous) |
| order_type | ENUM('sale','refund') | ✅ | Transaction type |
| status | ENUM('pending','paid','refunded','cancelled') | ✅ | Lifecycle |
| currency_code | TEXT | ✅ | Currency |
| subtotal_amount | NUMERIC(12,2) | ✅ | Before tax |
| discount_amount | NUMERIC(12,2) | ✅ | Total discount |
| tax_amount | NUMERIC(12,2) | ✅ | Total tax |
| total_amount | NUMERIC(12,2) | ✅ | Final total |
| source_channel | ENUM('pos','online','kiosk') | ✅ | Channel |
| parent_order_id | UUID FK → orders.id | ❌ | For refunds |
| notes | TEXT | ❌ | Staff notes |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Staff |

### Table: `order_items`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Item ID |
| order_id | UUID FK → orders.id | ✅ | Order |
| product_id | UUID FK → products.id | ✅ | Product |
| visitor_type_id | UUID FK → visitor_types.id | ❌ | Visitor type |
| quantity | INT | ✅ | Units |
| unit_price | NUMERIC(12,2) | ✅ | Base unit price |
| discount_amount | NUMERIC(12,2) | ✅ | Discount applied |
| tax_amount | NUMERIC(12,2) | ✅ | Tax applied |
| total_amount | NUMERIC(12,2) | ✅ | Final line total |
| price_overridden | BOOLEAN | ✅ default false | Manual override flag |
| created_at | TIMESTAMPTZ | ✅ | Created |

### Table: `order_item_price_components`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Component ID |
| order_item_id | UUID FK → order_items.id | ✅ | Item |
| component_type | ENUM('base_price','dynamic_pricing','visitor_modifier','channel_modifier') | ✅ | Type |
| source_id | UUID | ❌ | Source rule ID |
| amount | NUMERIC(12,2) | ✅ | Amount |
| created_at | TIMESTAMPTZ | ✅ | Created |

### Table: `order_item_adjustments`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Adjustment ID |
| order_item_id | UUID FK → order_items.id | ✅ | Item |
| adjustment_source | ENUM('pricing_rule','promo_code','bundle','manual') | ✅ | Source |
| source_id | UUID | ❌ | Rule or promo ID |
| adjustment_type | ENUM('discount','surcharge') | ✅ | Type |
| amount | NUMERIC(12,2) | ✅ | Amount |
| created_at | TIMESTAMPTZ | ✅ | Created |

### Table: `order_item_tax_components`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| order_item_id | UUID FK → order_items.id | ✅ | Item |
| tax_component_id | UUID FK → tax_components.id | ✅ | Component |
| tax_rate_percent | NUMERIC(5,2) | ✅ | Rate at time of sale |
| tax_amount | NUMERIC(12,2) | ✅ | Amount |

### Table: `order_payments`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Payment ID |
| order_id | UUID FK → orders.id | ✅ | Order |
| payment_method | ENUM('cash','card','upi','wallet','gift_card','redemption_card') | ✅ | Method |
| amount | NUMERIC(12,2) | ✅ | Amount |
| reference_id | UUID | ❌ | Wallet / gift card source ID |
| status | ENUM('pending','completed','failed','refunded') | ✅ | Status |
| created_at | TIMESTAMPTZ | ✅ | Created |

### Table: `payment_transactions`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Transaction ID |
| order_payment_id | UUID FK → order_payments.id | ✅ | Payment row |
| gateway | TEXT | ✅ | Gateway name |
| gateway_transaction_id | TEXT | ✅ | Gateway reference |
| status | ENUM('success','failed','pending','refunded') | ✅ | Status |
| response_payload | JSONB | ✅ | Full gateway response |
| created_at | TIMESTAMPTZ | ✅ | Created |

### Table: `order_status_history`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| order_id | UUID FK → orders.id | ✅ | Order |
| previous_status | TEXT | ✅ | Before |
| new_status | TEXT | ✅ | After |
| changed_by | UUID FK → users.id | ❌ | Actor |
| changed_at | TIMESTAMPTZ | ✅ | When |
| reason | TEXT | ❌ | Notes |

## 6.3 Post-Sale Fulfilment

On payment success, the following fulfilment actions are triggered based on product type:

| Product Type | Fulfilment Action |
|-------------|------------------|
| ticket | Create reservations |
| membership | Activate membership |
| retail | Deduct inventory |
| wallet_load | Create wallet credit transaction |
| gift_card | Issue gift card |
| event_package | Create event reservation group |
| donation | Create donation record |
| adoption | Create adoption record |

## 6.4 Refund Flow

A refund creates a new order of `order_type = 'refund'` linked via `parent_order_id`.

**Full cancellation sequence:**
1. Create refund order (e.g. `ORD1021-RFULL`)
2. Copy all `order_items` as negative rows
3. Reverse tax snapshots
4. Cancel associated reservations → `status = 'cancelled'`
5. Restore retail inventory
6. Deactivate memberships
7. Reverse wallet / gift card transactions
8. Refund to original payment method (or credit to wallet per policy)

---

# 7. Pricing Engine

## 7.1 Evaluation Order

```
1. Base Product Price         (product_prices)
2. Time-Based Pricing         (day_of_week, date_range, time_of_day)
3. Quantity-Based Pricing     (bulk slabs)
4. Bundle / BOGO              (bundle_promotions)
5. Early Bird / Advance       (booking_lead_time condition)
6. Membership Pricing         (discount or allowance)
7. Promo Code                 (manually applied)
8. Manual Override            (POS only, supervisor-logged)
```

Each rule carries `is_stackable`. Non-stackable rules prevent lower-priority rules from applying. When two rules of equal priority conflict, the **highest absolute discount value** wins.

## 7.2 Pricing Rules

### Table: `pricing_rules`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Rule ID |
| venue_id | UUID FK → venues.id | ❌ | Venue |
| name | TEXT | ✅ | Rule name |
| rule_type | ENUM('discount','surcharge','set_price','bogo','bundle') | ✅ | Behaviour |
| priority | INT | ✅ | Evaluation order (ascending) |
| is_stackable | BOOLEAN | ✅ default true | Allow stacking |
| effective_from | TIMESTAMPTZ | ❌ | Start |
| effective_until | TIMESTAMPTZ | ❌ | End |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

### Table: `pricing_rule_conditions`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Condition ID |
| pricing_rule_id | UUID FK → pricing_rules.id | ✅ | Rule |
| condition_type | ENUM('product','visitor_type','channel','day_of_week','date_range','time_of_day','quantity','booking_lead_time') | ✅ | Type |
| operator | ENUM('=','>','<','>=','<=','IN') | ✅ | Logic |
| value | TEXT | ✅ | Value (JSON for ranges/arrays) |

**Condition examples:**

| Type | Operator | Value | Meaning |
|------|---------|-------|---------|
| day_of_week | IN | `[6,7]` | Weekend |
| date_range | IN | `{"from":"2025-12-24","to":"2026-01-01"}` | Holiday period |
| time_of_day | IN | `{"from":"17:00","to":"20:00"}` | Peak hours |
| quantity | >= | `5` | Bulk (5+ units) |
| booking_lead_time | >= | `7` | 7+ days ahead |
| visitor_type | = | `child` | Children only |
| channel | = | `online` | Online only |

### Table: `pricing_rule_actions`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Action ID |
| pricing_rule_id | UUID FK → pricing_rules.id | ✅ | Rule |
| action_type | ENUM('flat_discount','percent_discount','flat_surcharge','percent_surcharge','set_price','free_item') | ✅ | Action |
| value | NUMERIC(12,2) | ❌ | Amount or percentage |
| target_product_id | UUID FK → products.id | ❌ | For free_item |

## 7.3 Promo Codes

### Table: `promo_codes`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Promo ID |
| venue_id | UUID FK → venues.id | ❌ | Venue |
| code | TEXT UNIQUE | ✅ | e.g. `SUMMER10` |
| description | TEXT | ❌ | Description |
| discount_type | ENUM('flat','percent') | ✅ | Type |
| discount_value | NUMERIC(12,2) | ✅ | Value |
| max_uses | INT | ❌ | Total usage cap |
| max_uses_per_customer | INT | ❌ | Per-account cap |
| is_stackable | BOOLEAN | ✅ default false | Stack with other discounts |
| effective_from | TIMESTAMPTZ | ❌ | Start |
| effective_until | TIMESTAMPTZ | ❌ | End |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

### Table: `promo_code_applicability`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| promo_code_id | UUID FK → promo_codes.id | ✅ | Promo |
| product_id | UUID FK → products.id | ❌ | Product restriction |
| visitor_type_id | UUID FK → visitor_types.id | ❌ | Visitor type restriction |
| sales_channel | ENUM('online','pos','kiosk') | ❌ | Channel restriction |

### Table: `promo_code_usages`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Usage ID |
| promo_code_id | UUID FK → promo_codes.id | ✅ | Promo |
| order_id | UUID FK → orders.id | ✅ | Order |
| account_id | UUID FK → accounts.id | ❌ | Customer |
| discount_amount | NUMERIC(12,2) | ✅ | Applied discount |
| used_at | TIMESTAMPTZ | ✅ | When |
| status | ENUM('applied','reversed') | ✅ | Lifecycle |

Rules: Recorded after payment success. Reversed on cancellation. Never deleted.

## 7.4 Bundle Promotions

### Table: `bundle_promotions`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Bundle ID |
| venue_id | UUID FK → venues.id | ❌ | Venue |
| name | TEXT | ✅ | Bundle name |
| bundle_type | ENUM('bogo','combo_discount','set_price','included_items') | ✅ | Type |
| max_applications_per_order | INT | ❌ | Cap per order |
| effective_from | TIMESTAMPTZ | ❌ | Start |
| effective_until | TIMESTAMPTZ | ❌ | End |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

### Table: `bundle_promotion_items`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Item ID |
| bundle_promotion_id | UUID FK → bundle_promotions.id | ✅ | Bundle |
| product_id | UUID FK → products.id | ✅ | Product |
| role | ENUM('qualifier','reward') | ✅ | Qualifier triggers; reward receives |
| required_quantity | INT | ❌ | Qualifying quantity |
| reward_quantity | INT | ❌ | Free/discounted quantity |
| discount_value | NUMERIC(12,2) | ❌ | Discount on reward |
| is_price_overridden | BOOLEAN | ❌ | Replace price entirely |
| is_auto_added | BOOLEAN | ❌ | Auto-add to cart |
| is_removable | BOOLEAN | ❌ | Customer can remove |

**Important:** Ticket rewards (even at ₹0) must create reservations and consume capacity.

---

# 8. Waivers

Native digital consent system replacing third-party dependencies.

## 8.1 Principles

- One guardian can sign on behalf of multiple minors in one event
- OTP verification required to sign (configurable)
- Every signature generates an immutable PDF snapshot
- SHA-256 hash stored to prove non-tampering
- Metadata (IP, user-agent, millisecond timestamp) captured per signature

## 8.2 Tables

### Table: `waiver_templates`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Template ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| name | TEXT | ✅ | Template name |
| version | INT | ✅ | Version number |
| content_html | TEXT | ✅ | Waiver body HTML |
| is_active | BOOLEAN | ✅ default true | Active version |
| effective_from | DATE | ✅ | Valid from |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

UNIQUE: `(venue_id, version)`

Any content change must increment version. Existing signatures remain on the version they were signed.

### Table: `product_waiver_mapping`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| product_id | UUID FK → products.id | ✅ | Product |
| waiver_template_id | UUID FK → waiver_templates.id | ✅ | Template |
| created_at | TIMESTAMPTZ | ✅ | Created |

### Table: `waiver_signatures`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Signature ID |
| waiver_template_id | UUID FK → waiver_templates.id | ✅ | Template |
| waiver_template_version | INT | ✅ | Version at signing |
| signed_by_account_id | UUID FK → accounts.id | ✅ | Signer |
| signature_data | TEXT | ✅ | SVG or base64 |
| signed_at | TIMESTAMPTZ | ✅ | Millisecond timestamp |
| ip_address | TEXT | ✅ | Signer IP |
| user_agent | TEXT | ✅ | Browser/device |
| pdf_url | TEXT | ❌ | Generated PDF |
| pdf_hash | TEXT | ❌ | SHA-256 of PDF |
| otp_verified | BOOLEAN | ✅ | OTP used |
| created_at | TIMESTAMPTZ | ✅ | Created |

### Table: `waiver_signature_persons`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| waiver_signature_id | UUID FK → waiver_signatures.id | ✅ | Signature |
| person_id | UUID FK → persons.id | ✅ | Covered person |
| is_self | BOOLEAN | ✅ | Signer signing for themselves |
| created_at | TIMESTAMPTZ | ✅ | Created |

## 8.3 Gate Validation

```
1. Reservation has person_id assigned
2. Lookup waiver_signature_persons WHERE person_id = X
3. Check waiver version = current active version
4. Check signature within waiver.expiry_months window
5. PASS → allow / FAIL → deny or warn per gate.strict_mode_enabled
```

---

# 9. Membership

Recurring subscriptions providing ongoing discounts, allowances, and access privileges.

## 9.1 Tables

### Table: `membership_plans`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Plan ID |
| product_id | UUID FK → products.id | ✅ | Product |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| name | TEXT | ✅ | Plan name |
| billing_cycle | ENUM('monthly','annual','one_time') | ✅ | Billing period |
| price | NUMERIC(12,2) | ✅ | Price per cycle |
| max_members | INT | ❌ | Family size cap |
| is_family_plan | BOOLEAN | ✅ default false | Shared pool |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

### Table: `membership_benefits`

Two types: `discount` (persistent % off) and `allowance` (periodic credit pool).

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Benefit ID |
| membership_plan_id | UUID FK → membership_plans.id | ✅ | Plan |
| benefit_type | ENUM('discount','allowance') | ✅ | Type |
| product_category | TEXT | ❌ | Scope: ticket, fnb, retail |
| product_id | UUID FK → products.id | ❌ | Specific product |
| discount_percent | NUMERIC(5,2) | ❌ | For discount type |
| allowance_quantity | NUMERIC(10,2) | ❌ | For allowance type |
| allowance_unit | ENUM('visits','hours','credits') | ❌ | Unit |
| allowance_reset_cycle | ENUM('monthly','annual') | ❌ | Reset period |
| created_at | TIMESTAMPTZ | ✅ | Created |

### Table: `memberships`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Membership ID |
| order_item_id | UUID FK → order_items.id | ✅ | Origin |
| membership_plan_id | UUID FK → membership_plans.id | ✅ | Plan |
| account_id | UUID FK → accounts.id | ✅ | Owner |
| status | ENUM('active','past_due','cancelled','expired') | ✅ | Status |
| started_at | TIMESTAMPTZ | ✅ | Activation |
| current_period_start | DATE | ✅ | Period start |
| current_period_end | DATE | ✅ | Period end |
| next_billing_date | DATE | ❌ | Auto-renew date |
| cancelled_at | TIMESTAMPTZ | ❌ | When cancelled |
| created_at | TIMESTAMPTZ | ✅ | Created |

### Table: `membership_members`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| membership_id | UUID FK → memberships.id | ✅ | Membership |
| person_id | UUID FK → persons.id | ✅ | Member |
| is_primary | BOOLEAN | ✅ | Primary holder |
| added_at | TIMESTAMPTZ | ✅ | Added |
| removed_at | TIMESTAMPTZ | ❌ | Removed |

### Table: `membership_allowance_balances`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| membership_id | UUID FK → memberships.id | ✅ | Membership |
| membership_benefit_id | UUID FK → membership_benefits.id | ✅ | Benefit |
| period_start | DATE | ✅ | Current period start |
| period_end | DATE | ✅ | Current period end |
| total_allowance | NUMERIC(10,2) | ✅ | Full entitlement |
| used_allowance | NUMERIC(10,2) | ✅ default 0 | Consumed |
| remaining_allowance | NUMERIC(10,2) | ✅ | Remaining |

### Table: `membership_allowance_transactions`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Transaction ID |
| membership_allowance_balance_id | UUID | ✅ | Balance |
| order_item_id | UUID FK → order_items.id | ❌ | Source |
| transaction_type | ENUM('deduction','reversal','reset') | ✅ | Type |
| quantity | NUMERIC(10,2) | ✅ | Amount |
| created_at | TIMESTAMPTZ | ✅ | Created |

---

# 10. Wallet System

Multi-currency venue wallet with restricted spend rules.

## 10.1 Balance Types

| Balance | Refundable | Usable For |
|---------|-----------|-----------|
| `real_cash` | Yes | All purchases |
| `bonus_cash` | No | All purchases |
| `redemption_points` | No | Retail / prizes only — never tickets |

**Burn order:** Bonus cash consumed first, then real cash.

## 10.2 Tables

### Table: `wallets`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Wallet ID |
| account_id | UUID FK → accounts.id | ✅ | Owner |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| real_cash_balance | NUMERIC(12,2) | ✅ default 0 | Refundable |
| bonus_cash_balance | NUMERIC(12,2) | ✅ default 0 | Non-refundable |
| redemption_points_balance | NUMERIC(12,2) | ✅ default 0 | Points |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |

### Table: `wallet_transactions`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Transaction ID |
| wallet_id | UUID FK → wallets.id | ✅ | Wallet |
| order_item_id | UUID FK → order_items.id | ❌ | Source |
| transaction_type | ENUM('credit','debit','refund','expiry','adjustment') | ✅ | Type |
| balance_type | ENUM('real_cash','bonus_cash','redemption_points') | ✅ | Pool |
| amount | NUMERIC(12,2) | ✅ | Amount |
| balance_after | NUMERIC(12,2) | ✅ | Post-transaction balance |
| reference | TEXT | ❌ | Notes |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Staff |

---

# 11. Gift Cards

Pre-paid value instruments issued and redeemed at the venue.

### Table: `gift_cards`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Card ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| code | TEXT UNIQUE | ✅ | Redemption code |
| order_item_id | UUID FK → order_items.id | ✅ | Purchase origin |
| issued_to_account_id | UUID FK → accounts.id | ❌ | Recipient |
| face_value | NUMERIC(12,2) | ✅ | Original value |
| current_balance | NUMERIC(12,2) | ✅ | Remaining |
| currency_code | TEXT | ✅ | Currency |
| status | ENUM('active','redeemed','expired','cancelled') | ✅ | Status |
| expires_at | DATE | ❌ | Expiry |
| created_at | TIMESTAMPTZ | ✅ | Created |

### Table: `gift_card_transactions`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Transaction ID |
| gift_card_id | UUID FK → gift_cards.id | ✅ | Card |
| order_payment_id | UUID FK → order_payments.id | ❌ | Redemption |
| transaction_type | ENUM('issue','redemption','refund','expiry','adjustment') | ✅ | Type |
| amount | NUMERIC(12,2) | ✅ | Amount |
| balance_after | NUMERIC(12,2) | ✅ | Post-transaction |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Staff |

---

# 12. Redemption Cards

Visit-based or credit-based loyalty instruments.

### Table: `redemption_cards`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Card ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| account_id | UUID FK → accounts.id | ✅ | Owner |
| card_type | ENUM('visit_based','credit_based') | ✅ | Type |
| code | TEXT UNIQUE | ✅ | Card code |
| total_visits | INT | ❌ | For visit_based |
| remaining_visits | INT | ❌ | Visits left |
| credit_balance | NUMERIC(12,2) | ❌ | For credit_based |
| status | ENUM('active','exhausted','expired','cancelled') | ✅ | Status |
| expires_at | DATE | ❌ | Expiry |
| created_at | TIMESTAMPTZ | ✅ | Created |

### Table: `redemption_card_transactions`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Transaction ID |
| redemption_card_id | UUID FK → redemption_cards.id | ✅ | Card |
| order_item_id | UUID FK → order_items.id | ❌ | Source |
| transaction_type | ENUM('issue','redemption','top_up','expiry') | ✅ | Type |
| visits_delta | INT | ❌ | Visit change |
| credit_delta | NUMERIC(12,2) | ❌ | Credit change |
| created_at | TIMESTAMPTZ | ✅ | Created |

---

# 13. Donations

Charitable contributions processed through checkout.

### Table: `donation_causes`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Cause ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| name | TEXT | ✅ | Cause name |
| description | TEXT | ❌ | Description |
| image_url | TEXT | ❌ | Cause image |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |

### Table: `donations`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Donation ID |
| order_item_id | UUID FK → order_items.id | ✅ | Source |
| donation_cause_id | UUID FK → donation_causes.id | ✅ | Cause |
| account_id | UUID FK → accounts.id | ❌ | Donor |
| amount | NUMERIC(12,2) | ✅ | Amount |
| donation_type | ENUM('one_time','recurring') | ✅ | Type |
| recurrence_cycle | ENUM('monthly','annual') | ❌ | If recurring |
| is_anonymous | BOOLEAN | ✅ default false | Anonymous |
| receipt_issued | BOOLEAN | ✅ default false | Receipt sent |
| created_at | TIMESTAMPTZ | ✅ | Created |

---

# 14. Adoptions

Sponsor-based programmes where customers support a named animal, exhibit, or project.

### Table: `adoptees`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Adoptee ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| name | TEXT | ✅ | Name (e.g. "Simba") |
| species | TEXT | ❌ | Species |
| adoptee_type | ENUM('animal','exhibit','project') | ✅ | Type |
| description | TEXT | ❌ | Story / bio |
| image_url | TEXT | ❌ | Photo |
| is_available | BOOLEAN | ✅ default true | Available |
| created_at | TIMESTAMPTZ | ✅ | Created |

### Table: `adoptions`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Adoption ID |
| order_item_id | UUID FK → order_items.id | ✅ | Source |
| adoptee_id | UUID FK → adoptees.id | ✅ | Adoptee |
| account_id | UUID FK → accounts.id | ✅ | Sponsor |
| person_id | UUID FK → persons.id | ❌ | On behalf of |
| sponsorship_start | DATE | ✅ | Start |
| sponsorship_end | DATE | ✅ | End |
| certificate_issued | BOOLEAN | ✅ default false | Certificate sent |
| status | ENUM('active','expired','cancelled') | ✅ | Status |
| created_at | TIMESTAMPTZ | ✅ | Created |

---

# 15. Food & Beverage

POS and kitchen management for venue F&B operations.

## 15.1 Menu

### Table: `fnb_categories`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Category ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| name | TEXT | ✅ | Name |
| parent_id | UUID FK → fnb_categories.id | ❌ | Sub-category |
| display_order | INT | ❌ | Sort order |
| is_active | BOOLEAN | ✅ default true | Active |

### Table: `fnb_items`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Item ID |
| product_id | UUID FK → products.id | ✅ | Product |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| category_id | UUID FK → fnb_categories.id | ✅ | Category |
| preparation_station_id | UUID FK → preparation_stations.id | ❌ | Kitchen routing |
| preparation_time_minutes | INT | ❌ | Estimated prep time |
| is_available | BOOLEAN | ✅ default true | Available now |
| created_at | TIMESTAMPTZ | ✅ | Created |

## 15.2 Kitchen Routing

### Table: `preparation_stations`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Station ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| name | TEXT | ✅ | e.g. `Grill`, `Beverages` |
| device_id | UUID FK → devices.id | ❌ | KDS device |
| is_active | BOOLEAN | ✅ default true | Active |

### Table: `kitchen_orders`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | KO ID |
| order_id | UUID FK → orders.id | ✅ | Source order |
| preparation_station_id | UUID FK → preparation_stations.id | ✅ | Station |
| status | ENUM('pending','preparing','ready','served','cancelled') | ✅ | Status |
| created_at | TIMESTAMPTZ | ✅ | Created |
| started_at | TIMESTAMPTZ | ❌ | Prep started |
| ready_at | TIMESTAMPTZ | ❌ | Ready |
| served_at | TIMESTAMPTZ | ❌ | Delivered |

### Table: `kitchen_order_items`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| kitchen_order_id | UUID FK → kitchen_orders.id | ✅ | KO |
| order_item_id | UUID FK → order_items.id | ✅ | Source item |
| quantity | INT | ✅ | Quantity |
| notes | TEXT | ❌ | Special instructions |
| status | ENUM('pending','preparing','ready','served') | ✅ | Status |

## 15.3 Inventory

### Table: `fnb_inventory`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| fnb_item_id | UUID FK → fnb_items.id | ✅ | Item |
| current_stock | NUMERIC(10,3) | ✅ | On-hand |
| stock_unit | TEXT | ✅ | units / litres / kg |
| low_stock_threshold | NUMERIC(10,3) | ❌ | Alert threshold |
| updated_at | TIMESTAMPTZ | ✅ | Last updated |

### Table: `fnb_inventory_adjustments`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Adjustment ID |
| fnb_inventory_id | UUID | ✅ | Inventory row |
| adjustment_type | ENUM('sale','manual_add','manual_remove','waste','receive') | ✅ | Type |
| quantity | NUMERIC(10,3) | ✅ | Delta |
| reason_code | TEXT | ❌ | Mandatory for manual |
| notes | TEXT | ❌ | Notes |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ✅ | Staff |

---

# 16. Retail

Physical merchandise with inventory management.

### Table: `retail_items`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Item ID |
| product_id | UUID FK → products.id | ✅ | Product |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| sku | TEXT | ✅ | Stock keeping unit |
| name | TEXT | ✅ | Display name |
| barcode | TEXT | ❌ | Barcode |
| variant_attributes | JSONB | ❌ | e.g. `{"color":"red","size":"S"}` |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |

### Table: `retail_inventory`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| retail_item_id | UUID FK → retail_items.id | ✅ | Item |
| current_stock | INT | ✅ | On-hand |
| low_stock_threshold | INT | ❌ | Alert threshold |
| updated_at | TIMESTAMPTZ | ✅ | Last updated |

### Table: `retail_inventory_transactions`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Transaction ID |
| retail_inventory_id | UUID | ✅ | Inventory |
| order_item_id | UUID FK → order_items.id | ❌ | Source |
| transaction_type | ENUM('sale','refund','adjustment','receive','waste') | ✅ | Type |
| quantity_delta | INT | ✅ | Change (negative = deduction) |
| reason_code | TEXT | ❌ | Mandatory for manual |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ✅ | Staff |

---

# 17. CRM & Marketing

## 17.1 Customer 360

### Table: `customer_activities`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Activity ID |
| account_id | UUID FK → accounts.id | ✅ | Customer |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| activity_type | ENUM('purchase','entry_scan','waiver_signed','membership_activated','membership_cancelled','refund','gift_card_redeemed','donation') | ✅ | Type |
| entity_type | TEXT | ❌ | `order`, `reservation` |
| entity_id | UUID | ❌ | Related record |
| metadata | JSONB | ❌ | Context |
| created_at | TIMESTAMPTZ | ✅ | When |

## 17.2 Segmentation

### Table: `customer_segments`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Segment ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| name | TEXT | ✅ | Segment name |
| description | TEXT | ❌ | Description |
| segment_type | ENUM('static','dynamic') | ✅ | Type |
| rules | JSONB | ❌ | Rule set for dynamic |
| is_active | BOOLEAN | ✅ default true | Active |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

**Dynamic segment examples:**

| Segment | Rule |
|---------|------|
| Lapsed VIPs | `total_spend > 5000 AND last_visit_days > 60` |
| New Visitors | `visit_count = 1` |
| Weekly Regulars | `visits_last_30_days >= 4` |
| Members Expiring Soon | `membership_days_remaining <= 14` |

### Table: `customer_segment_members`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| segment_id | UUID FK → customer_segments.id | ✅ | Segment |
| account_id | UUID FK → accounts.id | ✅ | Member |
| added_at | TIMESTAMPTZ | ✅ | Added |
| removed_at | TIMESTAMPTZ | ❌ | Removed |

## 17.3 Behavioural Tags

### Table: `customer_tags`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Row ID |
| account_id | UUID FK → accounts.id | ✅ | Customer |
| tag | TEXT | ✅ | e.g. `first-timer`, `member`, `vip` |
| applied_at | TIMESTAMPTZ | ✅ | When |
| applied_by | ENUM('system','staff') | ✅ | Source |
| expires_at | TIMESTAMPTZ | ❌ | Tag expiry |

## 17.4 Staff Notes

### Table: `customer_notes`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Note ID |
| account_id | UUID FK → accounts.id | ✅ | Customer |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| note | TEXT | ✅ | Note content |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ✅ | Staff |

## 17.5 Marketing Campaigns

### Table: `marketing_campaigns`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Campaign ID |
| venue_id | UUID FK → venues.id | ✅ | Venue |
| name | TEXT | ✅ | Campaign name |
| channel | ENUM('email','sms','whatsapp','push') | ✅ | Channel |
| segment_id | UUID FK → customer_segments.id | ❌ | Target |
| notification_template_id | UUID FK → notification_templates.id | ✅ | Template |
| trigger_type | ENUM('scheduled','event_based') | ✅ | Trigger |
| trigger_event | TEXT | ❌ | e.g. `post_checkin` |
| trigger_offset_hours | INT | ❌ | Hours from event |
| scheduled_at | TIMESTAMPTZ | ❌ | For scheduled |
| status | ENUM('draft','scheduled','running','completed','cancelled') | ✅ | Status |
| created_at | TIMESTAMPTZ | ✅ | Created |
| created_by | UUID FK → users.id | ❌ | Creator |

### Table: `marketing_campaign_sends`

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | ✅ | Send ID |
| campaign_id | UUID FK → marketing_campaigns.id | ✅ | Campaign |
| account_id | UUID FK → accounts.id | ✅ | Recipient |
| sent_at | TIMESTAMPTZ | ❌ | Sent |
| opened_at | TIMESTAMPTZ | ❌ | Opened |
| clicked_at | TIMESTAMPTZ | ❌ | Clicked |
| converted_at | TIMESTAMPTZ | ❌ | Purchase attributed |
| revenue_attributed | NUMERIC(12,2) | ❌ | Attributed revenue |
| status | ENUM('pending','sent','failed','bounced') | ✅ | Status |

---

# 18. Reporting & Business Intelligence

## 18.1 Nightly Aggregations

Computed nightly to power fast dashboards without querying raw transaction tables.

### Table: `daily_revenue_stats`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Row ID |
| venue_id | UUID | Venue |
| stat_date | DATE | Date |
| channel | TEXT | pos / online / kiosk |
| product_type | TEXT | ticket / membership / etc |
| gross_revenue | NUMERIC | Before discounts |
| discount_amount | NUMERIC | Total discounts |
| tax_amount | NUMERIC | Total tax |
| net_revenue | NUMERIC | After discounts |
| transaction_count | INT | Order count |
| created_at | TIMESTAMPTZ | Computed |

### Table: `hourly_occupancy_stats`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Row ID |
| venue_id | UUID | Venue |
| resource_id | UUID | Resource |
| stat_date | DATE | Date |
| stat_hour | INT | Hour (0–23) |
| peak_headcount | INT | Max in hour |
| avg_headcount | NUMERIC | Average |
| capacity | INT | Resource capacity |
| utilization_percent | NUMERIC | Peak / capacity |
| created_at | TIMESTAMPTZ | Computed |

## 18.2 Key Metrics

| Metric | Source | How |
|--------|--------|-----|
| Live headcount | reservation_usage_logs | entry − exit per resource |
| Revenue by category | daily_revenue_stats | Product type breakdown |
| Payment mix | order_payments | Method breakdown |
| Wallet liability | wallets | Sum real_cash_balance |
| Membership churn | memberships | Cancellations per period |
| Capacity utilisation | hourly_occupancy_stats | Peak / capacity |
| Hold conversion rate | capacity_holds | converted / total |
| Campaign revenue | marketing_campaign_sends | revenue_attributed |

## 18.3 Nightly Job

Runs at `reporting.daily_rollup_time` in venue timezone:

```
1. Aggregate paid orders → daily_revenue_stats
2. Aggregate entry/exit scans → hourly_occupancy_stats
3. Compute membership status changes
4. Queue scheduled campaign sends for next day
5. Evaluate alert_rules thresholds
6. Mark expired capacity_holds, reservations, gift cards, redemption cards
```

---

# 19. Access Control & Security

## 19.1 RBAC

Permissions are assigned to roles, not users directly. Users hold roles per venue.

**Permission resolution:**
```
1. Collect all active roles for user at venue
2. Union all granted permissions across those roles
3. Any role granting a permission = user has it
4. Sensitive permissions additionally require:
   - Supervisor PIN re-entry
   - Dual audit_logs entry (actor + supervisor)
```

## 19.2 Gate Strict Mode

When `gate.strict_mode_enabled = true`:

| Condition | Result |
|-----------|--------|
| Expired ticket | DENY |
| Already used (single_use) | DENY |
| Waiver missing for person | DENY |
| Person not assigned (if required) | DENY |
| Device offline > grace period | DENY all scans |

When `false`: waiver failures warn but do not block.

## 19.3 Sensitive Actions Requiring Supervisor

| Action | Permission Key |
|--------|---------------|
| Process refund | `order.refund` |
| Manual price override | `order.price_override` |
| Force gate entry | `gate.manual_override` |
| Edit signed waiver | `waiver.edit` |
| Adjust inventory | `inventory.manual_adjust` |
| Void order | `order.void` |

## 19.4 Data Security Standards

| Asset | Protection |
|-------|-----------|
| User PINs | bcrypt hashed |
| Account passwords | bcrypt hashed |
| OTPs | Hashed before storage, never plain |
| Gift card codes | Cryptographically random |
| API keys | Hashed — full key shown once at creation |
| Device tokens | Hashed |
| Waiver PDFs | SHA-256 fingerprinted at generation |

---

# 20. Venue Settings Registry

All valid `venue_settings.setting_key` values. Keys follow `module.setting_name` dot notation. Values stored as JSONB. Settings helper must always return the registered default if key is absent.

**Adding a new key:** Add to this registry first, implement the default fallback in the settings helper, never hardcode defaults in business logic.

## Authentication (`auth.*`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `auth.otp_required_for_login` | boolean | `true` | OTP at every login |
| `auth.allow_password_login` | boolean | `false` | Password-based login |
| `auth.otp_expiry_minutes` | integer | `10` | OTP validity window |
| `auth.max_otp_attempts` | integer | `3` | Lockout threshold |
| `auth.otp_channels` | array | `["sms"]` | Allowed channels |
| `auth.session_ttl_hours` | integer | `24` | Session expiry |

## Accounts (`account.*`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `account.allow_anonymous_otc_orders` | boolean | `true` | OTC without account |
| `account.require_person_assignment_before_entry` | boolean | `true` | Assignment mandatory |
| `account.allow_minor_self_registration` | boolean | `false` | Minor self-register |
| `account.minor_age_threshold` | integer | `18` | Minor age cutoff |

## Waivers (`waiver.*`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `waiver.otp_required_for_signing` | boolean | `true` | OTP to sign |
| `waiver.required_for_walkin` | boolean | `true` | Waiver at walk-in |
| `waiver.allow_bulk_minor_signing` | boolean | `true` | One waiver, multiple minors |
| `waiver.expiry_months` | integer | `12` | Validity (0 = never) |
| `waiver.quick_sign_enabled` | boolean | `false` | No-OTP quick sign |

## Ticketing (`ticketing.*`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `ticketing.max_advance_booking_days` | integer | `90` | Advance window |
| `ticketing.min_advance_booking_minutes` | integer | `0` | Minimum lead time |
| `ticketing.late_entry_grace_period_minutes` | integer | `15` | Late entry tolerance |
| `ticketing.allow_slot_rebooking` | boolean | `true` | Rebook allowed |
| `ticketing.rebooking_cutoff_hours` | integer | `2` | Rebook cutoff |
| `ticketing.max_tickets_per_online_order` | integer | `20` | Cart limit |
| `ticketing.cancellation_policy` | string | `"no_refund"` | `full_refund` / `partial_refund` / `no_refund` / `credit_only` |
| `ticketing.cancellation_cutoff_hours` | integer | `24` | Cancellation window |

## Gate (`gate.*`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `gate.strict_mode_enabled` | boolean | `true` | Deny on waiver failure |
| `gate.allow_manual_override` | boolean | `true` | Supervisor override |
| `gate.override_requires_supervisor` | boolean | `true` | PIN required |
| `gate.exit_scan_enabled` | boolean | `false` | Exit scanning |
| `gate.offline_grace_minutes` | integer | `30` | Offline tolerance |

## Checkout (`checkout.*`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `checkout.online_hold_ttl_minutes` | integer | `10` | Online hold duration |
| `checkout.otc_hold_ttl_minutes` | integer | `5` | OTC hold duration |
| `checkout.allow_split_payment` | boolean | `true` | Multiple methods |
| `checkout.max_payment_methods_per_order` | integer | `3` | Method cap |

## Payments (`payment.*`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `payment.cash_enabled` | boolean | `true` | Accept cash |
| `payment.card_enabled` | boolean | `true` | Accept card |
| `payment.upi_enabled` | boolean | `true` | Accept UPI |
| `payment.wallet_enabled` | boolean | `false` | Accept wallet |
| `payment.gift_card_enabled` | boolean | `false` | Accept gift card |
| `payment.refund_to_original_method` | boolean | `true` | Refund to source |
| `payment.allow_cash_refund` | boolean | `false` | Cash refund for digital |

## Promotions (`promo.*`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `promo.max_codes_per_order` | integer | `1` | Code cap |
| `promo.allow_promo_with_member_discount` | boolean | `false` | Stack with membership |

## Notifications (`notification.*`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `notification.booking_confirmation_channel` | array | `["sms"]` | Channels |
| `notification.pre_visit_reminder_enabled` | boolean | `false` | Pre-visit reminder |
| `notification.pre_visit_reminder_hours` | integer | `24` | Lead time |
| `notification.waiver_reminder_enabled` | boolean | `true` | Waiver reminder |
| `notification.waiver_reminder_hours` | integer | `12` | Reminder lead time |

## Invoicing (`invoice.*`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `invoice.auto_generate_on_payment` | boolean | `true` | Auto-generate |
| `invoice.number_prefix` | string | `"INV"` | Prefix |
| `invoice.number_sequence_start` | integer | `1` | Starting number |
| `invoice.show_tax_breakdown` | boolean | `true` | CGST/SGST split |
| `invoice.include_hsn_codes` | boolean | `false` | HSN/SAC on lines |

## Reporting (`reporting.*`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `reporting.daily_rollup_time` | string | `"02:00"` | Nightly job time (HH:MM) |
| `reporting.live_headcount_enabled` | boolean | `true` | Real-time occupancy |
| `reporting.data_retention_months` | integer | `36` | Data retention |

---

*End of VenuePlus Product Specification v2.0*
