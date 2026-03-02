import { useState } from 'react';
import {
  Card,
  Select,
  Input,
  Button,
  Typography,
  Space,
  Divider,
  Drawer,
  List,
  Alert,
  message,
} from 'antd';
import {
  ExperimentOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useTaskStore } from '../stores/taskStore';
import { usePipelineStore } from '../stores/pipelineStore';
import { useConfigStore } from '../stores/configStore';
import { useNavigationStore } from '../stores/navigationStore';
import ComponentSelector from '../components/ComponentSelector';
import PinMappingTable from '../components/PinMappingTable';

const { Title, Text } = Typography;
const { TextArea } = Input;

const boardOptions = [
  { label: 'Arduino Uno', value: 'arduino:avr:uno' },
  { label: 'Arduino Mega', value: 'arduino:avr:mega' },
  { label: 'Arduino Nano', value: 'arduino:avr:nano' },
  { label: 'ESP32', value: 'esp32:esp32:esp32' },
  { label: 'Arduino Leonardo', value: 'arduino:avr:leonardo' },
  { label: 'Arduino Due', value: 'arduino:sam:arduino_due_x_dbg' },
  { label: 'ESP8266 (NodeMCU)', value: 'esp8266:esp8266:nodemcuv2' },
];

const boardFqbnToName: Record<string, string> = {
  'arduino:avr:uno': 'Arduino Uno',
  'arduino:avr:mega': 'Arduino Mega',
  'arduino:avr:nano': 'Arduino Nano',
  'esp32:esp32:esp32': 'ESP32',
  'arduino:avr:leonardo': 'Arduino Leonardo',
  'arduino:sam:arduino_due_x_dbg': 'Arduino Due',
  'esp8266:esp8266:nodemcuv2': 'ESP8266 (NodeMCU)',
};

const PRESETS = [
  {
    name: 'DHT11 Temperature Reading',
    components: ['DHT11'],
    task: 'Read temperature and humidity every 5 seconds, display on serial monitor.',
  },
  {
    name: 'HC-SR04 Distance Measurement',
    components: ['HC-SR04'],
    task: 'Measure distance continuously and display in centimeters on serial monitor.',
  },
  {
    name: 'MPU6050 Motion Detection',
    components: ['MPU6050'],
    task: 'Read accelerometer and gyroscope data, display on serial monitor.',
  },
];

const cardStyle: React.CSSProperties = {
  background: '#1e1e2e',
  border: '1px solid #3a3a5c',
  borderRadius: 8,
};

const cardHeadStyle: React.CSSProperties = {
  borderBottom: '1px solid #3a3a5c',
  color: '#cdd6f4',
};

