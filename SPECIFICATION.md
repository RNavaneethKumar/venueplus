# VenuePlus Technical Specification (MVP)

**Version:** 1.1
**Status:** Approved for Database Design
**Scope:** Integrated Venue Management System (SaaS)

---

## 1. Ticketing & Booking Engine

*The core engine for selling access to the venue.*

### 1.1 Time Logic

* **Dual Support:** System must handle both time models simultaneously.
* **Fixed Slots:** Pre-defined sessions (e.g., "10:00 AM - 11:00 AM"). Usage: Classes, Escape Rooms.
* **Rolling Admissions:** Start time is determined at check-in (e.g., "1 Hour starts Now"). Usage: Trampoline Parks, Soft Play.



### 1.2 Capacity & Inventory Architecture

* **Resource-Based Capacity (Level 2):**
* Decouple **Products** (What is sold) from **Resources** (Physical space).
* **Resource Types:**
* *Finite:* Hard limits (e.g., Jump Arena = 50 pax). Stops sales when full.
* *Open:* Soft limits (e.g., Arcade Floor). Tracked for reporting but never blocks sales.




* **Combo Ticket Logic:** "Block Everything" strategy. A multi-attraction pass consumes 1 slot from *all* linked finite resources simultaneously to guarantee availability.

### 1.3 Pricing Engine

* **Product Structure:** **Single Product with Attributes** (Option B).
* *Example:* Base Product "Jump Pass" ($20) + Attribute "Child" (Modifier -$5).


* **Pricing Stack (Calculation Order):**
1. **Base Rate:** Default price of the product.
2. **Calendar Profile:** Overrides base rate for Peak/Off-Peak/Holiday/Weekend.
3. **Rule Engine:** Automated discounts (Quantity thresholds, Advance Booking windows).


* **Conflict Resolution:** Rules must have flags for:
* **Stackable:** Can be combined (e.g., Early Bird + Member Discount).
* **Exclusive:** Overrides all other discounts (e.g., Black Friday Flash Sale).



---

## 2. Membership Engine

*The retention and recurring revenue system.*

### 2.1 Benefit Logic

* **Hybrid Model (A + B):**
* **Discounts:** Percentage or Fixed Amount off specific Product Categories (e.g., "20% off F&B").
* **Allowances (Credits):** Monthly recurring balance of "Credits" (e.g., "5 Credits/Month").
* *Consumption:* Credits can be applied to Bookable Resources (1 Hour Jump) or Walk-in "Day Passes."



### 2.2 Family & Relationship Architecture

* **Structure:** **Master Account + Sub-Profiles (Group/Family).**
* **Role Logic:**
* **Master:** The Payer/Owner. Can also be a "Participant" (consume benefits).
* **Members:** Sub-profiles (e.g., children) linked to the Master.


* **Quota Logic:** **Shared Pools.** Allowances (e.g., "10 Credits") belong to the *Group* and can be consumed by the Master or any authorized Sub-Profile.

### 2.3 Billing

* **Supported Types:**
* **Prepaid Term:** Upfront payment for fixed duration (e.g., Annual Pass).
* **Recurring Subscription:** Auto-renewal (e.g., Monthly) via tokenized payment.



---

## 3. POS & Wallet (Cashiering)

*The unified point of sale and financial transaction center.*

### 3.1 Checkout Experience

* **Unified Basket:** Must process Tickets (Time-based), Memberships (Contracts), Retail (Physical), F&B (Consumable), and Wallet Loads in a single transaction.
* **Payment Methods:** Cash, Credit/Debit, Split Payment, and **Venue Wallet**.

### 3.2 Digital Wallet / Cash Card

* **Architecture:** **Hybrid Wallet.**
* *Real Cash:* Refundable liability.
* *Bonus Cash:* Promotional/Non-refundable.


* **Logic:** System consumes Bonus Cash first (configurable) or based on venue accounting rules.
* **Functions:** Issue Card (RFID/QR), Load Funds, Spend Funds.
* **Scope Note:** Arcade hardware integration is *out of scope* for MVP.

---

## 4. Integrated Waiver Management

*Native legal compliance module (replaces external WSR system).*

### 4.1 Legal Validity Engine

* **Content Integrity:** System must generate an immutable **PDF Snapshot** at the moment of signing.
* **Security:** PDF must be hashed to prove non-tampering.
* **Metadata Capture:** Record IP Address, Device User-Agent, and Timestamp (ms) for every signature.
* **Identity Verification:**
* **Configurable OTP:** Venue-level setting. (Enable/Disable OTP verification via SMS/Email before signing).



### 4.2 Relationship Model

* **Entities:**
* **Signer:** The Adult/Guardian (Legal capability to sign).
* **Subject:** The Minor/Participant (The person exposed to risk).


* **Workflow:** One-to-Many. A single signing event by a Guardian can cover multiple Subjects (Minors).

### 4.3 Integration Points

* **Kiosk Mode:** Public-facing URL for walk-ins to sign *before* transaction. Creates a "Pre-Booking" record.
* **POS Trigger:** Instant lookup by Name/Phone. If waiver missing, POS prompts to send link or sign on tablet.

---

## 5. Access Control (The Gate)

*Validation and entry management.*

### 5.1 Interface Support

* **Staff App:** Handheld device view for manual scanning and exception handling.
* **Turnstile API:** Standard signal protocol ("Pulse to Open") for automated gates.

### 5.2 Validation Logic

* **Strict Mode:** Gate strictly denies entry if no valid waiver is linked to the ticket holder, regardless of ticket validity.
* **Re-Entry Rules:** Configurable at the **Product Level**.
* *Single Entry:* Ticket burned on first scan.
* *Unlimited:* Valid until session timer expires.



---

## 6. Inventory & F&B

*Back-of-house stock management.*

### 6.1 Stock Tracking

* **Complexity:** **Level 1 (Item Tracking).** 1 Unit Sold = 1 Unit Deducted. (No ingredient-level recipe tracking).
* **Variants:** Support for Product Matrices (Size/Color/Style) for retail items.

### 6.2 Kitchen Operations

* **Routing:** POS "Routing Table" sends items to specific destinations (Drinks  Bar; Food  Kitchen).
* **Output:** Support **Both** Kitchen Printers and KDS (Kitchen Display Systems).

---

## 7. Admin & Configuration

*System configuration and user management.*

### 7.1 Venue Settings

* Global configs: Operating Hours (Standard + Holiday), Tax Rules, Currency.
* **Waiver Config:** Rich-text editor for legal text, Validity Period (e.g., 365 days), Minors Age Limit (e.g., <18).

### 7.2 Security (RBAC)

* **Role-Based Access Control:**
* *Super Admin:* Full Access.
* *Manager:* Ops + Refunds.
* *Cashier:* Sales + Check-in (No Refunds).
* *Kitchen:* View Only.


* **Audit Log:** Immutable record of sensitive actions (Refunds, Overrides, Discounts > Limit).

---

## 8. Reporting & Analytics

*Data visualization and business intelligence.*

### 8.1 Dashboard Views

* **Real-Time Ops:** Live occupancy (Resources), Incoming bookings, Waiver compliance status.
* **Daily Financials (Closeout):** Revenue by Category, Payment Methods (Cash vs. Liability), Discounts, Voids/Refunds.
* **Strategic Analytics:** Customer LTV, Retention Rates, Heatmaps (Peak times), Membership Churn.

---
