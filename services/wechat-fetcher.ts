import puppeteer from 'puppeteer';
import { NewsItem, Category } from '@/types';

import fs from 'fs';
import path from 'path';

const SOGOU_SEARCH_URL = 'https://weixin.sogou.com/weixin?type=1&query=';

export async function fetchWeChatNews(accountName: string = '晚点 LatePost'): Promise<NewsItem[]> {
    console.log(`开始抓取微信公众号: ${accountName}`);
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const newsItems: NewsItem[] = [];

    try {
        const page = await browser.newPage();
        // Set a realistic user agent to avoid immediate blocking
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // 1. Search for the official account
        const searchUrl = `${SOGOU_SEARCH_URL}${encodeURIComponent(accountName)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });

        // Check for CAPTCHA
        const content = await page.content();
        if (content.includes('antispider') || content.includes('验证码')) {
            console.warn('WeChat Scraper: Encountered CAPTCHA on search page. Skipping.');
            await browser.close();
            return [];
        }

        // 2. Find the first result (the official account) and click it
        // Note: Sogou search results for official accounts usually have a link to the profile
        // The selector might change, but usually it's in the news list
        const accountLinkSelector = '.news-box .tit a';
        // Wait for selector to ensure page is loaded
        try {
            await page.waitForSelector('.news-box', { timeout: 5000 });
        } catch (e) {
            console.log('Timeout waiting for .news-box');
        }

        const accountLink = await page.$(accountLinkSelector);

        if (!accountLink) {
            console.warn(`WeChat Scraper: Could not find account link for ${accountName}`);
            // Debug: save screenshot and html
            await page.screenshot({ path: 'wechat-debug.png' });
            const html = await page.content();
            fs.writeFileSync('wechat-debug.html', html);
            console.log('Saved debug info to wechat-debug.png and wechat-debug.html');

            await browser.close();
            return [];
        }

        // Get the href
        const profileUrl = await page.evaluate(el => el.href, accountLink);
        console.log(`Found profile URL: ${profileUrl}`);

        // Navigate to profile page
        await page.goto(profileUrl, { waitUntil: 'networkidle2' });

        // 3. Extract articles from the profile page
        // The structure of the profile page (history messages) is complex and dynamic.
        // Often it renders via JS.

        // Wait for the article list to load
        // Common classes for wechat history: .weui_media_box, .msg_item
        try {
            await page.waitForSelector('.weui_media_box, .msg_item', { timeout: 5000 });
        } catch (e) {
            console.log('Timeout waiting for article list, page might be different or empty.');
        }

        const articles = await page.evaluate(() => {
            const items: any[] = [];
            // Try to find message items
            const elements = document.querySelectorAll('.weui_media_box.appmsg, .msg_item');

            elements.forEach((el) => {
                const titleEl = el.querySelector('.weui_media_title, .msg_title');
                const linkEl = el.querySelector('.title_js, .msg_title'); // Sometimes the title itself is the link or parent
                const dateEl = el.querySelector('.weui_media_extra_info, .msg_date');
                const descEl = el.querySelector('.weui_media_desc, .msg_desc');

                // Get URL. In some versions, the whole box is clickable or url is in data-msgid
                // Often the url is in 'hrefs' variable in script or directly on the title
                let url = '';
                if (titleEl && titleEl.getAttribute('hrefs')) {
                    url = titleEl.getAttribute('hrefs') || '';
                } else if (linkEl && linkEl.getAttribute('href')) {
                    url = linkEl.getAttribute('href') || '';
                } else {
                    // Try to find any 'a' tag with href
                    const aTag = el.querySelector('a');
                    if (aTag) url = aTag.href;
                }

                if (!url.startsWith('http')) {
                    url = 'https://mp.weixin.qq.com' + url;
                }

                const title = titleEl?.textContent?.trim() || '';
                const summary = descEl?.textContent?.trim() || title;
                const dateStr = dateEl?.textContent?.trim() || ''; // Often "Yesterday", "Today", or date

                if (title && url) {
                    items.push({
                        title,
                        url,
                        summary,
                        dateStr
                    });
                }
            });
            return items;
        });

        console.log(`Found ${articles.length} articles`);

        // Process articles
        for (const article of articles.slice(0, 3)) { // Limit to 3
            // Parse date (simplified)
            let pubDate = new Date();
            if (article.dateStr.includes('昨天')) {
                pubDate.setDate(pubDate.getDate() - 1);
            } else if (article.dateStr.includes('前天')) {
                pubDate.setDate(pubDate.getDate() - 2);
            } else if (article.dateStr.match(/\d{4}年\d{1,2}月\d{1,2}日/)) {
                // Parse standard date format if present
                // This is tricky without a library, assuming recent
            }

            // If we need content, we might need to visit the page. 
            // For now, use summary.

            newsItems.push({
                id: `wechat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: article.title,
                category: 'technology' as Category, // Default to technology
                summary: article.summary,
                publishDate: pubDate.toISOString(),
                url: article.url,
                source: 'WeChat - ' + accountName,
                comments: [],
                heatIndex: 1000 // Default heat
            });
        }

    } catch (error) {
        console.error('Error scraping WeChat:', error);
    } finally {
        await browser.close();
    }

    return newsItems;
}
