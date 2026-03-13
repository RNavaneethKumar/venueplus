# Till Management — Functional Specification

**Feature**: Cash Drawer / Till Session Management
**Status**: Approved — ready for implementation
**Scope**: POS app + API + database

**Decisions locked:**
| Question | Decision |
|----------|----------|
| Till mode default | `counter` |
| Variance approval | Any variance (threshold = ₹0) requires manager sign-off |
| Midnight auto-close | Sessions auto-close at midnight by default (`pos.auto_close_midnight = true`) |
| Z-Report print format | Thermal receipt (80mm) |
| Multi-currency | Out of scope |
| Tips handling | Out of scope for V1 |
| Cash sale definition | `cash` payment method only |
| Denomination set | Indian standard set; denomination entry is optional (opt-in per venue) |

---

## 1. Overview

Till Management governs the lifecycle of a cashier's working session: opening the drawer with a starting float, recording cash movements during the day, and closing out at the end of the shift with a reconciliation report. The system supports both **counter-based** and **user-based** sessions, configurable per venue.

---

## 2. Terminology

| Term | Definition |
|------|-----------|
| **Till / Cash Drawer** | The physical cash drawer or virtual representation of a cashier's float. |
| **Session** | A single open-to-close cycle. One session exists per counter (or per user) at any time. |
| **Opening Float** | The cash placed in the drawer at the start of a session. |
| **Cash Drop** | Cash removed mid-session and transferred to a safe. |
| **Paid In** | Cash added to the drawer mid-session (e.g. petty cash reimbursement). |
| **Paid Out** | Cash removed from the drawer mid-session for an expense (e.g. supplier payment). |
| **Expected Cash** | Opening float + all cash sales + paid-in amounts − paid-out amounts − cash drops. |
| **Actual Cash** | The physical count entered by the cashier at close. |
| **Variance** | Actual Cash − Expected Cash (positive = overage, negative = shortage). |
| **X-Report** | A mid-session summary report that does **not** close the session. |
| **Z-Report** | The final closing report generated at session close. Once printed, the session is sealed. |
| **Blind Close** | A close where the cashier counts cash before being shown the expected amount, eliminating confirmation bias. |
| **Variance Threshold** | A configurable tolerance. Variances beyond this require manager approval before closing. |

---

## 3. Session Modes

### 3.1 Counter-Based
A session is tied to a named POS counter (e.g. "Counter 1", "Main Desk"). Multiple staff can operate the same counter across a shift — the session persists across operator changes. Suitable for a fixed physical till.

### 3.2 User-Based
A session is tied to the logged-in cashier. If a cashier moves between counters their session follows them. Suitable for venues where staff are mobile or share physical hardware.

**Configuration**: `venueSettings` key `pos.till_mode` with value `counter` (default) or `user`.

At any given time, a counter or user may have at most **one open session**.

---

## 4. User Roles

| Action | Cashier | Manager | Admin |
|--------|---------|---------|-------|
| Open till | ✓ | ✓ | ✓ |
| View own session summary (X-Report) | ✓ | ✓ | ✓ |
| Record cash in / cash out | ✓ | ✓ | ✓ |
| Initiate close (normal / blind) | ✓ | ✓ | ✓ |
| Approve variance above threshold | — | ✓ | ✓ |
| Force-close another user's session | — | ✓ | ✓ |
| View all sessions / Z-Reports | — | ✓ | ✓ |
| Configure variance threshold / till mode | — | — | ✓ |

---

## 5. Functional Flows

### 5.1 Opening a Till

**Trigger**: Cashier arrives at counter and taps "Open Till" in the POS.

**Preconditions**:
- No open session exists for this counter/user.
- Staff member is logged in.

**Steps**:
1. System shows the "Open Till" screen.
2. Cashier enters the **opening float amount**. Optionally, they may break it down by denomination (see §8).
3. Cashier confirms. System records:
   - `openedAt` timestamp
   - `openedBy` (staff ID)
   - `counterId` or `userId` depending on mode
   - `openingAmount`
   - denomination breakdown if provided
4. Session status is set to `open`.
5. The POS becomes usable for sales. While a session is open, the till icon in the UI shows a green indicator.

**Blocked state**: If `pos.require_till` is enabled (see §10), placing any order while no open session exists will be blocked with the message *"Open a till before taking orders."*

