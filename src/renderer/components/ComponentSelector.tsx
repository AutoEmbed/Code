import { Select, Typography } from 'antd';
import { useTaskStore } from '../stores/taskStore';

const { Text } = Typography;

const COMPONENT_GROUPS = [
  {
    label: 'Temperature',
    components: ['DHT11', 'DS18B20', 'LM35', 'LM75', 'MLX90614'],
  },
  {
    label: 'Environment',
    components: ['BME680', 'BME280', 'SHT40', 'SGP30', 'SGP40'],
  },
  {
    label: 'Distance',
    components: ['HC-SR04', 'VL53L0X'],
  },
  {
    label: 'Motion',
    components: ['ADXL345', 'MPU6050', 'ADXL362'],
  },
  {
    label: 'Color / Light',
    components: ['TCS34725', 'APDS9960', 'BH1750', 'LTR390'],
  },
  {
    label: 'Pressure',
    components: ['MS5611'],
  },
  {
    label: 'Power',
    components: ['INA219', 'ADS1115'],
  },
  {
    label: 'Other',
    components: ['HX711', 'MCP4725', 'SD', 'Servo', 'Buzzer', 'LED', 'PIR', 'Relay', 'LoRa', 'NFC'],
  },
];

// Flatten all known components for quick lookup
const KNOWN_COMPONENTS = new Set(COMPONENT_GROUPS.flatMap((g) => g.components));

export default function ComponentSelector() {
  const { components, setComponents } = useTaskStore();

  return (
    <div>
      <Text style={{ color: '#a6adc8', display: 'block', marginBottom: 8 }}>
        Select or type component names (supports any Arduino-compatible module)
      </Text>
      <Select
        mode="tags"
        showSearch
        allowClear
        placeholder="Select from list or type custom component name..."
        value={components}
        onChange={setComponents}
        style={{ width: '100%' }}
        optionFilterProp="label"
        maxTagCount="responsive"
        tokenSeparators={[',']}
        tagRender={(props) => {
          const { label, closable, onClose } = props;
          const isCustom = !KNOWN_COMPONENTS.has(label as string);
          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                margin: '2px 4px 2px 0',
                borderRadius: 4,
                fontSize: 12,
                background: isCustom ? '#1a3a2a' : '#1a2a3a',
                border: `1px solid ${isCustom ? '#2d6a4f' : '#3a5a8c'}`,
                color: isCustom ? '#52c41a' : '#69b1ff',
              }}
            >
              {isCustom && <span style={{ marginRight: 4, fontSize: 10 }}>*</span>}
              {label}
              {closable && (
                <span
                  onClick={onClose}
                  style={{ marginLeft: 6, cursor: 'pointer', opacity: 0.7 }}
                >
                  x
                </span>
              )}
            </span>
          );
        }}
      >
        {COMPONENT_GROUPS.map((group) => (
          <Select.OptGroup key={group.label} label={group.label}>
            {group.components.map((comp) => (
              <Select.Option key={comp} value={comp} label={comp}>
                {comp}
              </Select.Option>
            ))}
          </Select.OptGroup>
        ))}
      </Select>
      {components.some((c) => !KNOWN_COMPONENTS.has(c)) && (
        <Text style={{ color: '#52c41a', fontSize: 12, marginTop: 4, display: 'block' }}>
          * Custom components will be auto-discovered via Arduino library search
        </Text>
      )}
    </div>
  );
}
