
import { fetchPageContent } from "./lib/search-tool";
import Parser from "rss-parser";

async function test() {
    const url = "https://www.ft.com/rss/home";
    console.log(`Testing URL: ${url}`);

    // 1. Test Standard Parser
    console.log("\n--- Testing Standard RSS Parser ---");
    const parser = new Parser({
        timeout: 10000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
    });

    try {
        const feed = await parser.parseURL(url);
        console.log("✅ Standard Parser Success!");
        console.log(`Title: ${feed.title}`);
        console.log(`Items: ${feed.items.length}`);
    } catch (e) {
        console.log("❌ Standard Parser Failed:");
        console.log(e instanceof Error ? e.message : String(e));
    }

    // 2. Test Puppeteer Fallback
    console.log("\n--- Testing Puppeteer Fallback ---");
    try {
        const content = await fetchPageContent(url);
        console.log("Puppeteer fetch success. Content length:", content.length);

        // Parse the content string
        const feed = await parser.parseString(content);
        console.log("✅ Puppeteer + Parser Success!");
        console.log(`Title: ${feed.title}`);
        console.log(`Items: ${feed.items.length}`);
    } catch (e) {
        console.log("❌ Puppeteer Fallback Failed:");
        console.log(e instanceof Error ? e.message : String(e));
    }
}

test();
