import { fetchWeChatNews } from '../services/wechat-fetcher';

async function test() {
    try {
        console.log('Testing WeChat Scraper...');
        const items = await fetchWeChatNews('LatePost');
        console.log('Scraping result:');
        console.log(JSON.stringify(items, null, 2));

        if (items.length > 0) {
            console.log('SUCCESS: Found articles.');
        } else {
            console.log('WARNING: No articles found. Might be blocked or empty.');
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
