import { Card, Collapse, Progress, Segmented, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { usePipelineStore } from '../stores/pipelineStore';
import type { StageInfo } from '../stores/pipelineStore';

const { Text, Title } = Typography;

function statusTag(status: StageInfo['status']) {
  switch (status) {
    case 'completed':
      return (
        <Tag icon={<CheckCircleOutlined />} color="success">
          Completed
        </Tag>
      );
    case 'running':
      return (
        <Tag icon={<LoadingOutlined spin />} color="processing">
          Running
        </Tag>
      );
    case 'failed':
      return (
        <Tag icon={<CloseCircleOutlined />} color="error">
          Failed
        </Tag>
      );
    case 'pending':
    default:
      return (
        <Tag icon={<ClockCircleOutlined />} color="default">
          Pending
        </Tag>
      );
  }
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function SimpleView() {
  const { stages, currentStage, isRunning, result, error } =
    usePipelineStore();

  if (error) {
    return (
      <Card
        style={{
          background: '#1e1e2e',
          border: '1px solid #f38ba8',
          borderRadius: 8,
        }}
      >
        <Title level={5} style={{ color: '#f38ba8', marginBottom: 8 }}>
          Pipeline Failed
        </Title>
        <Text style={{ color: '#a6adc8' }}>{error}</Text>
      </Card>
    );
  }

  if (result) {
    return (
      <Card
        style={{
          background: '#1e1e2e',
          border: '1px solid #a6e3a1',
          borderRadius: 8,
        }}
      >
        <Title level={5} style={{ color: '#a6e3a1', marginBottom: 8 }}>
          Pipeline Complete
        </Title>
        <Text style={{ color: '#a6adc8' }}>
          All {stages.length} stages completed successfully.
        </Text>
        {result.code && (
          <pre
            style={{
              marginTop: 12,
              padding: 12,
              background: '#141422',
              borderRadius: 6,
              color: '#cdd6f4',
              fontSize: 12,
              maxHeight: 300,
              overflow: 'auto',
            }}
          >
            {result.code}
          </pre>
        )}
      </Card>
    );
  }

  if (!isRunning || currentStage < 0) {
    return (
      <Card
        style={{
          background: '#1e1e2e',
          border: '1px solid #3a3a5c',
          borderRadius: 8,
          textAlign: 'center',
          padding: '40px 24px',
        }}
      >
        <ClockCircleOutlined
          style={{ fontSize: 48, color: '#3a3a5c', marginBottom: 16 }}
        />
        <Title level={5} style={{ color: '#6c7086', marginBottom: 8 }}>
          Waiting for Pipeline
        </Title>
        <Text style={{ color: '#6c7086' }}>
          Configure a task and click "Start Pipeline" to begin.
        </Text>
      </Card>
    );
  }

  const stage = stages[currentStage];
  const completedCount = stages.filter((s) => s.status === 'completed').length;
  const overallProgress = Math.round((completedCount / stages.length) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card
        style={{
          background: '#1e1e2e',
          border: '1px solid #3a3a5c',
          borderRadius: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Title level={5} style={{ color: '#00b4d8', margin: 0 }}>
            Stage {stage.stage + 1}: {stage.stage_name}
          </Title>
          {statusTag(stage.status)}
        </div>
        <Text
          style={{ color: '#a6adc8', display: 'block', marginBottom: 12 }}
        >
          {stage.message || 'Processing...'}
        </Text>
        <Progress
          percent={Math.round(stage.progress * 100)}
          strokeColor="#00b4d8"
          trailColor="#3a3a5c"
          status={stage.status === 'failed' ? 'exception' : 'active'}
        />
      </Card>

      <Card
        style={{
          background: '#1e1e2e',
          border: '1px solid #3a3a5c',
          borderRadius: 8,
        }}
      >
        <Text
          style={{ color: '#a6adc8', display: 'block', marginBottom: 8 }}
        >
          Overall Progress
        </Text>
        <Progress
          percent={overallProgress}
          strokeColor={{
            '0%': '#00b4d8',
            '100%': '#a6e3a1',
          }}
          trailColor="#3a3a5c"
          format={() => `${completedCount}/${stages.length}`}
        />
      </Card>
    </div>
  );
}

function DetailView() {
  const { stages } = usePipelineStore();

  const items = stages
    .filter((s) => s.status !== 'pending')
    .map((stage) => ({
      key: String(stage.stage),
      label: (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {statusTag(stage.status)}
          <span style={{ color: '#cdd6f4' }}>
            Stage {stage.stage}: {stage.stage_name}
          </span>
          <span style={{ color: '#6c7086', fontSize: 12, marginLeft: 'auto' }}>
            {formatElapsed(stage.elapsed_ms)}
          </span>
        </span>
      ),
      children: (
        <div>
          <Text style={{ color: '#a6adc8', display: 'block', marginBottom: 8 }}>
            {stage.message}
          </Text>
          <div style={{ marginBottom: 8 }}>
            <Progress
              percent={Math.round(stage.progress * 100)}
              size="small"
              strokeColor="#00b4d8"
              trailColor="#3a3a5c"
            />
          </div>
          {stage.detail && (
            <pre
              style={{
                background: '#141422',
                padding: 12,
                borderRadius: 6,
                color: '#cdd6f4',
                fontSize: 12,
                maxHeight: 240,
                overflow: 'auto',
                margin: 0,
              }}
            >
              {JSON.stringify(stage.detail, null, 2)}
            </pre>
          )}
        </div>
      ),
    }));

  if (items.length === 0) {
    return (
      <Card
        style={{
          background: '#1e1e2e',
          border: '1px solid #3a3a5c',
          borderRadius: 8,
          textAlign: 'center',
          padding: '40px 24px',
        }}
      >
        <Text style={{ color: '#6c7086' }}>
          No stage data yet. Start a pipeline to see detailed progress.
        </Text>
      </Card>
    );
  }

  return (
    <Collapse
      items={items}
      defaultActiveKey={items.map((i) => i.key)}
      style={{
        background: '#1e1e2e',
        border: '1px solid #3a3a5c',
        borderRadius: 8,
      }}
    />
  );
}

export default function StageDetail() {
  const { viewMode, toggleViewMode } = usePipelineStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Segmented
          options={[
            { label: 'Simple', value: 'simple' },
            { label: 'Detail', value: 'detail' },
          ]}
          value={viewMode}
          onChange={() => toggleViewMode()}
        />
      </div>
      {viewMode === 'simple' ? <SimpleView /> : <DetailView />}
    </div>
  );
}
