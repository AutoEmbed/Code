import React, { useEffect, useRef } from 'react';
import { Typography } from 'antd';

interface SerialMonitorProps {
  lines: string[];
}

export default function SerialMonitor({ lines }: SerialMonitorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      ref={containerRef}
      style={{
        background: '#0d0d1a',
        border: '1px solid #3a3a5c',
        borderRadius: 6,
        padding: 12,
        height: 200,
        overflowY: 'auto',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13,
      }}
    >
      <Typography.Text style={{ color: '#45a049', fontSize: 12, fontWeight: 600 }}>
        Serial Monitor
      </Typography.Text>
      <div style={{ marginTop: 8 }}>
        {lines.length === 0 ? (
          <Typography.Text type="secondary">No serial output available</Typography.Text>
        ) : (
          lines.map((line, i) => (
            <div key={i} style={{ color: '#a6e3a1', lineHeight: 1.6 }}>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
