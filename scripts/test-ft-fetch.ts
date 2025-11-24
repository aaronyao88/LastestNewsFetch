import Parser from 'rss-parser';
import { fetchPageContent } from '@/lib/search-tool';

const parser = new Parser({
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache'
    }
});

async function testFTRSS() {
    const url = 'http://www.ft.com/rss/home';
    console.log('Testing FT RSS fetch with Puppeteer fallback...');
    console.log('URL:', url);
    console.log('='.repeat(60));

    try {
        console.log('\n[Method 1] Trying rss-parser.parseURL...');
        const feed = await parser.parseURL(url);
        console.log('✅ Success with parseURL!');
        console.log(`  Title: ${feed.title}`);
        console.log(`  Items: ${feed.items.length}`);
        return feed;
    } catch (err) {
        console.log(`❌ parseURL failed: ${err instanceof Error ? err.message : String(err)}`);
        
        try {
            console.log('\n[Method 2] Trying Puppeteer fallback...');
            const content = await fetchPageContent(url);
            console.log(`  Fetched content length: ${content.length} bytes`);
            
            const feed = await parser.parseString(content);
            console.log('✅ Success with Puppeteer!');
            console.log(`  Title: ${feed.title}`);
            console.log(`  Items: ${feed.items.length}`);
            
            if (feed.items.length > 0) {
                console.log('\nSample items:');
                feed.items.slice(0, 3).forEach((item, i) => {
                    console.log(`  ${i+1}. ${item.title}`);
                });
            }
            
            return feed;
        } catch (err2) {
            console.log(`❌ Puppeteer also failed: ${err2 instanceof Error ? err2.message : String(err2)}`);
            throw err2;
        }
    }
}

testFTRSS()
    .then(() => {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Test failed:', err.message);
        process.exit(1);
    });

