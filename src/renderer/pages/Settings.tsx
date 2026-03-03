import { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Space,
  Typography,
  Divider,
  message,
} from 'antd';
import {
  SaveOutlined,
  UndoOutlined,
  FolderOpenOutlined,
  ApiOutlined,
  UsbOutlined,
} from '@ant-design/icons';
import { useConfigStore, defaultConfig } from '../stores/configStore';
import type { AppConfig } from '../stores/configStore';

const { Title, Text } = Typography;

const boardOptions = [
  { label: 'Arduino Uno', value: 'arduino:avr:uno' },
  { label: 'Arduino Mega', value: 'arduino:avr:mega' },
  { label: 'Arduino Nano', value: 'arduino:avr:nano' },
  { label: 'Arduino Leonardo', value: 'arduino:avr:leonardo' },
  { label: 'Arduino Due', value: 'arduino:sam:arduino_due_x_dbg' },
  { label: 'ESP32', value: 'esp32:esp32:esp32' },
  { label: 'ESP32-S3', value: 'esp32:esp32:esp32s3' },
  { label: 'ESP32-C3', value: 'esp32:esp32:esp32c3' },
  { label: 'ESP8266 (NodeMCU)', value: 'esp8266:esp8266:nodemcuv2' },
  { label: 'STM32 Nucleo-64', value: 'STMicroelectronics:stm32:Nucleo_64' },
  { label: 'STM32 Blue Pill (F103C8)', value: 'STMicroelectronics:stm32:GenF1' },
  { label: 'Raspberry Pi Pico', value: 'rp2040:rp2040:rpipico' },
];

// Map board FQBN to display name
const boardFqbnToName: Record<string, string> = {
  'arduino:avr:uno': 'Arduino Uno',
  'arduino:avr:mega': 'Arduino Mega',
  'arduino:avr:nano': 'Arduino Nano',
  'arduino:avr:leonardo': 'Arduino Leonardo',
  'arduino:sam:arduino_due_x_dbg': 'Arduino Due',
  'esp32:esp32:esp32': 'ESP32',
  'esp32:esp32:esp32s3': 'ESP32-S3',
  'esp32:esp32:esp32c3': 'ESP32-C3',
  'esp8266:esp8266:nodemcuv2': 'ESP8266 (NodeMCU)',
  'STMicroelectronics:stm32:Nucleo_64': 'STM32 Nucleo-64',
  'STMicroelectronics:stm32:GenF1': 'STM32 Blue Pill (F103C8)',
  'rp2040:rp2040:rpipico': 'Raspberry Pi Pico',
};

const cardStyle: React.CSSProperties = {
  background: '#1e1e2e',
  border: '1px solid #3a3a5c',
  borderRadius: 8,
};

const cardHeadStyle: React.CSSProperties = {
  borderBottom: '1px solid #3a3a5c',
  color: '#cdd6f4',
};

