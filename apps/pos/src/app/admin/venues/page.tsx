'use client'

import { useEffect, useState, useCallback } from 'react'
import { posApi } from '@/lib/api'
import AdminPageShell from '@/components/admin/AdminPageShell'
import clsx from 'clsx'

interface Venue {
  id: string
  name: string
  legalName: string
  timezone: string
  currencyCode: string
  countryCode: string
  taxRegime: string
  taxRegistrationNumber: string
  registeredAddress: string
  settings: Record<string, string>
  featureFlags: Record<string, boolean>
}

// ─── Known Settings Registry ──────────────────────────────────────────────────
// Settings listed here render as structured UI instead of freeform text.
//   inputType: 'select' → <select> with predefined options
//   inputType: 'number' → <input type="number"> with optional unit label
//   inputType: 'text'   → <input type="text"> (labelled, but free-form)
//
// saveAs: 'setting' → stored in venueSettings   via updateVenueSetting(key, value)
// saveAs: 'flag'    → stored in venueFeatureFlags via updateVenueFlag(key, bool)

const SETTING_GROUPS: { key: string; label: string; icon: string }[] = [
  { key: 'till',         label: 'Till',           icon: '🗄️'  },
  { key: 'pos',          label: 'POS Behaviour',  icon: '🖥️'  },
  { key: 'auth',         label: 'Authentication', icon: '🔐'  },
  { key: 'account',      label: 'Accounts',       icon: '👤'  },
  { key: 'waiver',       label: 'Waivers',        icon: '📝'  },
  { key: 'ticketing',    label: 'Ticketing',      icon: '🎟️'  },
  { key: 'gate',         label: 'Gate',           icon: '🚪'  },
  { key: 'checkout',     label: 'Checkout',       icon: '🛒'  },
  { key: 'payment',      label: 'Payments',       icon: '💳'  },
  { key: 'notification', label: 'Notifications',  icon: '🔔'  },
  { key: 'invoice',      label: 'Invoicing',      icon: '🧾'  },
  { key: 'reporting',    label: 'Reporting',      icon: '📊'  },
]

const groupOf = (key: string): string => {
  if (key === 'till_close_mode') return 'till'
  return key.split('.')[0] ?? 'other'
}

type KnownSetting = {
  label: string
  description: string
  saveAs: 'setting' | 'flag'
  defaultValue: string
} & (
  | { inputType: 'select'; options: { value: string; label: string }[] }
  | { inputType: 'number'; unit?: string; min?: number; max?: number }
  | { inputType: 'text' }
)

// Shorthand for Yes/No boolean select options
const yn = (yesDesc: string, noDesc: string) => [
  { value: 'true',  label: `Yes — ${yesDesc}` },
  { value: 'false', label: `No — ${noDesc}` },
]