---

### 5.2 Cash In / Cash Out (Mid-Session Movements)

**Trigger**: Cashier taps "Cash Movement" in the QuickActionBar (manager and cashier role).

**Types**:

| Type | Code | Description |
|------|------|-------------|
| Cash Drop | `drop` | Cash removed to safe. Reduces expected cash. |
| Paid In | `paid_in` | Cash added for a specific reason. Increases expected cash. |
| Paid Out | `paid_out` | Cash removed for an expense. Reduces expected cash. |

**Steps**:
1. Staff selects movement type.
2. Enters amount and a mandatory reason/note (free text, max 100 chars).
3. Manager PIN required for amounts above a configurable limit (`pos.cash_movement_approval_threshold`).
4. Movement is recorded against the current session.
5. Optional: print a receipt/slip for the movement.

---

### 5.3 Closing a Till — Normal Close

**Trigger**: Cashier taps "Close Till" in the POS.

**Steps**:
1. System shows the expected cash amount and a breakdown of all payment methods transacted.
2. Cashier physically counts cash and enters the **actual cash amount** (optionally by denomination).
3. System calculates variance = actual − expected.
4. If variance is within the configured threshold:
   - Session closes immediately.
   - Z-Report is generated (see §6).
5. If variance **exceeds the threshold** (in either direction):
   - Screen shows variance with a warning.
   - Manager PIN is required to approve and close.
   - Manager override is recorded in the session.
6. Session status is set to `closed`.

---

### 5.4 Closing a Till — Blind Close

**Trigger**: Cashier taps "Close Till" → selects "Blind Close" (or venue forces blind close via `pos.blind_close_only`).

**Steps**:
1. System shows a cash-count screen **without** displaying the expected amount.
2. Cashier enters the actual cash count (optionally by denomination).
3. After submitting the count, the system **then** reveals the expected amount, variance, and whether manager approval is needed.
4. Same threshold/approval logic applies as normal close.
5. Session status is set to `blind_closed` (preserves the fact that a blind procedure was used for audit).

---

### 5.5 X-Report (Mid-Session Summary)

**Trigger**: Cashier or manager taps "X-Report" in the POS or the till management screen.

**Behaviour**:
- Generates the same report as a Z-Report but **does not close the session**.
- Does not prompt for a cash count; shows expected figures only.
- Can be printed multiple times.
- Useful for mid-shift cash drops or supervisory checks.

---

### 5.6 Force Close (Manager)

**Trigger**: Manager opens "Till Sessions" screen in management and force-closes a session.

**Use case**: Staff forgot to close at end of day; system needs to be reset for the next day.

**Steps**:
1. Manager selects the open session.
2. System warns: *"This session will be closed without a cash count. Variance will be marked as unverified."*
3. Manager enters PIN.
4. Session is closed with `closeType = 'forced'` and `actualAmount = null`.
5. A partial Z-Report is generated, flagged as *Force Closed — No Cash Count*.

---

## 6. Z-Report Contents

The Z-Report is the canonical end-of-session document. It is generated on close and stored as a JSON snapshot in the database. It can also be reprinted at any time from the management screen.

| Section | Data |
|---------|------|
| **Header** | Venue name, address, counter/user, session ID, opened at, closed at, closed by |
| **Opening Float** | Amount entered at open |
| **Sales Summary** | Total orders, total gross sales, total discounts, total net |
| **Sales by Payment Method** | Cash / UPI / Card / Wallet / Gift Card — each with order count and amount |
| **Cash Movements** | Itemised list of drops / paid-in / paid-out with timestamps and reasons |
| **Cash Reconciliation** | Opening float + cash sales + paid-in − paid-out − drops = **Expected Cash** |
| **Actual Cash** | Amount entered by cashier |
| **Variance** | Overage (+) or shortage (−) |
| **Manager Override** | If approved: manager name, time, and override note |
| **Close Type** | Normal / Blind / Forced |
| **Footer** | Report generated timestamp, session hash (tamper-evidence) |

---

## 7. UI — POS App

### 7.1 Open Till Screen
Shown on POS load if no open session exists (when `pos.require_till = true`) or accessible from QuickActionBar.
- Opening float input (number pad)
- Optional denomination breakdown toggle (show/hide)
- Confirm button

