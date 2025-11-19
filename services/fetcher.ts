import Parser from 'rss-parser';
import { NewsItem, Category } from '@/types';
import fs from 'fs';
import path from 'path';
import { fetchTwitterNews } from './twitter-fetcher';

const parser = new Parser({
    timeout: 8000, // 8秒超时
    headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)'
    }
});

interface RSSFeed {
    url: string;
    category: string;
    source: string;
}

function loadSources(): RSSFeed[] {
    try {
        const sourcesPath = path.join(process.cwd(), 'data', 'sources.json');
        if (fs.existsSync(sourcesPath)) {
            const data = fs.readFileSync(sourcesPath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading sources:', error);
    }
    return [];
}

const MAX_ITEMS_PER_FEED = 3; // 每个源最多取3条

export async function fetchNews(targetDate?: Date): Promise<NewsItem[]> {
    const newsItems: NewsItem[] = [];
    const categoryCounts: Record<string, number> = {};

    const date = targetDate || new Date();
    const oneDayAgo = new Date(date.getTime() - 24 * 60 * 60 * 1000);

    // Load sources from JSON file
    const RSS_FEEDS = loadSources();
    const shuffledFeeds = [...RSS_FEEDS].sort(() => Math.random() - 0.5);

    console.log(`开始抓取 ${shuffledFeeds.length} 个 RSS 源...`);

    for (const feed of shuffledFeeds) {
        try {
            const rssFeed = await parser.parseURL(feed.url);
            let itemCount = 0;

            for (const item of rssFeed.items || []) {
                // 限制每个源的数量
                if (itemCount >= MAX_ITEMS_PER_FEED) break;

                const pubDate = item.pubDate ? new Date(item.pubDate) : null;
                if (!pubDate || pubDate < oneDayAgo || pubDate > date) {
                    continue;
                }

                const newsItem: NewsItem = {
                    id: item.guid || item.link || `${feed.source}-${Date.now()}`,
                    title: item.title || 'No title',
                    category: feed.category as Category,
                    summary: item.contentSnippet || item.content || item.title || 'No summary available',
                    publishDate: pubDate.toISOString(),
                    url: item.link || '',
                    source: feed.source,
                    comments: [],
                    heatIndex: Math.floor(Math.random() * 10000) + 1000
                };

                // 简单去重
                const isDuplicate = newsItems.some(existing =>
                    existing.url === newsItem.url || existing.title === newsItem.title
                );

                if (!isDuplicate) {
                    newsItems.push(newsItem);
                    categoryCounts[feed.category] = (categoryCounts[feed.category] || 0) + 1;
                    itemCount++;
                }
            }
        } catch (error: any) {
            // 静默失败，继续处理其他源
            console.log(`跳过 ${feed.source}: ${error.message}`);
        }
    }

    console.log('RSS 抓取完成，各分类数量:', categoryCounts);

    // Fetch from Twitter/X.com
    console.log('正在抓取 Twitter...');
    const twitterItems = await fetchTwitterNews(targetDate);
    console.log(`Twitter 抓取完成: ${twitterItems.length} 条`);

    // Merge Twitter items
    newsItems.push(...twitterItems);

    return newsItems;
}
