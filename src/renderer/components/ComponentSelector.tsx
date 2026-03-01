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

export default function ComponentSelector() {
  const { components, setComponents } = useTaskStore();

  return (
    <div>
      <Text style={{ color: '#a6adc8', display: 'block', marginBottom: 8 }}>
        Select Components
      </Text>
      <Select
        mode="multiple"
        showSearch
        allowClear
        placeholder="Search and select IoT components..."
        value={components}
        onChange={setComponents}
        style={{ width: '100%' }}
        optionFilterProp="label"
        maxTagCount="responsive"
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
    </div>
  );
}
