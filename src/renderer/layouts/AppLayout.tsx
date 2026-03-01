import { Layout, Menu, Typography } from 'antd';
import {
  SettingOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  CodeOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

import TaskConfig from '../pages/TaskConfig';
import Pipeline from '../pages/Pipeline';
import CodeView from '../pages/CodeView';
import History from '../pages/History';
import Settings from '../pages/Settings';
import { useNavigationStore } from '../stores/navigationStore';
import type { PageKey } from '../stores/navigationStore';
import { useState } from 'react';

const { Sider, Content, Footer } = Layout;
const { Title } = Typography;

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

  const PageComponent = pageComponents[currentPage];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key as PageKey);
  };

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
            borderBottom: '1px solid #3a3a5c',
          }}
        >
          <Title
            level={4}
            style={{
              color: '#00b4d8',
              margin: 0,
              fontSize: collapsed ? 14 : 16,
              whiteSpace: 'nowrap',
            }}
          >
            {collapsed ? 'AE' : 'AutoEmbed'}
          </Title>
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
            textAlign: 'center',
          }}
        >
          AutoEmbed v1.0.0 — Neural Network Embedding Optimization
        </Footer>
      </Layout>
    </Layout>
  );
}
