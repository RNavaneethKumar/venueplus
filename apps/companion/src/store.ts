import Store from 'electron-store'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeviceInfo {
  token:    string
  id:       string
  name:     string
  type:     string
}

export interface PrinterSettings {
  receiptPrinter: string | null  // OS printer name, null = system default
  ticketPrinter:  string | null  // OS printer name, null = system default
  // Paper sizes and layout are managed in the back-office Print Layout page
  // and passed in each print job payload — not stored locally in the companion.
}

export interface CompanionStore {
  device:          DeviceInfo | null
  drawerId:        string | null
  printerSettings: PrinterSettings
}

// ─── Default values ───────────────────────────────────────────────────────────

const defaults: CompanionStore = {
  device:   null,
  drawerId: null,
  printerSettings: {
    receiptPrinter: null,
    ticketPrinter:  null,
  },
}

// ─── Store instance ───────────────────────────────────────────────────────────

export const store = new Store<CompanionStore>({
  name:     'venueplus-companion',
  defaults,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getDevice(): DeviceInfo | null {
  return store.get('device')
}

export function setDevice(device: DeviceInfo): void {
  store.set('device', device)
}

export function clearDevice(): void {
  store.delete('device')
}

export function getDrawerId(): string | null {
  return store.get('drawerId') ?? null
}

export function setDrawerId(drawerId: string): void {
  store.set('drawerId', drawerId)
}

export function clearDrawerId(): void {
  store.set('drawerId', null)
}

export function getPrinterSettings(): PrinterSettings {
  return store.get('printerSettings')
}

export function setPrinterSettings(settings: Partial<PrinterSettings>): void {
  const current = getPrinterSettings()
  store.set('printerSettings', { ...current, ...settings })
}

// ─── Print log (in-memory, current session only) ──────────────────────────────

export interface PrintLogEntry {
  id:          string
  type:        'receipt' | 'ticket'
  orderNumber: string
  status:      'success' | 'error'
  error?:      string
  timestamp:   string  // ISO
}

const MAX_PRINT_LOG = 100
const _printLog: PrintLogEntry[] = []
let   _printLogCallback: (() => void) | null = null

/** Register a callback fired whenever the print log changes. */
export function onPrintLogUpdated(cb: () => void): void {
  _printLogCallback = cb
}

export function addPrintLog(entry: Omit<PrintLogEntry, 'id'>): void {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  _printLog.unshift({ id, ...entry })
  if (_printLog.length > MAX_PRINT_LOG) _printLog.length = MAX_PRINT_LOG
  _printLogCallback?.()
}

export function getPrintLog(): PrintLogEntry[] {
  return [..._printLog]
}

export function clearPrintLog(): void {
  _printLog.length = 0
  _printLogCallback?.()
}
