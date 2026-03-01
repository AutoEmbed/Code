import { useEffect, useRef } from 'react';
import { usePipelineStore } from '../stores/pipelineStore';

export function usePipelineWS(
  taskId: string | null,
  backendPort: number = 8765,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const { updateStage, setResult, setError } = usePipelineStore();

  useEffect(() => {
    if (!taskId) return;

    const ws = new WebSocket(
      `ws://localhost:${backendPort}/api/pipeline/ws/${taskId}`,
    );
    wsRef.current = ws;

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

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [taskId, backendPort, updateStage, setResult, setError]);

  return wsRef;
}
