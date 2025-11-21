# Project Context

## Purpose
这是一个技术新闻聚合器应用，主要功能包括：
- **每日新闻聚合**：从多个 RSS 源、Twitter/X.com 和微信公众号抓取 AI 和技术相关新闻
- **智能翻译**：使用 AI 模型（Kimi/OpenAI）将英文新闻自动翻译成中文，并生成结构化摘要
- **专题匹配**：根据关键词自动匹配新闻到预定义的专题（如 MAG7 公司财报、AI 模型发布等）
- **仪表板展示**：提供 Web 界面查看最新和历史报告，支持按分类和专题筛选
- **自动化调度**：通过 macOS LaunchAgent 实现每日自动聚合

## Tech Stack
- **核心框架**：Next.js 16.0.3 (App Router), React 19.2.0, TypeScript 5
- **样式系统**：Tailwind CSS 4, clsx, tailwind-merge
- **数据获取**：
  - `rss-parser` - RSS 源解析
  - `axios` - HTTP 请求
  - `cheerio` - HTML 解析
  - `puppeteer` - 浏览器自动化（Twitter/微信爬虫）
  - `playwright-core` - 备用浏览器自动化
  - `twitter-api-v2` - Twitter API 客户端
- **AI 翻译**：
  - `openai` - OpenAI/Kimi API 客户端
  - 优先使用 Kimi (Moonshot) API，回退到 OpenAI
- **工具库**：
  - `date-fns` - 日期处理
  - `lucide-react` - 图标组件
  - `tsx` - TypeScript 脚本执行
  - `dotenv` - 环境变量管理

## Project Conventions

### Code Style
- **TypeScript**：启用 strict mode，使用类型安全
- **ESLint**：使用 Next.js 官方配置（`eslint-config-next`）
- **路径别名**：使用 `@/*` 指向项目根目录（配置在 `tsconfig.json`）
- **样式管理**：使用 `clsx` 和 `tailwind-merge` 进行条件样式组合
- **命名约定**：
  - 组件文件使用 PascalCase（如 `ReportView.tsx`）
  - 服务文件使用 kebab-case（如 `wechat-fetcher.ts`）
  - 类型定义集中在 `types/index.ts`
- **代码组织**：
  - 客户端组件使用 `'use client'` 指令
  - 服务端逻辑放在 `services/` 目录
  - API 路由放在 `app/api/` 目录

### Architecture Patterns
- **Next.js App Router**：使用最新的 App Router 架构
  - 页面组件在 `app/` 目录
  - API 路由在 `app/api/` 目录
  - 支持服务端组件和客户端组件混合使用
- **服务层架构**：核心业务逻辑封装在 `services/` 目录
  - `fetcher.ts` - 新闻抓取（RSS、Twitter、微信）
  - `translator.ts` - AI 翻译服务
  - `aggregator.ts` - 聚合和报告生成
  - `topic-matcher.ts` - 专题匹配逻辑
- **组件化设计**：UI 组件在 `components/` 目录
  - 可复用组件（如 `ReportView`, `Sidebar`, `TopicBadge`）
  - UI 基础组件在 `components/ui/` 目录
- **数据存储**：使用 JSON 文件存储
  - `data/reports/` - 每日报告（格式：`YYYY-MM-DD.json`）
  - `data/sources.json` - RSS 源配置
  - `data/topics.json` - 专题配置
- **图标缓存**：服务端缓存机制
  - API 路由 `/api/icon` 处理图标获取和缓存
  - 缓存文件存储在 `public/icons/` 目录
  - 使用 MD5 哈希作为文件名

### Testing Strategy
- **当前状态**：使用测试脚本进行功能验证
  - `scripts/test-*.ts` - 各种功能测试脚本
  - 包括性能测试、翻译测试、Twitter 集成测试等
- **测试脚本**：
  - `test-aggregate.ts` - 聚合功能测试
  - `test-performance.ts` - 性能测试
  - `test-translation.ts` - 翻译功能测试
  - `test-twitter.ts` - Twitter 集成测试
  - `test-wechat.ts` - 微信爬虫测试
- **未来计划**：可考虑添加正式的单元测试框架（如 Jest/Vitest）

### Git Workflow
- **分支策略**：使用 `main` 分支作为主分支
- **提交约定**：建议使用清晰的提交信息描述更改内容
- **文件组织**：通过 `.gitignore` 排除构建产物和敏感文件

