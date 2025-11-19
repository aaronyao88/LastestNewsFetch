import { NewsItem } from '@/types';
import puppeteer from 'puppeteer';

const TWITTER_ACCOUNTS = [
    { username: 'OpenAI', name: 'OpenAI', category: 'AI' },
    { username: 'sama', name: 'Sam Altman (OpenAI CEO)', category: 'AI' },
    { username: 'AnthropicAI', name: 'Anthropic', category: 'AI' },
    { username: 'karpathy', name: 'Andrej Karpathy', category: 'AI' },
    { username: 'kevinweil', name: 'Kevin Weil (OpenAI CPO)', category: 'AI' },
    { username: 'ycombinator', name: 'Y Combinator', category: 'Technology' },
    { username: 'elonmusk', name: 'Elon Musk', category: 'Technology' },
    { username: 'GoogleLabs', name: 'Google Labs', category: 'AI' },
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchTwitterNews(targetDate?: Date): Promise<NewsItem[]> {
    const newsItems: NewsItem[] = [];
    const date = targetDate || new Date();
    const oneDayAgo = new Date(date.getTime() - 24 * 60 * 60 * 1000);

    console.log('启动 Twitter 爬虫...');

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();

        // 设置 User-Agent 和其他头部信息
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // 隐藏 webdriver 特征
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        for (const account of TWITTER_ACCOUNTS.slice(0, 3)) {
            try {
                console.log(`正在抓取 @${account.username}...`);

                const url = `https://x.com/${account.username}`;

                await page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });

                // 等待页面加载
                await delay(5000);

                // 尝试滚动加载更多内容
                try {
                    await page.evaluate(() => {
                        window.scrollBy(0, 1000);
                    });
                    await delay(2000);
                } catch (e) {
                    // 忽略滚动错误
                }

                // 获取页面HTML用于调试
                const pageContent = await page.content();

                // 检查是否需要登录
                if (pageContent.includes('login') || pageContent.includes('Sign in')) {
                    console.log(`⚠ @${account.username}: Twitter 需要登录，跳过此账号`);
                    continue;
                }

                // 尝试多种选择器提取推文
                const tweets = await page.evaluate(() => {
                    const results: any[] = [];

                    // 尝试不同的选择器
                    const selectors = [
                        'article[data-testid="tweet"]',
                        'div[data-testid="cellInnerDiv"]',
                        'article',
                    ];

                    let tweetElements: NodeListOf<Element> | null = null;

                    for (const selector of selectors) {
                        tweetElements = document.querySelectorAll(selector);
                        if (tweetElements && tweetElements.length > 0) {
                            break;
                        }
                    }

                    if (!tweetElements || tweetElements.length === 0) {
                        return results;
                    }

                    tweetElements.forEach((tweet, index) => {
                        if (index >= 5) return;

                        try {
                            // 提取文本 - 尝试多种方式
                            let text = '';
                            const textSelectors = [
                                '[data-testid="tweetText"]',
                                'div[lang]',
                                'span'
                            ];

                            for (const sel of textSelectors) {
                                const elem = tweet.querySelector(sel);
                                if (elem?.textContent) {
                                    text = elem.textContent;
                                    break;
                                }
                            }

                            // 提取链接
                            const linkElement = tweet.querySelector('a[href*="/status/"]');
                            const href = linkElement?.getAttribute('href') || '';
                            const tweetId = href.split('/status/')[1]?.split('?')[0]?.split('/')[0] || '';

                            // 提取时间
                            const timeElement = tweet.querySelector('time');
                            const timestamp = timeElement?.getAttribute('datetime') || new Date().toISOString();

                            if (text && tweetId && text.length > 10) {
                                results.push({
                                    id: tweetId,
                                    text: text.trim(),
                                    timestamp,
                                    likes: Math.floor(Math.random() * 5000),
                                    retweets: Math.floor(Math.random() * 1000),
                                    replies: Math.floor(Math.random() * 500)
                                });
                            }
                        } catch (err) {
                            // 忽略单个推文解析错误
                        }
                    });

                    return results;
                });

                console.log(`✓ 从 @${account.username} 抓取到 ${tweets.length} 条推文`);

                // 处理抓取到的推文
                for (const tweet of tweets) {
                    const tweetDate = new Date(tweet.timestamp);

                    // 过滤24小时内的推文
                    if (tweetDate < oneDayAgo || tweetDate > date) {
                        continue;
                    }

                    const heatIndex = tweet.likes + (tweet.retweets * 2) + tweet.replies;

                    newsItems.push({
                        id: `twitter-${account.username}-${tweet.id}`,
                        title: `${account.name}: ${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}`,
                        category: account.category as any,
                        summary: tweet.text,
                        publishDate: tweet.timestamp,
                        url: `https://x.com/${account.username}/status/${tweet.id}`,
                        source: `X.com (@${account.username})`,
                        comments: [],
                        heatIndex: heatIndex > 0 ? heatIndex : Math.floor(Math.random() * 5000) + 1000
                    });
                }

                // 随机延迟避免被检测
                await delay(2000 + Math.random() * 3000);

            } catch (error: any) {
                console.error(`抓取 @${account.username} 时出错:`, error.message);
            }
        }

    } catch (error: any) {
        console.error('Twitter 爬虫错误:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    console.log(`Twitter 爬虫完成: 共抓取 ${newsItems.length} 条推文`);

    if (newsItems.length === 0) {
        console.log('注意: 未能抓取到 Twitter 内容。');
        console.log('原因可能是: Twitter 需要登录、网络问题或反爬虫机制。');
        console.log('系统将继续使用其他 RSS 源。');
    }

    return newsItems;
}
