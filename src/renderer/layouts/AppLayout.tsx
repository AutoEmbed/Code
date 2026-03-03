import { Layout, Menu, Typography, Badge } from 'antd';
import {
  SettingOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  CodeOutlined,
  HistoryOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

import TaskConfig from '../pages/TaskConfig';
import Pipeline from '../pages/Pipeline';
import CodeView from '../pages/CodeView';
import History from '../pages/History';
import Settings from '../pages/Settings';
import { useNavigationStore } from '../stores/navigationStore';
import type { PageKey } from '../stores/navigationStore';
import { useConfigStore } from '../stores/configStore';
import { usePipelineStore } from '../stores/pipelineStore';
import { useState } from 'react';

const { Sider, Content, Footer } = Layout;
const { Title, Text } = Typography;

// Map board FQBN to display name for status bar
const boardFqbnToName: Record<string, string> = {
  'arduino:avr:uno': 'Arduino Uno',
  'arduino:avr:mega': 'Arduino Mega',
  'arduino:avr:nano': 'Arduino Nano',
  'esp32:esp32:esp32': 'ESP32',
  'esp32:esp32:esp32s3': 'ESP32-S3',
};

const pageComponents: Record<PageKey, React.ComponentType> = {
  'task-config': TaskConfig,
  pipeline: Pipeline,
  'code-view': CodeView,
  history: History,
  settings: Settings,
};

const menuItems: MenuProps['items'] = [
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: 'Settings',
  },
  {
    key: 'task-config',
    icon: <FileTextOutlined />,
    label: 'Task Config',
  },
  {
    key: 'pipeline',
    icon: <PlayCircleOutlined />,
    label: 'Pipeline',
  },
  {
    key: 'code-view',
    icon: <CodeOutlined />,
    label: 'Code',
  },
  {
    key: 'history',
    icon: <HistoryOutlined />,
    label: 'History',
  },
];

export default function AppLayout() {
  const { currentPage, navigate } = useNavigationStore();
  const [collapsed, setCollapsed] = useState(false);
  const config = useConfigStore((s) => s.config);
  const { isRunning, currentStage, stages } = usePipelineStore();

  const PageComponent = pageComponents[currentPage];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key as PageKey);
  };

  // Status bar: left side info
  const boardDisplay = boardFqbnToName[config.boardFqbn] || config.boardFqbn || 'No Board';
  const portDisplay = config.serialPort || 'No Port';
  const connectionDisplay = config.apiKey ? 'Configured' : 'Not Configured';

  // Status bar: right side pipeline progress
  const completedCount = stages.filter((s) => s.status === 'completed').length;
  const pipelineDisplay = isRunning
    ? `Pipeline: ${completedCount + 1}/${stages.length}`
    : completedCount > 0
      ? `Pipeline: ${completedCount}/${stages.length}`
      : 'Pipeline: Idle';

  return (
    <Layout style={{ height: '100vh', background: '#141422' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={200}
        style={{
          background: '#1e1e2e',
          borderRight: '1px solid #3a3a5c',
        }}
      >
        <div
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderBottom: '1px solid #3a3a5c',
          }}
        >
          <ApiOutlined
            style={{
              color: '#00b4d8',
              fontSize: collapsed ? 18 : 16,
            }}
          />
          {!collapsed && (
            <Title
              level={4}
              style={{
                color: '#00b4d8',
                margin: 0,
                fontSize: 16,
                whiteSpace: 'nowrap',
                letterSpacing: '0.5px',
              }}
            >
              AutoEmbed
            </Title>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPage]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ background: 'transparent', borderRight: 0 }}
        />
      </Sider>
      <Layout style={{ background: '#141422' }}>
        <Content
          style={{
            padding: 0,
            overflow: 'auto',
            background: '#141422',
            minHeight: 0,
            flex: 1,
          }}
        >
          <PageComponent />
        </Content>
        <Footer
          style={{
            padding: '4px 16px',
            background: '#1e1e2e',
            borderTop: '1px solid #3a3a5c',
            color: '#888',
            fontSize: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: '#a6adc8', fontSize: 12 }}>{boardDisplay}</Text>
            <span style={{ color: '#3a3a5c' }}>|</span>
            <Text style={{ color: '#a6adc8', fontSize: 12 }}>{portDisplay}</Text>
            <span style={{ color: '#3a3a5c' }}>|</span>
            <Badge
              status={config.apiKey ? 'success' : 'default'}
              text={
                <Text style={{ color: config.apiKey ? '#a6e3a1' : '#6c7086', fontSize: 12 }}>
                  {connectionDisplay}
                </Text>
              }
            />
          </span>
          <span>
            <Badge
              status={isRunning ? 'processing' : 'default'}
              text={
                <Text
                  style={{
                    color: isRunning ? '#00b4d8' : '#6c7086',
                    fontSize: 12,
                  }}
                >
                  {pipelineDisplay}
                </Text>
              }
            />
          </span>
        </Footer>
      </Layout>
    </Layout>
  );
}
