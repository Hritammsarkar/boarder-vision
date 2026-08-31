/**
 * BorderVision AI — Stats Bar (KPI Dashboard)
 */

'use client';

import React, { useEffect, useState } from 'react';
import { getSystemStats } from '@/lib/api';
import type { SystemStats } from '@/lib/types';

const statCards = [
  {
    key: 'active_cameras',
    label: 'Active Cameras',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
    format: (v: number) => `${v}`,
  },
  {
    key: 'total_detections',
    label: 'Total Detections',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v}`,
  },
  {
    key: 'active_breaches',
    label: 'Active Breaches',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)',
    format: (v: number) => `${v}`,
  },
  {
    key: 'uptime_seconds',
    label: 'System Uptime',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    format: (v: number) => {
      const h = Math.floor(v / 3600);
      const m = Math.floor((v % 3600) / 60);
      const s = Math.floor(v % 60);
      if (h > 0) return `${h}h ${m}m`;
      if (m > 0) return `${m}m ${s}s`;
      return `${s}s`;
    },
  },
];

export default function StatsBar() {
  const [stats, setStats] = useState<SystemStats>({
    active_cameras: 0,
    total_detections: 0,
    active_breaches: 0,
    uptime_seconds: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getSystemStats();
        setStats(data);
      } catch {
        // Use simulated values on connection error
      }
    };

    fetchStats();
    const id = setInterval(fetchStats, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-4 gap-4 mb-5">
      {statCards.map(card => {
        const value = stats[card.key as keyof SystemStats] ?? 0;

        return (
          <div
            key={card.key}
            className="relative rounded-xl overflow-hidden border border-white/5 transition-transform hover:scale-[1.02] hover:border-white/10"
            style={{ background: 'rgba(15,18,30,0.6)', backdropFilter: 'blur(10px)' }}
          >
            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: card.gradient }} />

            <div className="p-4 flex items-center gap-4">
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: card.gradient, opacity: 0.9 }}
              >
                <span className="text-white">{card.icon}</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {card.format(typeof value === 'number' ? value : 0)}
                </div>
                <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                  {card.label}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
