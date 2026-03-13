'use client'

import { useEffect, useState, useCallback } from 'react'
import { posApi } from '@/lib/api'
import AdminPageShell from '@/components/admin/AdminPageShell'
import clsx from 'clsx'

interface TaxComponent {
  id: string
  code: string
  name: string
  rate: number
  isActive?: boolean
}

interface GlobalTaxComponent {
  id: string
  code: string
  name: string
  isActive: boolean
  createdAt: string
}

interface TaxStructure {
  id: string
  name: string
  code: string | null
  isActive: boolean
  createdAt: string
  components: TaxComponent[]
}

const fmtTime = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleDateString('en-IN') : '—'

export default function TaxPage() {
  const [taxStructures, setTaxStructures] = useState<TaxStructure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', code: '' })

  // Global tax components tab
  const [activeTab, setActiveTab] = useState<'structures' | 'components'>('structures')
  const [globalComponents, setGlobalComponents] = useState<GlobalTaxComponent[]>([])
  const [componentsLoading, setComponentsLoading] = useState(false)
  const [showNewCompModal, setShowNewCompModal] = useState(false)
  const [newCompForm, setNewCompForm] = useState({ code: '', name: '' })
  const [newCompLoading, setNewCompLoading] = useState(false)
  const [newCompError, setNewCompError] = useState<string | null>(null)
  const [editingCompId, setEditingCompId] = useState<string | null>(null)
  const [editingCompForm, setEditingCompForm] = useState({ code: '', name: '', isActive: true })
  const [editingCompLoading, setEditingCompLoading] = useState(false)
  const [editingCompError, setEditingCompError] = useState<string | null>(null)

  const fetchGlobalComponents = useCallback(async () => {
    try {
      setComponentsLoading(true)
      const res = await posApi.admin.listTaxComponents()
      setGlobalComponents(res.data.data || [])
    } catch (err) {
      console.error('Failed to load tax components:', err)
    } finally {
      setComponentsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'components') fetchGlobalComponents()
  }, [activeTab, fetchGlobalComponents])

  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCompForm.code.trim() || !newCompForm.name.trim()) return
    try {
      setNewCompLoading(true)
      setNewCompError(null)
      await posApi.admin.createTaxComponent({ code: newCompForm.code.trim(), name: newCompForm.name.trim() })
      setShowNewCompModal(false)
      setNewCompForm({ code: '', name: '' })
      await fetchGlobalComponents()
    } catch (err: any) {
      setNewCompError(err?.response?.data?.error?.message ?? 'Failed to create component')
    } finally {
      setNewCompLoading(false)
    }
  }

  const startEditComp = (c: GlobalTaxComponent) => {
    setEditingCompId(c.id)
    setEditingCompForm({ code: c.code, name: c.name, isActive: c.isActive })
    setEditingCompError(null)
  }

  const handleSaveComp = async () => {
    if (!editingCompId) return
    try {
      setEditingCompLoading(true)
      setEditingCompError(null)
      await posApi.admin.updateTaxComponent(editingCompId, editingCompForm)
      setEditingCompId(null)
      await fetchGlobalComponents()
    } catch (err: any) {
      setEditingCompError(err?.response?.data?.error?.message ?? 'Failed to save')
    } finally {
      setEditingCompLoading(false)
    }
  }

  const inputCls = 'bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full'

  const fetchTaxStructures = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await posApi.admin.listTax()
      setTaxStructures(response.data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tax structures')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTaxStructures()
  }, [fetchTaxStructures])

  const handleCreateTaxStructure = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      setModalLoading(true)
      setModalError(null)
      const payload: any = { name: formData.name }
      if (formData.code.trim()) payload.code = formData.code
      await posApi.admin.createTaxStructure(payload)
      setShowModal(false)
      setFormData({ name: '', code: '' })
      await fetchTaxStructures()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to create tax structure')
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <AdminPageShell
      title="Tax"
      description="GST components and tax structure configuration"
      icon="🧾"
      actions={
        activeTab === 'structures' ? (
          <button onClick={() => setShowModal(true)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
            New Structure
          </button>
        ) : (
          <button onClick={() => setShowNewCompModal(true)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
            New Component
          </button>
        )
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-slate-800 rounded-xl w-fit">
        {(['structures', 'components'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors capitalize',
              activeTab === tab ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            )}
          >
            {tab === 'structures' ? 'Tax Structures' : 'Tax Components'}
          </button>
        ))}
      </div>

      {error && <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-300 text-sm mb-4">{error}</div>}

      {/* Tax Structures tab */}
      {activeTab === 'structures' && (
        loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Mobile cards (tax structures) ── */}
            <div className="sm:hidden space-y-3">
              {taxStructures.map((ts) => (
                <div key={ts.id} className="bg-slate-800 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-white text-sm font-semibold">{ts.name}</p>
                    <span className={clsx(
                      'px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0',
                      ts.isActive ? 'bg-green-900/50 text-green-300 border-green-700/50' : 'bg-slate-700 text-slate-400 border-slate-600'
                    )}>{ts.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="text-slate-400 text-xs font-mono">{ts.code || '—'}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {ts.components?.map(c => `${c.name} ${c.rate}%`).join(' + ') || 'No components'}
                  </p>
                  <div className="mt-2">
                    <EditTaxButton id={ts.id} onRefresh={fetchTaxStructures} />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop table ── */}
            <div className="hidden sm:block rounded-2xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-semibold">Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Code</th>
                    <th className="text-left px-4 py-3 font-semibold">Components</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {taxStructures.map((ts) => (
                    <tr key={ts.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-slate-300">{ts.name}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs">{ts.code || '—'}</td>
                      <td className="px-4 py-3">
                        {ts.components && ts.components.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {ts.components.map((c) => (
                              <span key={c.id} className="inline-block px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-xs">
                                {c.name} {c.rate}%
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('px-2 py-1 rounded-full text-xs font-semibold border', ts.isActive ? 'bg-green-900/50 text-green-300 border-green-700/50' : 'bg-slate-700 text-slate-400 border-slate-600')}>
                          {ts.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <EditTaxButton id={ts.id} onRefresh={fetchTaxStructures} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
        )
      )}

      {/* Tax Components tab */}
      {activeTab === 'components' && (
        componentsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Mobile cards (components) ── */}
            <div className="sm:hidden space-y-3">
              {globalComponents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
                  <p className="text-slate-400 text-sm">No tax components. Tap &ldquo;New Component&rdquo; to add one.</p>
                </div>
              ) : globalComponents.map((c) => (
                <div key={c.id} className="bg-slate-800 rounded-2xl p-4">
                  {editingCompId === c.id ? (
                    <div className="space-y-3">
                      <input type="text" value={editingCompForm.code} onChange={(e) => setEditingCompForm({ ...editingCompForm, code: e.target.value.toUpperCase() })} className={inputCls} maxLength={20} placeholder="Code" />
                      <input type="text" value={editingCompForm.name} onChange={(e) => setEditingCompForm({ ...editingCompForm, name: e.target.value })} className={inputCls} placeholder="Name" />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div className="relative">
                          <input type="checkbox" className="sr-only" checked={editingCompForm.isActive} onChange={(e) => setEditingCompForm({ ...editingCompForm, isActive: e.target.checked })} />
                          <div className={clsx('w-8 h-5 rounded-full transition-colors', editingCompForm.isActive ? 'bg-blue-600' : 'bg-slate-600')} />
                          <div className={clsx('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform', editingCompForm.isActive ? 'translate-x-3' : '')} />
                        </div>
                        <span className="text-slate-300 text-xs">{editingCompForm.isActive ? 'Active' : 'Inactive'}</span>
                      </label>
                      {editingCompError && <p className="text-red-400 text-xs">{editingCompError}</p>}
                      <div className="flex gap-2">
                        <button onClick={handleSaveComp} disabled={editingCompLoading} className="flex-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50">
                          {editingCompLoading ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingCompId(null)} className="flex-1 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-white text-sm font-semibold">{c.name}</p>
                        <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0', c.isActive ? 'bg-green-900/50 text-green-300 border-green-700/50' : 'bg-slate-700 text-slate-400 border-slate-600')}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs font-mono">{c.code}</p>
                      <div className="mt-3">
                        <button onClick={() => startEditComp(c)} className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-700/50 text-xs font-semibold">Edit</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* ── Desktop table (components) ── */}
            <div className="hidden sm:block rounded-2xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-semibold">Code</th>
                    <th className="text-left px-4 py-3 font-semibold">Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {globalComponents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No tax components. Click "New Component" to add one.</td>
                    </tr>
                  ) : globalComponents.map((c) => (
                    editingCompId === c.id ? (
                      <tr key={c.id} className="bg-slate-800/50">
                        <td className="px-4 py-3">
                          <input type="text" value={editingCompForm.code} onChange={(e) => setEditingCompForm({ ...editingCompForm, code: e.target.value.toUpperCase() })} className={inputCls} maxLength={20} />
                        </td>
                        <td className="px-4 py-3">
                          <input type="text" value={editingCompForm.name} onChange={(e) => setEditingCompForm({ ...editingCompForm, name: e.target.value })} className={inputCls} />
                        </td>
                        <td className="px-4 py-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <div className="relative">
                              <input type="checkbox" className="sr-only" checked={editingCompForm.isActive} onChange={(e) => setEditingCompForm({ ...editingCompForm, isActive: e.target.checked })} />
                              <div className={clsx('w-8 h-5 rounded-full transition-colors', editingCompForm.isActive ? 'bg-blue-600' : 'bg-slate-600')} />
                              <div className={clsx('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform', editingCompForm.isActive ? 'translate-x-3' : '')} />
                            </div>
                            <span className="text-slate-300 text-xs">{editingCompForm.isActive ? 'Active' : 'Inactive'}</span>
                          </label>
                          {editingCompError && <p className="text-red-400 text-xs mt-1">{editingCompError}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={handleSaveComp} disabled={editingCompLoading} className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50">
                              {editingCompLoading ? '...' : 'Save'}
                            </button>
                            <button onClick={() => setEditingCompId(null)} className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-slate-300 font-mono text-xs">{c.code}</td>
                        <td className="px-4 py-3 text-white">{c.name}</td>
                        <td className="px-4 py-3">
                          <span className={clsx('px-2 py-1 rounded-full text-xs font-semibold border', c.isActive ? 'bg-green-900/50 text-green-300 border-green-700/50' : 'bg-slate-700 text-slate-400 border-slate-600')}>
                            {c.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => startEditComp(c)} className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-700/50 text-xs font-semibold">Edit</button>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )
      )}

      {/* New Component Modal */}
      {showNewCompModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">New Tax Component</h2>
              <button onClick={() => { setShowNewCompModal(false); setNewCompForm({ code: '', name: '' }); setNewCompError(null) }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-lg">×</button>
            </div>
            {newCompError && <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg text-red-300 text-sm mb-4">{newCompError}</div>}
            <form onSubmit={handleCreateComponent} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Code (e.g. CGST, SGST)</label>
                <input type="text" required maxLength={20} value={newCompForm.code} onChange={(e) => setNewCompForm({ ...newCompForm, code: e.target.value.toUpperCase() })} className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full font-mono" placeholder="CGST" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Name</label>
                <input type="text" required value={newCompForm.name} onChange={(e) => setNewCompForm({ ...newCompForm, name: e.target.value })} className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" placeholder="Central GST" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={newCompLoading || !newCompForm.code.trim() || !newCompForm.name.trim()} className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50">
                  {newCompLoading ? 'Creating...' : 'Create'}
                </button>
                <button type="button" onClick={() => { setShowNewCompModal(false); setNewCompError(null) }} className="flex-1 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">New Tax Structure</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setFormData({ name: '', code: '' })
                  setModalError(null)
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-lg"
              >
                ×
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg text-red-300 text-sm mb-4">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateTaxStructure} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Name</label>
                <input
                  type="text"
                  required
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Code</label>
                <input
                  type="text"
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={modalLoading || !formData.name.trim()}
                  className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {modalLoading ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setFormData({ name: '', code: '' })
                    setModalError(null)
                  }}
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}

function EditTaxButton({ id, onRefresh }: { id: string; onRefresh: () => Promise<void> }) {
  const [showSlideOver, setShowSlideOver] = useState(false)
  const [taxStructure, setTaxStructure] = useState<TaxStructure | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailsForm, setDetailsForm] = useState({ name: '', code: '', isActive: false })
  const [detailsSaved, setDetailsSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [availableComponents, setAvailableComponents] = useState<any[]>([])
  const [selectedComponentId, setSelectedComponentId] = useState('')
  const [selectedRate, setSelectedRate] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const fetchTaxStructure = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await posApi.admin.listTax()
      const found = response.data.data.find((ts: TaxStructure) => ts.id === id)
      if (found) {
        setTaxStructure(found)
        setDetailsForm({ name: found.name, code: found.code || '', isActive: found.isActive })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tax structure')
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchAvailableComponents = useCallback(async () => {
    try {
      const response = await posApi.admin.listTaxComponents()
      const allComponents = response.data.data
      const existingIds = new Set(taxStructure?.components.map((c) => c.id) || [])
      const available = allComponents.filter((c: any) => !existingIds.has(c.id))
      setAvailableComponents(available)
    } catch (err) {
      console.error('Failed to load tax components', err)
    }
  }, [taxStructure])

  useEffect(() => {
    if (showSlideOver) {
      fetchTaxStructure()
    }
  }, [showSlideOver, fetchTaxStructure])

  useEffect(() => {
    if (taxStructure) {
      fetchAvailableComponents()
    }
  }, [taxStructure, fetchAvailableComponents])

  const handleSaveDetails = async () => {
    try {
      setSaveLoading(true)
      await posApi.admin.updateTaxStructure(id, {
        name: detailsForm.name,
        ...(detailsForm.code ? { code: detailsForm.code } : {}),
        isActive: detailsForm.isActive,
      })
      setDetailsSaved(true)
      setTimeout(() => setDetailsSaved(false), 2000)
      await fetchTaxStructure()
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save details')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleAddComponent = async () => {
    if (!selectedComponentId || !selectedRate.trim()) return

    try {
      setAddLoading(true)
      await posApi.admin.addTaxComponent(id, { taxComponentId: selectedComponentId, taxRatePercent: selectedRate })
      setSelectedComponentId('')
      setSelectedRate('')
      await fetchTaxStructure()
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add component')
    } finally {
      setAddLoading(false)
    }
  }

  const handleRemoveComponent = async (componentId: string) => {
    try {
      await posApi.admin.removeTaxComponent(id, componentId)
      await fetchTaxStructure()
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove component')
    }
  }

  return (
    <>
      <button
        onClick={() => setShowSlideOver(true)}
        className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-700/50 text-xs font-semibold"
      >
        Edit
      </button>

      {showSlideOver && (
        <>
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setShowSlideOver(false)}>
            <div
              className="w-full max-w-xl bg-slate-900 border-l border-slate-700 h-full overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-white">{loading ? 'Loading...' : taxStructure?.name}</h2>
                  {taxStructure && (
                    <span
                      className={clsx(
                        'px-2 py-1 rounded-full text-xs font-semibold border',
                        taxStructure.isActive
                          ? 'bg-green-900/50 text-green-300 border-green-700/50'
                          : 'bg-slate-700 text-slate-400 border-slate-600'
                      )}
                    >
                      {taxStructure.isActive ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowSlideOver(false)}
                  className="text-slate-400 hover:text-slate-300 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg text-red-300 text-sm mb-4">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : taxStructure ? (
                  <>
                    {/* Details Section */}
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Details</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Name</label>
                          <input
                            type="text"
                            className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                            value={detailsForm.name}
                            onChange={(e) => setDetailsForm({ ...detailsForm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Code</label>
                          <input
                            type="text"
                            className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                            value={detailsForm.code}
                            onChange={(e) => setDetailsForm({ ...detailsForm, code: e.target.value })}
                          />
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={detailsForm.isActive}
                              onChange={(e) => setDetailsForm({ ...detailsForm, isActive: e.target.checked })}
                            />
                            <div
                              className={clsx(
                                'w-10 h-6 rounded-full transition-colors',
                                detailsForm.isActive ? 'bg-blue-600' : 'bg-slate-600'
                              )}
                            />
                            <div
                              className={clsx(
                                'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                                detailsForm.isActive ? 'translate-x-4' : ''
                              )}
                            />
                          </div>
                          <span className="text-slate-300 text-sm">Active</span>
                        </label>
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={handleSaveDetails}
                            disabled={saveLoading}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50"
                          >
                            {saveLoading ? 'Saving...' : 'Save Details'}
                          </button>
                          {detailsSaved && <span className="text-green-300 text-sm">✓ Saved</span>}
                        </div>
                      </div>
                    </div>

                    {/* Tax Components Section */}
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Tax Components</h3>

                      {taxStructure.components.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {taxStructure.components.map((component) => (
                            <div key={component.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                              <div className="text-sm text-slate-300 font-mono">
                                {component.name} ({component.code}) — {component.rate}%
                              </div>
                              <button
                                onClick={() => handleRemoveComponent(component.id)}
                                className="px-2 py-1 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-700/50 text-xs font-semibold"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                        <label className="text-xs text-slate-400 uppercase tracking-wider block">Add Component</label>
                        <select
                          value={selectedComponentId}
                          onChange={(e) => setSelectedComponentId(e.target.value)}
                          className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                        >
                          <option value="">Select a component...</option>
                          {availableComponents.map((comp: any) => (
                            <option key={comp.id} value={comp.id}>
                              {comp.name} ({comp.code})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="e.g. 18.00"
                          value={selectedRate}
                          onChange={(e) => setSelectedRate(e.target.value)}
                          className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                        />
                        <button
                          onClick={handleAddComponent}
                          disabled={addLoading || !selectedComponentId || !selectedRate.trim()}
                          className="w-full px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50"
                        >
                          {addLoading ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-700">
                <button
                  onClick={() => setShowSlideOver(false)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
