import { useEffect } from 'react';
import {
  Table,
  Tag,
  Badge,
  Button,
  Card,
  Empty,
  Drawer,
  Space,
  Typography,
  Popconfirm,
  Tooltip,
  Spin,
  Alert,
  message,
} from 'antd';
import {
  ClockCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  LoadingOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useHistoryStore } from '../stores/historyStore';
import type { HistoryItem } from '../stores/historyStore';
import { useNavigationStore } from '../stores/navigationStore';
import { usePipelineStore } from '../stores/pipelineStore';
import { useTaskStore } from '../stores/taskStore';

const { Title, Text, Paragraph } = Typography;

const statusColorMap: Record<string, string> = {
  completed: 'green',
  success: 'green',
  failed: 'red',
  error: 'red',
  running: 'blue',
  pending: 'gold',
};

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

const cardStyle: React.CSSProperties = {
  background: '#1e1e2e',
  border: '1px solid #3a3a5c',
  borderRadius: 8,
};

export default function History() {
  const { items, loading, error, selectedItem, fetchHistory, selectItem, deleteItem } =
    useHistoryStore();
  const { navigate } = useNavigationStore();
  const { loadResult } = usePipelineStore();
  const { setComponents, setTaskDescription } = useTaskStore();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    (async () => {
      const port = (await window.electronAPI?.getBackendPort()) ?? 8765;
      fetchHistory(port);
    })();
  }, [fetchHistory]);

  const handleDelete = async (taskId: string) => {
    try {
      const port = (await window.electronAPI?.getBackendPort()) ?? 8765;
      await deleteItem(taskId, port);
    } catch {
      messageApi.error('Failed to delete history item');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard
      .writeText(code)
      .then(() => messageApi.success('Code copied to clipboard'))
      .catch(() => messageApi.error('Failed to copy code'));
  };

  const columns: ColumnsType<HistoryItem> = [
    {
      title: 'Date',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      sorter: (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'descend',
      render: (ts: string) => (
        <Text style={{ color: '#a6adc8', fontSize: 13 }}>
          {formatTimestamp(ts)}
        </Text>
      ),
    },
    {
      title: 'Task',
      dataIndex: 'task_description',
      key: 'task_description',
      ellipsis: true,
      render: (desc: string) => (
        <Tooltip title={desc}>
          <Text style={{ color: '#cdd6f4' }}>{desc}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Components',
      dataIndex: 'components',
      key: 'components',
      width: 240,
      render: (components: string[]) => (
        <Space size={[0, 4]} wrap>
          {(components ?? []).map((c) => (
            <Tag
              key={c}
              color="#17384c"
              style={{ borderColor: '#00b4d8', color: '#00b4d8' }}
            >
              {c}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Badge
          color={statusColorMap[status] ?? 'default'}
          text={
            <Text
              style={{
                color: statusColorMap[status] ?? '#a6adc8',
                textTransform: 'capitalize',
              }}
            >
              {status}
            </Text>
          }
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="View details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined style={{ color: '#00b4d8' }} />}
              onClick={(e) => {
                e.stopPropagation();
                selectItem(record);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this history item?"
            description="This action cannot be undone."
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record.task_id);
            }}
            onCancel={(e) => e?.stopPropagation()}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const codeToShow = selectedItem?.code_clean || selectedItem?.code_debug;

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
          <ClockCircleOutlined style={{ marginRight: 8, color: '#00b4d8' }} />
          History
        </Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => fetchHistory()}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {loading && items.length === 0 ? (
          <Card style={{ ...cardStyle, textAlign: 'center', padding: '60px 24px' }}>
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 32, color: '#00b4d8' }} />}
              tip={<span style={{ color: '#a6adc8', marginTop: 12 }}>Loading history...</span>}
            >
              <div style={{ height: 60 }} />
            </Spin>
          </Card>
        ) : error ? (
          <Alert
            message="Failed to Load History"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={() => fetchHistory()}>
                Retry
              </Button>
            }
            style={{ marginBottom: 16 }}
          />
        ) : items.length === 0 ? (
          <Card style={cardStyle}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text style={{ color: '#6c7086' }}>
                  No pipeline runs yet. Start a pipeline from the Task Config
                  page.
                </Text>
              }
            />
          </Card>
        ) : (
          <Table<HistoryItem>
            columns={columns}
            dataSource={items}
            rowKey="task_id"
            loading={loading}
            pagination={{ pageSize: 15, showSizeChanger: false }}
            size="middle"
            style={{ background: 'transparent' }}
            onRow={(record) => ({
              onClick: () => selectItem(record),
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </div>

      {/* Detail Drawer */}
      <Drawer
        title={
          <Text strong style={{ color: '#cdd6f4' }}>
            Run Details
          </Text>
        }
        placement="right"
        width={560}
        open={!!selectedItem}
        onClose={() => selectItem(null)}
        styles={{
          body: { padding: '16px 24px' },
        }}
      >
        {selectedItem && (
          <div>
            {/* Task ID */}
            <div style={{ marginBottom: 16 }}>
              <Text
                type="secondary"
                style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
              >
                Task ID
              </Text>
              <Text style={{ color: '#cdd6f4', fontFamily: 'monospace' }}>
                {selectedItem.task_id}
              </Text>
            </div>

            {/* Timestamp */}
            <div style={{ marginBottom: 16 }}>
              <Text
                type="secondary"
                style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
              >
                Date
              </Text>
              <Text style={{ color: '#cdd6f4' }}>
                {formatTimestamp(selectedItem.timestamp)}
              </Text>
            </div>

            {/* Status */}
            <div style={{ marginBottom: 16 }}>
              <Text
                type="secondary"
                style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
              >
                Status
              </Text>
              <Badge
                color={statusColorMap[selectedItem.status] ?? 'default'}
                text={
                  <Text
                    style={{
                      color:
                        statusColorMap[selectedItem.status] ?? '#a6adc8',
                      textTransform: 'capitalize',
                    }}
                  >
                    {selectedItem.status}
                  </Text>
                }
              />
            </div>

            {/* Task Description */}
            <div style={{ marginBottom: 16 }}>
              <Text
                type="secondary"
                style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
              >
                Task Description
              </Text>
              <Paragraph style={{ color: '#cdd6f4', marginBottom: 0 }}>
                {selectedItem.task_description}
              </Paragraph>
            </div>

            {/* Components */}
            <div style={{ marginBottom: 16 }}>
              <Text
                type="secondary"
                style={{ fontSize: 12, display: 'block', marginBottom: 8 }}
              >
                Components
              </Text>
              <Space size={[4, 4]} wrap>
                {(selectedItem.components ?? []).map((c) => (
                  <Tag
                    key={c}
                    color="#17384c"
                    style={{ borderColor: '#00b4d8', color: '#00b4d8' }}
                  >
                    {c}
                  </Tag>
                ))}
              </Space>
            </div>

            {/* Generated Code */}
            {codeToShow && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Generated Code
                    {selectedItem.code_clean
                      ? ' (Clean)'
                      : ' (Debug)'}
                  </Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopyCode(codeToShow)}
                  >
                    Copy
                  </Button>
                </div>
                <pre
                  style={{
                    background: '#11111b',
                    border: '1px solid #3a3a5c',
                    borderRadius: 6,
                    padding: 16,
                    color: '#cdd6f4',
                    fontSize: 13,
                    fontFamily:
                      "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                    overflow: 'auto',
                    maxHeight: 400,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                  }}
                >
                  {codeToShow}
                </pre>
              </div>
            )}

            {/* Action Buttons */}
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={<CodeOutlined />}
                disabled={!selectedItem?.code_debug && !selectedItem?.code_clean}
                onClick={() => {
                  if (selectedItem) {
                    loadResult({
                      code_debug: selectedItem.code_debug,
                      code_clean: selectedItem.code_clean,
                    });
                    navigate('code-view');
                  }
                }}
              >
                View Code
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  if (selectedItem) {
                    setComponents(selectedItem.components);
                    setTaskDescription(selectedItem.task_description);
                    navigate('task-config');
                  }
                }}
              >
                Re-run
              </Button>
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  );
}
