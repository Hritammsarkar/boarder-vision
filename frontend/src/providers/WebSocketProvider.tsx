/**
 * BorderVision AI — Global WebSocket Context Provider
 * Manages shared event feed WebSocket across components.
 */

'use client';

import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import { WS_BASE_URL } from '@/lib/constants';
import type { WSBreachEvent, IncidentFeedItem } from '@/lib/types';

interface WebSocketContextType {
  events: IncidentFeedItem[];
  isConnected: boolean;
  clearEvents: () => void;
  breachCameras: Set<string>; // Camera IDs with active breaches
}

const WebSocketContext = createContext<WebSocketContextType>({
  events: [],
  isConnected: false,
  clearEvents: () => {},
  breachCameras: new Set(),
});

export const useWSContext = () => useContext(WebSocketContext);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<IncidentFeedItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [breachCameras, setBreachCameras] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const breachTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const addEvent = useCallback((event: WSBreachEvent) => {
    const feedItem: IncidentFeedItem = {
      ...event,
      isNew: true,
    };

    setEvents(prev => {
      const updated = [feedItem, ...prev].slice(0, 100); // Keep last 100
      return updated;
    });

    // Mark camera as having active breach
    setBreachCameras(prev => {
      const next = new Set(prev);
      next.add(event.camera_id);
      return next;
    });

    // Clear breach status after 10 seconds
    const existing = breachTimers.current.get(event.camera_id);
    if (existing) clearTimeout(existing);
    breachTimers.current.set(
      event.camera_id,
      setTimeout(() => {
        setBreachCameras(prev => {
          const next = new Set(prev);
          next.delete(event.camera_id);
          return next;
        });
      }, 10000)
    );

    // Mark as "not new" after animation
    setTimeout(() => {
      setEvents(prev =>
        prev.map(e =>
          e.event_id === event.event_id ? { ...e, isNew: false } : e
        )
      );
    }, 3000);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      if (!mountedRef.current) return;

      try {
        const ws = new WebSocket(`${WS_BASE_URL}/ws/events`);

        ws.onopen = () => {
          if (mountedRef.current) setIsConnected(true);
        };

        ws.onmessage = (e) => {
          if (!mountedRef.current) return;
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'breach') {
              addEvent(data as WSBreachEvent);
            }
          } catch {}
        };

        ws.onclose = () => {
          if (!mountedRef.current) return;
          setIsConnected(false);
          setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          if (mountedRef.current) setIsConnected(false);
        };

        wsRef.current = ws;
      } catch {
        setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
      breachTimers.current.forEach(t => clearTimeout(t));
    };
  }, [addEvent]);

  return (
    <WebSocketContext.Provider value={{ events, isConnected, clearEvents, breachCameras }}>
      {children}
    </WebSocketContext.Provider>
  );
}
