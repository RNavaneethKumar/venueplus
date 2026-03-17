'use client'

import { useEffect, useState, useCallback } from 'react';
import { posApi } from '@/lib/api';
import AdminPageShell from '@/components/admin/AdminPageShell';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface Device {
  id: string;
  name: string;
  deviceType: string;
  identifier: string;
  status: string;
  lastHeartbeatAt: string;
  lastIpAddress: string;
  createdAt: string;
  licenseKey: string | null;
  isActivated: boolean;
  activatedAt: string | null;
}

interface Drawer {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  deviceId: string | null;
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
  if (!lastHeartbeatAt) return 'bg-red-500';
  const diffMins = (Date.now() - new Date(lastHeartbeatAt).getTime()) / 60000;
  if (diffMins < 5) return 'bg-green-500';
  if (diffMins < 60) return 'bg-amber-500';
  return 'bg-red-500';
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [drawers, setDrawers] = useState<Drawer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create/edit modal
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    deviceType: 'pos',
    identifier: '',
    status: 'active',
    linkedDrawerId: '' as string, // '' = none
  });

  // License modal
  const [licenseDevice, setLicenseDevice] = useState<Device | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [devRes, drwRes] = await Promise.all([
        posApi.admin.listDevices(),
        posApi.till.listDrawers(),
      ]);
      setDevices(devRes.data.data);
      setDrawers(drwRes.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /** Find which drawer is currently linked to a device (if any). */
  const linkedDrawerForDevice = (deviceId: string): Drawer | null =>
    drawers.find((d) => d.deviceId === deviceId) ?? null;

  const openCreateModal = () => {
    setEditingDevice(null);
    setFormData({ name: '', deviceType: 'pos', identifier: '', status: 'active', linkedDrawerId: '' });
    setShowModal(true);
  };

  const openEditModal = (device: Device) => {
    const linked = linkedDrawerForDevice(device.id);
    setEditingDevice(device);
    setFormData({
      name: device.name,
      deviceType: device.deviceType,
      identifier: device.identifier ?? '',
      status: device.status,
      linkedDrawerId: linked?.id ?? '',
    });
    setShowModal(true);
  };

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      setModalLoading(true);

      let savedDeviceId: string;

      if (editingDevice) {
        await posApi.admin.updateDevice(editingDevice.id, {
          name: formData.name,
          identifier: formData.identifier,
          status: formData.status,
        });
        savedDeviceId = editingDevice.id;

        // Update drawer linkage only if it changed
        const prevLinked = linkedDrawerForDevice(editingDevice.id);
        const prevId = prevLinked?.id ?? '';
        if (formData.linkedDrawerId !== prevId) {
          // Clear old drawer link
          if (prevId) {
            await posApi.till.updateDrawer(prevId, { deviceId: null });
          }
          // Set new drawer link
          if (formData.linkedDrawerId) {
            await posApi.till.updateDrawer(formData.linkedDrawerId, { deviceId: savedDeviceId });
          }
        }
      } else {
        const payload: any = { name: formData.name, deviceType: formData.deviceType };
        if (formData.identifier) payload.identifier = formData.identifier;
        const res = await posApi.admin.createDevice(payload);
        savedDeviceId = res.data.data.id;

        // Link drawer to the new device
        if (formData.linkedDrawerId) {
          await posApi.till.updateDrawer(formData.linkedDrawerId, { deviceId: savedDeviceId });
        }
      }

      setShowModal(false);
      setEditingDevice(null);
      await fetchAll();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to save device');
    } finally {
      setModalLoading(false);
    }
  };

  const openLicenseModal = (device: Device) => {
    setLicenseDevice(device);
    setGeneratedKey(device.licenseKey ?? null);
    setCopied(false);
  };

  const handleGenerateLicense = async () => {
    if (!licenseDevice) return;
    setLicenseLoading(true);
    try {
      const res = await posApi.admin.generateLicense(licenseDevice.id);
      const newKey: string = res.data.data.licenseKey;
      setGeneratedKey(newKey);
      setLicenseDevice({ ...licenseDevice, licenseKey: newKey, isActivated: false });
      setCopied(false);
      await fetchAll();
      toast.success('New license key generated');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to generate license');
    } finally {
      setLicenseLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <AdminPageShell
      title="Devices"
      description="POS terminals, gates, kiosks, and readers"
      icon="🖥️"
      actions={
        <button onClick={openCreateModal} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold">
          Register Device
        </button>
      }
    >
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-300 text-sm mb-6">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {devices.map((device) => {
              const linked = linkedDrawerForDevice(device.id);
              return (
                <div key={device.id} className="bg-slate-800 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-white text-sm font-semibold">{device.name}</p>
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0',
                      deviceTypeColors[device.deviceType] || 'bg-slate-700 text-slate-400 border-slate-600')}>
                      {device.deviceType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {linked && (
                    <p className="text-slate-400 text-xs mb-1">🗄 {linked.name}</p>
                  )}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={clsx('inline-block w-2 h-2 rounded-full shrink-0', getHeartbeatDot(device.lastHeartbeatAt))} />
                    <p className="text-slate-500 text-xs">{device.lastHeartbeatAt ? fmtTime(device.lastHeartbeatAt) : 'Never'}</p>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold border',
                      device.isActivated ? 'bg-green-900/40 text-green-300 border-green-700/50' : 'bg-slate-700 text-slate-400 border-slate-600')}>
                      {device.isActivated ? '✓ Activated' : 'Not Activated'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(device)} className="flex-1 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold">Edit</button>
                    <button onClick={() => openLicenseModal(device)} className="flex-1 px-3 py-1.5 rounded-xl bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 border border-blue-700/50 text-xs font-semibold">🔑 License</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-2xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-semibold">Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Type</th>
                    <th className="text-left px-4 py-3 font-semibold">Cash Drawer</th>
                    <th className="text-left px-4 py-3 font-semibold">Activation</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Last Heartbeat</th>
                    <th className="text-left px-4 py-3 font-semibold">Last IP</th>
                    <th className="text-left px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {devices.map((device) => {
                    const linked = linkedDrawerForDevice(device.id);
                    return (
                      <tr key={device.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-slate-300 font-medium">{device.name}</td>
                        <td className="px-4 py-3">
                          <span className={clsx('px-2 py-1 rounded-full text-xs font-semibold border',
                            deviceTypeColors[device.deviceType] || 'bg-slate-700 text-slate-400 border-slate-600')}>
                            {device.deviceType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {linked ? (
                            <span className="flex items-center gap-1"><span>🗄</span>{linked.name}</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx('px-2 py-1 rounded-full text-xs font-semibold border',
                            device.isActivated ? 'bg-green-900/40 text-green-300 border-green-700/50' : 'bg-slate-700 text-slate-400 border-slate-600')}>
                            {device.isActivated ? '✓ Activated' : 'Not Activated'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx('px-2 py-1 rounded-full text-xs font-semibold border',
                            device.status === 'active' ? 'bg-green-900/50 text-green-300 border-green-700/50'
                              : device.status === 'maintenance' ? 'bg-amber-900/50 text-amber-300 border-amber-700/50'
                              : 'bg-slate-700 text-slate-400 border-slate-600')}>
                            {device.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className={clsx('inline-block w-2 h-2 rounded-full', getHeartbeatDot(device.lastHeartbeatAt))} />
                            {device.lastHeartbeatAt ? fmtTime(device.lastHeartbeatAt) : 'Never'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs font-mono">{device.lastIpAddress || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditModal(device)} className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold">Edit</button>
                            <button onClick={() => openLicenseModal(device)} className="px-3 py-1.5 rounded-xl bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 border border-blue-700/50 text-xs font-semibold">🔑 License</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Create / Edit Device Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">{editingDevice ? 'Edit Device' : 'Register Device'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300">✕</button>
            </div>
            <form onSubmit={handleSaveDevice} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Name</label>
                <input type="text" required className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>

              {!editingDevice && (
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Device Type</label>
                  <select className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    value={formData.deviceType} onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}>
                    <option value="pos">POS</option>
                    <option value="gate">Gate</option>
                    <option value="kiosk">Kiosk</option>
                    <option value="kds">KDS</option>
                    <option value="arcade_reader">Arcade Reader</option>
                  </select>
                </div>
              )}

              {editingDevice && (
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Device Type</label>
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-semibold border inline-block mt-1',
                    deviceTypeColors[editingDevice.deviceType] || 'bg-slate-700 text-slate-400 border-slate-600')}>
                    {editingDevice.deviceType.replace(/_/g, ' ')}
                  </span>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Identifier</label>
                <input type="text" placeholder="MAC address or serial number (optional)"
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  value={formData.identifier} onChange={(e) => setFormData({ ...formData, identifier: e.target.value })} />
              </div>

              {/* Cash drawer link — shown for POS-type devices */}
              {(formData.deviceType === 'pos' || editingDevice?.deviceType === 'pos') && drawers.length > 0 && (
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                    Linked Cash Drawer
                  </label>
                  <select
                    className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    value={formData.linkedDrawerId}
                    onChange={(e) => setFormData({ ...formData, linkedDrawerId: e.target.value })}
                  >
                    <option value="">— No linked drawer —</option>
                    {drawers.filter((d) => d.isActive).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}{d.deviceId && d.deviceId !== editingDevice?.id ? ' (linked to another device)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-slate-500 text-xs mt-1">
                    When set, the till opens automatically using this drawer — no counter selection needed.
                  </p>
                </div>
              )}

              {editingDevice && (
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
                  <select className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={modalLoading} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 flex-1">
                  {modalLoading ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* License Key Modal */}
      {licenseDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Terminal License</h2>
                <p className="text-slate-400 text-xs mt-0.5">{licenseDevice.name}</p>
              </div>
              <button onClick={() => { setLicenseDevice(null); setGeneratedKey(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300">✕</button>
            </div>

            <div className={clsx('rounded-xl p-3 mb-5 flex items-center gap-3',
              licenseDevice.isActivated ? 'bg-green-900/20 border border-green-700/40' : 'bg-slate-800 border border-slate-700')}>
              <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0',
                licenseDevice.isActivated ? 'bg-green-900/60 text-green-300' : 'bg-slate-700 text-slate-400')}>
                {licenseDevice.isActivated ? '✓' : '○'}
              </div>
              <div>
                <p className={clsx('text-sm font-semibold', licenseDevice.isActivated ? 'text-green-300' : 'text-slate-300')}>
                  {licenseDevice.isActivated ? 'Terminal is activated' : 'Terminal not yet activated'}
                </p>
                {licenseDevice.activatedAt && <p className="text-xs text-slate-400">{fmtTime(licenseDevice.activatedAt)}</p>}
              </div>
            </div>

            {generatedKey ? (
              <div className="mb-5">
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">License Key</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 font-mono text-white text-sm tracking-widest text-center select-all">
                    {generatedKey}
                  </div>
                  <button onClick={handleCopyKey} className={clsx('px-3 py-3 rounded-xl text-sm font-semibold shrink-0 transition-colors',
                    copied ? 'bg-green-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300')}>
                    {copied ? '✓' : '📋'}
                  </button>
                </div>
                <p className="text-slate-500 text-xs mt-2">
                  Enter this key on the terminal when prompted.
                  {licenseDevice.isActivated && ' Regenerating will force re-activation.'}
                </p>
              </div>
            ) : (
              <div className="mb-5 p-4 bg-slate-800 rounded-xl border border-slate-700 text-center">
                <p className="text-slate-400 text-sm">No license key generated yet.</p>
                <p className="text-slate-500 text-xs mt-1">Generate a key to activate this terminal.</p>
              </div>
            )}

            <button onClick={handleGenerateLicense} disabled={licenseLoading}
              className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm">
              {licenseLoading ? 'Generating…' : generatedKey ? '↺ Regenerate License Key' : '+ Generate License Key'}
            </button>
            {generatedKey && (
              <p className="text-amber-400 text-xs mt-3 text-center">
                ⚠ Keep this key secure. Regenerating will invalidate any existing activation.
              </p>
            )}
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
