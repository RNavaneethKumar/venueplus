'use client'

import { useEffect, useState, useCallback } from 'react'
import { posApi } from '@/lib/api'
import { usePosStore } from '@/store/posStore'
import AdminPageShell from '@/components/admin/AdminPageShell'
import clsx from 'clsx'
import toast from 'react-hot-toast'

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

// Only groups that are rendered by the generic setting-row loop
const SETTING_GROUPS: { key: string; label: string; icon: string }[] = [
  { key: 'till', label: 'Till',          icon: '🗄️' },
  { key: 'pos',  label: 'POS Behaviour', icon: '🖥️' },
]

const groupOf = (key: string): string => {
  if (key === 'till_close_mode') return 'till'
  if (key === 'pos.till_mode')   return 'till'
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
  'pos.till_mode': {
    label: 'Till Mode',
    description: 'Counter mode: one shared till per POS terminal (identified by device). User mode: each cashier has their own till session.',
    saveAs: 'setting', defaultValue: 'counter',
    inputType: 'select',
    options: [
      { value: 'counter', label: '🖥️ Counter — one till per terminal, shared by all users on that device' },
      { value: 'user',    label: '👤 User — each cashier opens and closes their own till session' },
    ],
  },

  // ── POS Behaviour ───────────────────────────────────────────────────────────
  'pos.require_customer': {
    label: 'Require Customer',
    description: 'Force cashiers to attach a customer account to every order',
    saveAs: 'flag', defaultValue: 'false',
    inputType: 'select',
    options: [
      { value: 'true',  label: 'Yes — customer account required for every order' },
      { value: 'false', label: 'No — customer attachment is optional' },
    ],
  },

  // ── Payments (rendered as checkbox chips, not generic rows) ──────────────────
  'payment.cash_enabled':     { label: 'Cash',      description: '', saveAs: 'setting', defaultValue: 'true', inputType: 'text' },
  'payment.card_enabled':     { label: 'Card',      description: '', saveAs: 'setting', defaultValue: 'true', inputType: 'text' },
  'payment.upi_enabled':      { label: 'UPI',       description: '', saveAs: 'setting', defaultValue: 'true', inputType: 'text' },
  'payment.wallet_enabled':   { label: 'Wallet',    description: '', saveAs: 'setting', defaultValue: 'true', inputType: 'text' },
  'payment.gift_card_enabled':{ label: 'Gift Card', description: '', saveAs: 'setting', defaultValue: 'true', inputType: 'text' },

  // ── POS Modules (rendered as checkbox chips, not generic rows) ───────────────
  'pos.tickets':     { label: '🎟️ Tickets',           description: '', saveAs: 'flag', defaultValue: 'true',  inputType: 'text' },
  'pos.fnb':         { label: '🍔 F&B',                description: '', saveAs: 'flag', defaultValue: 'false', inputType: 'text' },
  'pos.retail':      { label: '🛍️ Retail',             description: '', saveAs: 'flag', defaultValue: 'false', inputType: 'text' },
  'pos.wallet':      { label: '💳 Wallet / Gift Cards', description: '', saveAs: 'flag', defaultValue: 'false', inputType: 'text' },
  'pos.memberships': { label: '⭐ Memberships',         description: '', saveAs: 'flag', defaultValue: 'false', inputType: 'text' },
}

// Keys rendered as the Payments chip group — excluded from the generic row loop
const PAYMENT_CHIP_KEYS = [
  'payment.cash_enabled', 'payment.card_enabled', 'payment.upi_enabled',
  'payment.wallet_enabled', 'payment.gift_card_enabled',
] as const

const PAYMENT_CHIP_META: Record<string, { icon: string; label: string }> = {
  'payment.cash_enabled':     { icon: '💵', label: 'Cash'      },
  'payment.card_enabled':     { icon: '💳', label: 'Card'      },
  'payment.upi_enabled':      { icon: '📱', label: 'UPI'       },
  'payment.wallet_enabled':   { icon: '👛', label: 'Wallet'    },
  'payment.gift_card_enabled':{ icon: '🎁', label: 'Gift Card' },
}

// Keys rendered as the Modules chip group — excluded from the generic row loop
const MODULE_CHIP_KEYS = [
  'pos.tickets', 'pos.fnb', 'pos.retail', 'pos.wallet', 'pos.memberships',
] as const

const MODULE_CHIP_META: Record<string, { icon: string; label: string; desc: string }> = {
  'pos.tickets':     { icon: '🎟️', label: 'Tickets',           desc: 'Standard ticketing and add-ons' },
  'pos.fnb':         { icon: '🍔', label: 'F&B',                desc: 'Food & beverage ordering' },
  'pos.retail':      { icon: '🛍️', label: 'Retail',             desc: 'Retail product sales' },
  'pos.wallet':      { icon: '💳', label: 'Wallet / Gift Cards', desc: 'Wallet top-ups and gift card sales' },
  'pos.memberships': { icon: '⭐', label: 'Memberships',         desc: 'Membership plan sales' },
}

// Keys that are rendered via custom chip groups, not the generic row loop
const CHIP_RENDERED_KEYS = new Set<string>([...PAYMENT_CHIP_KEYS, ...MODULE_CHIP_KEYS])

