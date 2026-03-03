import { Card, Collapse, Progress, Segmented, Tag, Typography, Descriptions } from 'antd';
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
        {(result.code_debug || result.code_clean) && (
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
            {result.code_clean || result.code_debug}
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

function StageDetailContent({ stageName, detail }: { stageName: string; detail: Record<string, any> }) {
  const boxStyle: React.CSSProperties = {
    background: '#141422',
    padding: 12,
    borderRadius: 6,
    color: '#cdd6f4',
    fontSize: 12,
    margin: 0,
  };

  if (stageName === 'Library Discovery' && detail.libraries) {
    const libs = detail.libraries as Record<string, string>;
    return (
      <div style={boxStyle}>
        <Text style={{ color: '#6c7086', fontSize: 11, display: 'block', marginBottom: 6 }}>
          Discovered Libraries
        </Text>
        {Object.entries(libs).map(([comp, lib]) => (
          <div key={comp} style={{ marginBottom: 2 }}>
            <Tag color="blue" style={{ fontSize: 11 }}>{comp}</Tag>
            <span style={{ color: '#a6e3a1' }}>{lib}</span>
          </div>
        ))}
      </div>
    );
  }

  if (stageName === 'API Extraction' && detail.components) {
    return (
      <div style={boxStyle}>
        <Text style={{ color: '#6c7086', fontSize: 11, display: 'block', marginBottom: 6 }}>
          Extracted APIs
        </Text>
        <div style={{ marginBottom: 4 }}>
          Components: {(detail.components as string[]).map((c) => (
            <Tag key={c} color="cyan" style={{ fontSize: 11 }}>{c}</Tag>
          ))}
        </div>
        <Text style={{ color: '#cdd6f4', fontSize: 12 }}>
          Total APIs found: <strong style={{ color: '#00b4d8' }}>{detail.total_apis}</strong>
        </Text>
      </div>
    );
  }

  if (stageName === 'Task Decomposition' && detail.subtasks) {
    return (
      <div style={boxStyle}>
        <Text style={{ color: '#6c7086', fontSize: 11, display: 'block', marginBottom: 6 }}>
          Subtasks ({detail.count})
        </Text>
        {(detail.subtasks as string[]).map((t, i) => (
          <div key={i} style={{ marginBottom: 2 }}>
            <span style={{ color: '#6c7086', marginRight: 6 }}>{i + 1}.</span>
            <span style={{ color: '#cdd6f4' }}>{t}</span>
          </div>
        ))}
      </div>
    );
  }

  if (stageName === 'Semantic Matching' && detail.top_matches) {
    return (
      <div style={boxStyle}>
        <Text style={{ color: '#6c7086', fontSize: 11, display: 'block', marginBottom: 6 }}>
          Top Matches ({detail.matched_apis} total APIs matched)
        </Text>
        {(detail.top_matches as Array<{ subtask: string; functionality: string; score: number }>).map(
          (m, i) => (
            <div key={i} style={{ marginBottom: 4, display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <Tag color={m.score > 0.5 ? 'green' : 'orange'} style={{ fontSize: 10, minWidth: 48, textAlign: 'center' }}>
                {(m.score * 100).toFixed(0)}%
              </Tag>
              <span style={{ color: '#a6adc8', fontSize: 11 }}>{m.subtask}</span>
              <span style={{ color: '#6c7086' }}>&rarr;</span>
              <span style={{ color: '#a6e3a1', fontSize: 11 }}>{m.functionality}</span>
            </div>
          ),
        )}
      </div>
    );
  }

  if (stageName === 'Code Generation') {
    return (
      <div style={boxStyle}>
        <Text style={{ color: '#6c7086', fontSize: 11, display: 'block', marginBottom: 6 }}>
          Generation Details
        </Text>
        <div style={{ display: 'flex', gap: 16 }}>
          <span>Code length: <strong style={{ color: '#00b4d8' }}>{detail.code_length} chars</strong></span>
          <span>Baud rate: <strong style={{ color: '#00b4d8' }}>{detail.baud_rate}</strong></span>
        </div>
        {detail.libraries && (detail.libraries as string[]).length > 0 && (
          <div style={{ marginTop: 6 }}>
            Libraries: {(detail.libraries as string[]).map((l) => (
              <Tag key={l} color="purple" style={{ fontSize: 11 }}>{l}</Tag>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (stageName === 'Validation' && detail.result !== undefined) {
    return (
      <div style={boxStyle}>
        <div style={{ marginBottom: 4 }}>
          Status: <Tag color={detail.passed ? 'green' : 'orange'}>{detail.passed ? 'PASSED' : 'Needs Review'}</Tag>
        </div>
        <div>Serial lines captured: <strong style={{ color: '#00b4d8' }}>{detail.serial_lines}</strong></div>
        {detail.result && (
          <pre style={{ color: '#a6adc8', margin: '6px 0 0', whiteSpace: 'pre-wrap', fontSize: 11 }}>
            {detail.result}
          </pre>
        )}
      </div>
    );
  }

  // Fallback: show raw JSON for unknown stage types
  return (
    <pre style={{ ...boxStyle, maxHeight: 240, overflow: 'auto' }}>
      {JSON.stringify(detail, null, 2)}
    </pre>
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
          {stage.detail && <StageDetailContent stageName={stage.stage_name} detail={stage.detail} />}
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
