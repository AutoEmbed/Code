import { Table, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTaskStore } from '../stores/taskStore';

interface PinRow {
  key: string;
  component: string;
  pin: string;
}

export default function PinMappingTable() {
  const { components, pinConnections, setPinConnection } = useTaskStore();

  const dataSource: PinRow[] = components.map((comp) => ({
    key: comp,
    component: comp,
    pin: pinConnections[comp] ?? '',
  }));

  const columns: ColumnsType<PinRow> = [
    {
      title: 'Component',
      dataIndex: 'component',
      key: 'component',
      width: '50%',
    },
    {
      title: 'Pin',
      dataIndex: 'pin',
      key: 'pin',
      width: '50%',
      render: (_: unknown, record: PinRow) => (
        <Input
          placeholder="e.g. D2, A0"
          value={record.pin}
          onChange={(e) => setPinConnection(record.component, e.target.value)}
          size="small"
        />
      ),
    },
  ];

  return (
    <Table<PinRow>
      dataSource={dataSource}
      columns={columns}
      pagination={false}
      size="small"
      style={{ marginTop: 8 }}
    />
  );
}
