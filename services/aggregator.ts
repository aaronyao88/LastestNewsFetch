import { fetchNews } from './fetcher';
import { translateNewsItem } from './translator';
import { DailyReport, NewsItem } from '@/types';
import fs from 'fs';
import path from 'path';

async function updateProgress(status: string, current: number, total: number, message: string) {
    try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/aggregate/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, current, total, message })
        });
    } catch (error) {
        // Silently fail if progress update fails
    }
}

// 批量翻译 - 并行处理以提高速度
async function translateBatch(items: NewsItem[], batchSize: number = 5): Promise<NewsItem[]> {
    const results: NewsItem[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchPromises = batch.map(item => translateNewsItem(item));

        // 并行处理当前批次
        const translatedBatch = await Promise.all(batchPromises);
        results.push(...translatedBatch);

        // 更新进度
        await updateProgress(
            'translating',
            Math.min(i + batchSize, items.length),
            items.length,
            `正在处理第 ${Math.min(i + batchSize, items.length)}/${items.length} 条新闻...`
        );

        // 小延迟避免API限流
        if (i + batchSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return results;
}

export async function runAggregation(dateStr?: string) {
    const startTime = Date.now();
    console.log(`开始聚合新闻，日期: ${dateStr || '今天'}...`);

    await updateProgress('fetching', 0, 100, '正在抓取新闻源...');

    // Parse date or use today
    let targetDate = new Date();
    if (dateStr) {
        targetDate = new Date(dateStr);
        targetDate.setHours(23, 59, 59, 999);
    }

    const newsItems = await fetchNews(targetDate);
    const fetchTime = Date.now();
    console.log(`✓ 抓取完成: ${newsItems.length} 条新闻 (耗时: ${((fetchTime - startTime) / 1000).toFixed(1)}秒)`);

    await updateProgress('translating', 0, newsItems.length, `已抓取 ${newsItems.length} 条新闻，开始翻译...`);

    // 使用批量并行翻译 (Kimi API 限制并发为3)
    const translatedItems = await translateBatch(newsItems, 3); // 每批3条并行处理

    const translateTime = Date.now();
    console.log(`✓ 翻译完成 (耗时: ${((translateTime - fetchTime) / 1000).toFixed(1)}秒)`);

    // 应用专题匹配和热度提升
    const { applyTopicMatching } = await import('./topic-matcher');
    const enhancedItems = applyTopicMatching(translatedItems);
    console.log(`✓ 专题匹配完成`);

    await updateProgress('saving', newsItems.length, newsItems.length, '正在保存报告...');

    const reportDate = dateStr || new Date().toISOString().split('T')[0];
    const report: DailyReport = {
        id: reportDate,
        date: reportDate,
        title: `${reportDate} AI和科技新闻整理`,
        items: enhancedItems,
        shorts: [],
        createdAt: new Date().toISOString()
    };

    const reportsDir = path.join(process.cwd(), 'data', 'reports');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, `${reportDate}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    const totalTime = Date.now();
    console.log(`✓ 报告已保存: ${reportPath}`);
    console.log(`总耗时: ${((totalTime - startTime) / 1000).toFixed(1)}秒`);

    await updateProgress('complete', newsItems.length, newsItems.length, '报告生成完成！');

    return report;
}
