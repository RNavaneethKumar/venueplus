'use client'

import { useState, useEffect } from 'react'
import { posApi } from '@/lib/api'
import AdminPageShell from '@/components/admin/AdminPageShell'
import clsx from 'clsx'

interface Role {
  id: string
  name: string
  description?: string
  scopeType: string
  isActive: boolean
  createdAt: string
}

interface Permission {
  id: string
  key: string
  module: string
  description: string
  isSensitive: boolean
  granted?: boolean
}

interface RolePermissionItem {
  permissionId: string
  key: string
  module: string
  description: string
  granted: boolean
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<RolePermissionItem[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showNewRoleModal, setShowNewRoleModal] = useState(false)
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newRoleForm, setNewRoleForm] = useState({ name: '', description: '', scopeType: 'venue' })

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [rolesRes, permsRes] = await Promise.all([
          posApi.admin.listRoles(),
          posApi.admin.listPermissions(),
        ])
        setRoles(rolesRes.data.data)
        setAllPermissions(permsRes.data.data)
        if (rolesRes.data.data.length > 0) {
          setSelectedRoleId(rolesRes.data.data[0].id)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (selectedRoleId) {
      loadRolePermissions(selectedRoleId)
    }
  }, [selectedRoleId])

  const loadRolePermissions = async (roleId: string) => {
    setLoadingPermissions(true)
    try {
      const res = await posApi.admin.getRolePermissions(roleId)
      const perms = res.data.data as RolePermissionItem[]
      setRolePermissions(perms)
      const selected = new Set(perms.filter((p) => p.granted).map((p) => p.permissionId))
      setSelectedPermissions(selected)
    } catch {
      setError(true)
    } finally {
      setLoadingPermissions(false)
    }
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleForm.name) return

    setIsSubmitting(true)
    try {
      await posApi.admin.createRole({
        name: newRoleForm.name,
        description: newRoleForm.description,
        scopeType: newRoleForm.scopeType,
      })
      setShowNewRoleModal(false)
      setNewRoleForm({ name: '', description: '', scopeType: 'venue' })
      const res = await posApi.admin.listRoles()
      setRoles(res.data.data)
    } catch {
      setError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTogglePermission = (permissionId: string) => {
    const updated = new Set(selectedPermissions)
    if (updated.has(permissionId)) {
      updated.delete(permissionId)
    } else {
      updated.add(permissionId)
    }
    setSelectedPermissions(updated)
  }

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return

    setIsSubmitting(true)
    try {
      const permIds = Array.from(selectedPermissions)
      await posApi.admin.setRolePermissions(selectedRoleId, permIds)
      await loadRolePermissions(selectedRoleId)
    } catch {
      setError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null

  const groupedPermissions = allPermissions.reduce(
    (acc, perm) => {
      if (!acc[perm.module]) acc[perm.module] = []
      acc[perm.module]!.push(perm)
      return acc
    },
    {} as Record<string, Permission[]>
  )

  const actions = (
    <button
      onClick={() => setShowNewRoleModal(true)}
      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
    >
      New Role
    </button>
  )

  return (
    <AdminPageShell
      title="Roles & Permissions"
      description="Define roles, assign permissions to roles, and assign roles to users"
      icon="🔐"
      actions={actions}
    >
      {error && <p className="text-red-400">Failed to load data.</p>}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          {/* Left panel: Roles list */}
          <div className="sm:w-1/3">
            <h2 className="text-lg font-bold text-white mb-4">Roles</h2>
            <div className="space-y-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={clsx(
                    'p-4 rounded-xl cursor-pointer border-2 transition-all',
                    selectedRoleId === role.id
                      ? 'border-blue-500 bg-slate-800'
                      : 'border-slate-700 bg-slate-900/50 hover:bg-slate-800/50'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white">{role.name}</h3>
                    <span
                      className={clsx(
                        'px-2 py-1 rounded-full text-xs font-semibold',
                        role.isActive
                          ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                          : 'bg-slate-700 text-slate-400'
                      )}
                    >
                      {role.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{role.description || '—'}</p>
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-400">
                    {role.scopeType}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Permissions */}
          <div className="sm:w-2/3">
            {selectedRole ? (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white">Permissions for {selectedRole?.name}</h2>

                {loadingPermissions && (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!loadingPermissions && (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {Object.entries(groupedPermissions).map(([module, perms]) => (
                      <div key={module} className="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
                        <h3 className="font-semibold text-white text-sm uppercase tracking-wider mb-3">
                          {module}
                        </h3>
                        <div className="space-y-2">
                          {perms.map((perm) => (
                            <label
                              key={perm.id}
                              className="flex items-start gap-3 cursor-pointer hover:bg-slate-800/30 p-2 rounded transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPermissions.has(perm.id)}
                                onChange={() => handleTogglePermission(perm.id)}
                                className="mt-1 w-4 h-4 rounded accent-blue-500"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white break-words">{perm.key}</p>
                                <p className="text-xs text-slate-400">{perm.description}</p>
                                {perm.isSensitive && (
                                  <span className="text-xs text-amber-400 font-semibold">Sensitive</span>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleSavePermissions}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:bg-blue-600/50 transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            ) : (
              <p className="text-slate-400">Select a role to view and manage permissions</p>
            )}
          </div>
        </div>
      )}

      {/* New Role Modal */}
      {showNewRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Create New Role</h2>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newRoleForm.name}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Scope Type</label>
                <select
                  value={newRoleForm.scopeType}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, scopeType: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="venue">Venue</option>
                  <option value="global">Global</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:bg-blue-600/50 transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Create Role'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewRoleModal(false)}
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
