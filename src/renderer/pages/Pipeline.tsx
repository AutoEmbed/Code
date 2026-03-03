import { useEffect, useRef } from 'react';
import { Alert, Button, Card, Col, Row, Space, Typography, message } from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  CodeOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { usePipelineStore } from '../stores/pipelineStore';
import { useNavigationStore } from '../stores/navigationStore';
import { useTaskStore } from '../stores/taskStore';
import { usePipelineWS } from '../hooks/useWebSocket';
import StageTimeline from '../components/StageTimeline';
import StageDetail from '../components/StageDetail';

const { Title, Text } = Typography;

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function Pipeline() {
  const { taskId, isRunning, stages, currentStage, error, result, reset } =
    usePipelineStore();
  const { navigate } = useNavigationStore();
  const { codeOnly } = useTaskStore();
  const [messageApi, contextHolder] = message.useMessage();
  const autoNavigatedRef = useRef(false);

  const { wsStatus } = usePipelineWS(taskId);

  // Auto-navigate to CodeView when code-only pipeline completes
  useEffect(() => {
    if (codeOnly && result && !error && !autoNavigatedRef.current) {
      autoNavigatedRef.current = true;
      navigate('code-view');
    }
    if (!result) {
      autoNavigatedRef.current = false;
    }
  }, [codeOnly, result, error, navigate]);

  const completedCount = stages.filter((s) => s.status === 'completed').length;
  const totalElapsed = stages.reduce((sum, s) => sum + s.elapsed_ms, 0);
  const hasFinished = !!result || !!error;

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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={3} style={{ color: '#cdd6f4', margin: 0 }}>
          <PlayCircleOutlined style={{ marginRight: 8, color: '#00b4d8' }} />
          Pipeline Execution
        </Title>
      </div>

      {/* WebSocket disconnect warning */}
      {wsStatus.error && taskId && (
        <Alert
          message={
            wsStatus.reconnecting ? 'Reconnecting to Server' : 'Connection Lost'
          }
          description={wsStatus.error}
          type={wsStatus.reconnecting ? 'warning' : 'error'}
          showIcon
          icon={<DisconnectOutlined />}
          style={{ marginBottom: 16 }}
          banner
        />
      )}

      {/* Main two-column layout */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {!taskId && !hasFinished ? (
          <Card
            style={{
              background: '#1e1e2e',
              border: '1px solid #3a3a5c',
              borderRadius: 8,
              textAlign: 'center',
              padding: '60px 24px',
            }}
          >
            <PlayCircleOutlined
              style={{ fontSize: 64, color: '#3a3a5c', marginBottom: 16 }}
            />
            <Title level={4} style={{ color: '#6c7086', marginBottom: 8 }}>
              No Active Pipeline
            </Title>
            <Text style={{ color: '#6c7086' }}>
              Configure a task and click "Start Pipeline" on the Task Config
              page to begin.
            </Text>
          </Card>
        ) : (
          <Row gutter={24}>
            {/* Left column: Stage Timeline */}
            <Col span={8}>
              <Card
                title={
                  <Text strong style={{ color: '#cdd6f4' }}>
                    Stages
                  </Text>
                }
                style={{
                  background: '#1e1e2e',
                  border: '1px solid #3a3a5c',
                  borderRadius: 8,
                }}
                styles={{
                  header: {
                    borderBottom: '1px solid #3a3a5c',
                    color: '#cdd6f4',
                  },
                }}
              >
                <StageTimeline />
              </Card>
            </Col>

            {/* Right column: Stage Detail */}
            <Col span={16}>
              <StageDetail />
            </Col>
          </Row>
        )}
      </div>

      {/* Bottom bar */}
      {(taskId || hasFinished) && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            background: '#1e1e2e',
            border: '1px solid #3a3a5c',
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space size="large">
            <Text style={{ color: '#a6adc8' }}>
              Stage{' '}
              <Text strong style={{ color: '#00b4d8' }}>
                {completedCount}/{stages.length}
              </Text>
            </Text>
            <Text style={{ color: '#a6adc8' }}>
              Elapsed{' '}
              <Text strong style={{ color: '#cdd6f4' }}>
                {formatElapsed(totalElapsed)}
              </Text>
            </Text>
            {currentStage >= 0 && isRunning && (
              <Text style={{ color: '#a6adc8' }}>
                Current:{' '}
                <Text strong style={{ color: '#00b4d8' }}>
                  {stages[currentStage]?.stage_name}
                </Text>
              </Text>
            )}
          </Space>

          <Space>
            {isRunning && (
              <Button
                danger
                icon={<StopOutlined />}
                onClick={async () => {
                  if (taskId) {
                    const port = (await window.electronAPI?.getBackendPort()) ?? 8765;
                    try {
                      await fetch(`http://localhost:${port}/api/pipeline/${taskId}/cancel`, {
                        method: 'POST',
                      });
                    } catch (e: any) {
                      messageApi.error(`Failed to cancel pipeline: ${e.message ?? 'Unknown error'}`);
                    }
                  }
                  reset();
                }}
              >
                Cancel Pipeline
              </Button>
            )}
            {hasFinished && (
              <>
                {result && !error && (
                  <Button
                    type="primary"
                    icon={<CodeOutlined />}
                    onClick={() => navigate('code-view')}
                  >
                    View Code
                  </Button>
                )}
                {error && result && (
                  <Button
                    icon={<CodeOutlined />}
                    onClick={() => navigate('code-view')}
                  >
                    View Partial Code
                  </Button>
                )}
                <Button icon={<ReloadOutlined />} onClick={reset}>
                  Reset
                </Button>
              </>
            )}
          </Space>
        </div>
      )}
    </div>
  );
}
