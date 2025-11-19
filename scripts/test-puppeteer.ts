import puppeteer from 'puppeteer';

async function quickTest() {
    console.log('测试 Puppeteer 基本功能...\n');

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.goto('https://example.com', { timeout: 10000 });

        const title = await page.title();
        console.log('✓ Puppeteer 工作正常');
        console.log(`  测试页面标题: ${title}\n`);

        console.log('尝试访问 X.com...');
        await page.goto('https://x.com/OpenAI', { timeout: 15000, waitUntil: 'domcontentloaded' });

        const content = await page.content();
        const needsLogin = content.includes('login') || content.includes('Sign in');

        if (needsLogin) {
            console.log('⚠ X.com 需要登录才能查看内容');
            console.log('  这是 Twitter 的限制，爬虫无法绕过\n');
        } else {
            console.log('✓ 可以访问 X.com 公开内容\n');
        }

    } catch (error: any) {
        console.error('✗ 错误:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

quickTest();
