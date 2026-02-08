# 🧍 VenuePlus Identity & Relationship Model (Core Layer)

This is the **foundation layer** that Memberships, Wallets, CRM, Waivers, and Bookings all sit on top of.

---

## 1️⃣ Entity 1 — **Account** (Financial Owner)

An **Account** represents a paying or organizing entity.

### Examples

* A family (parent managing kids)
* A corporate company booking events
* A school organizing a trip
* An individual adult customer

### Account Holds

* Wallet balances (real cash, bonus cash)
* Membership subscriptions (family plans)
* Event bookings
* Invoices & payment history

---

## 2️⃣ Entity 2 — **Person Profile** (Individual Human)

Each real human = **one global Person record**

This profile travels across visits, venues, and accounts.

### Person Profile Stores

* Name, DOB, gender (optional)
* Photo (future optional)
* Waiver records
* Entry history
* CRM behavioral tags
* Membership usage history

A Person may:

* Be a child in one family
* A participant in a school trip
* Later become an adult account owner

Same person. Same history.

---

## 3️⃣ Entity 3 — **Account ↔ Person Relationship**

This is where permissions and roles are defined.

### Relationship Types

| Role            | Meaning                         |
| --------------- | ------------------------------- |
| **Owner**       | Financial controller of account |
| **Guardian**    | Can sign waivers for minors     |
| **Member**      | Can consume membership benefits |
| **Participant** | Can attend bookings             |
| **Viewer**      | Can see bookings but not manage |

One person can have **different roles in different accounts**.

---

## 4️⃣ Why Multi-Account Person Matters

| Scenario             | How Model Handles It                         |
| -------------------- | -------------------------------------------- |
| Divorced parents     | Child linked to both accounts as participant |
| School field trip    | Child linked to school account temporarily   |
| Corporate family day | Employee linked to company account           |
| Teen grows up        | Same person becomes new account owner later  |

No duplicate profiles. History stays unified.

---

## 5️⃣ How Other Modules Attach

| Module          | Attaches To                                    |
| --------------- | ---------------------------------------------- |
| **Tickets**     | Person (attendee) + Account (payer)            |
| **Events**      | Account (host) + Persons (guests)              |
| **Memberships** | Account (owner) → benefits consumed by Persons |
| **Wallets**     | Primarily Account, optionally Person-specific  |
| **Waivers**     | Person (participant) + Guardian Person         |
| **CRM**         | Person behavioral timeline                     |

---

## 6️⃣ Permissions Logic (High Level)

System must check relationship roles before allowing actions:

| Action                | Required Role            |
| --------------------- | ------------------------ |
| Pay for booking       | Account Owner            |
| Use membership credit | Member                   |
| Sign child waiver     | Guardian                 |
| Modify event booking  | Owner or authorized role |

---

## 7️⃣ Identity Matching & Deduplication (Future-Proofing)

Since same person can appear in multiple contexts:

Primary identity keys:

* Phone number (country-specific)
* Email
* Name + DOB fallback

System should support:

* Merging duplicate person profiles (admin tool)
* Linking existing person to new account without duplication

---
---


# 🎟️ VenuePlus — Ticketing & Bookings Module Specification

---

## 1️⃣ Core Concepts

### 1.1 Sellable Product Types (Ticketing Scope)

| Type                  | Description                                | Example              |
| --------------------- | ------------------------------------------ | -------------------- |
| **Time-Based Ticket** | Grants access to a resource for a duration | 1-Hour Jump Pass     |
| **Session Ticket**    | Valid only within a fixed slot window      | 4–5 PM Climb Session |
| **Day Pass**          | Valid any time during a day slot           | Museum Entry         |
| **Multi-Day Pass**    | Valid across multiple days                 | 3-Day Festival Pass  |
| **Combo Pass**        | Links multiple resources                   | Jump + Arcade Bundle |

Each product must define:

* Linked resource(s)
* Capacity binding mode
* Usage time rule

---

## 2️⃣ Resource Capacity Binding

### 2.1 Resource Modes

| Mode          | Behavior                |
| ------------- | ----------------------- |
| **UNLIMITED** | No capacity restriction |
| **FIXED**     | Controlled via slots    |

---

### 2.2 Slot Structure (For FIXED Resources)

| Field           | Meaning            |
| --------------- | ------------------ |
| slot_start_at   | Start time         |
| slot_end_at     | End time           |
| capacity_total  | Maximum allowed    |
| confirmed_count | Purchased capacity |
| hold_count      | Cart holds         |

Slots are generated from templates and may span multiple days.

---

## 3️⃣ Reservation Lifecycle

### 3.1 Reservation States

| State         | Meaning                              |
| ------------- | ------------------------------------ |
| **HELD**      | Temporarily reserved during checkout |
| **CONFIRMED** | Paid and capacity deducted           |
| **ACTIVE**    | First scan completed                 |
| **CONSUMED**  | Visit completed or expired after use |
| **NO_SHOW**   | Never scanned; slot expired          |
| **RELEASED**  | Hold expired or payment failed       |

**Capacity Impact**

* HELD → reduces available temporarily
* CONFIRMED onward → permanently consumes capacity

---

### 3.2 Hold Rules

| Rule          | Value                         |
| ------------- | ----------------------------- |
| Hold duration | Configurable (default 10 min) |
| Expiry action | Auto RELEASED                 |
| Concurrency   | Atomic lock on slot row       |

---

## 4️⃣ Booking Flow

### 4.1 Purchase Flow

1. User selects product
2. System determines required resource slot(s)
3. Capacity check performed
4. HELD reservations created
5. Payment initiated
6. On success → CONFIRMED
7. On failure/timeout → RELEASED

For combos: **all-or-nothing transaction**

---

### 4.2 Walk-In POS Flow

Same as online but:

* Staff may have override permission
* Overbook flag must be recorded

---

## 5️⃣ Usage Time Rules

This is independent from slot window.

### 5.1 Time Models

| Model                | Description                 |
| -------------------- | --------------------------- |
| **Fixed Window**     | Valid only inside slot time |
| **Rolling Duration** | Timer starts at first scan  |

---

### 5.2 Rolling Admission Logic

| Field         | Purpose                  |
| ------------- | ------------------------ |
| first_scan_at | Set at first entry       |
| expires_at    | first_scan_at + duration |

May exceed slot_end_at (allowed).

---

## 6️⃣ Entry & Exit Logic

### 6.1 Entry Scan Validation

Gate checks:

✔ Reservation exists
✔ State = CONFIRMED or ACTIVE
✔ Valid waiver exists
✔ Current time valid

