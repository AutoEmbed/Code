import { useEffect } from 'react';
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
  { label: 'ESP32', value: 'esp32:esp32:esp32' },
  { label: 'ESP32-S3', value: 'esp32:esp32:esp32s3' },
];

const modelOptions = [
  { label: 'GPT-4', value: 'gpt-4' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
];

// Map board FQBN to display name
const boardFqbnToName: Record<string, string> = {
  'arduino:avr:uno': 'Arduino Uno',
  'arduino:avr:mega': 'Arduino Mega',
  'arduino:avr:nano': 'Arduino Nano',
  'esp32:esp32:esp32': 'ESP32',
  'esp32:esp32:esp32s3': 'ESP32-S3',
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
  const { config, updateConfig, resetConfig } = useConfigStore();

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
            <Select options={modelOptions} placeholder="Select model" />
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
            <Input placeholder="/dev/ttyUSB0 or COM3" />
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
