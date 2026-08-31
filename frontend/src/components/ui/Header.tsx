/**
 * BorderVision AI — Header Bar
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useWSContext } from '@/providers/WebSocketProvider';

export default function Header() {
  const [currentTime, setCurrentTime] = useState('');
  const { events, isConnected } = useWSContext();
  const unackCount = events.filter(e => !e.isNew).length;

  useEffect(() => {
    const update = () => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="h-14 flex items-center justify-between px-6 border-b border-white/5 z-30"
      style={{
        background: 'rgba(10,12,20,0.85)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Left: Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-base font-bold tracking-widest text-white/90">
          BORDERVISION <span style={{ color: '#ff2d55' }}>AI</span>
        </h1>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 font-medium border border-white/10">
          v1.0
        </span>
      </div>

      {/* Right: Status indicators */}
      <div className="flex items-center gap-5">
        {/* System indicators */}
        <div className="flex items-center gap-3">
          <StatusDot label="AI Engine" status="active" />
          <StatusDot label="WebSocket" status={isConnected ? 'active' : 'inactive'} />
          <StatusDot label="Database" status="active" />
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/10" />

        {/* Alert count */}
        {events.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                {events.length > 9 ? '9+' : events.length}
              </span>
            </div>
          </div>
        )}

        {/* Clock */}
        <div className="font-mono text-sm text-gray-300 tracking-wider">
          {currentTime}
        </div>
      </div>
    </header>
  );
}

function StatusDot({ label, status }: { label: string; status: 'active' | 'inactive' }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-2 h-2 rounded-full ${status === 'active' ? 'animate-pulse' : ''}`}
        style={{
          backgroundColor: status === 'active' ? '#34d399' : '#6b7280',
          boxShadow: status === 'active' ? '0 0 6px rgba(52,211,153,0.5)' : 'none',
        }}
      />
      <span className="text-[11px] text-gray-500 font-medium">{label}</span>
    </div>
  );
}
