/**
 * BorderVision AI — Dashboard Page
 * Main surveillance dashboard with camera grid, incident feed, and tactical map.
 */

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import StatsBar from '@/components/dashboard/StatsBar';
import CameraGrid from '@/components/dashboard/CameraGrid';
import IncidentFeed from '@/components/dashboard/IncidentFeed';

// Dynamically import map (requires browser APIs)
const TacticalMap = dynamic(() => import('@/components/map/TacticalMap'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-white/5 h-[300px] flex items-center justify-center"
      style={{ background: 'rgba(15,18,30,0.6)' }}>
      <div className="text-gray-600 text-sm">Loading tactical map...</div>
    </div>
  ),
});

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      {/* KPI Stats */}
      <StatsBar />

      {/* Main content: Camera Grid + Incident Feed */}
      <div className="grid grid-cols-12 gap-5">
        {/* Camera Grid — left 8 cols */}
        <div className="col-span-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
              </svg>
              Live Camera Feeds
            </h2>
            <span className="text-[10px] text-gray-500">Click ⬡ Zone or ⚡ Wire on any feed to draw</span>
          </div>
          <CameraGrid />
        </div>

        {/* Incident Feed — right 4 cols */}
        <div className="col-span-4">
          <IncidentFeed />
        </div>
      </div>

      {/* Tactical Map — full width */}
      <TacticalMap />
    </div>
  );
}
