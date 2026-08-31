/**
 * BorderVision AI — Canvas Drawing State Hook
 * Manages polygon/tripwire drawing, editing, and interaction state.
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import type { DrawingState, DrawingMode, ParsedZone, ZoneCreate } from '@/lib/types';
import { createZone, deleteZone } from '@/lib/api';

interface UseCanvasOptions {
  cameraId: string;
  canvasWidth: number;
  canvasHeight: number;
  zones: ParsedZone[];
  onZonesChanged: () => void;
}

export function useCanvas({
  cameraId,
  canvasWidth,
  canvasHeight,
  zones,
  onZonesChanged,
}: UseCanvasOptions) {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    mode: 'none',
    points: [],
    isDrawing: false,
    selectedZoneId: null,
    hoveredVertex: null,
    dragVertex: null,
  });

  const [zoneLabel, setZoneLabel] = useState('New Zone');
  const [zoneSeverity, setZoneSeverity] = useState<'critical' | 'high' | 'warning'>('critical');
  const [zoneColor, setZoneColor] = useState('#ff3333');

  const setMode = useCallback((mode: DrawingMode) => {
    setDrawingState(prev => ({
      ...prev,
      mode,
      points: [],
      isDrawing: mode !== 'none' && mode !== 'select',
      selectedZoneId: null,
      hoveredVertex: null,
      dragVertex: null,
    }));
  }, []);

  const normalizePoint = useCallback(
    (clientX: number, clientY: number, rect: DOMRect): [number, number] => {
      return [
        (clientX - rect.left) / rect.width,
        (clientY - rect.top) / rect.height,
      ];
    },
    []
  );

  const saveZone = useCallback(async (type: 'polygon' | 'tripwire', points: [number, number][]) => {
    try {
      const zoneData: ZoneCreate = {
        camera_id: cameraId,
        zone_type: type,
        coordinates: JSON.stringify(points),
        color: zoneColor,
        label: zoneLabel,
        severity: zoneSeverity,
      };
      await createZone(zoneData);
      onZonesChanged();
    } catch (err) {
      console.error('Failed to save zone:', err);
    }
  }, [cameraId, zoneColor, zoneLabel, zoneSeverity, onZonesChanged]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const [nx, ny] = normalizePoint(e.clientX, e.clientY, rect);

      if (drawingState.mode === 'tripwire') {
        const newPoints: [number, number][] = [...drawingState.points, [nx, ny]];
        if (newPoints.length >= 2) {
          // Complete tripwire
          saveZone('tripwire', newPoints);
          setDrawingState(prev => ({ ...prev, points: [], isDrawing: false, mode: 'none' }));
        } else {
          setDrawingState(prev => ({ ...prev, points: newPoints }));
        }
      } else if (drawingState.mode === 'polygon') {
        setDrawingState(prev => ({
          ...prev,
          points: [...prev.points, [nx, ny]],
        }));
      } else if (drawingState.mode === 'select') {
        // Check if clicking on a zone
        const clickedZone = zones.find(z => isPointInZone(nx, ny, z));
        setDrawingState(prev => ({
          ...prev,
          selectedZoneId: clickedZone?.id ?? null,
        }));
      }
    },
    [drawingState.mode, drawingState.points, zones, normalizePoint, saveZone]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (drawingState.mode === 'polygon' && drawingState.points.length >= 3) {
        saveZone('polygon', drawingState.points);
        setDrawingState(prev => ({ ...prev, points: [], isDrawing: false, mode: 'none' }));
      }
    },
    [drawingState.mode, drawingState.points, saveZone]
  );

  const handleRightClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      // Cancel current drawing
      if (drawingState.isDrawing) {
        setDrawingState(prev => ({ ...prev, points: [], isDrawing: false, mode: 'none' }));
      }
    },
    [drawingState.isDrawing]
  );

  const handleDeleteSelected = useCallback(async () => {
    if (drawingState.selectedZoneId) {
      try {
        await deleteZone(drawingState.selectedZoneId);
        setDrawingState(prev => ({ ...prev, selectedZoneId: null }));
        onZonesChanged();
      } catch (err) {
        console.error('Failed to delete zone:', err);
      }
    }
  }, [drawingState.selectedZoneId, onZonesChanged]);

  const clearAll = useCallback(() => {
    setDrawingState({
      mode: 'none',
      points: [],
      isDrawing: false,
      selectedZoneId: null,
      hoveredVertex: null,
      dragVertex: null,
    });
  }, []);

  return {
    drawingState,
    setMode,
    handleCanvasClick,
    handleDoubleClick,
    handleRightClick,
    handleDeleteSelected,
    clearAll,
    zoneLabel,
    setZoneLabel,
    zoneSeverity,
    setZoneSeverity,
    zoneColor,
    setZoneColor,
  };
}

function isPointInZone(px: number, py: number, zone: ParsedZone): boolean {
  const coords = zone.coordinates;
  if (zone.zone_type === 'tripwire' && coords.length >= 2) {
    // Check proximity to line
    const [x1, y1] = coords[0];
    const [x2, y2] = coords[1];
    const dist = pointToLineDistance(px, py, x1, y1, x2, y2);
    return dist < 0.02; // 2% threshold
  }

  if (zone.zone_type === 'polygon' && coords.length >= 3) {
    return pointInPolygon(px, py, coords);
  }

  return false;
}

function pointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function pointToLineDistance(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let t = lenSq !== 0 ? dot / lenSq : -1;
  t = Math.max(0, Math.min(1, t));
  const nearX = x1 + t * C;
  const nearY = y1 + t * D;
  return Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2);
}
