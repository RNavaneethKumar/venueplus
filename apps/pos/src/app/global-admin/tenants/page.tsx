'use client'

import { useState, useEffect, useCallback } from 'react'
import { gaApi, type GATenant } from '@/lib/globalAdminApi'

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanValue = 'basic' | 'professional' | 'enterprise'

/** Used for the "Connect existing DB" mode (manual entry) */
interface ManualFormData {
  slug:           string
  name:           string
  dbUrl:          string
  defaultVenueId: string
  plan:           PlanValue
}

/** Used for the "Provision new DB" mode (automated) */
interface ProvisionFormData {
  slug:      string
  name:      string
  venueName: string
  plan:      PlanValue
  timezone:  string
  currency:  string
  country:   string
}

type CreateMode = 'provision' | 'manual'

const EMPTY_MANUAL: ManualFormData = {
  slug:           '',
  name:           '',
  dbUrl:          '',
  defaultVenueId: '',
  plan:           'basic',
}

const EMPTY_PROVISION: ProvisionFormData = {
  slug:      '',
  name:      '',
  venueName: '',
  plan:      'basic',
  timezone:  'UTC',
  currency:  'USD',
  country:   'US',
}

const PLAN_LABELS: Record<PlanValue, string> = {
  basic:        'Basic',
  professional: 'Professional',
  enterprise:   'Enterprise',
}