On success:

* CONFIRMED → ACTIVE
* Set first_scan_at if null

---

### 6.2 Exit Scan

Optional but recommended.

If used:

* Updates occupancy stats
* Does NOT restore capacity

---

## 7️⃣ No-Show Policy (Locked)

If reservation not scanned by slot end:

`CONFIRMED → NO_SHOW`

Capacity remains consumed.

---

## 8️⃣ Re-entry Rules

Per-product config:

| Setting               | Behavior                                  |
| --------------------- | ----------------------------------------- |
| allow_reentry = false | First entry consumes ticket               |
| allow_reentry = true  | Multiple entries allowed until expires_at |

---

## 9️⃣ Combo Products

Combos create multiple reservations.

Rules:

* All reservations must succeed
* Linked under a parent order line
* Gate validates per-resource reservation

---

## 🔟 Overrides & Exceptions

### 10.1 Overbooking

Allowed for privileged roles.

| Field           | Purpose        |
| --------------- | -------------- |
| is_overbooked   | Boolean        |
| override_reason | Mandatory text |
| overridden_by   | Staff ID       |

Reported separately in BI.

---

## 11️⃣ Cancellations & Refunds

| Scenario                 | Capacity Action                      |
| ------------------------ | ------------------------------------ |
| Refund before slot start | Capacity restored                    |
| Refund after slot start  | Venue policy (default: not restored) |
| No-show                  | Not restored                         |

Refunds must trigger:

* Reservation state update
* Capacity counter adjustment (if applicable)

---

## 12️⃣ Reporting Fields Generated

Per slot:

* Capacity total
* Sold
* Held
* No-show count
* Overbook count
* Actual scans

---

## 13️⃣ Required Background Jobs

| Job                     | Purpose                   |
| ----------------------- | ------------------------- |
| Hold Expiry Worker      | Releases expired HELD     |
| No-Show Processor       | Marks CONFIRMED → NO_SHOW |
| Slot Generator          | Creates future slots      |
| Capacity Reconciliation | Detect mismatches         |

---
---

# 🎉 VenuePlus — Events & Party Booking

---

## 1️⃣ Architectural Position

Events are **composite bookings** that orchestrate multiple ticketing reservations + services.

> Events module = Orchestrator
> Ticketing engine = Capacity authority

---

## 2️⃣ Event Reservation Lifecycle

| State         | Trigger            | Capacity Impact              |
| ------------- | ------------------ | ---------------------------- |
| **INQUIRY**   | Lead created       | None                         |
| **OPTIONED**  | Soft hold placed   | Temporary hold               |
| **CONFIRMED** | **Deposit paid**   | ✅ Capacity deducted          |
| **FINALIZED** | Guest count locked | Adjust capacity if increased |
| **COMPLETED** | Event date passed  | None                         |
| **CANCELED**  | Per policy         | Capacity may be restored     |

---

## 3️⃣ Soft Holds (Optioned Bookings)

Used when parent says “Let me confirm with family.”

| Rule            | Value                                         |
| --------------- | --------------------------------------------- |
| Hold duration   | Configurable (e.g., 24–72 hrs)                |
| Capacity impact | Increases `hold_count`, not `confirmed_count` |
| Expiry action   | Auto-release                                  |

Same mechanism as cart holds — just longer TTL.

---

## 4️⃣ Deposit-Based Capacity Deduction (Locked)

When deposit is successfully paid:

* All linked resource reservations move
  `OPTIONED → CONFIRMED`
* Slot `confirmed_count` increases
* Event now blocks inventory like a normal ticket

If deposit fails or expires → reservations released.

---

## 5️⃣ Event = Multi-Resource Group Reservation

An event may include:

| Resource Type  | Example                      |
| -------------- | ---------------------------- |
| Room           | Party Room A (2–4 PM)        |
| Activity       | Jump Arena (2–3 PM, 12 kids) |
| Add-on Area    | Arcade Zone credits          |
| Staff (future) | Party host allocation        |

Each creates **quantity-based reservations** in ticketing.

---

## 6️⃣ Guest Capacity Model

### 6.1 Package Structure

| Field             | Meaning                    |
| ----------------- | -------------------------- |
| included_guests   | Covered in base price      |
| min_guests        | Minimum chargeable         |
| max_guests        | Physical or policy limit   |
| extra_guest_price | Per additional participant |

---

### 6.2 Adjusting Guest Count

| Action          | Capacity Impact                          |
| --------------- | ---------------------------------------- |
| Increase guests | Check slot capacity → Deduct more        |
| Decrease guests | No automatic release unless venue allows |

Venue policy toggle:

* Allow capacity release on reduction (rare)
* Or lock after FINALIZED stage

---

## 7️⃣ Payment Structure

Events support **split payments**:

| Payment Stage     | Purpose                               |
| ----------------- | ------------------------------------- |
| Deposit           | Required to confirm & deduct capacity |
| Scheduled Balance | Due X days before event               |
| On-site extras    | Post-event settlement                 |

Event order must support:

* Multiple invoices
* Balance tracking
* Auto reminders

---

## 8️⃣ Cancellation Rules

| Timing             | Capacity Action           |
| ------------------ | ------------------------- |
| Before cutoff date | Capacity restored         |
| After cutoff       | Capacity remains consumed |
| No-show event      | Capacity remains consumed |

This should be configurable per venue.

---

## 9️⃣ Event-Day Operations View

Staff dashboard must show:

| Info                 | Why           |
| -------------------- | ------------- |
| Timeline of events   | Room turnover |
| Expected guest count | Staffing      |
| Add-ons              | Kitchen prep  |
| Waiver completion %  | Risk control  |
| Balance due          | Billing       |

---

## 🔟 Guest & Waiver Handling

Event booking contains:

| Role                  | Data Stored       |
| --------------------- | ----------------- |
| Host Parent           | Primary contact   |
| Celebrant             | Child profile     |
| Guest List (optional) | Names for waivers |

System sends waiver links to:

* Host (for their child)
* Other parents (if guest list provided)

Each child still requires individual waiver validation at gate.

---

## 11️⃣ Relationship to Ticketing Engine

Under the hood, event booking creates:

* Resource reservations with `quantity > 1`
* Linked to one event order
* Managed via same state machine (HELD → CONFIRMED etc.)

So reporting can still show:

* Event-driven capacity usage
* Regular ticket usage

---

## 12️⃣ Overbooking Protection

Events are high-impact on capacity.

If staff tries to book beyond availability:

