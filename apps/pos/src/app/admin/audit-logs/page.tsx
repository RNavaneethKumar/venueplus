'use client'

import { useEffect, useState, useCallback } from 'react';
import { posApi } from '@/lib/api';
import AdminPageShell from '@/components/admin/AdminPageShell';

interface AuditLog {
  id: string;
  timestamp: string;
  actionType: string;
  entityType: string;
  entityId: string;
  ipAddress: string;
  metadata: Record<string, unknown>;
  userName: string;
}

const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Debounce filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilter(actionFilter);
      setOffset(0);
      setLogs([]);
    }, 500);
    return () => clearTimeout(timer);
  }, [actionFilter]);

  // Fetch logs
  const fetchLogs = useCallback(
    async (currentOffset: number = 0) => {
      try {
        setLoading(true);
        setError(null);
        const params: Record<string, string> = {
          limit: '100',
          offset: currentOffset.toString(),
        };
        if (debouncedFilter) {
          params.actionType = debouncedFilter;
        }
        const response = await posApi.admin.listAuditLogs(params);
        const newLogs = response.data.data;

        if (currentOffset === 0) {
          setLogs(newLogs);
        } else {
          setLogs((prev) => [...prev, ...newLogs]);
        }

        // If exactly 100 rows returned, there might be more
        setHasMore(newLogs.length === 100);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    },
    [debouncedFilter]
  );

  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  const handleLoadMore = async () => {
    const newOffset = offset + 100;
    setOffset(newOffset);
    await fetchLogs(newOffset);
  };

  return (
    <AdminPageShell
      title="Audit Logs"
      description="System activity and change history"
      icon="📋"
      actions={
        <input
          type="text"
          placeholder="Filter by action..."
          className="w-64 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        />
      }
    >
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      <p className="text-slate-400 text-sm mb-4">{logs.length} logs loaded</p>

      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="sm:hidden space-y-3">
            {logs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
                <p className="text-slate-400 text-sm">No audit logs found.</p>
              </div>
            ) : logs.map((log) => (
              <div key={log.id} className="bg-slate-800 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 text-xs font-mono border border-slate-600 break-all">
                    {log.actionType}
                  </span>
                  <p className="text-slate-400 text-xs shrink-0">{log.userName || '—'}</p>
                </div>
                <p className="text-slate-400 text-xs">{log.entityType} · <span className="font-mono">{log.entityId.substring(0, 8)}</span></p>
                <p className="text-slate-500 text-xs mt-0.5">{fmtTime(log.timestamp)}</p>
              </div>
            ))}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden sm:block rounded-2xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-semibold">Timestamp</th>
                    <th className="text-left px-4 py-3 font-semibold">User</th>
                    <th className="text-left px-4 py-3 font-semibold">Action Type</th>
                    <th className="text-left px-4 py-3 font-semibold">Entity Type</th>
                    <th className="text-left px-4 py-3 font-semibold">Entity ID</th>
                    <th className="text-left px-4 py-3 font-semibold">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-left px-4 py-3 text-slate-500 text-sm">
                        No audit logs found.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {fmtTime(log.timestamp)}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {log.userName || '(no user)'}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-mono border border-slate-600">
                            {log.actionType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {log.entityType}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs font-mono">
                          {log.entityId.substring(0, 8)}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs font-mono">
                          {log.ipAddress}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-sm font-semibold"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </AdminPageShell>
  );
}
