/**
 * BorderVision AI — WebSocket Hook
 * Generic WebSocket connection with auto-reconnect and binary/text handling.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_RECONNECT_DELAY, WS_MAX_RECONNECT_ATTEMPTS } from '@/lib/constants';

export type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
  url: string;
  onBinaryMessage?: (data: ArrayBuffer) => void;
  onTextMessage?: (data: string) => void;
  autoConnect?: boolean;
  reconnect?: boolean;
}

export function useWebSocket({
  url,
  onBinaryMessage,
  onTextMessage,
  autoConnect = true,
  reconnect = true,
}: UseWebSocketOptions) {
  const [status, setStatus] = useState<WSStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Store callbacks in refs to avoid reconnection loops
  const onBinaryRef = useRef(onBinaryMessage);
  const onTextRef = useRef(onTextMessage);
  const connectRef = useRef<() => void>(() => {});

  useEffect(() => {
    onBinaryRef.current = onBinaryMessage;
  }, [onBinaryMessage]);

  useEffect(() => {
    onTextRef.current = onTextMessage;
  }, [onTextMessage]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      setStatus('connecting');
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setStatus('connected');
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        if (event.data instanceof ArrayBuffer) {
          onBinaryRef.current?.(event.data);
        } else if (typeof event.data === 'string') {
          onTextRef.current?.(event.data);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setStatus('disconnected');
        wsRef.current = null;

        if (reconnect && reconnectAttempts.current < WS_MAX_RECONNECT_ATTEMPTS) {
          const delay = WS_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts.current);
          reconnectAttempts.current++;
          reconnectTimer.current = setTimeout(() => {
            connectRef.current?.();
          }, delay);
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setStatus('error');
      };

      wsRef.current = ws;
    } catch {
      setStatus('error');
    }
  }, [url, reconnect]);

  // Keep connectRef up to date
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    reconnectAttempts.current = WS_MAX_RECONNECT_ATTEMPTS; // Prevent reconnect
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, []);

  const send = useCallback((data: string | ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const sendJSON = useCallback((data: unknown) => {
    send(JSON.stringify(data));
  }, [send]);

  useEffect(() => {
    mountedRef.current = true;
    let timer: NodeJS.Timeout | null = null;
    if (autoConnect) {
      timer = setTimeout(() => {
        connectRef.current?.();
      }, 0);
    }
    return () => {
      mountedRef.current = false;
      if (timer) clearTimeout(timer);
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return { status, connect, disconnect, send, sendJSON };
}
