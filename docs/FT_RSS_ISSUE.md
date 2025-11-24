# Financial Times (FT.com) RSS 访问问题

## 问题描述

FT.com 的 RSS 源 (`http://www.ft.com/rss/home`) 无法通过程序访问。

## 测试结果

所有方法都失败：
- ✗ **rss-parser**: `read ECONNRESET`
- ✗ **Native fetch**: `fetch failed`  
- ✗ **Puppeteer**: `net::ERR_CONNECTION_RESET`

## 原因分析

1. **地域限制**: FT.com 可能对某些地区/IP 有访问限制
2. **反爬虫措施**: 检测并阻止自动化访问
3. **订阅墙**: 需要付费订阅才能访问 RSS
4. **网络策略**: 严格的防火墙或 DDoS 保护

## 浏览器可访问的原因

浏览器可以访问是因为：
- 完整的浏览器指纹
- 用户交互（鼠标、键盘事件）
- 已登录账号或 Cookie
- 通过 Cloudflare 或类似服务的人机验证

## 解决方案

### 当前方案
已从 `data/sources.json` 中移除 FT RSS 源。

### 替代方案

1. **使用其他金融新闻源**
   - Reuters Business
   - Bloomberg
   - WSJ (通过 Dow Jones feeds)
   - The Economist

2. **使用 FT API**（如果有订阅）
   - FT Content API
   - 需要 API key 和付费订阅

3. **使用 RSS 聚合服务**
   - Feedly API
   - Inoreader API
   - 这些服务可能已经处理了反爬虫措施

4. **手动添加**
   - 通过浏览器访问
   - 使用浏览器扩展获取内容
   - 手动复制粘贴重要新闻

## 建议

对于企业级新闻聚合，建议：
1. 联系 FT 获取官方 API 访问权限
2. 使用付费的新闻聚合服务（如 Bloomberg Terminal）
3. 专注于更开放的新闻源

## 参考

- FT Developer Portal: https://developer.ft.com/
- FT Content API 文档（需要订阅）

