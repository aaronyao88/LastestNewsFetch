import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const ICONS_DIR = path.join(process.cwd(), 'public', 'icons');

// 常用信息源列表
const COMMON_SOURCES = [
    'https://techcrunch.com',
    'https://www.theverge.com',
    'https://www.wired.com',
    'https://arstechnica.com',
    'https://www.artificialintelligence-news.com',
    'https://venturebeat.com',
    'https://openai.com',
    'https://www.anthropic.com',
    'https://finance.yahoo.com',
    'https://www.cnbc.com',
    'https://www.marketwatch.com',
    'https://www.investing.com',
    'https://x.com',
];

async function preloadIcons() {
    console.log('开始预加载常用信息源图标...\n');

    if (!fs.existsSync(ICONS_DIR)) {
        fs.mkdirSync(ICONS_DIR, { recursive: true });
    }

    let successCount = 0;
    let failCount = 0;

    for (const url of COMMON_SOURCES) {
        try {
            const response = await fetch(`http://localhost:3000/api/icon?url=${encodeURIComponent(url)}`);

            if (response.ok) {
                console.log(`✓ ${new URL(url).hostname}`);
                successCount++;
            } else {
                console.log(`✗ ${new URL(url).hostname} - ${response.status}`);
                failCount++;
            }

            // 小延迟避免过载
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error: any) {
            console.log(`✗ ${new URL(url).hostname} - ${error.message}`);
            failCount++;
        }
    }

    console.log(`\n预加载完成:`);
    console.log(`  成功: ${successCount}`);
    console.log(`  失败: ${failCount}`);
    console.log(`  总计: ${COMMON_SOURCES.length}`);
    console.log(`\n图标已缓存到: ${ICONS_DIR}`);
}

preloadIcons();
