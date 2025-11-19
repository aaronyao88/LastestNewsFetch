import { fetchWeChatNews } from '../services/wechat-fetcher';

async function test() {
    console.log('Testing WeChat Fetcher...');
    try {
        const items = await fetchWeChatNews();
        console.log(`\nSuccessfully fetched ${items.length} items:`);
        items.forEach((item, index) => {
            console.log(`\n[${index + 1}] ${item.title}`);
            console.log(`    Date: ${item.publishDate}`);
            console.log(`    Link: ${item.url}`);
            console.log(`    Summary: ${item.summary.substring(0, 50)}...`);
        });
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
