'use client'

import { useEffect, useState, useCallback } from 'react';
import { posApi } from '@/lib/api';
import AdminPageShell from '@/components/admin/AdminPageShell';
import clsx from 'clsx';

interface Device {
  id: string;
  name: string;
  deviceType: string;
  identifier: string;
  status: string;
  lastHeartbeatAt: string;
  lastIpAddress: string;
  createdAt: string;
}

const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const deviceTypeColors: Record<string, string> = {
  pos: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  gate: 'bg-green-900/50 text-green-300 border-green-700/50',
  kiosk: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
  kds: 'bg-purple-900/50 text-purple-300 border-purple-700/50',
  arcade_reader: 'bg-pink-900/50 text-pink-300 border-pink-700/50',
};

const getHeartbeatDot = (lastHeartbeatAt: string | null | undefined) => {
  if (!lastHeartbeatAt) {
    return 'bg-red-500';
  }

  const lastHeartbeat = new Date(lastHeartbeatAt);
  const now = new Date();
  const diffMs = now.getTime() - lastHeartbeat.getTime();
  const diffMins = diffMs / (1000 * 60);

  if (diffMins < 5) return 'bg-green-500';
  if (diffMins < 60) return 'bg-amber-500';
  return 'bg-red-500';
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    deviceType: 'pos',
    identifier: '',
    status: 'active',
  });

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await posApi.admin.listDevices();
      setDevices(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const openCreateModal = () => {
    setEditingDevice(null);
    setFormData({
      name: '',
      deviceType: 'pos',
      identifier: '',
      status: 'active',
    });
    setShowModal(true);
  };

  const openEditModal = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      deviceType: device.deviceType,
      identifier: device.identifier,
      status: device.status,
    });
    setShowModal(true);
  };

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      setModalLoading(true);

      if (editingDevice) {
        await posApi.admin.updateDevice(editingDevice.id, {
          name: formData.name,
          identifier: formData.identifier,
          status: formData.status,
        });
      } else {
        const payload: any = {
          name: formData.name,
          deviceType: formData.deviceType,
        };

        if (formData.identifier) {
          payload.identifier = formData.identifier;
        }

        await posApi.admin.createDevice(payload);
      }

      setShowModal(false);
      setEditingDevice(null);
      await fetchDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save device');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <AdminPageShell
      title="Devices"
      description="POS terminals, gates, kiosks, and readers"
      icon="🖥️"
      actions={
        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
        >
          Register Device
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
            {devices.map((device) => (
              <div
                key={device.id}
                onClick={() => openEditModal(device)}
                className="bg-slate-800 rounded-2xl p-4 cursor-pointer active:bg-slate-700"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-white text-sm font-semibold">{device.name}</p>
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0',
                    deviceTypeColors[device.deviceType] || 'bg-slate-700 text-slate-400 border-slate-600'
                  )}>{device.deviceType.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-slate-400 text-xs font-mono">{device.identifier || '—'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={clsx('inline-block w-2 h-2 rounded-full shrink-0', getHeartbeatDot(device.lastHeartbeatAt))} />
                  <p className="text-slate-500 text-xs">{device.lastHeartbeatAt ? fmtTime(device.lastHeartbeatAt) : 'Never'}</p>
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
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Identifier</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Last Heartbeat</th>
                  <th className="text-left px-4 py-3 font-semibold">Last IP</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {devices.map((device) => (
                  <tr key={device.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-300">{device.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-semibold border',
                          deviceTypeColors[device.deviceType] ||
                            'bg-slate-700 text-slate-400 border-slate-600'
                        )}
                      >
                        {device.deviceType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs font-mono">
                      {device.identifier || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-semibold border',
                          device.status === 'active'
                            ? 'bg-green-900/50 text-green-300 border-green-700/50'
                            : device.status === 'maintenance'
                              ? 'bg-amber-900/50 text-amber-300 border-amber-700/50'
                              : 'bg-slate-700 text-slate-400 border-slate-600'
                        )}
                      >
                        {device.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={clsx('inline-block w-2 h-2 rounded-full', getHeartbeatDot(device.lastHeartbeatAt))} />
                        {device.lastHeartbeatAt ? fmtTime(device.lastHeartbeatAt) : 'Never'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs font-mono">
                      {device.lastIpAddress || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditModal(device)}
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
                {editingDevice ? 'Edit Device' : 'Register Device'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDevice} className="space-y-4">
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

              {!editingDevice && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                      Device Type
                    </label>
                    <select
                      className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                      value={formData.deviceType}
                      onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                    >
                      <option value="pos">POS</option>
                      <option value="gate">Gate</option>
                      <option value="kiosk">Kiosk</option>
                      <option value="kds">KDS</option>
                      <option value="arcade_reader">Arcade Reader</option>
                    </select>
                  </div>
                </>
              )}

              {editingDevice && (
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                    Device Type
                  </label>
                  <div className="mt-1">
                    <span
                      className={clsx(
                        'px-2 py-1 rounded-full text-xs font-semibold border inline-block',
                        deviceTypeColors[editingDevice.deviceType] ||
                          'bg-slate-700 text-slate-400 border-slate-600'
                      )}
                    >
                      {editingDevice.deviceType.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Identifier
                </label>
                <input
                  type="text"
                  placeholder="MAC address or serial number"
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                />
              </div>

              {editingDevice && (
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                    Status
                  </label>
                  <select
                    className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                  </select>
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