## Domain Context
- **新闻聚合流程**：
  1. 从 `data/sources.json` 加载 RSS 源配置（17+ 个源）
  2. 随机打乱源顺序以避免重复模式
  3. 每个源最多抓取 3 条新闻，RSS 超时设置为 8 秒
  4. 尝试从 Twitter/X.com 和微信公众号获取内容（可选）
  5. 按日期过滤，只保留最近 24 小时内的新闻
- **翻译机制**：
  - 批量并行处理，每批 3 条（受 API 并发限制）
  - 批次间延迟 0.5 秒以避免速率限制
  - 使用 AI 模型生成中文标题、摘要、市场反应和评论
  - 摘要中使用双星号 `**` 高亮关键术语和数字
- **专题匹配系统**：
  - 从 `data/topics.json` 加载专题配置
  - 每个专题包含关键词列表和颜色标识
  - 新闻标题和摘要匹配关键词后自动关联专题
  - 在 UI 中显示专题徽章（`TopicBadge` 组件）
- **图标缓存系统**：
  - 使用 Google Favicon API 获取网站图标
  - 服务端缓存到 `public/icons/` 目录
  - 使用域名 MD5 哈希作为文件名
  - 缓存有效期 1 年
  - 提供预加载脚本 `scripts/preload-icons.ts`
- **性能优化**：
  - RSS 超时从 60 秒优化到 8 秒
  - 翻译从串行改为批量并行（3 条/批）
  - 每源限制 3 条减少冗余
  - 实际性能：29 条新闻约 141 秒（抓取 39 秒 + 翻译 102 秒）
- **数据格式**：
  - `DailyReport` 包含日期、标题、新闻项列表和短新闻列表
  - `NewsItem` 包含标题、分类、摘要、市场反应、评论、URL、热度指数等
  - 支持分类：AI、Technology、US Stocks、US Economy、Other

## Important Constraints
- **API 并发限制**：
  - Kimi API 最多支持 3 个并发请求
  - 解决方案：批处理大小设为 3，批次间延迟 0.5 秒
- **API 速率限制**：
  - 偶尔出现 429 错误（速率限制）
  - 已实现自动重试机制
- **Twitter/X.com 访问限制**：
  - Twitter 要求登录才能查看内容
  - 当前状态：跳过 Twitter 抓取，不影响其他源
  - 可选方案：使用付费 Twitter API（$100/月）
- **RSS 源限制**：
  - 每个源最多抓取 3 条新闻
  - RSS 请求超时 8 秒
  - 失败时静默跳过，继续处理其他源
- **翻译质量要求**：
  - 必须保持准确性，不能为了速度牺牲质量
  - 摘要至少 100 字，包含关键事实和背景
- **数据存储**：
  - 使用 JSON 文件存储，不适合大规模数据
  - 未来可能需要迁移到数据库

## External Dependencies
- **AI 翻译服务**：
  - **Kimi (Moonshot) API**（优先）：`https://api.moonshot.cn/v1`，模型 `moonshot-v1-8k`
  - **OpenAI API**（回退）：模型 `gpt-4o`
  - 环境变量：`KIMI_API_KEY` 或 `OPENAI_API_KEY`
- **社交媒体 API**：
  - **Twitter/X.com API v2**：需要 Bearer Token
  - 环境变量：`TWITTER_BEARER_TOKEN`
  - 当前状态：由于访问限制，主要使用 RSS 源
- **图标服务**：
  - **Google Favicon API**：`https://www.google.com/s2/favicons?domain=`
  - 用于获取网站 favicon，服务端缓存
- **RSS 源**（17+ 个）：
  - AI 类：AI News, VentureBeat AI, TechCrunch AI, The Verge AI 等
  - 技术类：TechCrunch, The Verge, Wired, Ars Technica 等
  - 财经类：Yahoo Finance, CNBC, MarketWatch, Investing.com 等
  - 配置在 `data/sources.json`
- **定时任务**：
  - **macOS LaunchAgent**：使用 `com.user.newsaggregator.plist` 配置
  - 默认每天 10:00 AM 执行聚合
  - 通过 `npx tsx scripts/run-daily.ts` 执行
- **浏览器自动化**：
  - Puppeteer/Playwright 用于 Twitter 和微信爬虫
  - 需要安装 Chromium（Puppeteer 自动安装）
