/**
 * BorderVision AI — Event Logs Page
 * Audit log with filtering, pagination, and forensic snapshot viewer.
 */

'use client';

import React from 'react';
import EventTable from '@/components/events/EventTable';

export default function EventsPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white/90 flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
            </svg>
            Event Audit Logs
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Complete forensic log of all breach events, detection alerts, and system incidents.
          </p>
        </div>
      </div>

      <EventTable />
    </div>
  );
}