| Role        | Permission               |
| ----------- | ------------------------ |
| Sales staff | Blocked                  |
| Manager     | May override with reason |

Creates reservations flagged `is_overbooked = true`.

---

## 13️⃣ Reporting Additions

New metrics unlocked:

* Revenue from events vs regular tickets
* Party room utilization %
* Avg guests per party
* No-show event rate
* Lead → confirmed conversion rate

---
---

# 🎟️ VenuePlus — Membership & Benefits Engine

---

## 1️⃣ What Is a Membership in VenuePlus?

A **membership is a recurring contract** attached to an **Account**, which provides benefits that can be consumed by linked **Persons**.

It is NOT just a discount card — it is a **benefit entitlement system**.

---

## 2️⃣ Membership Ownership Model (Locked to Identity Layer)

| Entity               | Role                             |
| -------------------- | -------------------------------- |
| **Account**          | Owns and pays for the membership |
| **Persons (linked)** | Consume the benefits             |

So a **Family Membership** belongs to the parent account, but kids use the benefits.

---

## 3️⃣ Membership Types Supported

| Type                   | Example             | Key Behavior                    |
| ---------------------- | ------------------- | ------------------------------- |
| **Individual**         | Monthly Jump Pass   | Only one person can use         |
| **Family Shared**      | Family Fun Plan     | Multiple persons share benefits |
| **Named Multi-Member** | 3 Kids Play Plan    | Limited to X named profiles     |
| **Corporate/Group**    | Staff Wellness Pass | Assigned to employees           |

All use the same engine, just different constraints.

---

## 4️⃣ Membership Lifecycle

| Status        | Meaning                           |
| ------------- | --------------------------------- |
| **Active**    | Benefits usable                   |
| **Past Due**  | Payment failed, grace rules apply |
| **Suspended** | Temporarily disabled              |
| **Canceled**  | No further billing                |
| **Expired**   | Term ended                        |

---

### Status Change Triggers

| Trigger         | Result                   |
| --------------- | ------------------------ |
| Payment success | Remains Active           |
| Payment failure | Past Due                 |
| Grace exceeded  | Suspended                |
| User cancels    | Canceled at end of cycle |

---

## 5️⃣ Benefit Types (Core Engine)

Memberships grant **Benefits**, not products directly.

### 5.1 Discount Benefits

| Example                 | Rule                              |
| ----------------------- | --------------------------------- |
| 10% off F&B             | Applies automatically at checkout |
| 20% off weekday tickets | Condition-based                   |

Stored as **pricing modifiers**, not wallet value.

---

### 5.2 Allowance Benefits (Your Important One)

Recurring entitlements like:

| Example                    | Meaning              |
| -------------------------- | -------------------- |
| 4 Jump Hours/month         | Time-based allowance |
| 10 Visits/month            | Entry count          |
| ₹1000 Arcade Credits/month | Wallet allowance     |

These create **Allowance Buckets** that refill each cycle.

---

## 6️⃣ Allowance Bucket Logic

Each allowance benefit generates:

| Field           | Purpose         |
| --------------- | --------------- |
| total_per_cycle | Entitlement     |
| used_in_cycle   | Consumption     |
| remaining       | Auto-calculated |
| cycle_start/end | Reset window    |

---

### 6.1 Consumption Rules

When a person linked to account makes a booking:

System checks:

1. Eligible membership?
2. Available allowance?
3. Applies benefit → deducts allowance

If insufficient → charge normal price.

---

## 7️⃣ Family Shared Pool (You Designed This Earlier)

Because we chose multi-person accounts:

Allowance buckets belong to **Account**, not person.

| Scenario           | Result                           |
| ------------------ | -------------------------------- |
| 4 jump hours       | Any linked child can use         |
| One child uses all | Others cannot unless more bought |

Optional future rule: per-person cap.

---

## 8️⃣ Named Member Constraints (Optional Plan Type)

Some plans allow only X people.

System needs:

| Field               | Purpose               |
| ------------------- | --------------------- |
| max_linked_members  | Limit                 |
| enrolled_person_ids | Who is allowed to use |

Prevents 1 family sharing with 10 kids.

---

## 9️⃣ Membership + Ticketing Interaction

When booking:

1. Ticket added to cart
2. System checks linked persons
3. Membership benefits evaluated
4. Price adjusted OR allowance consumed
5. Reservation created normally

Capacity rules still apply.

---

## 🔟 Membership + Events Interaction

Events may include member benefits:

| Example                  | Behavior                |
| ------------------------ | ----------------------- |
| Member discount on party | Applies to base package |
| Member kids included     | Counts toward allowance |

This requires event pricing engine to also check memberships.

---

## 11️⃣ Past Due & Grace Rules

Important for real-world ops.

| Status                  | Benefit Access              |
| ----------------------- | --------------------------- |
| Active                  | Full access                 |
| Past Due (within grace) | Allow benefits              |
| Suspended               | Block benefits, allow renew |
| Canceled                | No benefits                 |

Grace period configurable (e.g., 5 days).

---

## 12️⃣ Rollover Policy (Must Be Configurable)

For unused allowances:

| Option           | Behavior                |
| ---------------- | ----------------------- |
| No rollover      | Reset monthly           |
| Limited rollover | Carry forward up to cap |
| Full rollover    | Rare, premium plans     |

Stored per benefit type.

---

## 13️⃣ Upgrade / Downgrade Handling

When plan changes mid-cycle:

| Scenario  | Action                          |
| --------- | ------------------------------- |
| Upgrade   | Prorate and increase allowances |
| Downgrade | Apply next cycle                |
| Cancel    | Benefits valid until period end |

---

## 14️⃣ Abuse Protection

To prevent misuse:

| Rule                                                   | Purpose |
| ------------------------------------------------------ | ------- |
| Same person cannot consume two benefits simultaneously |         |
| Identity verification at gate                          |         |
| Named-member limits                                    |         |
| Usage audit logs                                       |         |

---

## 📊 Reporting from Membership Engine

Venues can see:

* Active member count
* Allowance usage rates
* Expiring members
* Revenue from memberships vs tickets
* Member visit frequency vs non-members

This feeds your **behavioral CRM engine** later.

---
---

# 💳 VenuePlus Wallet & Stored Value System

**Final Technical Specification**

---

## 1️⃣ Wallet Ownership Model

A wallet can be attached to:

| Owner Type         | Use Case                             |
| ------------------ | ------------------------------------ |
| **Account Wallet** | Family funds, shared balances        |
| **Person Wallet**  | Arcade card, individual play credits |

