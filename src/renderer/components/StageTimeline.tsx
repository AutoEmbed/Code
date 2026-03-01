import { Steps } from 'antd';
import {
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { usePipelineStore } from '../stores/pipelineStore';
import type { StageInfo } from '../stores/pipelineStore';

function stageStatusToStepStatus(
  status: StageInfo['status'],
): 'wait' | 'process' | 'finish' | 'error' {
  switch (status) {
    case 'pending':
      return 'wait';
    case 'running':
      return 'process';
    case 'completed':
      return 'finish';
    case 'failed':
      return 'error';
  }
}

function stageIcon(status: StageInfo['status']) {
  switch (status) {
    case 'running':
      return <LoadingOutlined style={{ color: '#00b4d8' }} />;
    case 'completed':
      return <CheckCircleOutlined style={{ color: '#a6e3a1' }} />;
    case 'failed':
      return <CloseCircleOutlined style={{ color: '#f38ba8' }} />;
    case 'pending':
    default:
      return <ClockCircleOutlined style={{ color: '#6c7086' }} />;
  }
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function stageDescription(stage: StageInfo): string {
  switch (stage.status) {
    case 'completed':
      return `Completed in ${formatElapsed(stage.elapsed_ms)}`;
    case 'running':
      return stage.message || 'Running...';
    case 'failed':
      return stage.message || 'Failed';
    case 'pending':
    default:
      return 'Pending';
  }
}

export default function StageTimeline() {
  const { stages, currentStage } = usePipelineStore();

  const items = stages.map((stage) => ({
    title: (
      <span
        style={{
          color:
            stage.status === 'running'
              ? '#00b4d8'
              : stage.status === 'completed'
                ? '#a6e3a1'
                : stage.status === 'failed'
                  ? '#f38ba8'
                  : '#a6adc8',
          fontWeight: stage.status === 'running' ? 600 : 400,
        }}
      >
        {stage.stage_name}
      </span>
    ),
    description: (
      <span style={{ color: '#6c7086', fontSize: 12 }}>
        {stageDescription(stage)}
      </span>
    ),
    icon: stageIcon(stage.status),
    status: stageStatusToStepStatus(stage.status),
  }));

  return (
    <Steps
      direction="vertical"
      size="small"
      current={currentStage >= 0 ? currentStage : 0}
      items={items}
      style={{ padding: '8px 0' }}
    />
  );
}
