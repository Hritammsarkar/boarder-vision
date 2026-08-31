/**
 * BorderVision AI — Snapshot Viewer Modal
 * Forensic snapshot playback with event metadata.
 */

'use client';

import React from 'react';
import SeverityBadge from '@/components/ui/SeverityBadge';
import { API_BASE_URL, CLASS_ICONS } from '@/lib/constants';
import type { BreachEvent } from '@/lib/types';

interface SnapshotViewerProps {
  event: BreachEvent;
  onClose: () => void;
}

export default function SnapshotViewer({ event, onClose }: SnapshotViewerProps) {
  const snapshotUrl = event.snapshot_path
    ? `${API_BASE_URL}/snapshots/${event.snapshot_path.split('/').pop()}`
    : null;

  const formatDateTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      });
    } catch { return ts; }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: 'rgba(15,18,30,0.95)', backdropFilter: 'blur(20px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <span className="text-sm font-bold text-white">Forensic Snapshot</span>
            <SeverityBadge severity={event.severity} size="sm" />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex">
          {/* Snapshot image */}
          <div className="flex-1 bg-black flex items-center justify-center min-h-[300px]">
            {snapshotUrl ? (
              <img
                src={snapshotUrl}
                alt="Breach snapshot"
                className="w-full h-auto max-h-[500px] object-contain"
              />
            ) : (
              <div className="text-center text-gray-600">
                <div className="text-4xl mb-3">📷</div>
                <div className="text-sm">Snapshot not available</div>
                <div className="text-xs text-gray-700 mt-1">
                  Connect the vision pipeline to capture breach snapshots
                </div>
              </div>
            )}
          </div>

          {/* Metadata sidebar */}
          <div className="w-[240px] border-l border-white/5 p-4 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Event ID</div>
              <div className="text-xs text-white/80 font-mono break-all">{event.id}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Timestamp</div>
              <div className="text-xs text-white/80">{formatDateTime(event.timestamp)}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Object</div>
              <div className="text-xs text-white/80">
                {CLASS_ICONS[event.object_class] || '❓'} {event.object_class} — Track #{event.object_id}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Description</div>
              <div className="text-xs text-white/80">{event.description}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Status</div>
              <div className={`text-xs font-medium ${
                event.acknowledged ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {event.acknowledged ? '✓ Acknowledged' : '⏳ Pending Acknowledgement'}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Camera ID</div>
              <div className="text-xs text-white/80 font-mono">{event.camera_id.slice(0, 12)}...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
