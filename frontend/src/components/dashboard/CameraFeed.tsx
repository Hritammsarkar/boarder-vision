/**
 * BorderVision AI — Single Camera Feed Component
 * Connects to WebSocket and renders JPEG frames with status overlay.
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WS_BASE_URL } from '@/lib/constants';
import type { Camera, WSMessage } from '@/lib/types';

interface CameraFeedProps {
  camera: Camera;
  isExpanded?: boolean;
  onExpand?: () => void;
}

export default function CameraFeed({ camera, isExpanded, onExpand }: CameraFeedProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [fps, setFps] = useState(0);
  const [detectionCount, setDetectionCount] = useState(0);
  const [claheEnabled, setClaheEnabled] = useState(false);

  const onBinaryMessage = useCallback((data: ArrayBuffer) => {
    if (imgRef.current) {
      const blob = new Blob([data], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      const prevUrl = imgRef.current.src;
      imgRef.current.src = url;
      // Cleanup previous blob URL
      if (prevUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prevUrl);
      }
    }
  }, []);

  const onTextMessage = useCallback((data: string) => {
    try {
      const msg: WSMessage = JSON.parse(data);
      if (msg.type === 'stats') {
        setFps(msg.fps);
        setDetectionCount(msg.detections);
        setClaheEnabled(msg.clahe_enabled);
      }
    } catch {}
  }, []);

  const { status, sendJSON } = useWebSocket({
    url: `${WS_BASE_URL}/ws/stream/${camera.id}`,
    onBinaryMessage,
    onTextMessage,
  });

  const toggleClahe = useCallback(() => {
    sendJSON({ type: 'toggle_clahe', enabled: !claheEnabled });
    setClaheEnabled(!claheEnabled);
  }, [claheEnabled, sendJSON]);

  return (
    <div
      className={`relative rounded-lg overflow-hidden border border-white/5 group ${
        isExpanded ? 'col-span-2 row-span-2' : ''
      }`}
      style={{ background: '#0a0c14', aspectRatio: isExpanded ? 'auto' : '4/3' }}
    >
      {/* Video frame */}
      <img
        ref={imgRef}
        alt={camera.name}
        className="w-full h-full object-cover"
        style={{ imageRendering: 'auto' }}
      />

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        }}
      />

      {/* Top overlay bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-1.5"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
        <div className="flex items-center gap-2">
          {/* LIVE indicator */}
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold text-red-400 tracking-wider">LIVE</span>
          </div>
          <span className="text-[11px] text-white/70 font-medium">{camera.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-green-400 font-mono">{fps} FPS</span>
          {claheEnabled && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              CLAHE
            </span>
          )}
        </div>
      </div>

      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 flex items-center justify-between"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-mono">
            {detectionCount} objects
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={toggleClahe}
            className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${
              claheEnabled
                ? 'bg-blue-500/30 text-blue-300 border border-blue-500/40'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            CLAHE
          </button>
          <button
            onClick={onExpand}
            className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Connection status overlay */}
      {status !== 'connected' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-500 border-t-white rounded-full animate-spin mx-auto mb-2" />
            <div className="text-xs text-gray-400">
              {status === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
