import { ConfigProvider } from 'antd';
import { appTheme } from './styles/theme';
import AppLayout from './layouts/AppLayout';

export default function App() {
  return (
    <ConfigProvider theme={appTheme}>
      <AppLayout />
    </ConfigProvider>
  );
}
