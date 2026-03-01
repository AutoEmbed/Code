import { useCallback, useEffect, useRef, useState } from 'react';
import { usePipelineStore } from '../stores/pipelineStore';

export interface WSStatus {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
}

export function usePipelineWS(
  taskId: string | null,
  backendPort: number = 8765,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);
  const maxRetries = 5;
  const { updateStage, setResult, setError, isRunning } = usePipelineStore();
  const [wsStatus, setWsStatus] = useState<WSStatus>({
    connected: false,
    reconnecting: false,
    error: null,
  });

  const connect = useCallback(() => {
    if (!taskId) return;

    const ws = new WebSocket(
      `ws://localhost:${backendPort}/api/pipeline/ws/${taskId}`,
    );
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      setWsStatus({ connected: true, reconnecting: false, error: null });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pipeline_complete') {
          setResult(data.result);
        } else if (data.type === 'pipeline_error') {
          setError(data.error);
        } else if (data.stage !== undefined) {
          updateStage(data);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onerror = () => {
      setWsStatus((prev) => ({ ...prev, error: 'WebSocket connection error' }));
    };

    ws.onclose = () => {
      setWsStatus((prev) => ({ ...prev, connected: false }));
      // Attempt to reconnect if pipeline is still running
      const pipelineRunning = usePipelineStore.getState().isRunning;
      if (pipelineRunning && retriesRef.current < maxRetries) {
        retriesRef.current += 1;
        setWsStatus({
          connected: false,
          reconnecting: true,
          error: `Reconnecting... (${retriesRef.current}/${maxRetries})`,
        });
        reconnectTimerRef.current = setTimeout(connect, 2000 * retriesRef.current);
      } else if (retriesRef.current >= maxRetries) {
        setWsStatus({
          connected: false,
          reconnecting: false,
          error: 'WebSocket disconnected. Please check the backend server.',
        });
      }
    };
  }, [taskId, backendPort, updateStage, setResult, setError]);

  useEffect(() => {
    if (!taskId) {
      setWsStatus({ connected: false, reconnecting: false, error: null });
      return;
    }

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [taskId, connect]);

  return { wsRef, wsStatus };
}
