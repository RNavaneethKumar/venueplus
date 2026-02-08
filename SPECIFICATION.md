# VenuePlus Master Technical Specification

**Version:** 1.4 (Consolidated)
**Project Scope:** All-in-one SaaS for Venue Operations, Multi-Currency Finance, and Behavioral Marketing

---

## 1. Core Ticketing & Resource Engine

This module manages the physical constraints of the venue and the logic of time-based access.

### 1.1 Time-Slot Management

* **Fixed Sessions**
  Hard-coded intervals (e.g., `10:00 - 11:00`). Used for classes and capacity-heavy attractions.

* **Rolling Admissions**
  “Clock starts at the gate.” Logic calculates validity from the moment of first successful scan.

### 1.2 Resource-Based Capacity Architecture

* **Finite Resources**
  Physical zones with strict limits (e.g., *Jump Arena = 50 pax*).
  The system must block sales across all platforms once the limit is reached.

* **Open Resources**
  Zones with soft limits (e.g., *Arcade floor*).
  Tracked for occupancy reporting but do **not** restrict ticket sales.

### 1.3 Combo & Bundle Logic

* **“Block Everything” Strategy**
  For multi-attraction passes, the system performs a real-time availability check on **all linked finite resources**.
  If any one resource is at capacity, the entire combo product is marked **Sold Out**.

### 1.4 Dynamic Pricing Engine

* **Attribute Modifiers**
  Base products (e.g., *General Admission*) use modifiers for *Adult*, *Child*, or *Senior* rather than creating separate products.

* **Rule Priority**
  Logic must resolve conflicts between:

  * Peak / Off-Peak pricing profiles
  * Bulk / Advance purchase discounts

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