Each wallet can contain **multiple balance ledgers**.

---

## 2️⃣ Supported Balance Types

| Balance Type          | Refundable           | Where It Can Be Used              | Financial Nature      |
| --------------------- | -------------------- | --------------------------------- | --------------------- |
| **Real Cash**         | ✅ Yes (policy-based) | Tickets, F&B, Retail, Memberships | Refundable liability  |
| **Bonus Cash**        | ❌ No                 | Tickets, F&B (venue configurable) | Promotional liability |
| **Game Play Credits** | ❌ No                 | Arcade / game devices only        | Deferred revenue      |
| **Redemption Points** | ❌ No                 | Retail / prize redemption only    | Deferred COGS         |

Each balance type is stored in a **separate ledger**.

---

## 3️⃣ Spending Restrictions Engine

The system must enforce **category-based restrictions**.

| Purchase Category   | Allowed Balances              |
| ------------------- | ----------------------------- |
| Tickets             | Real Cash, Bonus Cash         |
| F&B                 | Real Cash, Bonus Cash         |
| Retail              | Real Cash, Bonus Cash, Points |
| Membership Purchase | Real Cash only (recommended)  |
| Arcade Games        | Game Play Credits only        |
| Prize Redemption    | Redemption Points only        |

Game devices should only query **Game Play Credits**.

---

## 4️⃣ Burn Order Rules

Burn order applies **only among eligible balances**.

### Default Order

1. Bonus Cash
2. Real Cash

Game Play Credits and Points do not mix with others.

---

## 5️⃣ Wallet Ledger Design

Every change creates an immutable ledger record.

| Field            | Purpose                                 |
| ---------------- | --------------------------------------- |
| wallet_id        | Wallet reference                        |
| balance_type     | Real / Bonus / Game / Points            |
| transaction_type | Load, Spend, Expiry, Refund, Adjustment |
| amount_change    | Positive or negative                    |
| source_type      | POS, Online, Arcade, Membership, Admin  |
| reference_id     | Order, game session, membership, etc.   |
| created_at       | Timestamp                               |
| created_by       | System or staff ID                      |

**Balances must always be derived from ledger**, not stored statically.

---

## 6️⃣ Balance Loading Sources

| Source               | Resulting Balance Type                   |
| -------------------- | ---------------------------------------- |
| POS top-up           | Real Cash or Game Credits (venue choice) |
| Online preload       | Real Cash or Game Credits                |
| Membership allowance | Bonus Cash or Game Credits               |
| Promo campaign       | Bonus Cash                               |
| Arcade gameplay      | Redemption Points                        |

---

## 7️⃣ Refund Handling

Refund logic must respect original balance type.

| Original Payment  | Refund Destination              |
| ----------------- | ------------------------------- |
| Credit/Debit Card | Same card                       |
| Real Cash Wallet  | Real Cash Wallet                |
| Bonus Cash        | Not refundable                  |
| Game Credits      | Not refundable                  |
| Points            | Only reversed if prize returned |

No conversion between balance types allowed.

---

## 8️⃣ Expiry Rules (Configurable)

| Balance Type | Typical Expiry Behavior                      |
| ------------ | -------------------------------------------- |
| Real Cash    | Often no expiry (jurisdictional)             |
| Bonus Cash   | Short promotional expiry                     |
| Game Credits | Medium expiry (e.g., 6–12 months inactivity) |
| Points       | Long expiry or inactivity-based              |

Expiry must create a ledger entry:
`transaction_type = EXPIRY`

---

## 9️⃣ Wallet Transfers

Allowed only in controlled scenarios:

| Transfer Type                        | Allowed?                |
| ------------------------------------ | ----------------------- |
| Account → Person (child arcade card) | ✅ Yes                   |
| Person → Account                     | Optional (venue policy) |
| Bonus → Real conversion              | ❌ Never                 |
| Game Credits → Cash                  | ❌ Never                 |
| Points → Cash                        | ❌ Never                 |

All transfers create ledger records on both wallets.

---

## 🔟 Integration With Other Modules

### Ticketing

Wallets can pay for bookings using eligible balances.

### Memberships

Memberships can auto-load:

* Bonus Cash
* Game Play Credits

### Events

Wallets can pay event balances or add-ons.

### Arcade Systems

Game devices deduct **Game Play Credits only**.

---

## 11️⃣ Fraud & Abuse Controls

| Risk                               | Prevention                  |
| ---------------------------------- | --------------------------- |
| Staff issuing fake credits         | Role-based permission       |
| Converting non-refundable balances | Strict ledger type rules    |
| Ticket purchase via points         | Category restriction engine |
| Unauthorized wallet use            | Card/PIN/QR validation      |

All manual adjustments require:

* Reason code
* Manager role
* Audit log entry

---

## 12️⃣ Financial & Operational Reporting

Venues must be able to track:

| Metric                        | Meaning                     |
| ----------------------------- | --------------------------- |
| Outstanding Real Cash         | Refundable liability        |
| Outstanding Game Credits      | Deferred revenue            |
| Bonus Cash issued vs redeemed | Promo performance           |
| Points issued vs redeemed     | Prize liability             |
| Expired balances (breakage)   | Revenue recognition support |

---
---

# 🧠 VenuePlus — Customer 360 CRM & Behavioral Automation

This module turns **visits, spending, memberships, and gameplay** into actionable marketing.

---

## 1️⃣ Customer 360 Profile (Person-Centric)

The CRM is built around the **Person Profile**, not just the paying account.

### Each Person Profile Shows

| Section             | Data Included                |
| ------------------- | ---------------------------- |
| Identity            | Name, age, guardian links    |
| Visit History       | Entry/exit scans, frequency  |
| Spending            | Tickets, F&B, retail         |
| Gameplay            | Credits spent, points earned |
| Membership Usage    | Allowances consumed          |
| Waivers             | Signed, expired, guardian    |
| Event Participation | Parties attended             |
| Behavioral Tags     | First Timer, VIP, Lapsed     |

This becomes the **single source of truth** for guest behavior.

---

## 2️⃣ Activity Timeline (Event Stream)

Every interaction generates a **timestamped activity event**:

| Event Type | Examples                 |
| ---------- | ------------------------ |
| Visit      | Entry scan, exit scan    |
| Purchase   | Ticket, F&B, retail      |
| Wallet     | Top-up, spend, expiry    |
| Membership | Joined, renewed, expired |
| Event      | Party attended           |
| Waiver     | Signed, expiring soon    |

