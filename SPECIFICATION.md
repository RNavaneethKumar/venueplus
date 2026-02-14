# VenuePlus Master Technical Specification

**Version:** 1.4 (Consolidated)
**Project Scope:** All-in-one SaaS for Venue Operations, Multi-Currency Finance, and Behavioral Marketing

---

## 1. 🎟 Ticketing & Resource Management

## 🧭 A. Admission Models

---

### 1️⃣ Fixed Session Booking

Examples:

* Laser tag game: 10:00–10:30
* Escape room: 2:00–3:00 PM
* Trampoline fitness class

System Requirements:

* Predefined start/end time
* Limited capacity per session
* Entry allowed only within session window
* Reservation consumes capacity at purchase
* Late entry policy configurable

---

### 2️⃣ Rolling Admission — **Open Capacity**

Examples:

* Indoor play zone
* Arcade free play
* Museum access

System Requirements:

* Duration-based validity (e.g., 60 mins)
* Validity starts on first scan
* Capacity optionally tracked (soft capacity)
* Does NOT block purchase when full
* Used for reporting only

---

### 3️⃣ Rolling Admission — **Fixed Capacity** ✅ (Key Decision)

Examples:

* 1-Hour Jump Pass (Arena Capacity = 50)
* Soft Play Area (Max 40 kids)

#### Core Problem:

System does not know when users will exit.

#### Adopted Solution:

Use **Rolling Window Capacity Commitment**.

At time of purchase:

System assumes user will occupy:

```
purchase_time → purchase_time + duration
```

Example:

Customer buys at 2:00 PM (60 min pass):

Capacity commitment = 2:00 → 3:00 PM

---

### Purchase-Time Behavior:

System checks:

```
Active reservations +
Future commitments overlapping that window
```

If:

```
occupancy < capacity → allow sale
else → block sale
```

Customer is informed:

> “Next available entry: 2:30 PM”

Based on earliest future window where capacity is available.

---

### Scan-Time Behavior:

Gate:

* Validates reservation
* Validates waiver
* DOES NOT re-check capacity

Capacity is committed at purchase.

---

### 4️⃣ All-Day / Open Entry

Examples:

* Theme park entry
* Water park
* Museum day pass

System Requirements:

* Valid entire day
* Multiple entries allowed (optional)
* Capacity tracked optionally (soft)
* Does not restrict sale

---

### 5️⃣ Multi-Day Pass

Examples:

* 3-day ski pass
* Weekend pass
* Camp access

System Requirements:

* Valid across multiple days
* One-entry-per-day or unlimited (configurable)

---

---

## 🧍 B. Visitor Assignment Model

---

### 6️⃣ Anonymous Purchase (Common Case)

Example:

Parent buys:

* 3 child tickets

System stores:

| Reservation | Visitor Type | Assigned Person |
| ----------- | ------------ | --------------- |
| R1          | child        | NULL            |
| R2          | child        | NULL            |
| R3          | child        | NULL            |

Only:

* Quantity
* Visitor type
* Slot

are known at purchase.

---

### 7️⃣ Named Assignment Later

Before visit:

Parent:

* Creates child profiles
* Assigns reservations
* Signs waiver

| Reservation | Person  |
| ----------- | ------- |
| R1          | Child A |
| R2          | Child B |
| R3          | Child C |

Gate validates:

```
reservation.assigned_person_id
→ waiver exists?
```

---

---

## ✍️ C. Waiver Model (Minors)

---

### At Purchase:

Parent signs:

> Signing on behalf of 3 minors

System captures:

* Signer (guardian)
* Covered capacity = 3 minors

Names NOT required at this stage.

---

### Before Entry:

Each reservation must be assigned:

* A person
* A valid waiver

Entry is denied if:

* Reservation assigned
* But waiver missing

---

---

## 🧮 D. Capacity Behavior

---

### 8️⃣ Hard Capacity Resources

Examples:

* Jump Arena
* Laser Tag Room
* Escape Room

System:

* Blocks sale when capacity full
* Reservations consume capacity
* Capacity NOT restored on no-show

---

### 9️⃣ Soft Capacity Resources

Examples:

* Arcade floor
* Museum

System:

* Tracks occupancy
* Does not restrict purchase

---

### 🔟 Cross-Resource Bundles

Examples:

* Jump + Ninja Course
* Laser Tag + Bowling

System:

* Must check availability across ALL resources
* If any full → bundle unavailable

---

---

## 🚪 E. Entry Behavior

---

### 1️⃣1️⃣ Single Entry

Examples:

* Laser tag session

---

### 1️⃣2️⃣ Multiple Entry Allowed

Examples:

* Museum ticket
* Water park pass

---

### 1️⃣3️⃣ Time-Limited Entry

Examples:

* 1-hour jump pass

First scan:

```
starts validity timer
```

Subsequent scans:

```
check expiry
```

---

---

## 🎉 F. Group / Event Integration

---

### 1️⃣4️⃣ Group Reservations

Examples:

* Birthday party

System:

* Reserves multiple spots together
* Linked to event
* Capacity consumed upfront

---

---

## 🔄 G. Modification Rules

---

### 1️⃣5️⃣ Rebooking

Example:

Move from 2 PM → 4 PM

System:

* Moves reservation
* Capacity adjusted

---

### 1️⃣6️⃣ Partial Cancellation

Example:

5 tickets booked → 1 canceled

System:

* Cancels reservation
* Capacity remains lost (no-show policy)

---

---

## 💰 H. Pricing Scenarios

---

### Visitor Type Pricing

* Adult
* Child
* Senior
* Member