export default function Settings() {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [testingApi, setTestingApi] = useState(false);
  const [ports, setPorts] = useState<Array<{ port: string; desc: string }>>([]);
  const [loadingPorts, setLoadingPorts] = useState(false);
  const { config, updateConfig, resetConfig } = useConfigStore();

  const fetchPorts = async () => {
    setLoadingPorts(true);
    try {
      const backendPort = (await window.electronAPI?.getBackendPort()) ?? 8765;
      const res = await fetch(`http://localhost:${backendPort}/api/settings/serial-ports`);
      const data = await res.json();
      setPorts(Array.isArray(data) ? data : []);
    } catch {
      setPorts([]);
    } finally {
      setLoadingPorts(false);
    }
  };

  // Populate form from store on mount and when config changes
  useEffect(() => {
    form.setFieldsValue({
      apiKey: config.apiKey,
      apiBaseUrl: config.apiBaseUrl,
      model: config.model,
      arduinoCliPath: config.arduinoCliPath,
      serialPort: config.serialPort,
      boardFqbn: config.boardFqbn,
      librariesDir: config.librariesDir,
    });
  }, [config, form]);

  const handleSave = () => {
    form
      .validateFields()
      .then((values) => {
        const boardName = boardFqbnToName[values.boardFqbn] || values.boardFqbn;
        const update: Partial<AppConfig> = {
          apiKey: values.apiKey ?? '',
          apiBaseUrl: values.apiBaseUrl ?? defaultConfig.apiBaseUrl,
          model: values.model ?? defaultConfig.model,
          arduinoCliPath: values.arduinoCliPath ?? '',
          serialPort: values.serialPort ?? '',
          boardFqbn: values.boardFqbn ?? defaultConfig.boardFqbn,
          boardName,
          librariesDir: values.librariesDir ?? '',
        };
        updateConfig(update);
        messageApi.success('Settings saved successfully');
      })
      .catch(() => {
        messageApi.error('Please fix form errors before saving');
      });
  };

  const handleReset = () => {
    resetConfig();
    form.setFieldsValue({
      apiKey: defaultConfig.apiKey,
      apiBaseUrl: defaultConfig.apiBaseUrl,
      model: defaultConfig.model,
      arduinoCliPath: defaultConfig.arduinoCliPath,
      serialPort: defaultConfig.serialPort,
      boardFqbn: defaultConfig.boardFqbn,
      librariesDir: defaultConfig.librariesDir,
    });
    messageApi.info('Settings reset to defaults');
  };

  const handleBrowseFile = async (fieldName: string) => {
    if (window.electronAPI?.selectFile) {
      const filePath = await window.electronAPI.selectFile();
      if (filePath) {
        form.setFieldValue(fieldName, filePath);
      }
    } else {
      messageApi.warning('File picker is only available in Electron');
    }
  };

  const handleBrowseDirectory = async (fieldName: string) => {
    if (window.electronAPI?.selectDirectory) {
      const dirPath = await window.electronAPI.selectDirectory();
      if (dirPath) {
        form.setFieldValue(fieldName, dirPath);
      }
    } else {
      messageApi.warning('Folder picker is only available in Electron');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      {contextHolder}
      <Title level={3} style={{ color: '#cdd6f4', marginBottom: 24 }}>
        Settings
      </Title>

      <Form
        form={form}
        layout="horizontal"
        labelCol={{ span: 7 }}
        wrapperCol={{ span: 17 }}
        requiredMark={false}
        size="middle"
      >
        {/* LLM Configuration */}
        <Card
          title={
            <Space>
              <ApiOutlined style={{ color: '#00b4d8' }} />
              <Text strong style={{ color: '#cdd6f4' }}>
                LLM Configuration
              </Text>
            </Space>
          }
          style={cardStyle}
          headStyle={cardHeadStyle}
        >
          <Form.Item
            label={<Text style={{ color: '#a6adc8' }}>API Key</Text>}
            name="apiKey"
          >
            <Input.Password placeholder="Enter your API key" />
          </Form.Item>

          <Form.Item
            label={<Text style={{ color: '#a6adc8' }}>API Base URL</Text>}
            name="apiBaseUrl"
          >
            <Input placeholder="https://api.openai.com/v1" />
          </Form.Item>

          <Form.Item
            label={<Text style={{ color: '#a6adc8' }}>Model</Text>}
            name="model"
          >
            <Input placeholder="e.g. gpt-4.1-mini, deepseek-chat, claude-3-5-sonnet..." />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 7, span: 17 }}>
            <Button
              size="small"
              loading={testingApi}
              onClick={async () => {
                setTestingApi(true);
                try {
                  const values = form.getFieldsValue(['apiKey', 'apiBaseUrl', 'model']);
                  const port = (await window.electronAPI?.getBackendPort()) ?? 8765;
                  const res = await fetch(
                    `http://localhost:${port}/api/settings/test-api`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        api_key: values.apiKey,
                        api_base_url: values.apiBaseUrl,
                        model: values.model,
                      }),
                    },
                  );
                  const data = await res.json();
                  if (data.ok) {
                    messageApi.success('API connection successful!');
                  } else {
                    messageApi.error(`API test failed: ${data.error}`);
                  }
                } catch (e: any) {
                  messageApi.error(`Connection failed: ${e.message}`);
                } finally {
                  setTestingApi(false);
                }
              }}
            >
              Test Connection
            </Button>
          </Form.Item>
        </Card>

        <Divider style={{ borderColor: 'transparent', margin: '16px 0' }} />

        {/* Arduino Configuration */}
        <Card
          title={
            <Space>
              <UsbOutlined style={{ color: '#00b4d8' }} />
              <Text strong style={{ color: '#cdd6f4' }}>
                Arduino Configuration
              </Text>
            </Space>
          }
          style={cardStyle}
          headStyle={cardHeadStyle}
        >
          <Form.Item
            label={<Text style={{ color: '#a6adc8' }}>Arduino CLI Path</Text>}
            name="arduinoCliPath"
          >
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="arduinoCliPath" noStyle>
                <Input
                  placeholder="/usr/local/bin/arduino-cli"
                  style={{ width: 'calc(100% - 90px)' }}
                />
              </Form.Item>
              <Button
                icon={<FolderOpenOutlined />}
                onClick={() => handleBrowseFile('arduinoCliPath')}
              >
                Browse
              </Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item
            label={<Text style={{ color: '#a6adc8' }}>Serial Port</Text>}
            name="serialPort"
          >
            <Select
              placeholder="Select serial port (click to refresh)"
              style={{ width: '100%' }}
              loading={loadingPorts}
              onDropdownVisibleChange={(open) => {
                if (open) fetchPorts();
              }}
              options={ports.map((p) => ({
                label: `${p.port} — ${p.desc}`,
                value: p.port,
              }))}
              allowClear
              showSearch
              notFoundContent="No serial ports detected"
            />
          </Form.Item>

          <Form.Item
            label={<Text style={{ color: '#a6adc8' }}>Board</Text>}
            name="boardFqbn"
          >
            <Select options={boardOptions} placeholder="Select board" />
          </Form.Item>

          <Form.Item
            label={<Text style={{ color: '#a6adc8' }}>Libraries Dir</Text>}
            name="librariesDir"
          >
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="librariesDir" noStyle>
                <Input
                  placeholder="Leave empty to auto-detect (recommended)"
                  style={{ width: 'calc(100% - 90px)' }}
                />
              </Form.Item>
              <Button
                icon={<FolderOpenOutlined />}
                onClick={() => handleBrowseDirectory('librariesDir')}
              >
                Browse
              </Button>
            </Space.Compact>
          </Form.Item>
        </Card>

        <Divider style={{ borderColor: 'transparent', margin: '16px 0' }} />

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button icon={<UndoOutlined />} onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            Save
          </Button>
        </div>
      </Form>
    </div>
  );
}