const KNOWN_SETTINGS: Record<string, KnownSetting> = {

  // ── Till ────────────────────────────────────────────────────────────────────
  'till_close_mode': {
    label: 'Till Close Mode',
    description: 'Controls how cashiers close the till at end of shift',
    saveAs: 'setting', defaultValue: 'normal',
    inputType: 'select',
    options: [
      { value: 'normal', label: '👁 Normal — cashier counts cash against expected amount' },
      { value: 'blind',  label: '🙈 Blind — cashier counts without seeing expected amount' },
    ],
  },

  // ── POS Behaviour ───────────────────────────────────────────────────────────
  'pos.require_customer': {
    label: 'Require Customer',
    description: 'Force cashiers to attach a customer account to every order',
    saveAs: 'flag', defaultValue: 'false',
    inputType: 'select',
    options: yn('customer account required for every order', 'customer attachment is optional'),
  },

  // ── Authentication ───────────────────────────────────────────────────────────
  'auth.otp_required_for_login': {
    label: 'OTP Required for Login',
    description: 'Require a one-time passcode in addition to PIN or password at every login',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('OTP verification required at login', 'PIN or password is sufficient'),
  },
  'auth.allow_password_login': {
    label: 'Allow Password Login',
    description: 'Whether staff can authenticate using a password in addition to PIN',
    saveAs: 'setting', defaultValue: 'false',
    inputType: 'select',
    options: yn('password login permitted', 'PIN login only'),
  },
  'auth.otp_channels': {
    label: 'OTP Delivery Channels',
    description: 'How one-time passcodes are sent to staff during login',
    saveAs: 'setting', defaultValue: 'sms',
    inputType: 'select',
    options: [
      { value: 'sms',       label: '📱 SMS only' },
      { value: 'email',     label: '📧 Email only' },
      { value: 'sms,email', label: '📱📧 SMS and Email' },
    ],
  },
  'auth.otp_expiry_minutes': {
    label: 'OTP Expiry',
    description: 'How long a one-time passcode remains valid before it expires',
    saveAs: 'setting', defaultValue: '10',
    inputType: 'number', unit: 'minutes', min: 1, max: 60,
  },
  'auth.max_otp_attempts': {
    label: 'Max OTP Attempts',
    description: 'Number of failed OTP attempts before the session is locked',
    saveAs: 'setting', defaultValue: '3',
    inputType: 'number', min: 1, max: 10,
  },
  'auth.session_ttl_hours': {
    label: 'Session Expiry',
    description: 'How long a staff login session stays active before requiring re-authentication',
    saveAs: 'setting', defaultValue: '24',
    inputType: 'number', unit: 'hours', min: 1, max: 168,
  },

  // ── Accounts ─────────────────────────────────────────────────────────────────
  'account.allow_anonymous_otc_orders': {
    label: 'Allow Anonymous OTC Orders',
    description: 'Whether over-the-counter orders can be placed without a customer account',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('anonymous OTC orders permitted', 'customer account required for OTC orders'),
  },
  'account.require_person_assignment_before_entry': {
    label: 'Require Person Assignment Before Entry',
    description: 'Whether each ticket must be assigned to a named person before gate entry is allowed',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('person must be assigned before entry', 'entry allowed without person assignment'),
  },

  // ── Waivers ───────────────────────────────────────────────────────────────────
  'waiver.otp_required_for_signing': {
    label: 'OTP Required for Waiver Signing',
    description: 'Whether signers must verify via OTP before a waiver is accepted',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('OTP required to sign waiver', 'waiver can be signed without OTP'),
  },
  'waiver.required_for_walkin': {
    label: 'Waiver Required for Walk-ins',
    description: 'Whether walk-in customers must sign a waiver before entry',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('waiver required for all walk-ins', 'walk-ins can enter without signing a waiver'),
  },
  'waiver.expiry_months': {
    label: 'Waiver Validity',
    description: 'How long a signed waiver remains valid before the customer must re-sign',
    saveAs: 'setting', defaultValue: '12',
    inputType: 'number', unit: 'months', min: 1, max: 120,
  },

  // ── Ticketing ─────────────────────────────────────────────────────────────────
  'ticketing.max_advance_booking_days': {
    label: 'Max Advance Booking Window',
    description: 'How far in advance customers can book tickets online',
    saveAs: 'setting', defaultValue: '90',
    inputType: 'number', unit: 'days', min: 1,
  },
  'ticketing.late_entry_grace_period_minutes': {
    label: 'Late Entry Grace Period',
    description: 'How many minutes past a session start time the gate will still accept entry',
    saveAs: 'setting', defaultValue: '15',
    inputType: 'number', unit: 'minutes', min: 0,
  },
  'ticketing.max_tickets_per_online_order': {
    label: 'Max Tickets Per Online Order',
    description: 'Maximum number of tickets a customer can purchase in a single online transaction',
    saveAs: 'setting', defaultValue: '20',
    inputType: 'number', min: 1,
  },
  'ticketing.cancellation_policy': {
    label: 'Cancellation Policy',
    description: 'Default policy applied when a customer cancels a booking',
    saveAs: 'setting', defaultValue: 'credit_only',
    inputType: 'select',
    options: [
      { value: 'credit_only', label: 'Credit only — issue venue credit, no cash refunds' },
      { value: 'full_refund',  label: 'Full refund — refund to original payment method' },
      { value: 'no_refund',    label: 'No refund — all sales are final' },
    ],
  },
  'ticketing.cancellation_cutoff_hours': {
    label: 'Cancellation Cutoff',
    description: 'How many hours before a session starts that cancellations are no longer accepted',
    saveAs: 'setting', defaultValue: '24',
    inputType: 'number', unit: 'hours', min: 0,
  },

  // ── Gate ──────────────────────────────────────────────────────────────────────
  'gate.strict_mode_enabled': {
    label: 'Strict Mode',
    description: 'Prevent entry for tickets with any validation issue (wrong session, already used, etc.)',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('strict — reject on any validation issue', 'lenient — warn but allow entry'),
  },
  'gate.allow_manual_override': {
    label: 'Allow Manual Override',
    description: 'Whether gate staff can manually override a failed scan and admit a visitor',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('manual override by gate staff permitted', 'overrides not allowed'),
  },
  'gate.exit_scan_enabled': {
    label: 'Exit Scan',
    description: 'Whether exits are tracked with a scan (enables real-time occupancy counting)',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('exit scans tracked', 'entry only — no exit scanning'),
  },
  'gate.offline_grace_minutes': {
    label: 'Offline Grace Period',
    description: 'How long the gate device continues to accept cached tickets after losing connectivity',
    saveAs: 'setting', defaultValue: '30',
    inputType: 'number', unit: 'minutes', min: 0,
  },

  // ── Checkout ──────────────────────────────────────────────────────────────────
  'checkout.online_hold_ttl_minutes': {
    label: 'Online Basket Hold Time',
    description: 'How long ticket inventory is reserved for an incomplete online checkout',
    saveAs: 'setting', defaultValue: '10',
    inputType: 'number', unit: 'minutes', min: 1,
  },
  'checkout.otc_hold_ttl_minutes': {
    label: 'OTC Basket Hold Time',
    description: 'How long inventory is reserved for an in-progress over-the-counter sale',
    saveAs: 'setting', defaultValue: '5',
    inputType: 'number', unit: 'minutes', min: 1,
  },
  'checkout.allow_split_payment': {
    label: 'Allow Split Payment',
    description: 'Whether a single order can be paid across multiple payment methods',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('split payment across methods allowed', 'single payment method per order only'),
  },

  // ── Payments ──────────────────────────────────────────────────────────────────
  'payment.cash_enabled': {
    label: 'Cash Payments',
    description: 'Accept cash as a payment method at the POS',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('cash accepted at POS', 'cash not accepted'),
  },
  'payment.card_enabled': {
    label: 'Card Payments',
    description: 'Accept card (credit / debit) as a payment method at the POS',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('card accepted at POS', 'card not accepted'),
  },
  'payment.upi_enabled': {
    label: 'UPI Payments',
    description: 'Accept UPI as a payment method at the POS',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('UPI accepted at POS', 'UPI not accepted'),
  },
  'payment.wallet_enabled': {
    label: 'Wallet Payments',
    description: 'Accept venue wallet balance as a payment method at the POS',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('wallet payments accepted', 'wallet not accepted at POS'),
  },
  'payment.gift_card_enabled': {
    label: 'Gift Card Payments',
    description: 'Accept gift cards as a payment method at the POS',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('gift cards accepted', 'gift cards not accepted'),
  },

  // ── Notifications ─────────────────────────────────────────────────────────────
  'notification.booking_confirmation_channel': {
    label: 'Booking Confirmation Channel',
    description: 'How customers receive their booking confirmation after purchase',
    saveAs: 'setting', defaultValue: 'sms,email',
    inputType: 'select',
    options: [
      { value: 'sms',       label: '📱 SMS only' },
      { value: 'email',     label: '📧 Email only' },
      { value: 'sms,email', label: '📱📧 SMS and Email' },
    ],
  },
  'notification.pre_visit_reminder_enabled': {
    label: 'Pre-visit Reminder',
    description: 'Send customers an automated reminder message before their visit',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('reminders sent before each visit', 'no pre-visit reminders'),
  },
  'notification.pre_visit_reminder_hours': {
    label: 'Reminder Lead Time',
    description: 'How many hours before a visit the reminder is sent',
    saveAs: 'setting', defaultValue: '24',
    inputType: 'number', unit: 'hours', min: 1,
  },

  // ── Invoicing ─────────────────────────────────────────────────────────────────
  'invoice.auto_generate_on_payment': {
    label: 'Auto-generate Invoice on Payment',
    description: 'Automatically create and send an invoice when a payment is completed',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('invoice generated automatically on payment', 'invoices must be created manually'),
  },
  'invoice.show_tax_breakdown': {
    label: 'Show Tax Breakdown on Invoice',
    description: 'Display individual tax line items on customer invoices',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('each tax line shown separately', 'tax shown as a single total only'),
  },
  'invoice.number_prefix': {
    label: 'Invoice Number Prefix',
    description: 'Short code prepended to every invoice number (e.g. "FZ" produces FZ-00001)',
    saveAs: 'setting', defaultValue: 'FZ',
    inputType: 'text',
  },

  // ── Reporting ─────────────────────────────────────────────────────────────────
  'reporting.live_headcount_enabled': {
    label: 'Live Headcount',
    description: 'Track and display real-time occupancy counts based on gate scan data',
    saveAs: 'setting', defaultValue: 'true',
    inputType: 'select',
    options: yn('live occupancy tracking enabled', 'headcount tracking disabled'),
  },
  'reporting.daily_rollup_time': {
    label: 'Daily Rollup Time',
    description: 'Time of day (24 h, local timezone) when daily sales and attendance reports are compiled',
    saveAs: 'setting', defaultValue: '02:00',
    inputType: 'text',
  },
}