### 7.2 QuickActionBar Addition
A new **Till** button (💰) is added to the QuickActionBar. Its state is reflected visually:
- 🟢 Green dot: session open
- 🔴 Red dot: no session open

Tapping opens the Till Menu sheet with options: X-Report, Cash In, Cash Out, Cash Drop, Close Till.

### 7.3 Close Till Screen (Sheet)
- Two tabs or toggle: **Normal** / **Blind**
- Denomination entry or lump-sum toggle
- For normal close: expected amount shown; cashier enters actual
- Confirm → variance screen → approve/manager override → success → Z-Report preview + print

### 7.4 Management Screen — Till Sessions Tab
A new tab in the Orders/Management screen:
- Table of all sessions: counter/user, opened, closed, opening float, expected, actual, variance, status
- Click a session → Z-Report viewer (printable)
- Force Close action for open sessions (manager only)

---

## 8. Denomination Breakdown (Optional)

When entering cash (open or close), staff can optionally break down by denomination. This is a venue-level opt-in via `pos.enable_denomination_entry`. If disabled, only a lump-sum amount is entered.

Indian denomination set (configurable): ₹2000, ₹500, ₹200, ₹100, ₹50, ₹20, ₹10, ₹5, ₹2, ₹1, and coin sub-totals.

The denomination breakdown is stored in the session record as a JSON column and printed on the Z-Report.

---

## 9. Database Schema

### 9.1 `cash_drawers` table
Represents named physical or logical tills. Optional — only used if `till_mode = counter`.

```
id            uuid PK
venue_id      uuid FK venues
name          text NOT NULL          -- "Counter 1", "Main Desk"
description   text
is_active     boolean DEFAULT true
created_at    timestamptz
```

### 9.2 `cash_sessions` table
One row per open/close cycle.

```
id                  uuid PK
venue_id            uuid FK venues
drawer_id           uuid FK cash_drawers (nullable — null if user-based mode)
opened_by           uuid FK users (staff)
closed_by           uuid FK users (nullable)
counter_id          text (nullable — counter name if counter-mode, for display)
status              enum: open | closed | blind_closed | forced
open_time           timestamptz NOT NULL
close_time          timestamptz (nullable)
opening_amount      numeric(12,2) NOT NULL
opening_denominations jsonb (nullable)
actual_amount       numeric(12,2) (nullable — null until closed)
actual_denominations  jsonb (nullable)
expected_amount     numeric(12,2) (nullable — computed and stored at close time)
variance            numeric(12,2) (nullable — actual − expected)
close_type          enum: normal | blind | forced (nullable)
variance_approved_by  uuid FK users (nullable)
variance_approved_at  timestamptz (nullable)
variance_note       text (nullable)
z_report_data       jsonb (nullable — full snapshot stored at close)
created_at          timestamptz
```

### 9.3 `cash_movements` table
Cash in/out events during a session.

```
id            uuid PK
venue_id      uuid FK venues
session_id    uuid FK cash_sessions
movement_type enum: drop | paid_in | paid_out
amount        numeric(12,2) NOT NULL
reason        text NOT NULL
recorded_by   uuid FK users
approved_by   uuid FK users (nullable — for amounts above threshold)
created_at    timestamptz
```

### 9.4 `venueFeatureFlags` / `venueSettings` additions

| Table | Key | Type | Default | Description |
|-------|-----|------|---------|-------------|
| venueSettings | `pos.till_mode` | value | `counter` | `counter` or `user` |
| venueFeatureFlags | `pos.require_till` | boolean | false | Block orders if no open till |
| venueFeatureFlags | `pos.blind_close_only` | boolean | false | Force blind close procedure |
| venueFeatureFlags | `pos.enable_denomination_entry` | boolean | false | Enable denomination breakdown |
| venueFeatureFlags | `pos.auto_close_midnight` | boolean | true | Auto-close open sessions at midnight |
| venueSettings | `pos.variance_threshold` | value | `0` | Max variance (₹) before manager approval — `0` means any variance triggers approval |
| venueSettings | `pos.cash_movement_approval_threshold` | value | `500` | Cash movement amount requiring manager PIN |

---

## 10. API Endpoints

All endpoints are staff-scoped (`requireStaff + requireVenueHeader`).