This timeline feeds both **staff insights** and **automation triggers**.

---

## 3️⃣ Dynamic Segmentation Engine

Segments are **live rule-based groups**.

### Example Rules

| Segment           | Logic                    |
| ----------------- | ------------------------ |
| First-Timers      | Visit count = 1          |
| Lapsed Guests     | Last visit > 60 days     |
| High Spenders     | Lifetime spend > ₹15,000 |
| Arcade Fans       | Game credits spent > X   |
| Birthday Upcoming | DOB within next 14 days  |

Segments update automatically as behavior changes.

---

## 4️⃣ Behavioral Tags (Auto-Applied Labels)

Tags are simpler, faster markers.

| Tag            | Trigger                  |
| -------------- | ------------------------ |
| First Visit    | After first scan         |
| Weekly Regular | ≥ 4 visits in 30 days    |
| VIP            | Lifetime spend threshold |
| Party Host     | Booked an event          |
| Member         | Active membership        |

Tags power fast filtering for staff and campaigns.

---

## 5️⃣ Marketing Automation Engine

This is the **trigger-action system**.

### 5.1 Trigger Types

| Trigger     | Example               |
| ----------- | --------------------- |
| Time-Based  | Birthday approaching  |
| Visit-Based | First visit completed |
| Spend-Based | Crossed ₹5,000 spend  |
| Inactivity  | No visit in 45 days   |
| Membership  | Expiring in 7 days    |
| Event       | Party completed       |

---

### 5.2 Actions

| Action             | Channel                           |
| ------------------ | --------------------------------- |
| Send Offer         | SMS / Email / WhatsApp            |
| Issue Bonus Cash   | Wallet credit                     |
| Issue Game Credits | Arcade promo                      |
| Send Reminder      | Waiver expiry, membership renewal |
| Tag Customer       | Move to VIP list                  |

---

## 6️⃣ Attribution Tracking

Every campaign must track revenue impact.

### System Must Track

| Step          | What’s Logged               |
| ------------- | --------------------------- |
| Message sent  | Campaign ID                 |
| Link clicked  | Person ID                   |
| Purchase made | Order ID linked to campaign |

Enables reports like:

> “Birthday campaign generated ₹1.2L revenue”

---

## 7️⃣ Staff CRM Interface

Front desk should see **actionable context**, not just data.

| Situation            | CRM Insight                  |
| -------------------- | ---------------------------- |
| Guest checking in    | “This is their 5th visit”    |
| Parent at POS        | “Child’s birthday in 5 days” |
| Member buying food   | “Eligible for 10% discount”  |
| Lapsed guest returns | “Offer available”            |

CRM should assist operations, not just marketing.

---

## 8️⃣ Data Privacy & Consent

CRM must support:

| Feature                   | Purpose                          |
| ------------------------- | -------------------------------- |
| Marketing consent flags   | SMS / Email permissions          |
| Communication preferences | Channel opt-in                   |
| Data retention policies   | Auto-anonymize inactive profiles |

Compliance-ready design.

---

## 9️⃣ Cross-Module Intelligence

Because all systems feed CRM:

| Source     | Insight Generated        |
| ---------- | ------------------------ |
| Ticketing  | Visit frequency          |
| Wallets    | Spending power           |
| Arcade     | Player engagement        |
| Membership | Loyalty level            |
| Events     | Social/family indicators |

This enables **behavioral marketing**, not just mass messaging.

---

## 🔟 Example Automation Flows

### 🎂 Birthday Flow

Trigger: 7 days before birthday
→ Send party discount offer
→ If booked → Tag “Birthday Host”

### 💤 Lapsed Guest Winback

Trigger: No visit in 60 days
→ Send bonus game credits
→ If visit happens → Remove “Lapsed” tag

### 🧒 First Visit Journey

Trigger: First visit
→ Thank-you message next day
→ Offer return discount valid 14 days

---

## 📊 CRM Reporting

Venues can track:

| Metric              | Purpose                 |
| ------------------- | ----------------------- |
| Repeat visit rate   | Loyalty health          |
| Campaign ROI        | Marketing effectiveness |
| Segment growth      | Audience quality        |
| Member retention    | Subscription health     |
| Birthday conversion | Party sales             |

---
---

# ✍️ VenuePlus — Integrated Digital Waiver System

**Full Technical Specification**

---

## 1️⃣ Core Purpose

The waiver system must:

✔ Legally bind participants
✔ Link signatures to **Person Profiles**
✔ Work across tickets, memberships, and events
✔ Be verifiable at entry in real time

It replaces third-party waiver tools entirely.

---

## 2️⃣ Waiver Ownership Model

| Role            | Description                             |
| --------------- | --------------------------------------- |
| **Participant** | Person who will enter/play              |
| **Signer**      | Adult signing waiver                    |
| **Guardian**    | Signer with legal authority for a minor |

One signer can sign for:

* Themselves
* Multiple minors linked via guardian relationship

---

## 3️⃣ Waiver Template System

Venues can maintain multiple templates.

| Field          | Purpose                     |
| -------------- | --------------------------- |
| Template Name  | “General Play Waiver”       |
| Version Number | Increment on edits          |
| Venue Scope    | Per venue or global         |
| Age Rules      | Adult / Minor specific text |
| Language       | Multi-language support      |

**Each signature binds to the exact template version used.**

---

## 4️⃣ Signature Flow

### 4.1 Standard Flow

1. Guest enters phone/email
2. OTP verification (if enabled)
3. Select participants (self + minors)
4. Sign digitally
5. System generates **PDF snapshot**

---

### 4.2 Quick Sign Mode (Venue Configurable)

For low-risk or walk-ins:

* No OTP required
* Minimal fields
* Still generates PDF + metadata

---

## 5️⃣ Legal Integrity & Evidence Storage

Each signed waiver stores:

| Data                     | Purpose                   |
| ------------------------ | ------------------------- |
| PDF Snapshot             | Immutable copy            |
| SHA-256 Hash             | Tamper-proof verification |
| Signer IP Address        | Legal trace               |
| Device User Agent        | Device identification     |
| Timestamp (ms precision) | Exact signing time        |
| Template Version ID      | Legal wording proof       |

PDF must be non-editable once stored.

---

## 6️⃣ Waiver Validity Rules

| Rule            | Behavior                                             |
| --------------- | ---------------------------------------------------- |
| Expiry Period   | Configurable (e.g., 12 months)                       |
| Age Transition  | Minor → Adult requires re-sign                       |
| Template Update | Old waivers remain valid unless venue forces re-sign |

