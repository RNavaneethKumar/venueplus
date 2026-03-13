'use client'

import { useEffect, useState } from 'react';
import { posApi } from '@/lib/api';
import AdminPageShell from '@/components/admin/AdminPageShell';
import clsx from 'clsx';

interface AlertRule {
  id: string;
  alertType: string;
  thresholdValue: string;
  comparisonOperator: string;
  timeWindowMinutes: number;
  severity: string;
  isActive: boolean;
  createdAt: string;
}

interface AlertLog {
  id: string;
  alertType: string;
  severity: string;
  message: string;
  createdAt: string;
  resolvedAt: string;
}

const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export default function AlertRulesPage() {
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    alertType: 'device.offline',
    severity: 'warning',
    thresholdValue: '',
    comparisonOperator: '>',
    timeWindowMinutes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rulesRes, logsRes] = await Promise.all([
        posApi.admin.listAlertRules(),
        posApi.admin.listAlertsLog(),
      ]);
      setAlertRules(rulesRes.data.data);
      setAlertLogs(logsRes.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    try {
      if (!formData.alertType) {
        setError('Alert type is required');
        return;
      }
      const createData: Record<string, unknown> = {
        alertType: formData.alertType,
        severity: formData.severity,
      };
      if (formData.thresholdValue) createData.thresholdValue = formData.thresholdValue;
      if (formData.comparisonOperator) createData.comparisonOperator = formData.comparisonOperator;
      if (formData.timeWindowMinutes) createData.timeWindowMinutes = formData.timeWindowMinutes;

      await posApi.admin.createAlertRule(createData);
      setFormData({
        alertType: 'device.offline',
        severity: 'warning',
        thresholdValue: '',
        comparisonOperator: '>',
        timeWindowMinutes: '',
      });
      setShowModal(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alert rule');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await posApi.admin.updateAlertRule(id, { isActive: !isActive });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update alert rule');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'bg-blue-900/50 text-blue-300 border-blue-700/50';
      case 'warning':
        return 'bg-amber-900/50 text-amber-300 border-amber-700/50';
      case 'critical':
        return 'bg-red-900/50 text-red-300 border-red-700/50';
      default:
        return 'bg-slate-700 text-slate-400 border-slate-600';
    }
  };

  if (loading) {
    return (
      <AdminPageShell title="Alert Rules" description="Automated monitoring and threshold alerts" icon="🔔">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Alert Rules"
      description="Automated monitoring and threshold alerts"
      icon="🔔"
      actions={
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
        >
          New Alert Rule
        </button>
      }
    >
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Alert Rules Section */}
      <div className="mb-8">
        <h2 className="text-white font-semibold text-lg mb-4">Alert Rules</h2>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {alertRules.map((rule) => (
            <div key={rule.id} className="bg-slate-800 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-white text-sm font-mono font-semibold">{rule.alertType}</p>
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0', getSeverityColor(rule.severity))}>
                  {rule.severity}
                </span>
              </div>
              <p className="text-slate-400 text-xs">
                {rule.thresholdValue ? `${rule.comparisonOperator || ''} ${rule.thresholdValue}` : '—'}
                {rule.timeWindowMinutes ? ` · ${rule.timeWindowMinutes} mins` : ''}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold border', rule.isActive ? 'bg-green-900/50 text-green-300 border-green-700/50' : 'bg-slate-700 text-slate-400 border-slate-600')}>
                  {rule.isActive ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  onClick={() => handleToggleActive(rule.id, rule.isActive)}
                  className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold"
                >
                  {rule.isActive ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block rounded-2xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Severity</th>
                  <th className="text-left px-4 py-3 font-semibold">Threshold</th>
                  <th className="text-left px-4 py-3 font-semibold">Comparison</th>
                  <th className="text-left px-4 py-3 font-semibold">Time Window (mins)</th>
                  <th className="text-left px-4 py-3 font-semibold">Active</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {alertRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-300 text-xs font-mono">
                      {rule.alertType}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-semibold border',
                          getSeverityColor(rule.severity)
                        )}
                      >
                        {rule.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {rule.thresholdValue || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {rule.comparisonOperator || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {rule.timeWindowMinutes || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-semibold border',
                          rule.isActive
                            ? 'bg-green-900/50 text-green-300 border-green-700/50'
                            : 'bg-slate-700 text-slate-400 border-slate-600'
                        )}
                      >
                        {rule.isActive ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <button
                        onClick={() => handleToggleActive(rule.id, rule.isActive)}
                        className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold"
                      >
                        {rule.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Alerts Section */}
      <div>
        <h2 className="text-white font-semibold text-lg mb-4">Recent Alerts</h2>
        {alertLogs.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/30 p-4">
            <p className="text-slate-500 text-sm">No recent alerts.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {alertLogs.map((log) => (
                <div key={log.id} className="bg-slate-800 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-white text-sm font-mono font-semibold">{log.alertType}</p>
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0', getSeverityColor(log.severity))}>
                      {log.severity}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">{log.message}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{fmtTime(log.createdAt)} · {log.resolvedAt ? '✓ Resolved' : 'Open'}</p>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block rounded-2xl border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-3 font-semibold">Type</th>
                      <th className="text-left px-4 py-3 font-semibold">Severity</th>
                      <th className="text-left px-4 py-3 font-semibold">Message</th>
                      <th className="text-left px-4 py-3 font-semibold">Triggered At</th>
                      <th className="text-left px-4 py-3 font-semibold">Resolved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {alertLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-slate-300 text-xs font-mono">
                          {log.alertType}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <span
                            className={clsx(
                              'px-2 py-1 rounded-full text-xs font-semibold border',
                              getSeverityColor(log.severity)
                            )}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {log.message}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {fmtTime(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {log.resolvedAt ? '✓' : '✕'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6">
            <h2 className="text-white font-bold text-lg mb-4">New Alert Rule</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Alert Type *
                </label>
                <select
                  value={formData.alertType}
                  onChange={(e) => setFormData({ ...formData, alertType: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="device.offline">Device Offline</option>
                  <option value="capacity.threshold">Capacity Threshold</option>
                  <option value="inventory.low_stock">Inventory Low Stock</option>
                  <option value="revenue.drop">Revenue Drop</option>
                  <option value="payment.failure">Payment Failure</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Severity
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Threshold Value
                </label>
                <input
                  type="text"
                  value={formData.thresholdValue}
                  onChange={(e) =>
                    setFormData({ ...formData, thresholdValue: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Comparison Operator
                </label>
                <select
                  value={formData.comparisonOperator}
                  onChange={(e) =>
                    setFormData({ ...formData, comparisonOperator: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value="=">=</option>
                  <option value=">=">&gt;=</option>
                  <option value="<=">&lt;=</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Time Window (minutes)
                </label>
                <input
                  type="number"
                  value={formData.timeWindowMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, timeWindowMinutes: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
