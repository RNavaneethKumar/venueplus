'use client'

import { useEffect, useState, useCallback } from 'react';
import { posApi } from '@/lib/api';
import AdminPageShell from '@/components/admin/AdminPageShell';
import clsx from 'clsx';

interface Resource {
  id: string;
  name: string;
  description: string;
  admissionMode: string;
  capacityEnforcementType: string;
  capacity: number | null;
  isActive: boolean;
  createdAt: string;
}

const getAdmissionModeBadgeColor = (mode: string) => {
  switch (mode) {
    case 'slot_based':
      return 'bg-blue-900/50 text-blue-300 border-blue-700/50';
    case 'rolling_duration':
      return 'bg-purple-900/50 text-purple-300 border-purple-700/50';
    case 'open_access':
      return 'bg-green-900/50 text-green-300 border-green-700/50';
    default:
      return 'bg-slate-700 text-slate-300';
  }
};

const getEnforcementBadgeColor = (enforcement: string) => {
  switch (enforcement) {
    case 'hard':
      return 'bg-red-900/50 text-red-300 border-red-700/50';
    case 'soft':
      return 'bg-amber-900/50 text-amber-300 border-amber-700/50';
    default:
      return 'bg-slate-700 text-slate-300';
  }
};

const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    admissionMode: 'slot_based',
    capacityEnforcementType: 'hard',
    capacity: '',
    isActive: true,
  });

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await posApi.admin.listResources();
      setResources(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const openCreateModal = () => {
    setEditingResource(null);
    setFormData({
      name: '',
      description: '',
      admissionMode: 'slot_based',
      capacityEnforcementType: 'hard',
      capacity: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      description: resource.description,
      admissionMode: resource.admissionMode,
      capacityEnforcementType: resource.capacityEnforcementType,
      capacity: resource.capacity ? resource.capacity.toString() : '',
      isActive: resource.isActive,
    });
    setShowModal(true);
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      setModalLoading(true);

      if (editingResource) {
        const updatePayload: any = {
          name: formData.name,
          description: formData.description,
          isActive: formData.isActive,
        };

        if (formData.capacity) {
          updatePayload.capacity = parseInt(formData.capacity, 10);
        }

        await posApi.admin.updateResource(editingResource.id, updatePayload);
      } else {
        const createPayload: any = {
          name: formData.name,
          description: formData.description,
          admissionMode: formData.admissionMode,
          capacityEnforcementType: formData.capacityEnforcementType,
        };

        if (formData.capacity) {
          createPayload.capacity = parseInt(formData.capacity, 10);
        }

        await posApi.admin.createResource(createPayload);
      }

      setShowModal(false);
      setEditingResource(null);
      await fetchResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resource');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <AdminPageShell
      title="Resources"
      description="Venues, attractions, and activity areas"
      icon="🏟️"
      actions={
        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
        >
          New Resource
        </button>
      }
    >
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="sm:hidden space-y-3">
            {resources.map((resource) => (
              <div
                key={resource.id}
                onClick={() => openEditModal(resource)}
                className="bg-slate-800 rounded-2xl p-4 cursor-pointer active:bg-slate-700"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-white text-sm font-semibold">{resource.name}</p>
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0',
                    resource.isActive
                      ? 'bg-green-900/50 text-green-300 border-green-700/50'
                      : 'bg-slate-700 text-slate-400 border-slate-600'
                  )}>{resource.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="text-slate-400 text-xs">
                  <span className={clsx('inline-block px-1.5 py-0.5 rounded text-xs border mr-1', getAdmissionModeBadgeColor(resource.admissionMode))}>
                    {resource.admissionMode.replace(/_/g, ' ')}
                  </span>
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {resource.capacity ? `${resource.capacity} slots` : 'Unlimited'}
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
                    <th className="text-left px-4 py-3 font-semibold">Admission Mode</th>
                  <th className="text-left px-4 py-3 font-semibold">Enforcement</th>
                  <th className="text-left px-4 py-3 font-semibold">Capacity</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {resources.map((resource) => (
                  <tr key={resource.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-300">{resource.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-semibold border',
                          getAdmissionModeBadgeColor(resource.admissionMode)
                        )}
                      >
                        {resource.admissionMode.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-semibold border',
                          getEnforcementBadgeColor(resource.capacityEnforcementType)
                        )}
                      >
                        {resource.capacityEnforcementType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {resource.capacity ? `${resource.capacity} slots` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-semibold border',
                          resource.isActive
                            ? 'bg-green-900/50 text-green-300 border-green-700/50'
                            : 'bg-slate-700 text-slate-400 border-slate-600'
                        )}
                      >
                        {resource.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditModal(resource)}
                        className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold"
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                {editingResource ? 'Edit Resource' : 'New Resource'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Name
                </label>
                <input
                  type="text"
                  required
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Description
                </label>
                <textarea
                  rows={2}
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {!editingResource && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                      Admission Mode
                    </label>
                    <select
                      className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                      value={formData.admissionMode}
                      onChange={(e) => setFormData({ ...formData, admissionMode: e.target.value })}
                    >
                      <option value="slot_based">Slot Based</option>
                      <option value="rolling_duration">Rolling Duration</option>
                      <option value="open_access">Open Access</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                      Capacity Enforcement
                    </label>
                    <select
                      className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                      value={formData.capacityEnforcementType}
                      onChange={(e) =>
                        setFormData({ ...formData, capacityEnforcementType: e.target.value })
                      }
                    >
                      <option value="hard">Hard</option>
                      <option value="soft">Soft</option>
                    </select>
                  </div>
                </>
              )}

              {editingResource && (
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                    Admission Mode
                  </label>
                  <div className="bg-slate-800 rounded-xl px-3 py-2 text-slate-400 text-sm">
                    {formData.admissionMode.replace(/_/g, ' ')}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Capacity
                </label>
                <input
                  type="number"
                  placeholder="Leave blank for unlimited"
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>

              {editingResource && (
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={formData.isActive}
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
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 flex-1"
                >
                  {modalLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