export default function TaskConfig() {
  const {
    components,
    taskDescription,
    pinConnections,
    boardFqbn,
    boardName,
    setComponents,
    setTaskDescription,
    setBoardName,
    setBoardFqbn,
  } = useTaskStore();

  const { reset: resetPipeline, setTaskId, setIsRunning } = usePipelineStore();
  const { config } = useConfigStore();
  const { navigate } = useNavigationStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleBoardChange = (value: string) => {
    setBoardFqbn(value);
    setBoardName(boardFqbnToName[value] ?? value);
  };

  const handlePresetSelect = (preset: (typeof PRESETS)[number]) => {
    setComponents(preset.components);
    setTaskDescription(preset.task);
    setDrawerOpen(false);
  };

  const handleStart = async () => {
    // Validate settings
    if (!config.apiKey) {
      messageApi.warning('Please set your API key in Settings first.');
      return;
    }

    setStarting(true);

    // Reset any previous pipeline state
    resetPipeline();

    const backendPort = (await window.electronAPI?.getBackendPort()) ?? 8765;

    const body = {
      task_config: {
        components,
        task_description: taskDescription,
        pin_connections: pinConnections,
        board_name: boardName,
        board_fqbn: boardFqbn,
      },
      app_config: {
        api_key: config.apiKey,
        api_base_url: config.apiBaseUrl,
        model: config.model,
        arduino_cli_path: config.arduinoCliPath,
        serial_port: config.serialPort,
        board_fqbn: boardFqbn,
        board_name: boardName,
        libraries_dir: config.librariesDir,
      },
    };

    try {
      const res = await fetch(`http://localhost:${backendPort}/api/pipeline/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      const taskId = data.task_id;

      // Update pipeline store and navigate
      setTaskId(taskId);
      setIsRunning(true);
      navigate('pipeline');
    } catch (err: any) {
      console.error('Failed to start pipeline:', err);
      messageApi.error(`Failed to start pipeline: ${err.message ?? 'Unknown error'}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      {contextHolder}

      {/* First-run guidance */}
      {(!config.apiKey || !config.arduinoCliPath) && (
        <Alert
          message="Setup Required"
          description={
            <span>
              Please configure your{' '}
              {!config.apiKey && <strong>API Key</strong>}
              {!config.apiKey && !config.arduinoCliPath && ' and '}
              {!config.arduinoCliPath && <strong>Arduino CLI path</strong>}
              {' '}in{' '}
              <a
                style={{ color: '#00b4d8' }}
                onClick={() => navigate('settings')}
              >
                <SettingOutlined /> Settings
              </a>
              {' '}before starting a pipeline.
            </span>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 20 }}
          banner
        />
      )}

      {/* Header */}
      <Title level={3} style={{ color: '#cdd6f4', marginBottom: 24 }}>
        Task Configuration
      </Title>

      {/* Component Selection */}
      <Card
        title={
          <Space>
            <AppstoreOutlined style={{ color: '#00b4d8' }} />
            <Text strong style={{ color: '#cdd6f4' }}>
              Component Selection
            </Text>
          </Space>
        }
        style={cardStyle}
        headStyle={cardHeadStyle}
      >
        <ComponentSelector />
      </Card>

      <Divider style={{ borderColor: 'transparent', margin: '16px 0' }} />

      {/* Board Selection */}
      <Card
        title={
          <Space>
            <ExperimentOutlined style={{ color: '#00b4d8' }} />
            <Text strong style={{ color: '#cdd6f4' }}>
              Board Selection
            </Text>
          </Space>
        }
        style={cardStyle}
        headStyle={cardHeadStyle}
      >
        <Text style={{ color: '#a6adc8', display: 'block', marginBottom: 8 }}>
          Target Board
        </Text>
        <Select
          value={boardFqbn}
          onChange={handleBoardChange}
          options={boardOptions}
          style={{ width: '100%' }}
          placeholder="Select target board"
        />
      </Card>

      <Divider style={{ borderColor: 'transparent', margin: '16px 0' }} />

      {/* Pin Mapping — only visible when components are selected */}
      {components.length > 0 && (
        <>
          <Card
            title={
              <Space>
                <ThunderboltOutlined style={{ color: '#00b4d8' }} />
                <Text strong style={{ color: '#cdd6f4' }}>
                  Pin Mapping
                </Text>
              </Space>
            }
            style={cardStyle}
            headStyle={cardHeadStyle}
          >
            <Text
              style={{ color: '#a6adc8', display: 'block', marginBottom: 4 }}
            >
              Assign pin numbers for each component (optional).
            </Text>
            <PinMappingTable />
          </Card>

          <Divider style={{ borderColor: 'transparent', margin: '16px 0' }} />
        </>
      )}

      {/* Task Description */}
      <Card
        title={
          <Space>
            <FileTextOutlined style={{ color: '#00b4d8' }} />
            <Text strong style={{ color: '#cdd6f4' }}>
              Task Description
            </Text>
          </Space>
        }
        style={cardStyle}
        headStyle={cardHeadStyle}
      >
        <TextArea
          rows={4}
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          placeholder="Describe what you want the Arduino to do, e.g., 'Read temperature every 5 seconds and display on serial monitor'"
        />
        <div style={{ marginTop: 12 }}>
          <Button type="dashed" onClick={() => setDrawerOpen(true)}>
            Load Preset
          </Button>
        </div>
      </Card>

      <Divider style={{ borderColor: 'transparent', margin: '16px 0' }} />

      {/* Start Button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          type="primary"
          size="large"
          icon={<PlayCircleOutlined />}
          onClick={handleStart}
          loading={starting}
          style={{ minWidth: 220, height: 48, fontSize: 16 }}
          disabled={components.length === 0 || !taskDescription.trim()}
        >
          Start Pipeline
        </Button>
      </div>

      {/* Preset Drawer */}
      <Drawer
        title="Preset Tasks"
        placement="right"
        width={400}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{
          body: { padding: 0 },
        }}
      >
        <List
          dataSource={PRESETS}
          renderItem={(preset) => (
            <List.Item
              style={{ cursor: 'pointer', padding: '12px 24px' }}
              onClick={() => handlePresetSelect(preset)}
            >
              <List.Item.Meta
                title={
                  <Text strong style={{ color: '#cdd6f4' }}>
                    {preset.name}
                  </Text>
                }
                description={
                  <div>
                    <Text
                      type="secondary"
                      style={{ fontSize: 12, display: 'block' }}
                    >
                      Components: {preset.components.join(', ')}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {preset.task}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Drawer>
    </div>
  );
}
