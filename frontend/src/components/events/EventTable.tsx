/**
 * BorderVision AI — Event Audit Table
 * Filterable, paginated event history with export.
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { getEvents, getCameras, acknowledgeEvent, getExportUrl } from '@/lib/api';
import SeverityBadge from '@/components/ui/SeverityBadge';
import SnapshotViewer from './SnapshotViewer';
import type { BreachEvent, Camera, Severity, EventFilters } from '@/lib/types';
import { CLASS_ICONS } from '@/lib/constants';

export default function EventTable() {
  const [events, setEvents] = useState<BreachEvent[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<BreachEvent | null>(null);
  const [filters, setFilters] = useState<EventFilters>({
    page: 1,
    page_size: 20,
  });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEvents(filters);
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEvents();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadEvents]);

  useEffect(() => {
    getCameras().then(setCameras).catch(() => {});
  }, []);

  const handleAck = async (id: string) => {
    try {
      await acknowledgeEvent(id);
      loadEvents();
    } catch {}
  };

  const getCameraName = (id: string) => cameras.find(c => c.id === id)?.name || id.slice(0, 8);

  const formatDateTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      });
    } catch { return ts; }
  };

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filters.camera_id || ''}
          onChange={e => setFilters(f => ({ ...f, camera_id: e.target.value || undefined, page: 1 }))}
          className="bg-white/5 text-sm text-white px-3 py-1.5 rounded-lg border border-white/10 focus:border-blue-500/50 outline-none"
        >
          <option value="">All Cameras</option>
          {cameras.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={filters.severity || ''}
          onChange={e => setFilters(f => ({ ...f, severity: (e.target.value || undefined) as Severity | undefined, page: 1 }))}
          className="bg-white/5 text-sm text-white px-3 py-1.5 rounded-lg border border-white/10 focus:border-blue-500/50 outline-none"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="warning">Warning</option>
        </select>

        <input
          type="date"
          value={filters.start_date?.split('T')[0] || ''}
          onChange={e => setFilters(f => ({ ...f, start_date: e.target.value ? `${e.target.value}T00:00:00` : undefined, page: 1 }))}
          className="bg-white/5 text-sm text-white px-3 py-1.5 rounded-lg border border-white/10 focus:border-blue-500/50 outline-none"
          placeholder="Start date"
        />

        <input
          type="date"
          value={filters.end_date?.split('T')[0] || ''}
          onChange={e => setFilters(f => ({ ...f, end_date: e.target.value ? `${e.target.value}T23:59:59` : undefined, page: 1 }))}
          className="bg-white/5 text-sm text-white px-3 py-1.5 rounded-lg border border-white/10 focus:border-blue-500/50 outline-none"
          placeholder="End date"
        />

        <div className="flex-1" />

        <a
          href={getExportUrl(filters)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
          Export CSV
        </a>

        <button
          onClick={loadEvents}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/5 overflow-hidden" style={{ background: 'rgba(15,18,30,0.6)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Camera</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Severity</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Object</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.02]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-white/5 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-600">
                    No events found matching your filters.
                  </td>
                </tr>
              ) : (
                events.map(event => (
                  <tr
                    key={event.id}
                    className="border-b border-white/[0.02] hover:bg-white/[0.02] cursor-pointer transition-colors"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <td className="px-4 py-2.5 text-xs text-gray-300 font-mono whitespace-nowrap">
                      {formatDateTime(event.timestamp)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-white/80">
                      {getCameraName(event.camera_id)}
                    </td>
                    <td className="px-4 py-2.5">
                      <SeverityBadge severity={event.severity} size="sm" />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-white/80">
                      {CLASS_ICONS[event.object_class] || '❓'} {event.object_class}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 max-w-[250px] truncate">
                      {event.description}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        event.acknowledged
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}>
                        {event.acknowledged ? 'Acknowledged' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {!event.acknowledged && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAck(event.id); }}
                          className="text-[10px] px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5">
          <span className="text-[11px] text-gray-500">
            Page {filters.page} • {events.length} results
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilters(f => ({ ...f, page: Math.max(1, f.page - 1) }))}
              disabled={filters.page <= 1}
              className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              disabled={events.length < filters.page_size}
              className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Snapshot viewer modal */}
      {selectedEvent && (
        <SnapshotViewer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