---

### Quantity-Based Pricing

Bulk pricing slabs

---

### Promotional Offers

* B2G1
* Buy X Get Y
* Bundle discount

---

### Time-Based Pricing

* Early Bird
* Advance booking

---

### Peak / Off-Peak

* Weekend pricing
* Holiday pricing

---

### Channel-Based Pricing

* Online vs Walk-in

---

### Membership-Based

* Discount
* Allowance

---

### Promo Codes

* Flat / %
* Product scoped

---

### Manual Override

* POS only
* Audit logged
* Supervisor approval

---

### Pricing Evaluation Order

```
1. Base Product Price
2. Time-Based Pricing
3. Quantity-Based Pricing
4. Bundle / BOGO
5. Early Bird / Advance
6. Membership
7. Promo Code
8. Manual Override
```

Each rule:

```
stackable = true / false
```

---

## 2. Membership & Family Architecture

Designed for recurring revenue and family-unit management.

### 2.1 Hybrid Benefit System

* **Discounts**
  Persistent percentage off specific categories (e.g., *10% off F&B*).

* **Allowances**
  A monthly recurring pool of **Credits** (e.g., *4 Jump Hours/month*).

### 2.2 Family Shared Pools

* **Account Hierarchy**
  One **Master Account** (Payer) manages multiple **Sub-Profiles** (Participants).

* **Quota Sharing**
  Credits are pooled at the **Family level**. Any authorized sub-profile can consume from the central credit balance.

### 2.3 Subscription Billing

* Support for **tokenized recurring billing**
* Automated status switching:

  * Active
  * Past Due
  * Canceled

---

## 3. Multi-Currency Wallet & POS

Unified cashiering system with restricted spending rules.

### 3.1 Unified Checkout

Basket must support mixed product types:

* Tickets (Time-based)
* Retail (Physical goods)
* Memberships (Contracts)

### 3.2 The Restricted Wallet Model

* **Real Cash**
  Refundable liability. Usable for all venue purchases.

* **Bonus Cash**
  Non-refundable promotional funds.

* **Redemption Points**
  Earned through arcade play.
  **Restriction:** Points can only be spent on **Retail / Prizes** and must never trigger entry ticket generation.

### 3.3 Accounting Burn Order

Spending logic must consume balances in this order:

1. Bonus Cash
2. Real Cash

This minimizes venue liability.

---

## 4. Integrated Waiver Module

A native legal compliance system replacing third-party dependencies.

### 4.1 The Relationship Model

* **One-to-Many**
  One adult/guardian can sign on behalf of themselves and multiple minors.

### 4.2 Security & OTP Policy

* **Mandatory OTP**
  Phone or Email verification required to:

  * View
  * Sign
  * Resume a partially completed waiver

* **Venue-Level Configuration**
  Toggle between:

  * Mandatory OTP
  * Quick Sign (for walk-ins)

### 4.3 Legal Data Integrity

* **Immutable Snapshots**
  Every signature generates a PDF version of the exact template used.

* **Digital Fingerprinting**
  SHA-256 hash of the PDF is stored in the database to prove non-tampering.

* **Metadata Audit**
  Each signature records:

  * IP address
  * Device User-Agent
  * Millisecond timestamps

---

## 5. Inventory & F&B Operations

Back-of-house management for physical goods.

### 5.1 Merchandise Matrix

Product variants (e.g., *Grip Socks*) are linked to specific physical SKUs (e.g., `Socks-Red-Small`).

### 5.2 Kitchen Routing Logic

* Orders are routed to **Preparation Stations** based on category.
* Output supports:

  * Physical thermal printers
  * KDS (Kitchen Display System) screens

### 5.3 Stock Tracking

* **Level 1 Inventory Model:** *Sold = Deducted*
* Supports manual stock adjustments with **mandatory audit reason codes**

---

## 6. Advanced CRM & Growth Marketing

The behavioral engine used to increase **Customer Lifetime Value (LTV)**.

### 6.1 Customer 360 View

Centralized timeline showing:

* Ticket scans
* Purchases
* Waiver signatures
* Staff notes

### 6.2 Dynamic Segmentation

* **Rules-Based Groups**
  Example: *Lapsed VIPs* → Spend > $200 **AND** Last Visit > 60 days

* **Behavioral Tags**
  Automatically applied based on actions:

  * First-Timer
  * Weekly Regular

### 6.3 Marketing Automations

* **Trigger Engine**
  Event-based actions (e.g., *2 hours after check-in → send Review SMS*).

* **Attribution**
  Tracks revenue back to specific Email/SMS campaign links.

---

## 7. Access Control & Security

The physical gatekeeper logic.

### 7.1 Strict Mode Validation

Gate API must deny entry if:

1. Ticket is expired or already used
2. No valid waiver is found for the participant linked to that ticket

### 7.2 RBAC (Role-Based Access Control)

* Permissions assigned to **Roles** at the venue level

* **Audit Log**
  Immutable record of sensitive actions:

  * Refunds
  * Manual gate unlocks
  * Waiver edits

---

## 8. Reporting & Business Intelligence

Data visualization and operational intelligence for venue owners.

### 8.1 Performance Aggregators

Nightly **roll-up jobs** populate:

* `daily_revenue_stats`
* `hourly_occupancy_stats`

This ensures fast dashboard performance.

### 8.2 Key Metrics

* **Live Headcount**
  Real-time occupancy = Entry Scans − Exit Scans

* **Financial Health**

  * Revenue by category
  * Payment method breakdown
  * Liability tracking (Unspent Wallet / Credits)

---
