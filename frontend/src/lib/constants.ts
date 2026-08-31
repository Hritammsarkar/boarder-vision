/**
 * BorderVision AI — App Constants
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

// Severity colors
export const SEVERITY_CONFIG = {
  critical: {
    label: 'CRITICAL',
    color: '#ff2d55',
    bg: 'rgba(255, 45, 85, 0.15)',
    border: 'rgba(255, 45, 85, 0.5)',
    pulse: true,
  },
  high: {
    label: 'HIGH',
    color: '#ff9500',
    bg: 'rgba(255, 149, 0, 0.15)',
    border: 'rgba(255, 149, 0, 0.5)',
    pulse: false,
  },
  warning: {
    label: 'WARNING',
    color: '#ffcc00',
    bg: 'rgba(255, 204, 0, 0.15)',
    border: 'rgba(255, 204, 0, 0.5)',
    pulse: false,
  },
} as const;

// Object class icons
export const CLASS_ICONS: Record<string, string> = {
  human: '🚶',
  vehicle: '🚗',
  wildlife: '🦊',
};

// Canvas drawing colors
export const ZONE_COLORS = [
  '#ff3333',
  '#ff6600',
  '#ffaa00',
  '#33ff33',
  '#3399ff',
  '#cc33ff',
];

// Default map center (border region)
export const MAP_CENTER: [number, number] = [26.9124, 75.7873];
export const MAP_ZOOM = 15;

// WebSocket reconnection
export const WS_RECONNECT_DELAY = 2000;
export const WS_MAX_RECONNECT_ATTEMPTS = 10;

// Camera grid
export const MAX_CAMERAS = 4;
