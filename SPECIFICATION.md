# VenuePlus Software Specification (MVP)

**Version:** 1.0
**Status:** Draft / Scope Definition
**Focus:** Comprehensive Venue Management System (SaaS)

---

## 1. Ticketing & Booking Engine

*The core engine for selling access to the venue.*

### 1.1 Time Logic

* **Requirements:** Must support both distinct time models simultaneously.
* **Fixed Slots:** Pre-defined sessions (e.g., "10:00 AM - 11:00 AM"). Used for classes, escape rooms, or peak-capacity management.
* **Rolling Admissions:** Start time is determined at check-in (e.g., "1 Hour starts Now"). Used for general park access.



### 1.2 Capacity & Inventory Architecture

* **Logic:** **Resource-Based Capacity (Level 2)**.
* Decouple **Products** (What is sold) from **Resources** (Physical space).
* **Resource Types:**
* *Finite:* Hard limits (e.g., Trampoline Court = 50 pax). Stops sales when full.
* *Open:* Soft limits (e.g., Arcade Floor). Tracked for reporting but never blocks sales.




* **Combo Ticket Logic:** "Block Everything." A multi-attraction pass consumes 1 slot from *all* linked finite resources simultaneously to guarantee availability.

### 1.3 Pricing Engine

* **Product Structure:** **Single Product with Attributes** (Option B).
* Base Product: "Jump Pass" ($20).
* Attribute: "Child" (Modifier: -$5).


* **Pricing Stack:**
1. **Base Rate:** Default price.
2. **Calendar Profile:** Overrides base rate for Peak/Off-Peak/Holiday.
3. **Rule Engine:** Automated discounts (Quantity, Advance Booking).


* **Conflict Resolution:** Rules must have flags for **Stackable** (can combine) or **Exclusive** (overrides all others).

---

## 2. Membership Engine

*The retention and recurring revenue system.*

### 2.1 Benefit Logic

* **Hybrid Model (A + B):**
* **Discounts:** % or $ off specific categories (e.g., "20% off F&B").
* **Allowances (Credits):** Monthly recurring balance of "Credits" or "Visits" (e.g., "5 Free Jumps per month").
* *Usage:* Credits can be applied to Bookable Resources or Walk-in "Day Passes."



### 2.2 Family & Relationship Architecture

* **Structure:** **Master Account + Sub-Profiles (Group/Family).**
* **Role Logic:** The "Master" (Payer) can also be a "Participant" (Member).
* **Quota Logic:** **Shared Pools.** Allowances (e.g., "10 Credits") belong to the Group and can be consumed by any authorized Sub-Profile.

### 2.3 Billing

* **Supported Types:**
* **Prepaid Term:** Upfront payment for fixed duration (e.g., Annual Pass).
* **Recurring Subscription:** Auto-renewal (e.g., Monthly) via tokenized payment.



---

## 3. POS & Wallet (Cashiering)

*The unified point of sale and financial transaction center.*

### 3.1 Checkout Experience

* **Unified Basket:** Must process Tickets (Time-based), Memberships (Contracts), Retail (Physical), and F&B (Consumable) in a single transaction.
* **Payment Methods:** Cash, Credit/Debit, Split Payment, and **Venue Wallet**.

### 3.2 Digital Wallet / Cash Card

* **Architecture:** **Hybrid Wallet.**
* *Real Cash:* Refundable liability.
* *Bonus Cash:* Promotional/Non-refundable.


* **Logic:** System consumes Bonus Cash first (configurable).
* **Functions:** Issue Card (RFID/QR), Load Funds, Spend Funds.
* **Scope Note:** Arcade hardware integration is *out of scope* for MVP.

---

## 4. Access Control (The Gate)

*Validation and entry management.*

### 4.1 Interface Support

* **Staff App:** Handheld device for manual scanning and exception handling (e.g., "Sign Waiver Here").
* **Turnstile API:** Standard signal protocol ("Pulse to Open") for automated gates.

### 4.2 Compliance & Validation

* **Waiver Logic:** **Profile-Based (Path B)**. Valid for X months.
* **Enforcement:** **Strict Mode.** Gate strictly denies entry if no valid waiver is linked to the ticket holder, regardless of ticket validity.

### 4.3 Re-Entry Rules

* **Configuration:** Defined at the **Product Level**.
* *Single Entry:* Ticket burned on scan.
* *Unlimited Re-entry:* Valid until session timer expires.



---

## 5. Inventory & F&B

*Back-of-house stock management.*

### 5.1 Stock Tracking

* **Complexity:** **Level 1 (Item Tracking).** 1 Unit Sold = 1 Unit Deducted. (No ingredient-level recipe tracking for MVP).
* **Variants:** Support for Product Matrices (Size/Color/Style) for retail items like socks.

### 5.2 Kitchen Operations

* **Production Routing:** POS must support routing rules (Drinks  Bar; Food  Kitchen).
* **Output Formats:** Must support **Both** Kitchen Printers and KDS (Kitchen Display Systems).

---

## 6. Admin & Configuration

*System configuration and user management.*

### 6.1 Venue Settings

* Global configs: Operating Hours (Standard + Holiday), Tax Rules, Currency, Legal/Waiver text editor.

### 6.2 Security (RBAC)

* **Role-Based Access Control:** Granular permissions.
* *Super Admin:* All access.
* *Manager:* Ops + Refunds.
* *Cashier:* Sales + Check-in (No Refunds).
* *Kitchen:* View Only.


* **Audit Log:** Immutable record of sensitive actions (Refunds, overrides).

---

## 7. Reporting & Analytics

*Data visualization and business intelligence.*

### 7.1 Dashboard Views

* **Real-Time Ops:** Live occupancy, Incoming bookings, Waiver status, Staff active.
* **Daily Financials (Closeout):** Revenue by Category, Payment Methods (Cash vs. Liability), Discounts, Voids/Refunds.
* **Strategic Analytics:** Customer LTV, Retention Rates, Heatmaps (Peak times), Membership Churn.

---