---

## 7️⃣ Waiver & Identity Integration

Waivers attach to **Person Profiles**, not tickets.

This means:

* Same waiver valid across visits
* Valid for memberships and events
* Guardian relationship checked before allowing minor signing

---

## 8️⃣ Gate Validation Rules (Strict Mode)

At entry scan, system must verify:

✔ Person has valid ticket/reservation
✔ Person has **active valid waiver**
✔ If minor → waiver signed by linked guardian

If no valid waiver:
→ Gate denies entry
→ Staff prompt to complete waiver

Offline mode should cache waiver validity flags.

---

## 9️⃣ Event & Group Handling

For birthday parties or school groups:

* Host can send waiver links to guest parents
* Waiver completion dashboard shows % completed
* Staff can track missing waivers before event starts

---

## 🔟 Partial Waiver Handling

If waiver started but not completed:

| State         | Behavior                   |
| ------------- | -------------------------- |
| Draft         | Can be resumed via OTP     |
| Expired draft | Auto-deleted after X hours |

---

## 11️⃣ Admin Controls

Venue staff can:

| Action               | Permission Level      |
| -------------------- | --------------------- |
| View signed waiver   | Staff                 |
| Resend waiver link   | Staff                 |
| Mark manual waiver   | Manager (with reason) |
| Force re-sign        | Manager               |
| Upload legacy waiver | Admin only            |

All edits logged in audit trail.

---

## 12️⃣ Reporting & Alerts

Venues can see:

| Metric                      | Use             |
| --------------------------- | --------------- |
| Waivers expiring soon       | Send reminders  |
| % guests with valid waivers | Risk overview   |
| Event waiver completion     | Party readiness |
| Waiver audit log            | Legal defense   |

---

## 13️⃣ Compliance Considerations

System must support:

✔ Jurisdiction-specific wording
✔ Multi-language templates
✔ Data retention policies
✔ Consent tracking for marketing separate from liability waiver

---
---

# 📊 VenuePlus — Reporting & Business Intelligence Layer

**Technical & Functional Specification**

---

## 1️⃣ Architecture Overview

The BI layer is built on **aggregated operational data** to ensure dashboards are fast and reliable.

### Data Flow

**Operational DB → Aggregation Jobs → Analytics Tables → Dashboards / Exports**

We avoid heavy queries on live transactional tables.

---

## 2️⃣ Aggregation Strategy

Nightly + near-real-time jobs populate summary tables.

### 2.1 Core Aggregation Tables

| Table                        | Purpose                           |
| ---------------------------- | --------------------------------- |
| `daily_revenue_stats`        | Revenue by category per day       |
| `hourly_occupancy_stats`     | Entry/exit trends                 |
| `resource_utilization_stats` | Slot capacity vs usage            |
| `membership_kpi_stats`       | Active, churn, usage              |
| `wallet_liability_stats`     | Outstanding balances              |
| `crm_engagement_stats`       | Visits, segments, campaign impact |
| `event_booking_stats`        | Party/event performance           |

---

## 3️⃣ Operations Dashboards

### 3.1 Live Operations

| Metric                | Description                         |
| --------------------- | ----------------------------------- |
| Current Headcount     | Entries − Exits                     |
| Active Sessions       | Guests currently in time-based play |
| Upcoming Events Today | Party schedule                      |
| Waiver Compliance %   | Guests with valid waivers           |
| Capacity Status       | Slots nearing full                  |

Designed for front desk and floor managers.

---

### 3.2 Resource Utilization

| Metric             | Insight               |
| ------------------ | --------------------- |
| Slot Fill Rate %   | Sold vs capacity      |
| No-Show Rate       | Lost attendance       |
| Overbook Incidents | Operational overrides |
| Peak Hours Heatmap | Staffing optimization |

---

## 4️⃣ Financial Dashboards

### 4.1 Revenue Breakdown

| Dimension   | Example                         |
| ----------- | ------------------------------- |
| By Category | Tickets / F&B / Retail / Events |
| By Time     | Hour / Day / Week / Month       |
| By Channel  | Online / POS / Kiosk            |
| By Product  | Top selling passes              |

---

### 4.2 Deferred & Liability Tracking

| Metric                      | Meaning                      |
| --------------------------- | ---------------------------- |
| Outstanding Real Cash       | Refundable liability         |
| Outstanding Game Credits    | Deferred revenue             |
| Outstanding Bonus Cash      | Promo liability              |
| Outstanding Points          | Prize liability              |
| Membership Deferred Revenue | Unearned subscription income |

Critical for finance reconciliation.

---

## 5️⃣ Membership Intelligence

| KPI                     | Purpose             |
| ----------------------- | ------------------- |
| Active Members          | Subscription health |
| New vs Cancelled        | Growth trend        |
| Allowance Utilization % | Value perception    |
| Visit Frequency         | Engagement          |
| Renewal Rate            | Retention           |

---

## 6️⃣ Event & Party Reporting

| Metric                      | Insight              |
| --------------------------- | -------------------- |
| Events per Month            | Demand trend         |
| Avg Revenue per Party       | Pricing optimization |
| Avg Guest Count             | Package sizing       |
| Add-on Sales Rate           | Upsell performance   |
| Deposit vs Balance Payments | Cash flow visibility |

---

## 7️⃣ CRM & Marketing Performance

| Metric                       | Insight             |
| ---------------------------- | ------------------- |
| Repeat Visit Rate            | Loyalty indicator   |
| Lapsed Guest Count           | Winback opportunity |
| Segment Growth               | Audience changes    |
| Campaign Revenue Attribution | ROI tracking        |
| Offer Redemption Rate        | Promo effectiveness |

---

## 8️⃣ Arcade & Gameplay Analytics

| Metric                       | Purpose         |
| ---------------------------- | --------------- |
| Game Credits Loaded vs Spent | Engagement      |
| Points Issued vs Redeemed    | Prize economics |
| Top Games by Revenue         | Machine ROI     |
| Avg Spend per Player         | Monetization    |

---

## 9️⃣ Custom Filters & Drilldowns

Reports must support filtering by:

* Date range
* Venue (multi-location support)
* Resource
* Product
* Customer segment
* Staff member
* Sales channel

All dashboards should allow drill-down from summary → transaction list.

---

## 🔟 Scheduled Reports & Exports

Venues can:

| Feature           | Function                    |
| ----------------- | --------------------------- |
| Email Reports     | Daily / Weekly summary      |
| CSV Export        | Finance & reconciliation    |
| API Access        | External BI tools           |
| Accounting Export | Revenue recognition support |

