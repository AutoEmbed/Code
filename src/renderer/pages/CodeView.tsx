import { useState } from 'react';
import { Button, Card, Space, Tabs, Typography, message } from 'antd';
import {
  CodeOutlined,
  CopyOutlined,
  DownloadOutlined,
  BugOutlined,
  ClearOutlined,
  ReloadOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { usePipelineStore } from '../stores/pipelineStore';
import SerialMonitor from '../components/SerialMonitor';

const { Title, Text } = Typography;

type TabKey = 'debug' | 'clean';

export default function CodeView() {
  const [activeTab, setActiveTab] = useState<TabKey>('debug');
  const [messageApi, contextHolder] = message.useMessage();
  const { result } = usePipelineStore();

  const codeDebug: string = result?.code_debug ?? '';
  const codeClean: string = result?.code_clean ?? '';
  const serialOutput: string[] = result?.serial_output ?? [];

  const currentCode = activeTab === 'debug' ? codeDebug : codeClean;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      messageApi.success('Code copied to clipboard');
    } catch {
      messageApi.error('Failed to copy code');
    }
  };

  const handleDownload = async () => {
    const filename = activeTab === 'debug' ? 'autoembed_debug.ino' : 'autoembed_clean.ino';

    if (window.electronAPI?.saveFile) {
      const saved = await window.electronAPI.saveFile(currentCode, filename);
      if (saved) {
        messageApi.success(`Saved as ${filename}`);
      }
    } else {
      // Fallback: create a download blob for browser environments
      const blob = new Blob([currentCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      messageApi.success(`Downloaded ${filename}`);
    }
  };

  // Empty state: pipeline hasn't run yet
  if (!result) {
    return (
      <div
        style={{
          padding: 24,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Card
          style={{
            background: '#1e1e2e',
            border: '1px solid #3a3a5c',
            borderRadius: 8,
            textAlign: 'center',
            padding: '60px 24px',
            maxWidth: 480,
          }}
        >
          <CodeOutlined
            style={{ fontSize: 64, color: '#3a3a5c', marginBottom: 16 }}
          />
          <Title level={4} style={{ color: '#6c7086', marginBottom: 8 }}>
            No Generated Code
          </Title>
          <Text style={{ color: '#6c7086' }}>
            Run the pipeline first to see generated code.
          </Text>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {contextHolder}

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ color: '#cdd6f4', margin: 0 }}>
          <CodeOutlined style={{ marginRight: 8, color: '#00b4d8' }} />
          Generated Code
        </Title>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        style={{ marginBottom: 0 }}
        items={[
          {
            key: 'debug',
            label: (
              <span>
                <BugOutlined style={{ marginRight: 6 }} />
                Debug Version
              </span>
            ),
          },
          {
            key: 'clean',
            label: (
              <span>
                <ClearOutlined style={{ marginRight: 6 }} />
                Clean Version
              </span>
            ),
          },
        ]}
      />

      {/* Monaco Editor */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          border: '1px solid #3a3a5c',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <Editor
          language="cpp"
          theme="vs-dark"
          value={currentCode}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            wordWrap: 'on',
            renderWhitespace: 'selection',
            padding: { top: 12 },
          }}
        />
      </div>

      {/* Toolbar */}
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space>
          <Button
            icon={<CopyOutlined />}
            onClick={handleCopy}
            disabled={!currentCode}
          >
            Copy Code
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            disabled={!currentCode}
          >
            Download .ino
          </Button>
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} disabled>
            Re-compile
          </Button>
          <Button icon={<CloudUploadOutlined />} disabled>
            Re-upload
          </Button>
        </Space>
      </div>

      {/* Serial Monitor */}
      <div style={{ marginTop: 12 }}>
        <SerialMonitor lines={serialOutput} />
      </div>
    </div>
  );
}
