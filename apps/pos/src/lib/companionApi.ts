/**
 * VenuePlus Companion client.
 *
 * Communicates with the locally-installed Companion app at http://127.0.0.1:8765.
 * All functions are safe to call even when the Companion is not running —
 * they fail silently and return null/false so the POS continues normally.
 */

const COMPANION_URL = 'http://127.0.0.1:8765'
const TIMEOUT_MS    = 2_000   // Never block the UI waiting for companion

// ─── Internal fetch wrapper ───────────────────────────────────────────────────

async function companionFetch(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    const controller = new AbortController()
    const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res        = await fetch(`${COMPANION_URL}${path}`, { ...init, signal: controller.signal })
    clearTimeout(timer)
    return res
  } catch {
    return null
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompanionDevice {
  token: string
  id:    string
  name:  string
  type:  string
}

export interface CompanionPrinter {
  name:        string
  displayName: string
  isDefault:   boolean
}

export interface PrintResult {
  success: boolean
  error?:  string
}

export interface ReceiptPayment {
  method: string
  amount: number
}

export interface ReceiptItem {
  name:           string
  visitorType?:   string
  qty:            number
  unitPrice:      number
  discountAmount: number
  lineTotal:      number
}

export interface ReceiptJob {
  orderNumber:  string
  items:        ReceiptItem[]
  subtotal:     number
  discount:     number
  tax:          number
  total:        number
  payments:     ReceiptPayment[]
  cashierName:  string
  timestamp:    string
  promoCode?:   string
  notes?:       string
  // Layout — from venue back-office settings, common across all POS terminals
  venueName?:    string | undefined   // printed in the receipt header
  receiptWidth?: number               // mm, default 80
}

export interface TicketJob {
  orderNumber:   string
  productName:   string
  visitorType?:  string
  visitDate:     string
  holderName?:   string
  resourceName?: string
  ticketNumber:  string
  qrData:        string
  // Layout — from venue back-office settings, common across all POS terminals
  venueName?:    string | undefined   // printed on the ticket
  ticketWidth?:  number               // mm, default 210
  ticketHeight?: number               // mm, default 99
}

// ─── Companion availability ───────────────────────────────────────────────────

/** Returns true when the Companion app is reachable. */
export async function isCompanionAvailable(): Promise<boolean> {
  const res = await companionFetch('/health')
  return res?.ok === true
}

// ─── Device persistence ───────────────────────────────────────────────────────

/**
 * Returns the device stored in the Companion's OS config.
 * Returns null if Companion is not running or no device is registered.
 */
export async function getCompanionDevice(): Promise<CompanionDevice | null> {
  const res = await companionFetch('/device')
  if (!res?.ok) return null
  const json = await res.json() as { success: boolean; data: CompanionDevice | null }
  return json.data ?? null
}

/**
 * Saves device info to the Companion for OS-level persistence across browser sessions.
 * Fire-and-forget is fine — returns true if accepted, false if Companion is down.
 */
export async function saveToCompanion(device: CompanionDevice): Promise<boolean> {
  const res = await companionFetch('/device', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(device),
  })
  return res?.ok === true
}

/** Clears the device registration from the Companion. Fire-and-forget. */
export async function clearCompanionDevice(): Promise<void> {
  await companionFetch('/device', { method: 'DELETE' })
}

/**
 * Reads the device token directly from the Companion (convenience shortcut).
 * Returns null if Companion is not running or no device is registered.
 */
export async function getDeviceToken(): Promise<string | null> {
  const device = await getCompanionDevice()
  return device?.token ?? null
}

// ─── Active drawer (till session) ─────────────────────────────────────────────
// Replaces the venueplus_active_drawer_id cookie. Stored in the Companion so the
// drawer state persists across browsers and survives page reloads.

/** Returns the drawerId of the currently-open till session on this terminal, or null. */
export async function getDrawerId(): Promise<string | null> {
  const res = await companionFetch('/session/drawer')
  if (!res?.ok) return null
  const json = await res.json() as { success: boolean; data: { drawerId: string | null } }
  return json.data?.drawerId ?? null
}

/** Stores the drawerId when a till session is opened. Fire-and-forget. */
export async function setDrawerId(drawerId: string): Promise<void> {
  await companionFetch('/session/drawer', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ drawerId }),
  })
}

/** Removes the stored drawerId when the till session is closed. Fire-and-forget. */
export async function clearDrawerId(): Promise<void> {
  await companionFetch('/session/drawer', { method: 'DELETE' })
}

// ─── Printer discovery ────────────────────────────────────────────────────────

/** Returns the list of OS-registered printers from the Companion. */
export async function getCompanionPrinters(): Promise<CompanionPrinter[]> {
  const res = await companionFetch('/printers')
  if (!res?.ok) return []
  const json = await res.json() as { success: boolean; data: CompanionPrinter[] }
  return json.data ?? []
}

// ─── Printing ─────────────────────────────────────────────────────────────────

/**
 * Send a receipt print job to the Companion.
 * Returns { success: false, error: 'Companion not available' } if not running.
 */
export async function printReceipt(job: ReceiptJob): Promise<PrintResult> {
  const res = await companionFetch('/print/receipt', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(job),
  })
  if (!res) return { success: false, error: 'Companion not available' }
  const json = await res.json() as { success: boolean; error?: string }
  return json.error ? { success: json.success, error: json.error } : { success: json.success }
}

/**
 * Send a ticket print job to the Companion.
 * Returns { success: false, error: 'Companion not available' } if not running.
 */
export async function printTicket(job: TicketJob): Promise<PrintResult> {
  const res = await companionFetch('/print/ticket', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(job),
  })
  if (!res) return { success: false, error: 'Companion not available' }
  const json = await res.json() as { success: boolean; error?: string }
  return json.error ? { success: json.success, error: json.error } : { success: json.success }
}
