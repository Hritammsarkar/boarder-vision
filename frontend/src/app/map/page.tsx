/**
 * BorderVision AI — Tactical Map Page
 * Full-screen GIS map with camera locations and FOV cones.
 */

'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const TacticalMap = dynamic(() => import('@/components/map/TacticalMap'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-white/5 h-[calc(100vh-140px)] flex items-center justify-center"
      style={{ background: 'rgba(15,18,30,0.6)' }}>
      <div className="text-gray-600 text-sm">Loading tactical map...</div>
    </div>
  ),
});

export default function MapPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-white/90 flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/>
          </svg>
          Tactical Operations Map
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Real-time camera locations with field-of-view cones. Cameras pulse red during active breaches.
        </p>
      </div>

      <TacticalMap className="!h-[calc(100vh-180px)]" />
    </div>
  );
}
