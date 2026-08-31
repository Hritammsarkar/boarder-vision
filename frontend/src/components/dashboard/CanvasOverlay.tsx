/**
 * BorderVision AI — Canvas Overlay Component
 * Interactive HTML5 Canvas for drawing/editing geofence polygons & tripwire lines.
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ParsedZone, DrawingMode } from '@/lib/types';
import { getZones, createZone, deleteZone } from '@/lib/api';
import { ZONE_COLORS } from '@/lib/constants';

interface CanvasOverlayProps {
  cameraId: string;
  width: number;
  height: number;
}

export default function CanvasOverlay({ cameraId, width, height }: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zones, setZones] = useState<ParsedZone[]>([]);
  const [mode, setMode] = useState<DrawingMode>('none');
  const [points, setPoints] = useState<[number, number][]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const [label, setLabel] = useState('Red Zone');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'warning'>('critical');
  const [colorIdx, setColorIdx] = useState(0);
  const animFrame = useRef<number>(0);

  // Load zones
  const loadZones = useCallback(async () => {
    try {
      const data = await getZones(cameraId);
      const parsed: ParsedZone[] = data.map(z => ({
        ...z,
        coordinates: JSON.parse(z.coordinates),
      }));
      setZones(parsed);
    } catch {}
  }, [cameraId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadZones();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadZones]);

  // Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const t = performance.now() / 1000;

      // Draw existing zones
      for (const zone of zones) {
        const isSelected = zone.id === selectedZone;
        const pts = zone.coordinates.map(([x, y]) => [x * width, y * height] as [number, number]);

        ctx.save();

        // Parse color
        const color = zone.color || '#ff3333';
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        if (zone.zone_type === 'polygon' && pts.length >= 3) {
          // Fill
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i][0], pts[i][1]);
          }
          ctx.closePath();
          ctx.fillStyle = `rgba(${r},${g},${b},${isSelected ? 0.25 : 0.12})`;
          ctx.fill();

          // Animated dashed border
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i][0], pts[i][1]);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.6 + 0.3 * Math.sin(t * 3)})`;
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.setLineDash([6, 4]);
          ctx.lineDashOffset = -t * 20;
          ctx.stroke();
          ctx.setLineDash([]);

          // Label
          ctx.font = 'bold 11px Inter, system-ui, sans-serif';
          ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
          const labelX = pts[0][0];
          const labelY = pts[0][1] - 8;
          ctx.fillText(`⬡ ${zone.label}`, labelX, labelY);

          // Vertices
          if (isSelected) {
            for (const [px, py] of pts) {
              ctx.beginPath();
              ctx.arc(px, py, 4, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
              ctx.fill();
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        } else if (zone.zone_type === 'tripwire' && pts.length >= 2) {
          // Animated tripwire line
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          ctx.lineTo(pts[1][0], pts[1][1]);
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.7 + 0.3 * Math.sin(t * 4)})`;
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.setLineDash([8, 4]);
          ctx.lineDashOffset = -t * 30;
          ctx.stroke();
          ctx.setLineDash([]);

          // Direction arrows along the line
          const dx = pts[1][0] - pts[0][0];
          const dy = pts[1][1] - pts[0][1];
          const len = Math.sqrt(dx * dx + dy * dy);
          const nx = dx / len;
          const ny = dy / len;
          const midX = (pts[0][0] + pts[1][0]) / 2;
          const midY = (pts[0][1] + pts[1][1]) / 2;

          // Arrow head at midpoint
          ctx.beginPath();
          ctx.moveTo(midX + ny * 6, midY - nx * 6);
          ctx.lineTo(midX + nx * 8, midY + ny * 8);
          ctx.lineTo(midX - ny * 6, midY + nx * 6);
          ctx.fillStyle = `rgba(${r},${g},${b},0.7)`;
          ctx.fill();

          // Label
          ctx.font = 'bold 11px Inter, system-ui, sans-serif';
          ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
          ctx.fillText(`⚡ ${zone.label}`, midX - 30, midY - 12);

          // Endpoint dots
          for (const [px, py] of pts.slice(0, 2)) {
            ctx.beginPath();
            ctx.arc(px, py, isSelected ? 5 : 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
            ctx.fill();
          }
        }

        ctx.restore();
      }

      // Draw current drawing in progress
      if (points.length > 0) {
        const color = ZONE_COLORS[colorIdx % ZONE_COLORS.length];
        const pts = points.map(([x, y]) => [x * width, y * height] as [number, number]);

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -t * 15;

        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i][0], pts[i][1]);
        }

        // Draw line to mouse cursor
        if (mousePos) {
          ctx.lineTo(mousePos[0] * width, mousePos[1] * height);
        }

        if (mode === 'polygon' && pts.length >= 3) {
          // Show closing line preview
          if (mousePos) {
            ctx.lineTo(pts[0][0], pts[0][1]);
          }
          ctx.fillStyle = color.replace('#', 'rgba(') ? `${color}22` : 'rgba(255,0,0,0.1)';
        }

        ctx.stroke();
        ctx.setLineDash([]);

        // Draw vertices
        for (const [px, py] of pts) {
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.restore();
      }

      // Mode indicator
      if (mode !== 'none') {
        ctx.save();
        ctx.font = 'bold 10px Inter, system-ui, sans-serif';
        const modeText = mode === 'polygon'
          ? '🔷 Drawing Polygon (double-click to finish, right-click to cancel)'
          : mode === 'tripwire'
            ? '⚡ Drawing Tripwire (click 2 points)'
            : '👆 Select a zone to edit';
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        const metrics = ctx.measureText(modeText);
        ctx.fillRect(width / 2 - metrics.width / 2 - 8, height - 28, metrics.width + 16, 22);
        ctx.fillStyle = '#fff';
        ctx.fillText(modeText, width / 2 - metrics.width / 2, height - 12);
        ctx.restore();
      }

      animFrame.current = requestAnimationFrame(render);
    };

    animFrame.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame.current);
  }, [zones, points, mousePos, mode, selectedZone, width, height, colorIdx]);

  const savePolygon = useCallback(async (pts: [number, number][]) => {
    try {
      await createZone({
        camera_id: cameraId,
        zone_type: 'polygon',
        coordinates: JSON.stringify(pts),
        color: ZONE_COLORS[colorIdx % ZONE_COLORS.length],
        label,
        severity,
      });
      setColorIdx(i => i + 1);
      loadZones();
    } catch (err) {
      console.error('Save polygon failed:', err);
    }
  }, [cameraId, colorIdx, label, severity, loadZones]);

  const saveTripwire = useCallback(async (pts: [number, number][]) => {
    try {
      await createZone({
        camera_id: cameraId,
        zone_type: 'tripwire',
        coordinates: JSON.stringify(pts.slice(0, 2)),
        color: ZONE_COLORS[colorIdx % ZONE_COLORS.length],
        label,
        severity,
      });
      setColorIdx(i => i + 1);
      loadZones();
    } catch (err) {
      console.error('Save tripwire failed:', err);
    }
  }, [cameraId, colorIdx, label, severity, loadZones]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    if (mode === 'tripwire') {
      const newPts: [number, number][] = [...points, [nx, ny]];
      if (newPts.length >= 2) {
        saveTripwire(newPts);
        setPoints([]);
        setMode('none');
      } else {
        setPoints(newPts);
      }
    } else if (mode === 'polygon') {
      setPoints(prev => [...prev, [nx, ny]]);
    } else if (mode === 'select') {
      const clicked = zones.find(z => isPointInsideZone(nx, ny, z));
      setSelectedZone(clicked?.id ?? null);
    }
  }, [mode, points, zones, saveTripwire]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (mode === 'polygon' && points.length >= 3) {
      savePolygon(points);
      setPoints([]);
      setMode('none');
    }
  }, [mode, points, savePolygon]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos([
      (e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height,
    ]);
  }, []);

  const handleRightClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setPoints([]);
    setMode('none');
  }, []);

  const handleDelete = async () => {
    if (selectedZone) {
      try {
        await deleteZone(selectedZone);
        setSelectedZone(null);
        loadZones();
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 z-10 cursor-crosshair"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove}
        onContextMenu={handleRightClick}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1">
        <button
          onClick={() => setMode(mode === 'polygon' ? 'none' : 'polygon')}
          className={`text-[10px] px-2 py-1 rounded transition-colors ${
            mode === 'polygon'
              ? 'bg-red-500/30 text-red-300 border border-red-500/40'
              : 'bg-black/50 text-gray-300 border border-white/10 hover:bg-white/10'
          }`}
          title="Draw Red Zone (polygon)"
        >
          ⬡ Zone
        </button>
        <button
          onClick={() => setMode(mode === 'tripwire' ? 'none' : 'tripwire')}
          className={`text-[10px] px-2 py-1 rounded transition-colors ${
            mode === 'tripwire'
              ? 'bg-orange-500/30 text-orange-300 border border-orange-500/40'
              : 'bg-black/50 text-gray-300 border border-white/10 hover:bg-white/10'
          }`}
          title="Draw Tripwire (line)"
        >
          ⚡ Wire
        </button>
        <button
          onClick={() => setMode(mode === 'select' ? 'none' : 'select')}
          className={`text-[10px] px-2 py-1 rounded transition-colors ${
            mode === 'select'
              ? 'bg-blue-500/30 text-blue-300 border border-blue-500/40'
              : 'bg-black/50 text-gray-300 border border-white/10 hover:bg-white/10'
          }`}
          title="Select zone"
        >
          👆 Select
        </button>
        {selectedZone && (
          <button
            onClick={handleDelete}
            className="text-[10px] px-2 py-1 rounded bg-red-500/30 text-red-300 border border-red-500/40 hover:bg-red-500/50 transition-colors"
            title="Delete selected zone"
          >
            🗑 Delete
          </button>
        )}
      </div>

      {/* Drawing config (shown when in drawing mode) */}
      {(mode === 'polygon' || mode === 'tripwire') && (
        <div className="absolute bottom-8 left-2 z-20 flex items-center gap-2 bg-black/70 backdrop-blur rounded px-2 py-1">
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="bg-white/10 text-white text-[10px] px-1.5 py-0.5 rounded border border-white/10 w-24"
            placeholder="Label..."
          />
          <select
            value={severity}
            onChange={e => setSeverity(e.target.value as 'critical' | 'high' | 'warning')}
            className="bg-white/10 text-white text-[10px] px-1 py-0.5 rounded border border-white/10"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="warning">Warning</option>
          </select>
        </div>
      )}
    </div>
  );
}

function isPointInsideZone(px: number, py: number, zone: ParsedZone): boolean {
  const coords = zone.coordinates;
  if (zone.zone_type === 'polygon' && coords.length >= 3) {
    let inside = false;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
      const [xi, yi] = coords[i];
      const [xj, yj] = coords[j];
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }
  if (zone.zone_type === 'tripwire' && coords.length >= 2) {
    const [x1, y1] = coords[0];
    const [x2, y2] = coords[1];
    const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let t = lenSq !== 0 ? dot / lenSq : -1;
    t = Math.max(0, Math.min(1, t));
    const dist = Math.sqrt((px - (x1 + t * C)) ** 2 + (py - (y1 + t * D)) ** 2);
    return dist < 0.02;
  }
  return false;
}
