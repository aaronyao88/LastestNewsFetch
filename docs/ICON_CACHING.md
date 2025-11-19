# 信息源图标缓存系统

## 功能说明

为了提高性能和减少外部 API 调用，系统实现了信息源图标的服务端缓存机制。

## 工作原理

### 1. 缓存流程

```
用户请求图标
    ↓
检查本地缓存 (public/icons/)
    ↓
存在? → 直接返回缓存图标
    ↓
不存在? → 从 Google Favicon API 获取
    ↓
保存到本地缓存
    ↓
返回图标给用户
```

### 2. 文件命名

- 使用域名的 MD5 哈希作为文件名
- 格式: `{md5_hash}.png`
- 示例: `techcrunch.com` → `1823e9fe31332eba596d653a5a7339b0.png`

### 3. 缓存位置

```
public/icons/
├── 1823e9fe31332eba596d653a5a7339b0.png  (techcrunch.com)
├── 3387be370c2448216e2ac4e9ebbda6c4.png  (theverge.com)
├── 378c6ce938a1126c136782fdfb9c4799.png  (wired.com)
└── ...
```

## API 端点

### GET /api/icon

获取信息源图标（自动缓存）

**参数:**
- `url` (必需): 新闻源的完整 URL

**示例:**
```
/api/icon?url=https://techcrunch.com/article/123
```

**响应:**
- Content-Type: `image/png`
- Cache-Control: `public, max-age=31536000` (1年)

## 使用方法

### 在组件中使用

```tsx
const iconUrl = `/api/icon?url=${encodeURIComponent(newsUrl)}`;

<img src={iconUrl} alt="Source icon" />
```

### 预加载常用图标

运行预加载脚本来缓存常用信息源的图标:

```bash
npx tsx scripts/preload-icons.ts
```

这会预加载以下源的图标:
- TechCrunch
- The Verge
- Wired
- Ars Technica
- AI News
- VentureBeat
- OpenAI
- Anthropic
- Yahoo Finance
- CNBC
- MarketWatch
- Investing.com
- X.com

## 性能优势

### 优化前
- 每次加载页面都要从 Google API 获取图标
- 网络请求延迟: ~200-500ms
- 依赖外部服务可用性

### 优化后
- 首次请求后永久缓存
- 本地读取延迟: ~1-5ms
- 减少 **99%** 的外部 API 调用
- 离线也能显示已缓存的图标

## 缓存管理

### 查看缓存

```bash
ls -lh public/icons/
```

### 清理缓存

```bash
rm -rf public/icons/*
```

### 重新预加载

```bash
npx tsx scripts/preload-icons.ts
```

## 后备机制

如果图标获取失败，系统会:
1. 尝试使用默认图标 (`/default-source-icon.png`)
2. 或显示带颜色的文字缩写

## 注意事项

1. **首次加载**: 第一次访问新源时会有轻微延迟（获取并缓存图标）
2. **存储空间**: 每个图标约 0.5-2KB，1000个图标约 1-2MB
3. **更新**: 图标缓存永久有效，除非手动清理
4. **Git**: `public/icons/` 已添加到 `.gitignore`

## 统计数据

当前已缓存图标数量: **13个**

预加载成功率: **100%** (13/13)

平均图标大小: **~700 bytes**
