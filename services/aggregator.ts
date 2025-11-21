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

// Levenshtein distance for string similarity
function levenshtein(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

function isSimilar(title1: string, title2: string, threshold: number = 0.8): boolean {
    const t1 = title1.toLowerCase();
    const t2 = title2.toLowerCase();
    const distance = levenshtein(t1, t2);
    const maxLength = Math.max(t1.length, t2.length);
    if (maxLength === 0) return true;
    const similarity = 1 - distance / maxLength;
    return similarity >= threshold;
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

    // --- Load Existing Report for Incremental Update ---
    const reportDate = dateStr || new Date().toISOString().split('T')[0];
    const reportsDir = path.join(process.cwd(), 'data', 'reports');
    const reportPath = path.join(reportsDir, `${reportDate}.json`);

    let existingItems: NewsItem[] = [];
    if (fs.existsSync(reportPath)) {
        try {
            const existingReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
            if (existingReport.items && Array.isArray(existingReport.items)) {
                existingItems = existingReport.items;
                console.log(`Found existing report with ${existingItems.length} items.`);
            }
        } catch (e) {
            console.error('Error reading existing report:', e);
        }
    }

    // --- Smart Deduplication ---
    const newItems = newsItems.filter(item => {
        const isDuplicate = existingItems.some(existing => {
            // 1. Exact URL match
            if (existing.url === item.url) return true;

            // 2. Title similarity
            // item.title is English (raw)
            // existing.originalTitle is English (if available), existing.title is Chinese
            const existingOriginalTitle = existing.originalTitle || existing.title;

            if (isSimilar(existingOriginalTitle, item.title)) {
                console.log(`Duplicate skipped (similarity): "${item.title}" vs "${existingOriginalTitle}"`);
                return true;
            }
            return false;
        });
        return !isDuplicate;
    });

    console.log(`New items to process: ${newItems.length}`);

    let finalItems = existingItems;

    if (newItems.length > 0) {
        await updateProgress('translating', 0, newItems.length, `发现 ${newItems.length} 条新内容，开始翻译...`);

        // Translate ONLY new items
        const translatedNewItems = await translateBatch(newItems, 3);

        const translateTime = Date.now();
        console.log(`✓ 新内容翻译完成 (耗时: ${((translateTime - fetchTime) / 1000).toFixed(1)}秒)`);

        // Apply topic matching to new items
        const { applyTopicMatching } = await import('./topic-matcher');
        const enhancedNewItems = applyTopicMatching(translatedNewItems);
        console.log(`✓ 新内容专题匹配完成`);

        // Merge: New items on top? Or append? 
        // Usually users want to see new stuff, but if we sort by heat/read status later, order here matters less.
        // Let's append new items to the list, but maybe we should re-sort everything?
        // For now, just merge.
        finalItems = [...existingItems, ...enhancedNewItems];
    } else {
        console.log('No new items found.');
        await updateProgress('translating', 0, 0, '没有发现新内容，跳过翻译...');
    }

    await updateProgress('saving', finalItems.length, finalItems.length, '正在保存报告...');

    const report: DailyReport = {
        id: reportDate,
        date: reportDate,
        title: `${reportDate} AI和科技新闻整理`,
        items: finalItems,
        shorts: [],
        createdAt: new Date().toISOString() // Update timestamp
    };

    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    const totalTime = Date.now();
    console.log(`✓ 报告已保存: ${reportPath}`);
    console.log(`总耗时: ${((totalTime - startTime) / 1000).toFixed(1)}秒`);

    await updateProgress('complete', finalItems.length, finalItems.length, `报告生成完成！共 ${finalItems.length} 条新闻`);

    return report;
}
