# UI Change Detector - Chrome Extension

一个用于检测前端 UI 变化并发送系统通知的 Chrome 扩展程序。

## 功能特性

- 🔍 **实时监测**：使用 MutationObserver 技术实时监测网页 DOM 变化
- 🔔 **系统通知**：检测到 UI 变化时，通过浏览器 API 发送系统级通知
- ⚙️ **可配置**：支持自定义通知设置（启用/禁用、声音、交互要求）
- 📊 **统计信息**：记录并显示检测到的变化次数和最后变化时间
- 🎯 **智能过滤**：自动过滤 insignificant 的变化，避免过度通知
- ⏱️ **防抖机制**：内置防抖和冷却时间，防止通知泛滥

## 文件结构

```
ui-change-detector/
├── manifest.json          # 扩展配置文件 (Manifest V3)
├── background.js          # 后台服务 worker，处理通知
├── content.js             # 内容脚本，监测 DOM 变化
├── popup.html             # 弹出界面 HTML
├── popup.js               # 弹出界面逻辑
├── icons/                 # 扩展图标
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg
└── README.md              # 说明文档
```

## 安装方法

### 方法一：开发者模式加载（推荐用于测试）

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的 **"开发者模式"**
3. 点击 **"加载已解压的扩展程序"**
4. 选择本项目所在的文件夹
5. 扩展即可安装成功

### 方法二：打包为 CRX 文件

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启 **"开发者模式"**
3. 点击 **"打包扩展程序"**
4. 选择项目根目录
5. 点击 **"打包扩展程序"** 按钮
6. 生成的 `.crx` 文件可直接拖入浏览器安装

## 使用说明

### 基本使用

1. 安装扩展后，它会自动在所有网页上运行
2. 当检测到页面 UI 发生变化时，会发送系统通知
3. 点击通知可以跳转到对应的页面标签

### 配置选项

点击浏览器工具栏中的扩展图标，可以打开设置面板：

- **启用通知**：开启或关闭通知功能
- **声音**：通知是否播放声音
- **需要交互**：通知是否需要用户手动关闭
- **统计数据**：查看检测到的变化次数

### 高级配置

可以在 `content.js` 中修改以下配置：

```javascript
const CONFIG = {
  debounceTime: 2000,        // 防抖时间（毫秒）
  notificationCooldown: 5000, // 通知冷却时间（毫秒）
  mutationOptions: {         // 观察的变更类型
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true
  }
};
```

## 技术实现

### 核心技术

1. **MutationObserver API**：高效监测 DOM 树的变化
2. **Chrome Notifications API**：发送系统级通知
3. **Chrome Storage API**：持久化存储用户设置
4. **Service Worker**：后台处理通知逻辑（Manifest V3）

### 检测策略

- 监测 DOM 节点的新增、删除
- 监测重要属性变化（class, style, id, src 等）
- 监测文本内容变化
- 监测页面标题变化
- 使用快照对比确认实质性变化

### 优化措施

- **防抖处理**：避免短时间内重复触发
- **冷却时间**：限制通知频率
- **智能过滤**：忽略不重要的变化
- **资源优化**：只在必要时发送通知

## 权限说明

扩展请求以下权限：

- `notifications`：发送系统通知
- `tabs`：管理标签页，跳转页面
- `storage`：存储用户设置
- `<all_urls>`：在所有网站上监测 UI 变化

## 兼容性

- Chrome 88+ (Manifest V3)
- Edge 88+
- 其他基于 Chromium 的浏览器

## 开发调试

### 查看日志

1. **Content Script 日志**：
   - 打开任意网页的开发者工具 (F12)
   - 在 Console 中查看 "UI Change Detector" 相关日志

2. **Background Script 日志**：
   - 访问 `chrome://extensions/`
   - 找到本扩展，点击 "service worker" 链接
   - 在打开的开发者工具中查看 Console

3. **Popup 日志**：
   - 右键点击扩展图标
   - 选择 "检查弹出内容"

### 测试通知

1. 点击扩展图标打开 popup
2. 点击 "Test Notification" 按钮
3. 应该能看到系统通知

## 故障排除

### 问题：收不到通知

**解决方案**：
1. 检查系统通知权限是否开启
2. 在 popup 中确认 "启用通知" 已打开
3. 检查 Chrome 的通知设置

### 问题：通知过于频繁

**解决方案**：
1. 在 `content.js` 中增加 `debounceTime` 和 `notificationCooldown`
2. 调整 `mutationOptions` 减少监测范围

### 问题：某些网站不工作

**解决方案**：
1. 确认网站不是 `chrome://` 或 `about:` 等内部页面
2. 检查是否有 CSP（内容安全策略）限制
3. 尝试刷新页面重新加载 content script

## 版本历史

### v1.0.0
- 初始版本发布
- 实现基本的 UI 变化检测
- 实现系统通知功能
- 添加配置界面
- 添加统计功能

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题或建议，请创建 Issue。