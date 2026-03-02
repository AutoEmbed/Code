# AutoEmbed GUI 使用指南

## 一、安装前准备

需要安装以下软件（如果已有可跳过）：

### 1. Python 3.10+
- 下载地址：https://www.python.org/downloads/
- **安装时务必勾选 "Add Python to PATH"**

### 2. Node.js 18+
- 下载地址：https://nodejs.org/ （选 LTS 版本）

### 3. Arduino CLI
- 下载地址：https://arduino.github.io/arduino-cli/installation/
- 解压到任意位置，记住路径（如 `C:\arduino-cli\arduino-cli.exe`）

### 4. Arduino USB 驱动
- CH340 驱动：https://www.wch.cn/download/CH341SER_EXE.html
- CP2102 驱动：https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers

## 二、安装 AutoEmbed GUI

1. 解压 `AutoEmbed-GUI.zip` 到任意位置
2. 双击 `scripts\setup-windows.bat`，等待自动安装依赖
3. 安装完成后，双击 `scripts\start.bat` 启动

## 三、首次配置（Settings 页面）

启动后点击左侧 **Settings**（齿轮图标），填写：

| 配置项 | 填写内容 |
|--------|---------|
| API Key | `sk-XjwAWC8WytfBbwspaRpr4LgWEeGAcsJp7EeJ2MyoFJAQrtPQ` |
| API Base URL | `https://yunwu.ai/v1` |
| Model | `gpt-4.1-mini` |
| Arduino CLI Path | 你的 arduino-cli.exe 路径 |
| Serial Port | 连接 Arduino 后出现的 COM 端口（如 COM3） |
| Board | 选择你的开发板型号 |

填完后点 **Save**。

## 四、使用流程

### Step 1: 配置任务（Task Config 页面）

1. 点击左侧 **Task Config**
2. **选择传感器**：从下拉菜单选择你连接的组件（如 DHT11）
3. **选择开发板**：如 Arduino Uno
4. **配置引脚**：填写每个组件连接的引脚号
5. **描述任务**：用自然语言描述（英文），例如：
   - `Read temperature every 5 seconds and display on serial monitor`
   - `When distance is less than 20cm, turn on buzzer`
6. 也可以点 **Load Preset** 加载预设任务
7. 点击 **Start Pipeline**

### Step 2: 观察流程（Pipeline 页面）

系统自动执行 8 个阶段：

```
① 库发现 → ② API提取 → ③ 任务分解 → ④ 语义匹配
→ ⑤ 代码生成 → ⑥ 编译 → ⑦ 上传 → ⑧ 验证
```

- 每个阶段会显示运行状态和耗时
- 点击 **Detail** 模式可查看中间结果

### Step 3: 查看代码（Code View 页面）

- **Debug 版本**：带调试输出的代码
- **Clean 版本**：最终干净代码
- 可以复制或下载 .ino 文件
- 底部 Serial Monitor 显示 Arduino 串口输出

## 五、支持的传感器（30+）

| 类别 | 组件 |
|------|------|
| 温度 | DHT11, DS18B20, LM35, LM75, MLX90614 |
| 环境 | BME680, BME280, SHT40, SGP30, SGP40 |
| 距离 | HC-SR04, VL53L0X |
| 运动 | ADXL345, MPU6050, ADXL362 |
| 光/颜色 | TCS34725, APDS9960, BH1750, LTR390 |
| 气压 | MS5611 |
| 电流 | INA219, ADS1115 |
| 其他 | HX711, MCP4725, SD, Servo, Buzzer, LED, PIR, Relay, LoRa, NFC |

## 六、常见问题

**Q: Pipeline 在 Library Discovery 阶段失败？**
A: 检查 Arduino CLI 路径是否正确，确保网络能访问 Arduino 库。

**Q: 编译失败？**
A: 系统会自动重试最多 5 次。如果持续失败，检查 Board 选择是否与实际硬件匹配。

**Q: 上传失败？**
A: 检查 Serial Port 设置，确保 Arduino 已通过 USB 连接且驱动安装正确。

**Q: API 调用报错？**
A: 检查 API Key 是否正确，网络是否能访问 yunwu.ai。
