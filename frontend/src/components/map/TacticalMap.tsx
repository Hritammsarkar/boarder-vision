/**
 * BorderVision AI — Tactical GIS Map (Leaflet)
 * Camera locations with FOV cones that pulse red during breaches.
 */

'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCameras } from '@/lib/api';
import { useWSContext } from '@/providers/WebSocketProvider';
import { MAP_CENTER, MAP_ZOOM } from '@/lib/constants';
import type { Camera } from '@/lib/types';

// Fix Leaflet default icon issue
const cameraIcon = new L.DivIcon({
  className: 'custom-camera-icon',
  html: `<div style="
    width: 28px; height: 28px;
    background: linear-gradient(135deg, #1e293b, #334155);
    border: 2px solid #3b82f6;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
    box-shadow: 0 0 10px rgba(59,130,246,0.3);
  ">📷</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const breachIcon = new L.DivIcon({
  className: 'custom-camera-icon breach',
  html: `<div style="
    width: 28px; height: 28px;
    background: linear-gradient(135deg, #7f1d1d, #991b1b);
    border: 2px solid #ef4444;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
    box-shadow: 0 0 15px rgba(239,68,68,0.5);
    animation: pulse 1s ease-in-out infinite;
  ">🚨</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Compute FOV cone polygon points
function computeFovCone(
  lat: number,
  lng: number,
  direction: number,
  angle: number,
  range: number = 0.003 // ~300m at this latitude
): [number, number][] {
  const points: [number, number][] = [[lat, lng]];
  const halfAngle = angle / 2;
  const steps = 12;

  for (let i = 0; i <= steps; i++) {
    const a = direction - halfAngle + (i / steps) * angle;
    const rad = (a * Math.PI) / 180;
    points.push([
      lat + range * Math.cos(rad),
      lng + range * Math.sin(rad) / Math.cos((lat * Math.PI) / 180),
    ]);
  }

  return points;
}

interface TacticalMapProps {
  className?: string;
}

function MapContent({ cameras, breachCameras, mapStyle }: { cameras: Camera[]; breachCameras: Set<string>; mapStyle: string }) {
  const tileUrls: Record<string, { url: string; attr: string }> = {
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attr: '&copy; Esri &mdash; Tactical Satellite',
    },
    dark: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attr: '&copy; OpenStreetMap contributors',
    },
  };

  const currentTile = tileUrls[mapStyle] || tileUrls.satellite;

  return (
    <>
      <TileLayer
        attribution={currentTile.attr}
        url={currentTile.url}
        className={mapStyle === 'dark' ? 'tactical-dark-tiles' : ''}
      />

      {cameras.map(cam => {
        const hasBreach = breachCameras.has(cam.id);
        const fovColor = hasBreach ? '#ef4444' : '#3b82f6';
        const fovOpacity = hasBreach ? 0.3 : 0.12;
        const fovPoints = computeFovCone(
          cam.location_lat,
          cam.location_lng,
          cam.fov_direction,
          cam.fov_angle
        );

        return (
          <React.Fragment key={cam.id}>
            {/* FOV Cone */}
            <Polygon
              positions={fovPoints}
              pathOptions={{
                color: fovColor,
                fillColor: fovColor,
                fillOpacity: fovOpacity,
                weight: 1,
                dashArray: hasBreach ? undefined : '4 4',
              }}
            />

            {/* Breach pulse ring */}
            {hasBreach && (
              <Circle
                center={[cam.location_lat, cam.location_lng]}
                radius={200}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.08,
                  weight: 2,
                  dashArray: '4 4',
                }}
              />
            )}

            {/* Camera marker */}
            <Marker
              position={[cam.location_lat, cam.location_lng]}
              icon={hasBreach ? breachIcon : cameraIcon}
            >
              <Popup>
                <div style={{ color: '#000', minWidth: '150px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
                    {cam.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    Status: <span style={{ color: cam.status === 'online' ? '#16a34a' : '#dc2626' }}>
                      {cam.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    FOV: {cam.fov_angle}° @ {cam.fov_direction}°
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    Position: {cam.location_lat.toFixed(4)}, {cam.location_lng.toFixed(4)}
                  </div>
                  {hasBreach && (
                    <div style={{ marginTop: '6px', padding: '3px 6px', background: '#fef2f2', borderRadius: '4px', fontSize: '11px', color: '#dc2626', fontWeight: 'bold' }}>
                      ⚠️ ACTIVE BREACH
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
}

function MapViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

export default function TacticalMap({ className }: TacticalMapProps) {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'dark'>('satellite');
  const [mapCenter, setMapCenter] = useState<[number, number]>(MAP_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(MAP_ZOOM);
  const [locating, setLocating] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null);
  const { breachCameras } = useWSContext();

  const loadCameras = useCallback(async () => {
    try {
      const data = await getCameras();
      setCameras(data);
    } catch {
      setCameras([
        { id: 'cam-1', name: 'Laptop Webcam', location_lat: MAP_CENTER[0], location_lng: MAP_CENTER[1], status: 'online', stream_source: 'webcam', fov_angle: 65, fov_direction: 45, created_at: '' },
      ]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCameras();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadCameras]);

  const detectLocation = useCallback(() => {
    setLocating(true);

    const applyCoords = async (lat: number, lng: number, label: string) => {
      setMapCenter([lat, lng]);
      setMapZoom(16);
      setDetectedLocation(label);
      setLocating(false);

      // Update Camera 1 coordinates in backend database
      try {
        const data = await getCameras();
        const activeCam = data.find(c => c.status === 'online') || data[0];
        if (activeCam) {
          await fetch(`http://localhost:8000/api/v1/cameras/${activeCam.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location_lat: lat, location_lng: lng }),
          });
          setCameras(prev =>
            prev.map(c => (c.id === activeCam.id ? { ...c, location_lat: lat, location_lng: lng } : c))
          );
        }
      } catch (e) {
        console.error('Failed to update camera position:', e);
      }
    };

    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          applyCoords(latitude, longitude, `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        },
        async () => {
          // Fallback to IP geolocation if browser permission denied
          try {
            const res = await fetch('https://ipapi.co/json/');
            const json = await res.json();
            if (json.latitude && json.longitude) {
              applyCoords(json.latitude, json.longitude, `${json.city || ''}, ${json.region || ''}`);
            } else {
              setLocating(false);
            }
          } catch {
            setLocating(false);
          }
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setLocating(false);
    }
  }, []);

  return (
    <div className={`rounded-xl overflow-hidden border border-white/5 ${className || ''}`}
      style={{ background: 'rgba(15,18,30,0.6)' }}>
      {/* Map header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/>
          </svg>
          <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Tactical GIS Map</span>
          {detectedLocation && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              📍 {detectedLocation}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Detect Location Button */}
          <button
            onClick={detectLocation}
            disabled={locating}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold transition-all disabled:opacity-50"
          >
            <span className={locating ? 'animate-spin' : ''}>🎯</span>
            {locating ? 'Locating...' : 'Detect My Location'}
          </button>

          {/* Layer switcher */}
          <div className="flex items-center rounded-lg bg-black/40 p-0.5 border border-white/10 text-[10px]">
            <button
              onClick={() => setMapStyle('satellite')}
              className={`px-2 py-1 rounded transition-colors ${
                mapStyle === 'satellite'
                  ? 'bg-blue-600 text-white font-medium shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🛰️ Satellite
            </button>
            <button
              onClick={() => setMapStyle('dark')}
              className={`px-2 py-1 rounded transition-colors ${
                mapStyle === 'dark'
                  ? 'bg-blue-600 text-white font-medium shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🗺️ Tactical Dark
            </button>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Normal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>Breach</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: '300px' }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <MapViewController center={mapCenter} zoom={mapZoom} />
          <MapContent cameras={cameras} breachCameras={breachCameras} mapStyle={mapStyle} />
        </MapContainer>
      </div>
    </div>
  );
}