export default function VenuesPage() {
  // Access the POS store so we can push payment/module changes in immediately,
  // keeping the Cart in sync even when the POS page is cached by Next.js router.
  const { setVenueConfig, venueConfig } = usePosStore()

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
          // JSON-encoded array → comma-separated string
          try {
            const parsed = JSON.parse(value)
            coerced = Array.isArray(parsed) ? parsed.join(',') : value
          } catch {
            coerced = value
          }
        } else if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
          // JSON-encoded string → plain string (e.g. '"counter"' → 'counter')
          try {
            coerced = JSON.parse(value)
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

    if (errors.length > 0) {
      setError(`Some settings failed to save:\n${errors.join('\n')}`)
    }

    if (saved.length > 0) {
      toast.success(`${saved.length} setting${saved.length > 1 ? 's' : ''} saved`)

      // Push the updated payment + module settings into the shared POS store so
      // the Cart reflects them immediately — even if the POS page is cached by
      // the Next.js router and its own fetchConfig hasn't re-run yet.
      const payEnabled = (key: string) =>
        (settingsState[key]?.value ?? 'true') !== 'false'
      setVenueConfig({
        ...venueConfig,
        enabledPayments: {
          cash:      payEnabled('payment.cash_enabled'),
          card:      payEnabled('payment.card_enabled'),
          upi:       payEnabled('payment.upi_enabled'),
          wallet:    payEnabled('payment.wallet_enabled'),
          gift_card: payEnabled('payment.gift_card_enabled'),
        },
        tabs: {
          tickets:     (settingsState['pos.tickets']?.value     ?? 'true')  === 'true',
          fnb:         (settingsState['pos.fnb']?.value         ?? 'false') === 'true',
          retail:      (settingsState['pos.retail']?.value      ?? 'false') === 'true',
          wallet:      (settingsState['pos.wallet']?.value      ?? 'false') === 'true',
          memberships: (settingsState['pos.memberships']?.value ?? 'false') === 'true',
        },
      })

      // Re-fetch from DB so the page reflects the true persisted state
      await fetchVenue()
    }

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
  // Chip-rendered keys (payments + modules) are excluded from the generic row loop
  const knownSettingKeys = Object.keys(KNOWN_SETTINGS).filter(
    (k) => settingsState[k] !== undefined && !CHIP_RENDERED_KEYS.has(k)
  )
  const unknownSettingKeys = Object.keys(settingsState).filter((k) => !KNOWN_SETTINGS[k])

  // Group known settings by domain for section headers
  const knownByGroup = SETTING_GROUPS.map((group) => ({
    ...group,
    keys: knownSettingKeys.filter((k) => groupOf(k) === group.key),
  })).filter((g) => g.keys.length > 0)

  // Helper: is a chip key currently enabled?
  const chipEnabled = (key: string) => (settingsState[key]?.value ?? 'true') !== 'false'
  const toggleChip  = (key: string) =>
    updateSetting(key, chipEnabled(key) ? 'false' : 'true')

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

          {/* ── Payments chip group ── */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base leading-none">💳</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Payments</span>
              <div className="flex-1 h-px bg-slate-700 ml-1" />
            </div>
            <div className="py-4 pl-3">
              <p className="text-slate-400 text-xs mb-3">Select which payment methods are available at the POS checkout.</p>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_CHIP_KEYS.map((key) => {
                  const meta    = PAYMENT_CHIP_META[key]!
                  const enabled = chipEnabled(key)
                  const dirty   = isDirty(key)
                  return (
                    <button
                      key={key}
                      onClick={() => toggleChip(key)}
                      disabled={isSavingAll}
                      className={clsx(
                        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50',
                        enabled
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                          : 'bg-slate-700/50 border-slate-600 text-slate-500',
                        dirty && 'ring-1 ring-amber-400/50'
                      )}
                    >
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                      {enabled
                        ? <span className="text-xs text-blue-400">✓</span>
                        : <span className="text-xs text-slate-600">✕</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── POS Modules chip group ── */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base leading-none">🖥️</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">POS Modules</span>
              <div className="flex-1 h-px bg-slate-700 ml-1" />
            </div>
            <div className="py-4 pl-3">
              <p className="text-slate-400 text-xs mb-3">Control which tabs are visible on the cashier POS screen.</p>
              <div className="flex flex-wrap gap-2">
                {MODULE_CHIP_KEYS.map((key) => {
                  const meta    = MODULE_CHIP_META[key]!
                  const enabled = chipEnabled(key)
                  const dirty   = isDirty(key)
                  return (
                    <button
                      key={key}
                      onClick={() => toggleChip(key)}
                      disabled={isSavingAll}
                      title={meta.desc}
                      className={clsx(
                        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50',
                        enabled
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                          : 'bg-slate-700/50 border-slate-600 text-slate-500',
                        dirty && 'ring-1 ring-amber-400/50'
                      )}
                    >
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                      {enabled
                        ? <span className="text-xs text-blue-400">✓</span>
                        : <span className="text-xs text-slate-600">✕</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {knownSettingKeys.length === 0 && unknownSettingKeys.length === 0 && (
            <p className="text-slate-500 text-sm">No settings configured.</p>
          )}
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
