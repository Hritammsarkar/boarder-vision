/**
 * BorderVision AI — Multi-Camera Live Grid
 * 2x2 grid of camera feeds with canvas overlays.
 */

'use client';

import React, { useEffect, useState } from 'react';
import CameraFeed from './CameraFeed';
import CanvasOverlay from './CanvasOverlay';
import { getCameras } from '@/lib/api';
import type { Camera } from '@/lib/types';

export default function CameraGrid() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCameras();
        const active = data.filter(c => c.status === 'online');
        setCameras(active);
      } catch {
        setCameras([
          { id: 'cam-1', name: 'Laptop Webcam - Sector A', location_lat: 26.9124, location_lng: 75.7873, status: 'online', stream_source: 'webcam', fov_angle: 65, fov_direction: 45, created_at: '' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-lg bg-white/[0.02] border border-white/5 animate-pulse" style={{ aspectRatio: '16/9' }}>
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Loading camera...
          </div>
        </div>
      </div>
    );
  }

  const expanded = cameras.find(c => c.id === expandedId);

  // If a camera is expanded or only 1 camera is active, show full prominent view
  if (expanded || cameras.length === 1) {
    const mainCam = expanded || cameras[0];
    const otherCams = cameras.filter(c => c.id !== mainCam.id);

    return (
      <div className="space-y-3">
        <div className="relative rounded-lg overflow-hidden border border-white/5" style={{ aspectRatio: '16/9' }}>
          <CameraFeed
            camera={mainCam}
            isExpanded={true}
            onExpand={cameras.length > 1 ? () => setExpandedId(expanded ? null : mainCam.id) : undefined}
          />
          <CanvasOverlay cameraId={mainCam.id} width={960} height={540} />
        </div>
        {otherCams.length > 0 && (
          <div className="flex gap-2">
            {otherCams.map(cam => (
              <button
                key={cam.id}
                onClick={() => setExpandedId(cam.id)}
                className="relative rounded overflow-hidden border border-white/10 hover:border-white/30 transition-colors flex-1"
                style={{ aspectRatio: '16/9', maxHeight: '80px' }}
              >
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-[10px] text-white/80 font-medium">{cam.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`grid ${cameras.length <= 2 ? 'grid-cols-2' : 'grid-cols-2'} gap-3`}>
      {cameras.map(cam => (
        <div key={cam.id} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
          <CameraFeed
            camera={cam}
            onExpand={() => setExpandedId(cam.id)}
          />
          <CanvasOverlay cameraId={cam.id} width={640} height={480} />
        </div>
      ))}
    </div>
  );
}