---

## 11️⃣ Performance & Data Freshness

| Data Type           | Refresh Frequency |
| ------------------- | ----------------- |
| Live occupancy      | Real-time         |
| Today’s sales       | Every few minutes |
| Financial summaries | Hourly            |
| Historical trends   | Nightly           |

---

## 12️⃣ Multi-Venue / Franchise View

HQ-level users can see:

| View                  | Description         |
| --------------------- | ------------------- |
| Per Venue Performance | Comparison charts   |
| Regional Trends       | Growth patterns     |
| Top Locations         | Revenue leaderboard |
| Underperforming Sites | Alert flags         |

---

## 13️⃣ Data Integrity & Reconciliation

System must support:

✔ Rebuild aggregates from raw data
✔ Mismatch detection (capacity vs scans)
✔ Audit-friendly exports
✔ Timezone-aware reporting

---
---

# 🛍🍔 VenuePlus — Retail & F&B Module Specification

---

## 1️⃣ Purpose

The Retail & F&B module enables venues to:

✔ Sell merchandise and food items
✔ Route kitchen orders correctly
✔ Apply discounts and wallet payments
✔ Track stock at a basic level
✔ Feed sales data into CRM and BI

It is tightly integrated with **POS, Wallets, Memberships, and Reporting**.

---

## 2️⃣ Product Types Covered

| Type                | Examples                   | Operational Impact    |
| ------------------- | -------------------------- | --------------------- |
| **Retail Goods**    | Grip socks, T-shirts, toys | Inventory tracked     |
| **Food Items**      | Pizza, burgers, fries      | Kitchen routing       |
| **Beverages**       | Soft drinks, coffee        | Fast serve            |
| **Combos/Meals**    | Kids meal, family combo    | Multi-line order      |
| **Service Add-ons** | Birthday cake, decoration  | Event-linked optional |

All are **non-time-based products** (no capacity slots).

---

## 3️⃣ Product Configuration

Each product must support:

* Category (Retail / Food / Beverage / Combo)
* Base price
* Tax category
* Active/Inactive status
* Optional preparation routing (for F&B)
* Optional inventory tracking

---

## 4️⃣ Variants & Modifiers

Retail and F&B often need selectable options.

### Retail Variants

Examples:

* Size (S/M/L)
* Color (Red/Blue)

Each variant may:

* Have its own SKU
* Have its own price

### F&B Modifiers

Examples:

* Extra cheese (+₹20)
* No onion
* Drink choice in combo

Modifiers can be:

* Optional
* Required (must choose one)

---

## 5️⃣ POS Order Flow

Retail & F&B are sold through **POS orders**, not reservations.

### Standard Flow

1. Staff adds items to basket
2. Modifiers/variants selected
3. Membership discounts applied (if eligible)
4. Wallet balances applied per burn rules
5. Payment completed
6. Order routed to:

   * Receipt printer
   * Kitchen (if F&B)

---

## 6️⃣ Kitchen Routing (F&B Only)

Some items require preparation.

### Kitchen Workflow

* Product linked to one or more preparation stations
* On order completion:

  * Ticket printed at kitchen printer **or**
  * Sent to Kitchen Display System (KDS)
* Staff mark item as:

  * Preparing
  * Ready
  * Served (optional stage)

This supports multi-station kitchens (e.g., pizza, drinks, desserts).

---

## 7️⃣ Inventory Handling (MVP Level)

Retail items and selected F&B items may have stock tracking.

### Inventory Rules (MVP)

* Stock is reduced when item is sold
* Staff can manually adjust stock (with reason)
* System warns when stock falls below threshold
* Stock does NOT block sale automatically (configurable future)

This is **Level 1 inventory** — simple and operational.

---

## 8️⃣ Combo & Bundle Logic

Combos may include multiple child items:

Example:

* Kids Meal = Burger + Fries + Drink

Operationally:

* POS shows as one item
* Kitchen receives individual preparation items
* Inventory deducted per child item

---

## 9️⃣ Integration with Wallets

Wallet rules apply to retail & F&B.

| Balance Type      | Retail           | F&B |
| ----------------- | ---------------- | --- |
| Real Cash         | ✅                | ✅   |
| Bonus Cash        | ✅ (configurable) | ✅   |
| Game Credits      | ❌                | ❌   |
| Redemption Points | ✅ (Retail only)  | ❌   |

Burn order logic applies automatically.

---

## 🔟 Integration with Memberships

Membership benefits may apply automatically:

| Benefit Type    | Example                |
| --------------- | ---------------------- |
| Discount        | 10% off F&B            |
| Allowance       | 1 free drink per visit |
| Retail discount | 15% off merchandise    |

POS must check membership eligibility at checkout.

---

## 1️⃣1️⃣ Refunds & Voids

Retail/F&B refunds must:

* Reverse payment method appropriately
* Restore stock (if inventory tracked)
* Log staff action in audit trail

Partial refunds and line-item voids should be supported.

---

## 1️⃣2️⃣ CRM & Behavioral Tracking

Retail & F&B purchases feed into the **Customer 360**:

* Spending patterns
* Favorite items
* Average basket size
* Upsell targeting (e.g., food buyers → combo offers)

---

## 1️⃣3️⃣ Reporting Impact

Retail & F&B contribute to:

* Revenue by category (Food vs Retail)
* Top-selling products
* Modifier usage trends
* Kitchen load by hour
* Stock variance reports

---

## 1️⃣4️⃣ Event Integration

Retail & F&B may link to events:

| Scenario                  | Behavior                        |
| ------------------------- | ------------------------------- |
| Party food package        | Pre-added to event order        |
| Extra drinks during party | Added to event tab              |
| Cake add-on               | Routed to kitchen at party time |

---
---

# 🔐 VenuePlus — Platform Governance Layer

**(Administration, RBAC, Configuration & Control)**

---

## 1️⃣ Purpose

The Platform Governance Layer enables venue operators and HQ administrators to:

✔ Control system behavior
✔ Manage users and permissions
✔ Configure financial, legal, and operational rules
✔ Register and manage devices
✔ Govern integrations and data policies

It is the **control plane** of the VenuePlus ecosystem.

---

## 2️⃣ Role-Based Access Control (RBAC)

### Core Entities

| Entity         | Description             |
| -------------- | ----------------------- |
| **User**       | Staff member login      |
| **Role**       | Group of permissions    |
| **Permission** | Granular allowed action |
| **Scope**      | Venue-level or global   |

