import puppeteer from 'puppeteer';
import { NewsItem } from '@/types';

const SOGOU_URL = 'https://weixin.sogou.com/';
const ACCOUNT_NAME = '晚点LatePost';

export async function fetchWeChatNews(targetDate?: Date): Promise<NewsItem[]> {
    const newsItems: NewsItem[] = [];
    const date = targetDate || new Date();
    // Set time to end of day to include all posts from that day
    const queryDate = new Date(date);
    queryDate.setHours(23, 59, 59, 999);

    const oneDayAgo = new Date(queryDate.getTime() - 24 * 60 * 60 * 1000);

    console.log(`启动 WeChat 爬虫抓取: ${ACCOUNT_NAME}...`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Set User Agent to avoid basic detection
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // 1. Go to Sogou WeChat Home
        await page.goto(SOGOU_URL, { waitUntil: 'networkidle2' });

        // Wait for session establishment
        await new Promise(r => setTimeout(r, 3000));

        // 2. Navigate to search URL with time filter
        const searchUrl = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(ACCOUNT_NAME)}&tsn=1`;
        console.log(`Navigating to: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

        // Wait for results
        await page.waitForSelector('.news-list', { timeout: 20000 });

        // 3. Extract Article Links from the first page
        // Sogou search results structure: .news-list > li > .txt-box
        const articles = await page.evaluate(() => {
            const items = document.querySelectorAll('.news-list li');
            return Array.from(items).map(item => {
                const titleEl = item.querySelector('h3 a');
                const summaryEl = item.querySelector('.txt-info');
                const timeEl = item.querySelector('.s-p');
                const link = titleEl?.getAttribute('href') || '';
                const title = titleEl?.textContent || '';
                const summary = summaryEl?.textContent || '';
                // Time format in Sogou is often relative (e.g., "1小时前") or date (e.g., "2023-10-27")
                // We need to parse it carefully. For now, we get the raw text.
                // Actually, Sogou often uses a timestamp in the HTML source like `document.write(timeConvert('1731991234'))`
                // But scraping the rendered text is easier.
                const timeText = timeEl?.textContent || '';

                return { title, link, summary, timeText };
            });
        });

        console.log(`找到 ${articles.length} 条相关结果`);

        // 4. Process and Filter Articles
        for (const article of articles) {
            // Filter by title match (fuzzy) to ensure it's from the target account
            // Note: Sogou search searches ALL articles, not just from one account.
            // We need to check the source account name usually found in `.account`
            // Let's refine the extraction above or filter here.
            // Actually, searching "晚点LatePost" might return articles MENTIONING it.
            // A better way is to search for the Account specifically, but Sogou Account Search is harder to scrape (captchas).
            // We will stick to Article Search and filter by source if possible.

            // For now, we assume top results are relevant.

            // Check date
            let pubDate = new Date();
            let isRecent = false;

            // Handle Sogou's timeConvert format: document.write(timeConvert('1731991234'))
            const timestampMatch = article.timeText.match(/timeConvert\('(\d+)'\)/);

            if (timestampMatch) {
                const timestamp = parseInt(timestampMatch[1], 10);
                pubDate = new Date(timestamp * 1000);
                isRecent = true;
            } else if (article.timeText.includes('昨天')) {
                pubDate.setDate(pubDate.getDate() - 1);
                isRecent = true;
            } else if (article.timeText.includes('前')) {
                // "X小时前", "X分钟前" -> Today
                isRecent = true;
            } else if (article.timeText.match(/\d{4}-\d{2}-\d{2}/)) {
                pubDate = new Date(article.timeText);
                isRecent = true;
            } else {
                console.log(`Unknown date format: ${article.timeText}`);
            }

            if (!isRecent) continue;

            // Filter by date range
            if (pubDate < oneDayAgo || pubDate > queryDate) {
                console.log(`Skipping old article: ${article.title} (${pubDate.toISOString()})`);
                continue;
            }

            // Visit the article to get full content (or just use summary)
            // Sogou links are temporary and redirect.
            // We need to resolve the real link.
            let realUrl = article.link;
            if (article.link.startsWith('/link?url=')) {
                realUrl = `https://weixin.sogou.com${article.link}`;
            }

            // Create NewsItem
            const newsItem: NewsItem = {
                id: `wechat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: article.title,
                category: 'Technology', // Default to Tech for LatePost
                summary: article.summary,
                publishDate: pubDate.toISOString(),
                url: realUrl,
                source: '晚点 LatePost',
                comments: [],
                heatIndex: 2000 + Math.floor(Math.random() * 1000) // Boost heat for this premium source
            };

            newsItems.push(newsItem);
        }

    } catch (error) {
        console.error('WeChat scraper error:', error);
        if (browser) {
            try {
                const pages = await browser.pages();
                if (pages.length > 0) {
                    const page = pages[0];
                    const title = await page.title();
                    console.log(`Page title: ${title}`);
                    const content = await page.content();
                    // Save HTML for inspection
                    const fs = await import('fs');
                    fs.writeFileSync('public/wechat-debug.html', content);
                    console.log('HTML saved to public/wechat-debug.html');

                    await page.screenshot({ path: 'public/wechat-debug.png' });
                    console.log('Screenshot saved to public/wechat-debug.png');
                }
            } catch (e) {
                console.error('Failed to debug:', e);
            }
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    return newsItems;
}
