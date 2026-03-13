'use client'

import { useEffect, useState, useCallback } from 'react'
import { posApi } from '@/lib/api'
import AdminPageShell from '@/components/admin/AdminPageShell'
import clsx from 'clsx'

interface VisitorType {
  id: string
  name: string
  code: string
  description: string
  isMinor: boolean
  requiresWaiver: boolean
  isActive: boolean
  createdAt: string
}

interface FormData {
  name: string
  code: string
  description: string
  isMinor: boolean
  requiresWaiver: boolean
  isActive?: boolean
}

export default function VisitorTypesPage() {
  const [visitorTypes, setVisitorTypes] = useState<VisitorType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    description: '',
    isMinor: false,
    requiresWaiver: false,
    isActive: true,
  })

  // Fetch visitor types
  const fetchVisitorTypes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await posApi.admin.listVisitorTypes()
      setVisitorTypes(response.data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load visitor types')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVisitorTypes()
  }, [fetchVisitorTypes])

  const openCreateModal = () => {
    setIsEditMode(false)
    setEditingId(null)
    setFormData({
      name: '',
      code: '',
      description: '',
      isMinor: false,
      requiresWaiver: false,
      isActive: true,
    })
    setShowModal(true)
  }

  const openEditModal = (visitorType: VisitorType) => {
    setIsEditMode(true)
    setEditingId(visitorType.id)
    setFormData({
      name: visitorType.name,
      code: visitorType.code,
      description: visitorType.description,
      isMinor: visitorType.isMinor,
      requiresWaiver: visitorType.requiresWaiver,
      isActive: visitorType.isActive,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setIsEditMode(false)
    setEditingId(null)
    setFormData({
      name: '',
      code: '',
      description: '',
      isMinor: false,
      requiresWaiver: false,
      isActive: true,
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.code) return

    try {
      setModalLoading(true)
      if (isEditMode && editingId) {
        const payload = isEditMode
          ? {
              name: formData.name,
              code: formData.code,
              description: formData.description,
              isMinor: formData.isMinor,
              requiresWaiver: formData.requiresWaiver,
              isActive: formData.isActive,
            }
          : {
              name: formData.name,
              code: formData.code,
              description: formData.description,
              isMinor: formData.isMinor,
              requiresWaiver: formData.requiresWaiver,
            }
        await posApi.admin.updateVisitorType(editingId, payload)
      } else {
        await posApi.admin.createVisitorType({
          name: formData.name,
          code: formData.code,
          description: formData.description,
          isMinor: formData.isMinor,
          requiresWaiver: formData.requiresWaiver,
        })
      }
      closeModal()
      await fetchVisitorTypes()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditMode
            ? 'Failed to update visitor type'
            : 'Failed to create visitor type'
      )
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <AdminPageShell
      title="Visitor Types"
      description="Ticket categories and visitor classifications"
      icon="🎫"
      actions={
        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
        >
          New Visitor Type
        </button>
      }
    >
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-300 text-sm mb-4">
          {error}
        </div>
      )}

      <p className="text-slate-400 text-sm mb-4">{visitorTypes.length} visitor types</p>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visitorTypes.length === 0 ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/30 p-8 text-center">
          <p className="text-slate-400 text-sm">No visitor types found</p>
        </div>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="sm:hidden space-y-3">
            {visitorTypes.map((vt) => (
              <div
                key={vt.id}
                onClick={() => openEditModal(vt)}
                className="bg-slate-800 rounded-2xl p-4 cursor-pointer active:bg-slate-700"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-white text-sm font-semibold">{vt.name}</p>
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-semibold shrink-0',
                    vt.isActive
                      ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                      : 'bg-slate-700 text-slate-400 border border-slate-600'
                  )}>{vt.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="text-slate-400 text-xs font-mono">{vt.code}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {vt.isMinor ? 'Minor · ' : ''}{vt.requiresWaiver ? 'Waiver required' : ''}
                </p>
              </div>
            ))}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden sm:block rounded-2xl border border-slate-700 bg-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                    <th className="text-left px-4 py-3 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Code</th>
                  <th className="text-center px-4 py-3 font-semibold">Minor?</th>
                  <th className="text-center px-4 py-3 font-semibold">Waiver?</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-center px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {visitorTypes.map((vt) => (
                  <tr key={vt.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{vt.name}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs bg-slate-900/50 rounded px-2 py-1 w-fit">
                      {vt.code}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-center">
                      {vt.isMinor ? (
                        <span className="text-green-400 font-bold">✓</span>
                      ) : (
                        <span className="text-slate-500">✕</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-center">
                      {vt.requiresWaiver ? (
                        <span className="text-green-400 font-bold">✓</span>
                      ) : (
                        <span className="text-slate-500">✕</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-semibold',
                          vt.isActive
                            ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                            : 'bg-slate-700 text-slate-400 border border-slate-600'
                        )}
                      >
                        {vt.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEditModal(vt)}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                {isEditMode ? 'Edit Visitor Type' : 'New Visitor Type'}
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block font-semibold">
                  Name
                </label>
                <input
                  type="text"
                  required
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Adult"
                />
              </div>

              {/* Code */}
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block font-semibold">
                  Code
                </label>
                <input
                  type="text"
                  required
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Used in tickets and reports — e.g. ADULT, CHILD"
                />
                <p className="text-slate-500 text-xs mt-1">Used in tickets and reports — e.g. ADULT, CHILD</p>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block font-semibold">
                  Description
                </label>
                <textarea
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>

              {/* Is Minor Toggle */}
              <label className="flex items-center gap-3 cursor-pointer py-1">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={formData.isMinor}
                    onChange={(e) => setFormData({ ...formData, isMinor: e.target.checked })}
                  />
                  <div
                    className={clsx(
                      'w-10 h-6 rounded-full transition-colors',
                      formData.isMinor ? 'bg-blue-600' : 'bg-slate-600'
                    )}
                  />
                  <div
                    className={clsx(
                      'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                      formData.isMinor ? 'translate-x-4' : ''
                    )}
                  />
                </div>
                <span className="text-slate-300 text-sm">This visitor type is for minors (under 18)</span>
              </label>

              {/* Requires Waiver Toggle */}
              <label className="flex items-center gap-3 cursor-pointer py-1">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={formData.requiresWaiver}
                    onChange={(e) => setFormData({ ...formData, requiresWaiver: e.target.checked })}
                  />
                  <div
                    className={clsx(
                      'w-10 h-6 rounded-full transition-colors',
                      formData.requiresWaiver ? 'bg-blue-600' : 'bg-slate-600'
                    )}
                  />
                  <div
                    className={clsx(
                      'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                      formData.requiresWaiver ? 'translate-x-4' : ''
                    )}
                  />
                </div>
                <span className="text-slate-300 text-sm">Waiver required at entry</span>
              </label>

              {/* Active Toggle - Only in Edit Mode */}
              {isEditMode && (
                <label className="flex items-center gap-3 cursor-pointer py-1">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={formData.isActive || false}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <div
                      className={clsx(
                        'w-10 h-6 rounded-full transition-colors',
                        formData.isActive ? 'bg-blue-600' : 'bg-slate-600'
                      )}
                    />
                    <div
                      className={clsx(
                        'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                        formData.isActive ? 'translate-x-4' : ''
                      )}
                    />
                  </div>
                  <span className="text-slate-300 text-sm">Active</span>
                </label>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {modalLoading ? (isEditMode ? 'Saving...' : 'Creating...') : isEditMode ? 'Save' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
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
