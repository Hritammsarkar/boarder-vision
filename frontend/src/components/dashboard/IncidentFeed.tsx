/**
 * BorderVision AI — Real-Time Incident Feed
 * WebSocket-connected live event ticker with audio siren.
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useWSContext } from '@/providers/WebSocketProvider';
import SeverityBadge from '@/components/ui/SeverityBadge';
import { acknowledgeEvent } from '@/lib/api';
import { CLASS_ICONS } from '@/lib/constants';
import type { IncidentFeedItem } from '@/lib/types';

export default function IncidentFeed() {
  const { events, isConnected } = useWSContext();
  const [autoScroll, setAutoScroll] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio siren for critical events
  useEffect(() => {
    audioRef.current = new Audio();
    // Generate a simple siren beep using AudioContext
    audioRef.current.volume = 0.3;
    return () => {
      audioRef.current = null;
    };
  }, []);

  const playSiren = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }, []);

  // Play alert sound on new critical events
  useEffect(() => {
    if (!audioEnabled) return;
    const critical = events.find(e => e.isNew && e.severity === 'critical');
    if (critical) {
      playSiren();
    }
  }, [events, audioEnabled, playSiren]);

  // Auto-scroll to top on new events
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events, autoScroll]);

  const handleAck = async (eventId: string) => {
    try {
      await acknowledgeEvent(eventId);
    } catch {}
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      setAutoScroll(scrollRef.current.scrollTop < 10);
    }
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-white/5 overflow-hidden"
      style={{ background: 'rgba(15,18,30,0.6)', backdropFilter: 'blur(10px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Incident Feed</span>
          {events.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
              {events.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              audioEnabled
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-white/5 text-gray-500 border border-white/10'
            }`}
          >
            {audioEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* Event list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin"
        style={{ maxHeight: 'calc(100vh - 400px)' }}
      >
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-600 text-xs">
            <div className="text-center">
              <div className="text-2xl mb-2">🛡️</div>
              <div>No incidents detected</div>
              <div className="text-gray-700 mt-1">System monitoring active</div>
            </div>
          </div>
        ) : (
          events.map((event, i) => (
            <IncidentItem
              key={`${event.event_id}-${i}`}
              event={event}
              onAcknowledge={handleAck}
              formatTime={formatTime}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {!autoScroll && events.length > 0 && (
        <button
          onClick={() => {
            setAutoScroll(true);
            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-3 py-1.5 text-[10px] text-center text-blue-400 bg-blue-500/10 border-t border-white/5 hover:bg-blue-500/20 transition-colors"
        >
          ↑ Scroll to latest
        </button>
      )}
    </div>
  );
}

function IncidentItem({
  event,
  onAcknowledge,
  formatTime,
}: {
  event: IncidentFeedItem;
  onAcknowledge: (id: string) => void;
  formatTime: (ts: string) => string;
}) {
  const borderColor = event.severity === 'critical'
    ? 'rgba(255,45,85,0.3)'
    : event.severity === 'high'
      ? 'rgba(255,149,0,0.3)'
      : 'rgba(255,204,0,0.2)';

  return (
    <div
      className={`px-3 py-2.5 border-b border-white/[0.03] transition-all duration-500 ${
        event.isNew ? 'bg-red-500/[0.06]' : 'hover:bg-white/[0.02]'
      }`}
      style={{
        borderLeft: `3px solid ${borderColor}`,
        animation: event.isNew ? 'slideIn 0.3s ease-out' : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={event.severity} size="sm" />
            <span className="text-[10px] text-gray-500 font-mono">
              {formatTime(event.timestamp)}
            </span>
          </div>
          <div className="text-xs text-white/80 truncate">
            <span className="mr-1">{CLASS_ICONS[event.object_class] || '❓'}</span>
            {event.description}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            📷 {event.zone_label} • ID #{event.object_id}
          </div>
        </div>
        <button
          onClick={() => onAcknowledge(event.event_id)}
          className="flex-shrink-0 text-[9px] px-2 py-1 rounded bg-white/5 text-gray-400 border border-white/10 hover:bg-green-500/20 hover:text-green-400 hover:border-green-500/30 transition-colors"
        >
          ACK
        </button>
      </div>
    </div>
  );
}
