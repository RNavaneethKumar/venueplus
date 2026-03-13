'use client'

import { useState, useEffect, useCallback } from 'react'
import { posApi } from '@/lib/api'
import AdminPageShell from '@/components/admin/AdminPageShell'
import clsx from 'clsx'

const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

interface User {
  id: string
  username: string
  displayName: string
  email?: string
  mobileNumber?: string
  isActive: boolean
  isLocked: boolean
  lastLoginAt?: string
  createdAt: string
  roles: string[]
}

interface UserRole {
  id: string
  name: string
}

interface NewUserForm {
  username: string
  displayName: string
  pin: string
  mobileNumber?: string
  email?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [allRoles, setAllRoles] = useState<UserRole[]>([])
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [formData, setFormData] = useState<NewUserForm>({
    username: '',
    displayName: '',
    pin: '',
  })
  const [editFormData, setEditFormData] = useState({ displayName: '', mobileNumber: '', email: '' })
  const [editSuccess, setEditSuccess] = useState('')
  const [editError, setEditError] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData2, setFormData2] = useState<NewUserForm>({
    username: '',
    displayName: '',
    pin: '',
  })
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)

  useEffect(() => {
    loadUsers()
    loadAllRoles()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    setError(false)
    try {
      const response = await posApi.admin.listUsers()
      setUsers(response.data.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const loadAllRoles = async () => {
    try {
      const response = await posApi.admin.listRoles()
      setAllRoles(response.data.data || [])
    } catch (err) {
      console.error('Failed to load roles:', err)
    }
  }

  const loadUserDetail = useCallback(async (userId: string) => {
    setDetailLoading(true)
    setDetailError('')
    try {
      const response = await posApi.admin.getUser(userId)
      const user = response.data.data
      setSelectedUser(user)
      setEditFormData({
        displayName: user.displayName,
        mobileNumber: user.mobileNumber || '',
        email: user.email || '',
      })
      await loadUserRoles(userId)
    } catch (err) {
      console.error('Failed to load user:', err)
      setDetailError('Failed to load user details')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const loadUserRoles = async (userId: string) => {
    try {
      const response = await posApi.admin.getUserRoles(userId)
      setUserRoles(response.data.data || [])
    } catch (err) {
      console.error('Failed to load user roles:', err)
    }
  }

  const openDetailPanel = (userId: string) => {
    setSelectedUserId(userId)
    loadUserDetail(userId)
    setEditSuccess('')
    setEditError('')
    setPinError('')
    setPinSuccess('')
    setNewPin('')
    setConfirmPin('')
    setSelectedRoleId('')
  }

  const closeDetailPanel = () => {
    setSelectedUserId(null)
    setSelectedUser(null)
    setUserRoles([])
    setEditSuccess('')
    setEditError('')
    setPinError('')
    setPinSuccess('')
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.username || !formData.displayName || !formData.pin) return

    setIsSubmittingForm(true)
    try {
      await posApi.admin.createUser({
        username: formData.username,
        displayName: formData.displayName,
        pin: formData.pin,
        ...(formData.mobileNumber ? { mobileNumber: formData.mobileNumber } : {}),
        ...(formData.email ? { email: formData.email } : {}),
      })
      setShowNewUserModal(false)
      setFormData({ username: '', displayName: '', pin: '' })
      await loadUsers()
    } catch (err) {
      console.error('Failed to create user:', err)
      setError(true)
    } finally {
      setIsSubmittingForm(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return
    setIsSubmitting(true)
    setEditError('')
    setEditSuccess('')
    try {
      await posApi.admin.updateUser(selectedUser.id, {
        displayName: editFormData.displayName,
        mobileNumber: editFormData.mobileNumber,
        email: editFormData.email,
      })
      setEditSuccess('Changes saved successfully')
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          displayName: editFormData.displayName,
          mobileNumber: editFormData.mobileNumber,
          email: editFormData.email,
        })
      }
      await loadUsers()
    } catch (err) {
      console.error('Failed to update user:', err)
      setEditError('Failed to save changes')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    setIsSubmitting(true)
    try {
      await posApi.admin.updateUser(userId, { isActive: !isActive })
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, isActive: !isActive })
      }
      await loadUsers()
    } catch (err) {
      console.error('Failed to toggle active:', err)
      setEditError('Failed to update status')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleLocked = async (userId: string, isLocked: boolean) => {
    setIsSubmitting(true)
    try {
      await posApi.admin.updateUser(userId, { isLocked: !isLocked })
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, isLocked: !isLocked })
      }
      await loadUsers()
    } catch (err) {
      console.error('Failed to toggle locked:', err)
      setEditError('Failed to update lock status')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    if (newPin !== confirmPin) {
      setPinError('PINs do not match')
      return
    }
    if (newPin.length < 4 || !/^\d+$/.test(newPin)) {
      setPinError('PIN must be at least 4 digits')
      return
    }

    setIsSubmitting(true)
    setPinError('')
    setPinSuccess('')
    try {
      await posApi.admin.resetPin(selectedUser.id, newPin)
      setPinSuccess('PIN reset successfully')
      setNewPin('')
      setConfirmPin('')
    } catch (err) {
      console.error('Failed to reset PIN:', err)
      setPinError('Failed to reset PIN')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRoleId) return
    setIsSubmitting(true)
    try {
      await posApi.admin.assignRole(selectedUser.id, { roleId: selectedRoleId })
      setSelectedRoleId('')
      await loadUserRoles(selectedUser.id)
    } catch (err) {
      console.error('Failed to assign role:', err)
      setEditError('Failed to assign role')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveRole = async (roleId: string) => {
    if (!selectedUser) return
    setIsSubmitting(true)
    try {
      await posApi.admin.removeRole(selectedUser.id, roleId)
      await loadUserRoles(selectedUser.id)
    } catch (err) {
      console.error('Failed to remove role:', err)
      setEditError('Failed to remove role')
    } finally {
      setIsSubmitting(false)
    }
  }

  const actions = (
    <button
      onClick={() => setShowNewUserModal(true)}
      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
    >
      New User
    </button>
  )

  return (
    <AdminPageShell
      title="Users"
      description="Staff accounts, PINs, and role assignments"
      icon="👤"
      actions={actions}
    >
      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/50 text-red-300 text-sm">Failed to load users.</div>}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length > 0 ? (
        <>
          {/* ── Mobile cards ── */}
          <div className="sm:hidden space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => openDetailPanel(user.id)}
                className="bg-slate-800 rounded-2xl p-4 cursor-pointer active:bg-slate-700"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-white text-sm font-semibold">{user.displayName}</p>
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-semibold shrink-0',
                    user.isActive
                      ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                      : 'bg-slate-700 text-slate-400'
                  )}>{user.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="text-slate-400 text-xs font-mono">{user.username}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {user.roles.length > 0 ? user.roles.join(', ') : 'No roles'}
                  {user.isLocked && ' · 🔒 Locked'}
                </p>
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
                  <th className="text-left px-4 py-3 font-semibold">Username</th>
                  <th className="text-left px-4 py-3 font-semibold">Mobile</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Locked</th>
                  <th className="text-left px-4 py-3 font-semibold">Roles</th>
                  <th className="text-center px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-300">{user.displayName}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">{user.username}</td>
                    <td className="px-4 py-3 text-slate-300">{user.mobileNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'px-2 py-1 rounded-full text-xs font-semibold',
                        user.isActive
                          ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                          : 'bg-slate-700 text-slate-400'
                      )}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.isLocked && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-900/50 text-red-300 border border-red-700/50">
                          Locked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length > 0
                          ? user.roles.map((role) => (
                              <span
                                key={role}
                                className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-400"
                              >
                                {role}
                              </span>
                            ))
                          : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openDetailPanel(user.id)}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                      >
                        View/Edit
                      </button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <p className="text-slate-400">No users found.</p>
      )}

      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-700 h-full overflow-y-auto flex flex-col">
            {detailLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : detailError ? (
              <div className="flex items-center justify-center h-full text-slate-400">{detailError}</div>
            ) : selectedUser ? (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                  <div>
                    <p className="text-white text-lg font-semibold">{selectedUser.displayName}</p>
                    <div className="flex gap-2 mt-1">
                      {selectedUser.roles.map((role) => (
                        <span
                          key={role}
                          className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-400"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={closeDetailPanel}
                    className="text-slate-400 hover:text-white text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                <div className="flex-1 px-6 py-6 space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Profile</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Display Name</label>
                        <input
                          type="text"
                          value={editFormData.displayName}
                          onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })}
                          className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Mobile Number</label>
                        <input
                          type="text"
                          value={editFormData.mobileNumber}
                          onChange={(e) => setEditFormData({ ...editFormData, mobileNumber: e.target.value })}
                          className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Email</label>
                        <input
                          type="email"
                          value={editFormData.email}
                          onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                          className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                        />
                      </div>
                      {editSuccess && <p className="text-xs text-green-400">{editSuccess}</p>}
                      {editError && <p className="text-xs text-red-400">{editError}</p>}
                      <button
                        onClick={handleUpdateUser}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 w-full"
                      >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Status</h3>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleToggleActive(selectedUser.id, selectedUser.isActive)}
                        disabled={isSubmitting}
                        className={clsx(
                          'flex-1 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50',
                          selectedUser.isActive
                            ? 'bg-green-900/50 hover:bg-green-800/60 text-green-300 border border-green-700/50'
                            : 'bg-slate-700 hover:bg-slate-600 text-white'
                        )}
                      >
                        {selectedUser.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => handleToggleLocked(selectedUser.id, selectedUser.isLocked)}
                        disabled={isSubmitting}
                        className={clsx(
                          'flex-1 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50',
                          selectedUser.isLocked
                            ? 'bg-red-900/50 hover:bg-red-800/60 text-red-300 border border-red-700/50'
                            : 'bg-slate-700 hover:bg-slate-600 text-white'
                        )}
                      >
                        {selectedUser.isLocked ? 'Locked' : 'Unlocked'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Roles</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Current Roles</label>
                        <div className="space-y-2">
                          {userRoles.length > 0 ? (
                            userRoles.map((role) => (
                              <div key={role.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                <span className="text-white text-sm">{role.name}</span>
                                <button
                                  onClick={() => handleRemoveRole(role.id)}
                                  disabled={isSubmitting}
                                  className="text-red-400 hover:text-red-300 disabled:opacity-50 font-bold text-lg leading-none"
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-400 text-sm">No roles assigned</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Assign Role</label>
                        <div className="flex gap-2">
                          <select
                            value={selectedRoleId}
                            onChange={(e) => setSelectedRoleId(e.target.value)}
                            className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select a role</option>
                            {allRoles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleAssignRole}
                            disabled={!selectedRoleId || isSubmitting}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Security</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">New PIN</label>
                        <input
                          type="password"
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                          placeholder="Enter 4+ digits"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Confirm PIN</label>
                        <input
                          type="password"
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value)}
                          className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                          placeholder="Confirm PIN"
                        />
                      </div>
                      {pinError && <p className="text-xs text-red-400">{pinError}</p>}
                      {pinSuccess && <p className="text-xs text-green-400">{pinSuccess}</p>}
                      <button
                        onClick={handleResetPin}
                        disabled={isSubmitting || !newPin || !confirmPin}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 w-full"
                      >
                        {isSubmitting ? 'Resetting...' : 'Reset PIN'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-700 sticky bottom-0 bg-slate-900">
                  <button
                    onClick={closeDetailPanel}
                    className="w-full px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {showNewUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Display Name</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">PIN</label>
                <input
                  type="password"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  minLength={4}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Mobile (Optional)</label>
                <input
                  type="text"
                  value={formData.mobileNumber || ''}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Email (Optional)</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {isSubmittingForm ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewUserModal(false)}
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
