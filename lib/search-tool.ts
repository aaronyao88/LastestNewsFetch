import puppeteer from 'puppeteer';

export interface SearchResult {
    title: string;
    link: string;
    snippet?: string;
}

export async function searchWeb(query: string, engine: 'google' | 'baidu' = 'google'): Promise<SearchResult[]> {
    console.log(`Searching ${engine} for: ${query}`);
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const results: SearchResult[] = [];

        if (engine === 'google') {
            // Using DuckDuckGo as a proxy for "Google-like" results to avoid strict captchas
            await page.goto(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            // Wait a bit for content to settle if needed, but domcontentloaded is usually enough for static HTML version
            // await new Promise(r => setTimeout(r, 1000));

            const elements = await page.$$('.result');
            for (const el of elements) {
                try {
                    const titleEl = await el.$('.result__a');
                    const snippetEl = await el.$('.result__snippet');

                    if (titleEl) {
                        const title = await page.evaluate(e => e.textContent?.trim() || '', titleEl);
                        const link = await page.evaluate(e => e.getAttribute('href') || '', titleEl);
                        const snippet = snippetEl ? await page.evaluate(e => e.textContent?.trim() || '', snippetEl) : '';

                        if (link && !link.includes('duckduckgo.com')) {
                            results.push({ title, link, snippet });
                        }
                    }
                } catch (e) {
                    // Ignore parsing errors for individual items
                }
            }
        } else {
            // Baidu
            await page.goto(`https://www.baidu.com/s?wd=${encodeURIComponent(query)}`, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            const elements = await page.$$('.c-container');
            for (const el of elements) {
                try {
                    const titleEl = await el.$('h3 a');

                    if (titleEl) {
                        const title = await page.evaluate(e => e.textContent?.trim() || '', titleEl);
                        const link = await page.evaluate(e => e.getAttribute('href') || '', titleEl);

                        if (link) {
                            results.push({ title, link });
                        }
                    }
                } catch (e) {
                    // Ignore
                }
            }
        }

        return results.slice(0, 10);
    } catch (error) {
        console.error('Search failed:', error);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

export async function fetchPageContent(url: string): Promise<string> {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Disable request blocking to avoid ERR_BLOCKED_BY_CLIENT errors
        // This allows all requests including RSS feeds that might be blocked by ad blockers
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            // Allow all requests, including those that might be blocked by ad blockers
            request.continue();
        });

        // Navigate to the URL directly
        // This avoids CORS issues that fetch() inside evaluate() would face
        const response = await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // Try to get content from response first (for HTTP/HTTPS URLs)
        // This gives us the raw response body, which is ideal for RSS/XML feeds
        if (response) {
            try {
                const status = response.status();
                if (status >= 200 && status < 300) {
                    // Success status, get response text (raw body)
                    const text = await response.text();
                    if (text && text.trim().length > 0) {
                        return text;
                    }
                } else if (status >= 400) {
                    // Error status (4xx, 5xx)
                    const statusText = response.statusText();
                    throw new Error(`HTTP ${status} ${statusText}`);
                }
                // For 3xx redirects, Puppeteer handles them automatically, continue to fallback
            } catch (responseError) {
                // If response.text() fails or status is not 2xx, try fallback method
                // This can happen with some URLs or if response is not available
                console.log(`Response method failed, using page content as fallback: ${responseError instanceof Error ? responseError.message : String(responseError)}`);
            }
        }

        // Fallback: Get content from page
        // For XML/RSS, try to get the raw text content from the page
        // Browsers typically display XML as text, so we can extract it
        try {
            // Try to get the text content directly (works for XML/RSS displayed as text)
            const textContent = await page.evaluate(() => {
                // If it's an XML document, return the XML string
                if (document.documentElement && document.documentElement.tagName) {
                    return new XMLSerializer().serializeToString(document);
                }
                // Otherwise return the body text or full HTML
                return document.body ? document.body.innerText : document.documentElement.outerHTML;
            });
            
            if (textContent && textContent.trim().length > 0) {
                return textContent;
            }
        } catch (evalError) {
            // If evaluate fails, use page.content() as last resort
            console.log(`Page evaluate failed, using page.content(): ${evalError instanceof Error ? evalError.message : String(evalError)}`);
        }

        // Last resort: return page HTML content
        return await page.content();

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // If ERR_BLOCKED_BY_CLIENT, try using native fetch as fallback
        if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT') || errorMessage.includes('net::ERR_BLOCKED_BY_CLIENT')) {
            console.log(`Puppeteer blocked by client for ${url}, trying native fetch as fallback...`);
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
                        'Accept-Language': 'en-US,en;q=0.9'
                    },
                    redirect: 'follow',
                    signal: AbortSignal.timeout(30000)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const text = await response.text();
                if (text && text.trim().length > 0) {
                    console.log(`Native fetch succeeded for ${url}`);
                    return text;
                }
            } catch (fetchError) {
                console.error(`Native fetch also failed for ${url}:`, fetchError instanceof Error ? fetchError.message : String(fetchError));
                // Re-throw the original Puppeteer error
                throw error;
            }
        }
        
        console.error(`Puppeteer fetch failed for ${url}:`, errorMessage);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}
