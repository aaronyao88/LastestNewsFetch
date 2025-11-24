import Parser from 'rss-parser';
import { NewsItem, Category } from '@/types';
import fs from 'fs';
import path from 'path';
import { fetchPageContent } from '@/lib/search-tool';
// import { fetchWeChatNews } from './wechat-fetcher';
// import { fetchTwitterNews } from './twitter-fetcher';

const parser = new Parser({
    timeout: 15000, // 15秒超时 - 某些网站需要更长时间
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache'
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

// Helper function to fetch RSS with retries and fallback
export async function fetchRSSWithRetry(url: string, maxRetries: number = 2): Promise<any> {
    let lastError: Error | null = null;

    // Try with parser first (multiple attempts)
    for (let i = 0; i < maxRetries; i++) {
        try {
            const feed = await parser.parseURL(url);
            return feed;
        } catch (error) {
            lastError = error as Error;
            const errorMsg = error instanceof Error ? error.message : String(error);

            // If it's a network error (ECONNRESET, timeout), retry
            if (errorMsg.includes('ECONNRESET') || errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
                console.log(`  Retry ${i + 1}/${maxRetries} for ${url}...`);
                // Wait a bit before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }

            // For other errors, log and break to try fallbacks
            console.log(`  Parser error for ${url}: ${errorMsg}. Proceeding to fallbacks...`);
            break;
        }
    }

    // Fallback 1: Try using fetch
    try {
        console.log(`  Using fetch fallback for ${url}...`);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(20000) // 20 second timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();
        const feed = await parser.parseString(text);
        console.log(`  ✓ Fetch fallback succeeded for ${url}`);
        return feed;
    } catch (fetchError) {
        console.log(`  Fetch fallback failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
    }

    // Fallback 2: Try using Puppeteer (for sites that block bots)
    try {
        console.log(`  Using Puppeteer fallback for ${url}...`);
        let content = await fetchPageContent(url);

        // Clean content: remove BOM and trim
        content = content.replace(/^\uFEFF/, '').trim();

        console.log(`  Puppeteer content preview: ${content.substring(0, 100).replace(/\n/g, '\\n')}`);

        const feed = await parser.parseString(content);
        if (feed && feed.items && feed.items.length > 0) {
            console.log(`  ✓ Puppeteer fallback succeeded for ${url} (${feed.items.length} items)`);
            return feed;
        } else {
            throw new Error('No items found in feed');
        }
    } catch (puppeteerError) {
        console.log(`  Puppeteer fallback also failed: ${puppeteerError instanceof Error ? puppeteerError.message : String(puppeteerError)}`);
        throw lastError || puppeteerError;
    }
}

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
            const rssFeed = await fetchRSSWithRetry(feed.url);
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

    // Fetch from Twitter/X.com (Disabled due to login requirements)
    // console.log('正在抓取 Twitter...');
    // const twitterItems = await fetchTwitterNews(targetDate);
    // console.log(`Twitter 抓取完成: ${twitterItems.length} 条`);

    // Merge Twitter items
    // newsItems.push(...twitterItems);

    // Fetch from WeChat (Disabled - unreliable due to anti-scraping measures)
    // try {
    //     console.log('正在抓取微信公众号...');
    //     const wechatItems = await fetchWeChatNews('晚点LatePost');
    //     console.log(`微信抓取完成: ${wechatItems.length} 条`);
    //     newsItems.push(...wechatItems);
    // } catch (error) {
    //     console.error('微信抓取失败:', error);
    // }

    return newsItems;
}
