// ============================================================================
// VenuePlus — Shared Utility Functions
// ============================================================================

// ── Currency ─────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currencyCode = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(amount)
}

// ── Dates ────────────────────────────────────────────────────────────────────

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0] ?? ''
}

export function isExpired(expiresAt: Date | string): boolean {
  return new Date(expiresAt) < new Date()
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function startOfDay(date: Date, timezone?: string): Date {
  if (timezone) {
    // Use Intl to find the start of day in a specific timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = formatter.formatToParts(date)
    const year = parts.find((p) => p.type === 'year')?.value
    const month = parts.find((p) => p.type === 'month')?.value
    const day = parts.find((p) => p.type === 'day')?.value
    return new Date(`${year}-${month}-${day}T00:00:00`)
  }
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

export function endOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

// ── Tax Calculations ──────────────────────────────────────────────────────────

export function calculateTaxAmount(basePrice: number, taxRatePercent: number): number {
  return Math.round(basePrice * (taxRatePercent / 100) * 100) / 100
}

export function calculatePriceWithTax(basePrice: number, taxRatePercent: number): number {
  return Math.round(basePrice * (1 + taxRatePercent / 100) * 100) / 100
}

export function calculateBaseFromTotal(totalWithTax: number, taxRatePercent: number): number {
  return Math.round((totalWithTax / (1 + taxRatePercent / 100)) * 100) / 100
}

// ── String Helpers ────────────────────────────────────────────────────────────

export function generateSessionToken(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export function maskMobileNumber(mobile: string): string {
  if (mobile.length < 6) return '****'
  return mobile.slice(0, -4).replace(/./g, '*') + mobile.slice(-4)
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '****@****'
  const visible = local.slice(0, Math.min(3, local.length))
  return `${visible}****@${domain}`
}

// ── Validation ────────────────────────────────────────────────────────────────

export function isValidMobileIN(mobile: string): boolean {
  return /^\+91[6-9]\d{9}$/.test(mobile)
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ── QR Code ──────────────────────────────────────────────────────────────────

export function buildReservationQrPayload(reservationId: string, venueId: string): string {
  return JSON.stringify({ type: 'reservation', id: reservationId, v: venueId })
}

export function buildGiftCardQrPayload(code: string, venueId: string): string {
  return JSON.stringify({ type: 'gift_card', code, v: venueId })
}

// ── Pagination ────────────────────────────────────────────────────────────────

export function getPaginationOffset(page: number, pageSize: number): number {
  return (Math.max(1, page) - 1) * pageSize
}

export function buildPaginationMeta(total: number, page: number, pageSize: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  }
}
