import Parser from 'rss-parser';

const parser = new Parser();

const sources = [
    { name: '36Kr', url: 'https://36kr.com/feed' },
    { name: 'Huxiu', url: 'https://www.huxiu.com/rss/0.xml' }
];

async function testSources() {
    console.log('Testing new sources...');

    for (const source of sources) {
        try {
            console.log(`\nFetching ${source.name} (${source.url})...`);
            const feed = await parser.parseURL(source.url);
            console.log(`✅ Success! Found ${feed.items.length} items.`);
            if (feed.items.length > 0) {
                console.log('Latest item:', feed.items[0].title);
                console.log('PubDate:', feed.items[0].pubDate);
            }
        } catch (error: any) {
            console.error(`❌ Failed to fetch ${source.name}:`, error.message);
        }
    }
}

testSources();
