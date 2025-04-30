# Crypto Analyst Chrome 插件

这是一个 Chrome 插件，用于在加密货币交易所页面上显示技术分析数据。

## 功能

- 支持的交易所：
  - Gate.io
  - Binance
  - OKX

- 主要功能：
  - 显示上涨、横盘、下跌概率
  - 提供详细的技术分析报告
  - 包含交易建议和风险评估

## 安装步骤

1. 克隆仓库到本地
2. 打开 Chrome 浏览器，进入扩展程序页面（chrome://extensions/）
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目中的 `extension` 目录

## 使用方法

1. 访问支持的交易所的交易对页面（如 BTC/USDT）
2. 点击浏览器工具栏中的插件图标
3. 查看技术分析数据和详细报告

## 配置

- 在 `src/popup.js` 中修改 `BASE_URL` 为你的后端 API 地址

## 开发

### 目录结构

```
extension/
├── manifest.json        # 插件配置文件
├── public/             # 静态资源
│   ├── icons/         # 图标文件
│   └── popup.html     # 弹出窗口 HTML
├── src/               # 源代码
│   ├── popup.js      # 弹出窗口逻辑
│   ├── content.js    # 内容脚本
│   └── background.js # 后台脚本
└── README.md         # 说明文档
```

### 构建和测试

1. 修改代码后，在 Chrome 扩展程序页面点击刷新按钮
2. 使用 Chrome 开发者工具调试弹出窗口和内容脚本

## 注意事项

- 确保后端 API 服务正在运行
- 插件需要访问 `activeTab` 权限来获取当前页面信息
- 在本地开发时，需要允许跨域请求 