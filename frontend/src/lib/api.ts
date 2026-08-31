/**
 * BorderVision AI — REST API Client
 */

import { API_BASE_URL } from './constants';
import type {
  Camera, CameraCreate,
  Zone, ZoneCreate, ZoneUpdate,
  BreachEvent, EventFilters,
  SystemStats
} from './types';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API Error ${res.status}: ${error}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Cameras ────────────────────────────────────────────────────────────

export async function getCameras(): Promise<Camera[]> {
  return apiFetch<Camera[]>('/api/v1/cameras/');
}

export async function getCamera(id: string): Promise<Camera> {
  return apiFetch<Camera>(`/api/v1/cameras/${id}`);
}

export async function createCamera(data: CameraCreate): Promise<Camera> {
  return apiFetch<Camera>('/api/v1/cameras/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Zones ──────────────────────────────────────────────────────────────

export async function getZones(cameraId?: string): Promise<Zone[]> {
  const query = cameraId ? `?camera_id=${cameraId}` : '';
  return apiFetch<Zone[]>(`/api/v1/zones/${query}`);
}

export async function createZone(data: ZoneCreate): Promise<Zone> {
  return apiFetch<Zone>('/api/v1/zones/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateZone(id: string, data: ZoneUpdate): Promise<Zone> {
  return apiFetch<Zone>(`/api/v1/zones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteZone(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/zones/${id}`, { method: 'DELETE' });
}

// ── Events ─────────────────────────────────────────────────────────────

export async function getEvents(filters: EventFilters): Promise<BreachEvent[]> {
  const params = new URLSearchParams();
  if (filters.camera_id) params.set('camera_id', filters.camera_id);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.acknowledged !== undefined) params.set('acknowledged', String(filters.acknowledged));
  if (filters.start_date) params.set('start_date', filters.start_date);
  if (filters.end_date) params.set('end_date', filters.end_date);
  params.set('page', String(filters.page));
  params.set('page_size', String(filters.page_size));

  return apiFetch<BreachEvent[]>(`/api/v1/events/?${params.toString()}`);
}

export async function acknowledgeEvent(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/events/${id}/acknowledge`, { method: 'POST' });
}

export async function getEventCount(severity?: string): Promise<{ count: number }> {
  const query = severity ? `?severity=${severity}` : '';
  return apiFetch<{ count: number }>(`/api/v1/events/count${query}`);
}

export async function getTodayEventCount(): Promise<{ count: number }> {
  return apiFetch<{ count: number }>('/api/v1/events/today-count');
}

// ── Stats ──────────────────────────────────────────────────────────────

export async function getSystemStats(): Promise<SystemStats> {
  return apiFetch<SystemStats>('/api/v1/stats');
}

// ── Export ──────────────────────────────────────────────────────────────

export function getExportUrl(filters?: Partial<EventFilters>): string {
  const params = new URLSearchParams();
  if (filters?.camera_id) params.set('camera_id', filters.camera_id);
  if (filters?.severity) params.set('severity', filters.severity);
  if (filters?.start_date) params.set('start_date', filters.start_date);
  if (filters?.end_date) params.set('end_date', filters.end_date);
  return `${API_BASE_URL}/api/v1/events/export?${params.toString()}`;
}