export default function VenuesPage() {
  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    taxRegistrationNumber: '',
    registeredAddress: '',
  })
  const [savingBasic, setSavingBasic] = useState(false)
  const [basicSaved, setBasicSaved] = useState(false)
  // All settings (including flag-based known settings stored as strings) live here
  const [settingsState, setSettingsState] = useState<Record<string, { value: string }>>({})
  // Snapshot of values as last loaded/saved — used to detect dirty state
  const [originalSettings, setOriginalSettings] = useState<Record<string, string>>({})
  // True while Save All is in flight
  const [isSavingAll, setIsSavingAll] = useState(false)
  // Pure boolean flags — POS module toggles only (not in KNOWN_SETTINGS)
  const [flagsState, setFlagsState] = useState<Record<string, { value: boolean; saving: boolean }>>({})

  const fetchVenue = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await posApi.admin.getVenue()
      const venueData = response.data.data
      setVenue(venueData)
      setFormData({
        name: venueData.name,
        legalName: venueData.legalName,
        taxRegistrationNumber: venueData.taxRegistrationNumber || '',
        registeredAddress: venueData.registeredAddress || '',
      })

      const allFlags: Record<string, boolean> = venueData.featureFlags || {}

      // 1. Pre-seed every known setting with its configured default so selects always
      //    have a valid scalar — even if the key hasn't been saved to the DB yet.
      const valuesInit: Record<string, string> = {}
      Object.entries(KNOWN_SETTINGS).forEach(([key, meta]) => {
        if (meta.saveAs === 'flag') {
          const boolVal = allFlags[key] ?? (meta.defaultValue === 'true')
          valuesInit[key] = String(boolVal)
        } else {
          valuesInit[key] = meta.defaultValue
        }
      })

      // 2. Overwrite with real DB values — coerce everything to a scalar string.
      //    JSON arrays (e.g. ["sms","email"]) are joined to comma-separated strings
      //    to match our option values.
      Object.entries(venueData.settings || {}).forEach(([key, value]) => {
        let coerced: string
        if (Array.isArray(value)) {
          coerced = value.join(',')
        } else if (typeof value === 'string' && value.startsWith('[')) {
          try {
            const parsed = JSON.parse(value)
            coerced = Array.isArray(parsed) ? parsed.join(',') : value
          } catch {
            coerced = value
          }
        } else {
          coerced = String(value ?? '')
        }
        valuesInit[key] = coerced
      })

      // Store both the editable state and a clean snapshot for dirty detection
      setSettingsState(Object.fromEntries(Object.entries(valuesInit).map(([k, v]) => [k, { value: v }])))
      setOriginalSettings(valuesInit)

      // 3. Pure boolean flags for POS module toggles (exclude flag-type known settings)
      const flagsInit: Record<string, { value: boolean; saving: boolean }> = {}
      Object.entries(allFlags).forEach(([key, value]) => {
        if (!KNOWN_SETTINGS[key] || KNOWN_SETTINGS[key]!.saveAs !== 'flag') {
          flagsInit[key] = { value, saving: false }
        }
      })
      setFlagsState(flagsInit)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load venue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVenue()
  }, [fetchVenue])

  const handleSaveBasicInfo = async () => {
    try {
      setSavingBasic(true)
      await posApi.admin.updateVenue(formData)
      setBasicSaved(true)
      setTimeout(() => setBasicSaved(false), 2000)
      await fetchVenue()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save basic info')
    } finally {
      setSavingBasic(false)
    }
  }

  const extractApiError = (err: unknown) => {
    if (err && typeof err === 'object') {
      const axiosErr = err as any
      const msg = axiosErr?.response?.data?.error?.message
      if (msg) return msg
      if (axiosErr?.message) return axiosErr.message
    }
    return 'Unknown error'
  }

  // Keys whose current value differs from the last saved snapshot
  const dirtyKeys = Object.keys(settingsState).filter(
    (k) => settingsState[k]!.value !== (originalSettings[k] ?? '')
  )

  const handleSaveAll = async () => {
    if (dirtyKeys.length === 0) return
    setIsSavingAll(true)
    setError(null)

    const results = await Promise.allSettled(
      dirtyKeys.map((key) => {
        const value = settingsState[key]!.value
        const meta  = KNOWN_SETTINGS[key]
        if (meta?.saveAs === 'flag') {
          return posApi.admin.updateVenueFlag(key, value === 'true').then(() => key)
        }
        return posApi.admin.updateVenueSetting(key, value).then(() => key)
      })
    )

    const saved: string[]  = []
    const errors: string[] = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') saved.push(dirtyKeys[i]!)
      else errors.push(`${dirtyKeys[i]}: ${extractApiError(r.reason)}`)
    })

    // Advance the snapshot for everything that saved successfully
    if (saved.length > 0) {
      setOriginalSettings((prev) => {
        const next = { ...prev }
        saved.forEach((k) => { next[k] = settingsState[k]!.value })
        return next
      })
    }

    if (errors.length > 0) setError(`Some settings failed to save:\n${errors.join('\n')}`)

    setIsSavingAll(false)
  }

  const handleDiscardAll = () => {
    setSettingsState((prev) => {
      const next = { ...prev }
      dirtyKeys.forEach((k) => { next[k] = { value: originalSettings[k] ?? '' } })
      return next
    })
    setError(null)
  }

  const handleToggleFlag = async (key: string) => {
    const newValue = !flagsState[key]?.value
    try {
      setFlagsState((prev) => ({ ...prev, [key]: { ...prev[key]!, value: newValue, saving: true } }))
      await posApi.admin.updateVenueFlag(key, newValue)
      setFlagsState((prev) => ({ ...prev, [key]: { ...prev[key]!, saving: false } }))
    } catch (err) {
      setError(extractApiError(err))
      setFlagsState((prev) => ({ ...prev, [key]: { ...prev[key]!, value: !newValue, saving: false } }))
    }
  }

  if (loading) {
    return (
      <AdminPageShell title="Venue Settings" description="Legal info, timezone, and configuration" icon="🏛️">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminPageShell>
    )
  }

  if (!venue) {
    return (
      <AdminPageShell title="Venue Settings" description="Legal info, timezone, and configuration" icon="🏛️">
        <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-300 text-sm">
          {error || 'Failed to load venue'}
        </div>
      </AdminPageShell>
    )
  }

  // Partition settingsState: known (structured UI) vs unknown (freeform catch-all)
  const knownSettingKeys = Object.keys(KNOWN_SETTINGS).filter((k) => settingsState[k] !== undefined)
  const unknownSettingKeys = Object.keys(settingsState).filter((k) => !KNOWN_SETTINGS[k])

  // Group known settings by domain for section headers
  const knownByGroup = SETTING_GROUPS.map((group) => ({
    ...group,
    keys: knownSettingKeys.filter((k) => groupOf(k) === group.key),
  })).filter((g) => g.keys.length > 0)

  const isDirty = (key: string) => settingsState[key]?.value !== (originalSettings[key] ?? '')

  const updateSetting = (key: string, value: string) =>
    setSettingsState((prev) => ({ ...prev, [key]: { value } }))

  return (
    <AdminPageShell title="Venue Settings" description="Legal info, timezone, and configuration" icon="🏛️">
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      {/* ── Basic Information ────────────────────────────────────────────────── */}
      <div className="bg-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold text-lg mb-4">Basic Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Venue Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Legal Name</label>
            <input
              type="text"
              value={formData.legalName}
              onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Timezone</label>
            <div className="inline-block px-3 py-2 rounded-lg bg-slate-600 text-slate-300 text-sm">{venue.timezone || '—'}</div>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Currency Code</label>
            <div className="inline-block px-3 py-2 rounded-lg bg-slate-600 text-slate-300 text-sm">{venue.currencyCode || '—'}</div>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Country</label>
            <div className="inline-block px-3 py-2 rounded-lg bg-slate-600 text-slate-300 text-sm">{venue.countryCode || '—'}</div>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Tax Regime</label>
            <div className="inline-block px-3 py-2 rounded-lg bg-slate-600 text-slate-300 text-sm">{venue.taxRegime || '—'}</div>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Tax Registration Number</label>
            <input
              type="text"
              value={formData.taxRegistrationNumber}
              onChange={(e) => setFormData({ ...formData, taxRegistrationNumber: e.target.value })}
              className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Registered Address</label>
            <textarea
              value={formData.registeredAddress}
              onChange={(e) => setFormData({ ...formData, registeredAddress: e.target.value })}
              className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full h-24 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveBasicInfo}
            disabled={savingBasic}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {savingBasic ? 'Saving...' : 'Save Basic Info'}
          </button>
          {basicSaved && <span className="text-green-300 text-sm">✓ Saved</span>}
        </div>
      </div>

      {/* ── Runtime Settings ─────────────────────────────────────────────────── */}
      <div className="bg-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold text-lg mb-1">Runtime Settings</h2>
        <p className="text-slate-400 text-sm mb-6">
          Configuration values that control POS, operational, and platform behaviour.
          {dirtyKeys.length > 0 && (
            <span className="ml-2 text-amber-400 font-medium">
              {dirtyKeys.length} unsaved {dirtyKeys.length === 1 ? 'change' : 'changes'}
            </span>
          )}
        </p>

        <div className="space-y-8">

          {/* Known settings — grouped by domain */}
          {knownByGroup.map((group) => (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base leading-none">{group.icon}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{group.label}</span>
                <div className="flex-1 h-px bg-slate-700 ml-1" />
              </div>

              <div>
                {group.keys.map((key) => {
                  const meta  = KNOWN_SETTINGS[key]!
                  const value = settingsState[key]?.value ?? meta.defaultValue
                  const dirty = isDirty(key)
                  return (
                    <div
                      key={key}
                      className={clsx(
                        'py-4 border-b border-slate-700/50 last:border-0 pl-3 transition-colors',
                        dirty ? 'border-l-2 border-l-amber-400' : 'border-l-2 border-l-transparent'
                      )}
                    >
                      <p className="text-white text-sm font-medium mb-0.5">{meta.label}</p>
                      <p className="text-slate-400 text-xs mb-3">{meta.description}</p>

                      {meta.inputType === 'select' && (
                        <select
                          value={value}
                          disabled={isSavingAll}
                          onChange={(e) => updateSetting(key, e.target.value)}
                          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-sm appearance-none cursor-pointer disabled:opacity-50"
                        >
                          {meta.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}

                      {meta.inputType === 'number' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={value}
                            disabled={isSavingAll}
                            onChange={(e) => updateSetting(key, e.target.value)}
                            min={meta.min}
                            max={meta.max}
                            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-28 text-center disabled:opacity-50"
                          />
                          {meta.unit && <span className="text-slate-400 text-xs">{meta.unit}</span>}
                        </div>
                      )}

                      {meta.inputType === 'text' && (
                        <input
                          type="text"
                          value={value}
                          disabled={isSavingAll}
                          onChange={(e) => updateSetting(key, e.target.value)}
                          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-sm disabled:opacity-50"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Unknown settings — freeform catch-all for unrecognised keys */}
          {unknownSettingKeys.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base leading-none">⚙️</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Other</span>
                <div className="flex-1 h-px bg-slate-700 ml-1" />
              </div>
              <div>
                {unknownSettingKeys.map((key) => {
                  const value = settingsState[key]?.value ?? ''
                  const dirty = isDirty(key)
                  return (
                    <div
                      key={key}
                      className={clsx(
                        'flex items-center gap-3 py-3 border-b border-slate-700/50 last:border-0 pl-3 transition-colors',
                        dirty ? 'border-l-2 border-l-amber-400' : 'border-l-2 border-l-transparent'
                      )}
                    >
                      <span className="text-slate-400 text-sm w-56 shrink-0 font-mono">{key}</span>
                      <input
                        type="text"
                        value={value}
                        disabled={isSavingAll}
                        onChange={(e) => updateSetting(key, e.target.value)}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {knownSettingKeys.length === 0 && unknownSettingKeys.length === 0 && (
            <p className="text-slate-500 text-sm">No settings configured.</p>
          )}
        </div>
      </div>

      {/* ── POS Feature Modules ──────────────────────────────────────────────── */}
      <div className="bg-slate-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold text-lg mb-1">POS Feature Modules</h2>
        <p className="text-slate-400 text-sm mb-5">Control which tabs and modules are visible on the cashier POS screen.</p>
        <div className="divide-y divide-slate-700/50">
          {([
            { key: 'pos.tickets',     label: '🎟️ Tickets',           desc: 'Standard ticketing and add-ons' },
            { key: 'pos.fnb',         label: '🍔 F&B',                desc: 'Food & beverage ordering' },
            { key: 'pos.retail',      label: '🛍️ Retail',             desc: 'Retail product sales' },
            { key: 'pos.wallet',      label: '💳 Wallet / Gift Cards', desc: 'Wallet top-ups and gift card sales' },
            { key: 'pos.memberships', label: '⭐ Memberships',        desc: 'Membership plan sales' },
          ] as const).map((flag) => {
            const state   = flagsState[flag.key]
            const enabled = state?.value  ?? false
            const saving  = state?.saving ?? false
            return (
              <div key={flag.key} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-white text-sm font-medium">{flag.label}</p>
                  <p className="text-slate-400 text-xs">{flag.desc}</p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer ml-4">
                  {saving && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                  <div className="relative" onClick={() => handleToggleFlag(flag.key)}>
                    <div className={clsx('w-10 h-6 rounded-full transition-colors', enabled ? 'bg-blue-600' : 'bg-slate-600')} />
                    <div className={clsx('absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform', enabled ? 'translate-x-4' : '')} />
                  </div>
                  <span className={clsx('text-xs font-semibold w-14', enabled ? 'text-blue-300' : 'text-slate-500')}>
                    {enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            )
          })}
        </div>
      </div>
      {/* ── Sticky unsaved-changes footer ───────────────────────────────────── */}
      {dirtyKeys.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-6 py-4 bg-slate-900/95 backdrop-blur border-t border-slate-700 shadow-2xl">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-amber-400">{dirtyKeys.length} unsaved {dirtyKeys.length === 1 ? 'change' : 'changes'}</span>
            <span className="text-slate-500 ml-2">— review before saving</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDiscardAll}
              disabled={isSavingAll}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSavingAll}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {isSavingAll && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {isSavingAll ? 'Saving…' : 'Save All Changes'}
            </button>
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}
