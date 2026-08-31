/**
 * BorderVision AI — TypeScript Interfaces
 * Complete type definitions for the entire platform.
 */

// ── Camera Types ─────────────────────────────────────────────────────

export type CameraStatus = 'online' | 'offline' | 'maintenance';

export interface Camera {
  id: string;
  name: string;
  location_lat: number;
  location_lng: number;
  status: CameraStatus;
  stream_source: string;
  fov_angle: number;
  fov_direction: number;
  created_at: string;
}

export interface CameraCreate {
  name: string;
  location_lat?: number;
  location_lng?: number;
  stream_source?: string;
  fov_angle?: number;
  fov_direction?: number;
}

// ── Zone Types ───────────────────────────────────────────────────────

export type ZoneType = 'polygon' | 'tripwire';
export type Severity = 'critical' | 'high' | 'warning';

export interface Zone {
  id: string;
  camera_id: string;
  zone_type: ZoneType;
  coordinates: string; // JSON array of [x, y] normalized pairs
  color: string;
  label: string;
  severity: Severity;
  is_active: boolean;
  created_at: string;
}

export interface ZoneCreate {
  camera_id: string;
  zone_type: ZoneType;
  coordinates: string;
  color?: string;
  label?: string;
  severity?: Severity;
}

export interface ZoneUpdate {
  coordinates?: string;
  color?: string;
  label?: string;
  severity?: string;
  is_active?: boolean;
}

// Parsed zone for canvas rendering
export interface ParsedZone extends Omit<Zone, 'coordinates'> {
  coordinates: [number, number][];
}

// ── Event Types ──────────────────────────────────────────────────────

export interface BreachEvent {
  id: string;
  camera_id: string;
  zone_id: string | null;
  timestamp: string;
  severity: Severity;
  object_class: string;
  object_id: number;
  snapshot_path: string | null;
  acknowledged: boolean;
  description: string;
}

// WebSocket breach event message
export interface WSBreachEvent {
  type: 'breach';
  event_id: string;
  camera_id: string;
  zone_id: string;
  zone_label: string;
  severity: Severity;
  object_class: string;
  object_id: number;
  timestamp: string;
  description: string;
  snapshot_url?: string;
}

// ── Detection Types ──────────────────────────────────────────────────

export interface Detection {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2] normalized
  confidence: number;
  object_class: string;
  track_id: number;
}

// ── WebSocket Message Types ──────────────────────────────────────────

export interface WSStatsMessage {
  type: 'stats';
  fps: number;
  detections: number;
  clahe_enabled: boolean;
  camera_id: string;
}

export type WSMessage = WSBreachEvent | WSStatsMessage;

// ── System Stats ─────────────────────────────────────────────────────

export interface SystemStats {
  active_cameras: number;
  total_detections: number;
  active_breaches: number;
  uptime_seconds: number;
  total_events_today?: number;
}

// ── Canvas Drawing Types ─────────────────────────────────────────────

export type DrawingMode = 'none' | 'polygon' | 'tripwire' | 'select';

export interface DrawingState {
  mode: DrawingMode;
  points: [number, number][];
  isDrawing: boolean;
  selectedZoneId: string | null;
  hoveredVertex: number | null;
  dragVertex: number | null;
}

// ── Event Feed Types ─────────────────────────────────────────────────

export interface IncidentFeedItem extends WSBreachEvent {
  isNew: boolean;
}

// ── Map Types ────────────────────────────────────────────────────────

export interface CameraMarker {
  id: string;
  name: string;
  position: [number, number]; // [lat, lng]
  fovAngle: number;
  fovDirection: number;
  status: CameraStatus;
  hasActiveBreach: boolean;
}

// ── Pagination ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

// ── Event Filters ────────────────────────────────────────────────────

export interface EventFilters {
  camera_id?: string;
  severity?: Severity;
  acknowledged?: boolean;
  start_date?: string;
  end_date?: string;
  page: number;
  page_size: number;
}
