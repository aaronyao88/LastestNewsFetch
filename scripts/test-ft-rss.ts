import Parser from 'rss-parser';
import { fetchPageContent } from '@/lib/search-tool';

// Helper function to normalize URL (handle http -> https redirects)
function normalizeUrl(url: string): string[] {
    const urls = [url];
    // If URL is http, also try https version
    if (url.startsWith('http://')) {
        urls.push(url.replace('http://', 'https://'));
    }
    // If URL is https, also try http version
    if (url.startsWith('https://')) {
        urls.push(url.replace('https://', 'http://'));
    }
    return urls;
}

// Helper function to validate RSS feed with direct fetch
async function validateWithFetch(url: string, parser: Parser): Promise<{ feed: any; success: boolean }> {
    try {
        console.log(`  [Fetch] Attempting to fetch ${url}...`);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache'
            },
            redirect: 'follow', // Follow redirects
            signal: AbortSignal.timeout(15000) // 15 second timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        console.log(`  [Fetch] Content-Type: ${contentType}`);
        
        if (!contentType.includes('xml') && !contentType.includes('rss') && !contentType.includes('atom')) {
            console.log(`  [Fetch] Warning: Unexpected content-type, attempting to parse anyway`);
        }

        const text = await response.text();
        console.log(`  [Fetch] Response length: ${text.length} bytes`);
        
        if (!text || text.trim().length === 0) {
            throw new Error('Empty response');
        }

        const feed = await parser.parseString(text);
        console.log(`  [Fetch] ✅ Parse successful! Title: ${feed.title}, Items: ${feed.items?.length || 0}`);
        return { feed, success: true };
    } catch (e) {
        console.log(`  [Fetch] ❌ Failed: ${e instanceof Error ? e.message : String(e)}`);
        return { feed: null, success: false };
    }
}

async function testFTValidation() {
    const testUrl = 'http://www.ft.com/rss/home';
    console.log(`\n🧪 Testing RSS Validation for: ${testUrl}\n`);
    console.log('='.repeat(60));

    const parser = new Parser({
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br'
        }
    });

    let validUrl: string | null = null;
    let sourceName = 'FT.com';
    let category = 'Other';

    // Try normalized URLs (http/https variants)
    const urlsToTry = normalizeUrl(testUrl);
    console.log(`\n📋 URLs to try: ${urlsToTry.join(', ')}\n`);

    for (const url of urlsToTry) {
        console.log(`\n🔍 Testing: ${url}`);
        console.log('-'.repeat(60));

        // Method 1: Try rss-parser's parseURL
        console.log('\n[Method 1] Testing rss-parser parseURL...');
        try {
            const feed = await parser.parseURL(url);
            if (feed.items && feed.items.length > 0) {
                validUrl = url;
                sourceName = feed.title || 'FT.com';
                const text = (feed.title + " " + (feed.description || "")).toLowerCase();
                if (text.includes('ai') || text.includes('intelligence')) category = 'AI';
                else if (text.includes('tech')) category = 'Technology';
                else if (text.includes('finance') || text.includes('stock')) category = 'US Stocks';
                else if (text.includes('economy')) category = 'US Economy';
                console.log(`✅ Method 1 SUCCESS!`);
                console.log(`   Title: ${feed.title}`);
                console.log(`   Items: ${feed.items.length}`);
                console.log(`   Category: ${category}`);
                break;
            } else {
                console.log(`⚠️  Method 1: Parse succeeded but no items found`);
            }
        } catch (parseUrlError) {
            console.log(`❌ Method 1 FAILED: ${parseUrlError instanceof Error ? parseUrlError.message : String(parseUrlError)}`);
        }

        // Method 2: Try direct fetch + parseString
        if (!validUrl) {
            console.log('\n[Method 2] Testing direct fetch + parseString...');
            const { feed, success } = await validateWithFetch(url, parser);
            if (success && feed && feed.items && feed.items.length > 0) {
                validUrl = url;
                sourceName = feed.title || 'FT.com';
                const text = (feed.title + " " + (feed.description || "")).toLowerCase();
                if (text.includes('ai') || text.includes('intelligence')) category = 'AI';
                else if (text.includes('tech')) category = 'Technology';
                else if (text.includes('finance') || text.includes('stock')) category = 'US Stocks';
                else if (text.includes('economy')) category = 'US Economy';
                console.log(`✅ Method 2 SUCCESS!`);
                console.log(`   Category: ${category}`);
                break;
            } else {
                console.log(`❌ Method 2: No valid feed found`);
            }
        }

        // Method 3: Try Puppeteer as last resort
        if (!validUrl) {
            console.log('\n[Method 3] Testing Puppeteer fallback...');
            try {
                console.log(`  [Puppeteer] Fetching ${url}...`);
                const content = await fetchPageContent(url);
                console.log(`  [Puppeteer] Content length: ${content.length} bytes`);
                const feed = await parser.parseString(content);
                if (feed.items && feed.items.length > 0) {
                    validUrl = url;
                    sourceName = feed.title || 'FT.com';
                    const text = (feed.title + " " + (feed.description || "")).toLowerCase();
                    if (text.includes('ai') || text.includes('intelligence')) category = 'AI';
                    else if (text.includes('tech')) category = 'Technology';
                    else if (text.includes('finance') || text.includes('stock')) category = 'US Stocks';
                    else if (text.includes('economy')) category = 'US Economy';
                    console.log(`✅ Method 3 SUCCESS!`);
                    console.log(`   Title: ${feed.title}`);
                    console.log(`   Items: ${feed.items.length}`);
                    console.log(`   Category: ${category}`);
                    break;
                } else {
                    console.log(`⚠️  Method 3: Found feed but no items`);
                }
            } catch (puppeteerError) {
                console.log(`❌ Method 3 FAILED: ${puppeteerError instanceof Error ? puppeteerError.message : String(puppeteerError)}`);
            }
        }

        // If we found a valid URL, break out of the loop
        if (validUrl) break;
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Test Results:');
    if (validUrl) {
        console.log(`✅ SUCCESS! Valid RSS feed found:`);
        console.log(`   URL: ${validUrl}`);
        console.log(`   Source: ${sourceName}`);
        console.log(`   Category: ${category}`);
    } else {
        console.log(`❌ FAILED! No valid RSS feed found for ${testUrl}`);
    }
    console.log('\n');
}

testFTValidation().catch(console.error);