```
POST   /till/sessions                  Open a new session
GET    /till/sessions/active           Get current open session for this counter/user
GET    /till/sessions                  List sessions (date range, status filter)
GET    /till/sessions/:id              Get session detail + Z-Report data
POST   /till/sessions/:id/close        Close a session (normal or blind)
POST   /till/sessions/:id/force-close  Manager force-close
GET    /till/sessions/:id/x-report     Get X-Report for open session (no close)
POST   /till/movements                 Record a cash movement (drop / paid in / paid out)
GET    /till/drawers                   List configured cash drawers (counter mode)
POST   /till/drawers                   Create a cash drawer (admin)
```

---

## 11. Business Rules

1. Only one `open` session may exist per counter (counter-mode) or per user (user-mode) at a time.
2. Orders in payment method `cash` affect the expected cash balance.
3. `expected_amount` is **computed server-side** at close time from the ledger (opening + movements + cash sales) — it is never trusted from the client.
4. The Z-Report JSON snapshot is immutable once stored; no edits allowed after close.
5. If a session is open at midnight (session crosses midnight), it remains open until explicitly closed. The date filter on the report covers the close date.
6. Reprinting a Z-Report does not change the session or re-run any computation.
7. Variance threshold of `0` means any variance, however small, requires manager approval. Threshold of `null` or `-1` disables approval requirement entirely.
8. Force-close is an audit event and appears in the sessions list with a ⚠️ flag.

---

## 12. Midnight Auto-Close

When `pos.auto_close_midnight = true` (the default), a scheduled job runs at **00:00 venue local time** each day and force-closes any sessions still open. The close is recorded as `close_type = 'auto'`. A partial Z-Report is generated flagged *Auto-closed at midnight — no cash count*. The next morning the cashier opens a fresh session.

This prevents sessions from spanning calendar days, which simplifies daily reconciliation — each Z-Report maps cleanly to a single business date.

Implementation: a cron job in the API queries `cash_sessions` where `status = 'open'` and `open_time < midnight`, then force-closes each with `closedBy = null`, `actualAmount = null`, and `closeType = 'auto'`.

---

## 13. Z-Report — Thermal Print Layout (80mm)

The Z-Report renders as a thermal receipt. The POS triggers printing via the browser print dialog targeting the connected receipt printer. An `@media print` stylesheet narrows the output to 80mm column width. Layout:

```
================================
        VenuePlus
      [Venue Name]
================================
Z-REPORT
Session #[short-id]
Counter : [counter name]
Cashier : [staff name]
Opened  : [date] [time]
Closed  : [date] [time]
--------------------------------
SALES SUMMARY
Orders       :          [count]
Gross Sales  :    ₹[amount]
Discounts    :   -₹[amount]
Net Sales    :    ₹[amount]
--------------------------------
BY PAYMENT METHOD
Cash         :    ₹[amount] ([n])
UPI          :    ₹[amount] ([n])
Card         :    ₹[amount] ([n])
Wallet       :    ₹[amount] ([n])
Gift Card    :    ₹[amount] ([n])
--------------------------------
CASH MOVEMENTS
[time] Drop       -₹[amount]
       [reason]
[time] Paid In    +₹[amount]
       [reason]
--------------------------------
CASH RECONCILIATION
Opening Float:    ₹[amount]
Cash Sales   :   +₹[amount]
Paid In      :   +₹[amount]
Paid Out     :   -₹[amount]
Cash Drops   :   -₹[amount]
             ─────────────
Expected     :    ₹[amount]
Actual Count :    ₹[amount]
VARIANCE     :  [+/-]₹[amount]
--------------------------------
Close Type   : [Normal/Blind/Auto]
[If variance approved:]
Approved by  : [manager name]
Approval time: [time]
--------------------------------
[Session: xxxxxxxx]
[Printed: date time]
================================
       ** END OF DAY **
================================
```

---

## 14. Decisions Made

| # | Question | Decision |
|---|----------|----------|
| 1 | Till mode default | `counter` |
| 2 | Multi-currency | Out of scope |
| 3 | Tips handling | Out of scope for V1 |
| 4 | Cash sale definition | `cash` payment method only |
| 5 | Denomination set | Indian standard; opt-in per venue |
| 6 | Print format | Thermal 80mm |
| 7 | Midnight behaviour | Auto-close by default |
| 8 | Offline resilience | Deferred to V2 (edge deployment story) |