Users may have multiple roles across different venues.

---

### Permission Categories

| Domain       | Example Permissions                           |
| ------------ | --------------------------------------------- |
| Ticketing    | Create/edit products, override capacity       |
| Events       | Create/edit party bookings, adjust guests     |
| POS          | Process sales, apply discounts, issue refunds |
| Wallet       | Load balances, manual adjustments             |
| Memberships  | Create plans, suspend members                 |
| Waivers      | Edit templates, force re-sign                 |
| CRM          | Create campaigns, manage segments             |
| Reporting    | View/export financial reports                 |
| Devices      | Register/manage hardware                      |
| Integrations | Manage API keys                               |
| System Admin | Manage users, roles, configs                  |

All sensitive actions must be audit-logged.

---

## 3️⃣ Venue Configuration

Each venue operates independently with configurable settings.

| Category         | Examples                  |
| ---------------- | ------------------------- |
| Timezone         | Reporting & slot logic    |
| Currency         | Multi-currency operations |
| Tax Rules        | VAT/GST mapping           |
| Business Hours   | Slot generation windows   |
| Refund Policies  | Time-based rules          |
| No-Show Policies | Already defined           |
| Waitlist Rules   | Queue behavior            |
| Alert Thresholds | Operational alerts        |

---

## 4️⃣ Product & Pricing Administration

Admins must manage:

### Ticketing

* Product catalog
* Resource bindings
* Slot binding mode
* Pricing rules
* Dynamic modifiers

### Events

* Party packages
* Guest limits
* Deposit requirements
* Add-on items

### Memberships

* Plan types
* Allowances
* Discount benefits
* Billing cycles & grace periods

---

## 5️⃣ Resource & Capacity Administration

| Configurable Item | Purpose               |
| ----------------- | --------------------- |
| Resources         | Play zones, rooms     |
| Capacity mode     | Fixed or unlimited    |
| Slot templates    | Duration & capacity   |
| Special overrides | Holidays, maintenance |
| Blackout dates    | Closures              |

---

## 6️⃣ Financial Governance

| Feature                | Purpose              |
| ---------------------- | -------------------- |
| Tax mapping            | Product → Tax code   |
| Revenue categories     | Tickets, F&B, Retail |
| Payment methods        | Cash, Card, Wallet   |
| Refund approval limits | Role-based           |
| Accounting exports     | ERP integrations     |

---

## 7️⃣ Wallet & Stored Value Controls

| Setting              | Purpose                     |
| -------------------- | --------------------------- |
| Balance expiry rules | Bonus/Game credits          |
| Category usage rules | Where balances can be spent |
| Burn order           | Bonus → Real                |
| Transfer permissions | Account ↔ Person            |

---

## 8️⃣ Waiver Administration

| Capability          | Purpose                |
| ------------------- | ---------------------- |
| Template management | Legal updates          |
| Jurisdiction rules  | Location-based wording |
| Force re-sign       | Risk mitigation        |
| Signing mode config | OTP vs Quick Sign      |
| Waiver audit logs   | Legal traceability     |

---

## 9️⃣ CRM & Communication Governance

| Setting             | Purpose               |
| ------------------- | --------------------- |
| Consent defaults    | Marketing permissions |
| Message templates   | Email/SMS formats     |
| Automation limits   | Anti-spam controls    |
| Segment permissions | Marketing team roles  |

---

## 🔟 Reporting & BI Governance

| Feature           | Purpose          |
| ----------------- | ---------------- |
| KPI configuration | Custom metrics   |
| Scheduled reports | Email automation |
| Export controls   | Finance/security |
| Data retention    | Compliance       |

---

## 1️⃣1️⃣ Device & Hardware Management

| Capability         | Purpose                       |
| ------------------ | ----------------------------- |
| Device registry    | Add/remove devices            |
| Device type        | POS, Gate, Arcade, Kiosk, KDS |
| Venue assignment   | Location control              |
| Status monitoring  | Online/offline                |
| Secure credentials | API/device authentication     |

---

## 1️⃣2️⃣ Resource-to-Device Mapping

| Mapping              | Purpose          |
| -------------------- | ---------------- |
| Gate → Resource      | Entry validation |
| KDS → Prep Station   | Kitchen routing  |
| Arcade Reader → Zone | Game tracking    |

---

## 1️⃣3️⃣ Notification Template Management

Used for operational and marketing messages.

| Type          | Examples              |
| ------------- | --------------------- |
| Transactional | Booking confirmations |
| Legal         | Waiver reminders      |
| Membership    | Renewal notices       |
| Events        | Party details         |

Supports placeholders and multi-channel formats.

---

## 1️⃣4️⃣ Legal & Compliance Controls

| Setting                | Purpose                   |
| ---------------------- | ------------------------- |
| Jurisdiction tags      | Waiver and tax variations |
| Age-of-majority rules  | Minor logic               |
| Data retention periods | Regulatory compliance     |

---

## 1️⃣5️⃣ Backup, Archival & Data Retention

| Feature              | Purpose            |
| -------------------- | ------------------ |
| Data retention rules | Privacy compliance |
| Archival policies    | Historical storage |
| Backup monitoring    | System safety      |

---

## 1️⃣6️⃣ API & Integration Management

| Feature            | Purpose            |
| ------------------ | ------------------ |
| API key creation   | Third-party access |
| Permission scoping | Limit data access  |
| Revocation         | Security control   |

---

## 1️⃣7️⃣ Feature Flag Management

| Feature        | Purpose                     |
| -------------- | --------------------------- |
| Module toggles | Events, Arcade, Memberships |
| Beta features  | Controlled rollout          |
| Tiered plans   | SaaS packaging              |

---

## 1️⃣8️⃣ Waitlist & Queue Controls

| Setting         | Purpose                 |
| --------------- | ----------------------- |
| Enable waitlist | Capture overflow demand |
| Auto-release    | Fill canceled spots     |
| Notifications   | Inform guests           |

---

## 1️⃣9️⃣ Operational Alert Configuration

| Alert              | Example                 |
| ------------------ | ----------------------- |
| Capacity threshold | Near sellout            |
| Waiver compliance  | Risk warning            |
| Device offline     | Hardware issue          |
| Billing failures   | Membership revenue risk |

---

## 2️⃣0️⃣ Audit Logs (Global)

Every critical admin and financial action must be recorded:

* Refund approvals
* Capacity overrides
* Wallet adjustments
* Membership changes
* Waiver edits
* Role/permission changes

Logs must be immutable and exportable.

---