const PLAN_COLORS: Record<PlanValue, string> = {
  basic:        'bg-gray-800 text-gray-300',
  professional: 'bg-blue-900/40 text-blue-300',
  enterprise:   'bg-violet-900/40 text-violet-300',
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TenantsPage() {
  const [tenants,    setTenants]    = useState<GATenant[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  // Create modal state
  const [createOpen,   setCreateOpen]   = useState(false)
  const [createMode,   setCreateMode]   = useState<CreateMode>('provision')
  const [manualForm,   setManualForm]   = useState<ManualFormData>(EMPTY_MANUAL)
  const [provForm,     setProvForm]     = useState<ProvisionFormData>(EMPTY_PROVISION)
  const [saving,       setSaving]       = useState(false)
  const [createError,  setCreateError]  = useState<string | null>(null)

  // Edit modal state
  const [editTenant,  setEditTenant]  = useState<GATenant | null>(null)
  const [editForm,    setEditForm]    = useState<Omit<ManualFormData, 'slug'> & { slug: string }>({
    slug: '', name: '', dbUrl: '', defaultVenueId: '', plan: 'basic',
  })
  const [editSaving,  setEditSaving]  = useState(false)
  const [editError,   setEditError]   = useState<string | null>(null)

  // Detail flyout
  const [detailId,    setDetailId]    = useState<string | null>(null)
  const [detailData,  setDetailData]  = useState<GATenant | null>(null)
  const [detailLoad,  setDetailLoad]  = useState(false)

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchTenants = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await gaApi.tenants.list()
      setTenants(res.data.data)
    } catch {
      setError('Failed to load tenants. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTenants() }, [fetchTenants])

  // ── Create modal helpers ──────────────────────────────────────────────────

  const openCreate = () => {
    setManualForm(EMPTY_MANUAL)
    setProvForm(EMPTY_PROVISION)
    setCreateError(null)
    setCreateMode('provision')
    setCreateOpen(true)
  }

  const closeCreate = () => {
    if (saving) return
    setCreateOpen(false)
    setCreateError(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setCreateError(null)
    try {
      if (createMode === 'provision') {
        const res = await gaApi.tenants.provision({
          slug:      provForm.slug.trim(),
          name:      provForm.name.trim(),
          venueName: provForm.venueName.trim() || 'Main Venue',
          plan:      provForm.plan,
          timezone:  provForm.timezone.trim() || 'UTC',
          currency:  provForm.currency.trim().toUpperCase() || 'USD',
          country:   provForm.country.trim().toUpperCase() || 'US',
        })
        setTenants((prev) => [res.data.data, ...prev])
      } else {
        const res = await gaApi.tenants.create({
          slug:           manualForm.slug.trim(),
          name:           manualForm.name.trim(),
          dbUrl:          manualForm.dbUrl.trim(),
          defaultVenueId: manualForm.defaultVenueId.trim(),
          plan:           manualForm.plan,
        })
        setTenants((prev) => [res.data.data, ...prev])
      }
      closeCreate()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Save failed. Please try again.'
      setCreateError(msg)
    } finally {
      setSaving(false)
    }
  }

  // ── Edit modal helpers ────────────────────────────────────────────────────

  const openEdit = (t: GATenant) => {
    setEditTenant(t)
    setEditForm({
      slug:           t.slug,
      name:           t.name,
      dbUrl:          '',    // intentionally blank — must re-enter to change
      defaultVenueId: t.defaultVenueId,
      plan:           t.plan,
    })
    setEditError(null)
  }

  const closeEdit = () => {
    if (editSaving) return
    setEditTenant(null)
    setEditError(null)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTenant) return
    setEditSaving(true)
    setEditError(null)
    try {
      const patch: Parameters<typeof gaApi.tenants.update>[1] = {
        name:           editForm.name,
        defaultVenueId: editForm.defaultVenueId,
        plan:           editForm.plan,
      }
      if (editForm.dbUrl.trim()) patch.dbUrl = editForm.dbUrl.trim()

      const res = await gaApi.tenants.update(editTenant.id, patch)
      setTenants((prev) => prev.map((t) => t.id === editTenant.id ? res.data.data : t))
      closeEdit()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Save failed. Please try again.'
      setEditError(msg)
    } finally {
      setEditSaving(false)
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  const toggleActive = async (t: GATenant) => {
    try {
      if (t.isActive) {
        await gaApi.tenants.deactivate(t.id)
        setTenants((prev) => prev.map((x) => x.id === t.id ? { ...x, isActive: false } : x))
      } else {
        const res = await gaApi.tenants.update(t.id, { isActive: true })
        setTenants((prev) => prev.map((x) => x.id === t.id ? res.data.data : x))
      }
    } catch {
      fetchTenants()
    }
  }

  // ── Detail flyout ─────────────────────────────────────────────────────────

  const openDetail = async (id: string) => {
    setDetailId(id)
    setDetailData(null)
    setDetailLoad(true)
    try {
      const res = await gaApi.tenants.get(id)
      setDetailData(res.data.data)
    } finally {
      setDetailLoad(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tenants</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} provisioned
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add tenant
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400 mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchTenants} className="text-red-300 hover:text-white underline text-xs">Retry</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-900 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && tenants.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3M9 7h1m-1 4h1m4-4h1m-1 4h1M9 21v-4a1 1 0 011-1h4a1 1 0 011 1v4" />
          </svg>
          <p className="font-medium text-gray-400">No tenants yet</p>
          <p className="text-sm mt-1">Click "Add tenant" to provision your first customer.</p>
        </div>
      )}

      {/* Table — desktop */}
      {!loading && tenants.length > 0 && (
        <>
          <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Slug / Name</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Database</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Plan</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{t.name}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">{t.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openDetail(t.id)}
                        className="text-xs font-mono text-gray-400 hover:text-violet-400 transition-colors text-left max-w-xs truncate block"
                        title="Click to view full connection string"
                      >
                        {t.dbUrl}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${PLAN_COLORS[t.plan]}`}>
                        {PLAN_LABELS[t.plan]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(t)}
                        className={`text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                          t.isActive
                            ? 'bg-green-900/40 text-green-400 hover:bg-red-900/40 hover:text-red-400'
                            : 'bg-red-900/40 text-red-400 hover:bg-green-900/40 hover:text-green-400'
                        }`}
                        title={t.isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {t.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(t)}
                        className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="md:hidden space-y-3">
            {tenants.map((t) => (
              <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-white">{t.name}</div>
                    <div className="text-xs font-mono text-gray-500 mt-0.5">{t.slug}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${PLAN_COLORS[t.plan]}`}>
                      {PLAN_LABELS[t.plan]}
                    </span>
                    <button
                      onClick={() => toggleActive(t)}
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        t.isActive ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                      }`}
                    >
                      {t.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
                <div className="text-xs font-mono text-gray-500 mt-2 truncate">{t.dbUrl}</div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => openDetail(t.id)}
                    className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                  >
                    View DB URL
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Create modal ────────────────────────────────────────────────────── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-base font-semibold text-white">Add tenant</h2>
              <button
                onClick={closeCreate}
                disabled={saving}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mode toggle */}
            <div className="px-6 pt-5 pb-1">
              <div className="flex rounded-lg border border-gray-700 overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setCreateMode('provision')}
                  className={`flex-1 py-2 font-medium transition-colors ${
                    createMode === 'provision'
                      ? 'bg-violet-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Provision new database
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode('manual')}
                  className={`flex-1 py-2 font-medium transition-colors ${
                    createMode === 'manual'
                      ? 'bg-violet-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Connect existing database
                </button>
              </div>

              {createMode === 'provision' && (
                <p className="text-xs text-gray-500 mt-2">
                  The API will automatically create the database, run migrations, and set up the first venue.
                  Requires <code className="text-gray-400">POSTGRES_ADMIN_URL</code> on the server.
                </p>
              )}
              {createMode === 'manual' && (
                <p className="text-xs text-gray-500 mt-2">
                  Register an existing, already-migrated database. You must supply the connection URL and default venue ID.
                </p>
              )}
            </div>

            {/* ── Provision form ── */}
            {createMode === 'provision' && (
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Slug */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">
                      Slug
                      <span className="text-gray-600 font-normal ml-1">(subdomain, e.g. greenpark)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={provForm.slug}
                      onChange={(e) => setProvForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                      placeholder="greenpark"
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    {provForm.slug && (
                      <p className="text-xs text-gray-600 mt-1">
                        Database name: <code className="text-gray-400">venueplus_{provForm.slug.replace(/-/g, '_')}</code>
                      </p>
                    )}
                  </div>

                  {/* Tenant name */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">
                      Tenant name
                      <span className="text-gray-600 font-normal ml-1">(registry display name)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={provForm.name}
                      onChange={(e) => setProvForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Green Park Ltd."
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  {/* Venue name */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">
                      Venue name
                      <span className="text-gray-600 font-normal ml-1">(first venue inside the DB)</span>
                    </label>
                    <input
                      type="text"
                      value={provForm.venueName}
                      onChange={(e) => setProvForm((f) => ({ ...f, venueName: e.target.value }))}
                      placeholder="Green Park Arena"
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Timezone</label>
                    <input
                      type="text"
                      value={provForm.timezone}
                      onChange={(e) => setProvForm((f) => ({ ...f, timezone: e.target.value }))}
                      placeholder="UTC"
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <p className="text-xs text-gray-600 mt-1">IANA tz, e.g. Asia/Kolkata</p>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Currency</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={provForm.currency}
                      onChange={(e) => setProvForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                      placeholder="USD"
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                    />
                    <p className="text-xs text-gray-600 mt-1">ISO 4217, e.g. INR</p>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Country</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={provForm.country}
                      onChange={(e) => setProvForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))}
                      placeholder="US"
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                    />
                    <p className="text-xs text-gray-600 mt-1">ISO 3166-1 alpha-2</p>
                  </div>

                  {/* Plan */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Plan</label>
                    <select
                      value={provForm.plan}
                      onChange={(e) => setProvForm((f) => ({ ...f, plan: e.target.value as PlanValue }))}
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="basic">Basic</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>

                {createError && (
                  <div className="bg-red-900/30 border border-red-800 rounded-lg px-3 py-2.5 text-sm text-red-400">
                    {createError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeCreate} disabled={saving}
                    className="flex-1 py-2.5 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 rounded-lg text-sm font-medium transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    {saving ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Provisioning…
                      </>
                    ) : 'Provision tenant'}
                  </button>
                </div>
              </form>
            )}

            {/* ── Manual / connect existing DB form ── */}
            {createMode === 'manual' && (
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Slug
                    <span className="text-gray-600 font-normal ml-1">(subdomain — e.g. greenpark)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={manualForm.slug}
                    onChange={(e) => setManualForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    placeholder="greenpark"
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Display name</label>
                  <input
                    type="text"
                    required
                    value={manualForm.name}
                    onChange={(e) => setManualForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Green Park Venue"
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* DB URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Database URL</label>
                  <input
                    type="text"
                    required
                    value={manualForm.dbUrl}
                    onChange={(e) => setManualForm((f) => ({ ...f, dbUrl: e.target.value }))}
                    placeholder="postgres://user:pass@host:5432/dbname"
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  />
                </div>

                {/* Default Venue ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Default venue ID
                    <span className="text-gray-600 font-normal ml-1">(UUID from tenant DB)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={manualForm.defaultVenueId}
                    onChange={(e) => setManualForm((f) => ({ ...f, defaultVenueId: e.target.value.trim() }))}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  />
                </div>

                {/* Plan */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Plan</label>
                  <select
                    value={manualForm.plan}
                    onChange={(e) => setManualForm((f) => ({ ...f, plan: e.target.value as PlanValue }))}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="basic">Basic</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                {createError && (
                  <div className="bg-red-900/30 border border-red-800 rounded-lg px-3 py-2.5 text-sm text-red-400">
                    {createError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeCreate} disabled={saving}
                    className="flex-1 py-2.5 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 rounded-lg text-sm font-medium transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                    {saving ? 'Saving…' : 'Create tenant'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Edit modal ──────────────────────────────────────────────────────── */}
      {editTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-base font-semibold text-white">Edit tenant</h2>
              <button onClick={closeEdit} disabled={editSaving} className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-6 space-y-4">
              {/* Slug — read-only */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Slug</label>
                <input
                  type="text"
                  readOnly
                  value={editForm.slug}
                  className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-600 mt-1">Slug cannot be changed after creation.</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Display name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* DB URL */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Database URL
                  <span className="text-gray-600 font-normal ml-1">(leave blank to keep current)</span>
                </label>
                <input
                  type="text"
                  value={editForm.dbUrl}
                  onChange={(e) => setEditForm((f) => ({ ...f, dbUrl: e.target.value }))}
                  placeholder="postgres://user:pass@host:5432/dbname"
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                />
              </div>

              {/* Default Venue ID */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Default venue ID
                  <span className="text-gray-600 font-normal ml-1">(UUID from tenant DB)</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.defaultVenueId}
                  onChange={(e) => setEditForm((f) => ({ ...f, defaultVenueId: e.target.value.trim() }))}
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                />
              </div>

              {/* Plan */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Plan</label>
                <select
                  value={editForm.plan}
                  onChange={(e) => setEditForm((f) => ({ ...f, plan: e.target.value as PlanValue }))}
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="basic">Basic</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {editError && (
                <div className="bg-red-900/30 border border-red-800 rounded-lg px-3 py-2.5 text-sm text-red-400">
                  {editError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeEdit} disabled={editSaving}
                  className="flex-1 py-2.5 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 rounded-lg text-sm font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  {editSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Detail flyout (full DB URL) ─────────────────────────────────────── */}
      {detailId && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setDetailId(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Connection string</h2>
              <button onClick={() => setDetailId(null)} className="text-gray-500 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {detailLoad && (
              <div className="h-16 bg-gray-800 rounded-lg animate-pulse" />
            )}

            {detailData && !detailLoad && (
              <>
                <p className="text-sm text-gray-400 mb-3">
                  <span className="font-medium text-white">{detailData.name}</span>
                  <span className="font-mono text-gray-500 ml-2">({detailData.slug})</span>
                </p>
                <div className="bg-gray-800 rounded-lg p-3 font-mono text-xs text-green-400 break-all">
                  {detailData.dbUrl}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs">Default venue ID</span>
                    <div className="font-mono text-xs text-gray-300 mt-0.5 break-all">{detailData.defaultVenueId}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Updated</span>
                    <div className="text-gray-300 text-xs mt-0.5">{new Date(detailData.updatedAt).toLocaleString()}</div>
                  </div>
                </div>
                <button
                  onClick={() => { openEdit(detailData); setDetailId(null) }}
                  className="mt-4 w-full py-2 border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Edit this tenant
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
