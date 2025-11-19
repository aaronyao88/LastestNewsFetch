import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ICONS_DIR = path.join(process.cwd(), 'public', 'icons');

// 确保图标目录存在
if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// 生成域名的哈希作为文件名
function getDomainHash(domain: string): string {
    return crypto.createHash('md5').update(domain).digest('hex');
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
    }

    try {
        // 提取域名
        const domain = new URL(url).hostname;
        const domainHash = getDomainHash(domain);
        const iconPath = path.join(ICONS_DIR, `${domainHash}.png`);

        // 检查缓存
        if (fs.existsSync(iconPath)) {
            // 返回缓存的图标
            const iconBuffer = fs.readFileSync(iconPath);
            return new NextResponse(iconBuffer, {
                headers: {
                    'Content-Type': 'image/png',
                    'Cache-Control': 'public, max-age=31536000', // 缓存1年
                },
            });
        }

        // 从 Google Favicon API 获取图标
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        const response = await fetch(faviconUrl);

        if (!response.ok) {
            throw new Error('Failed to fetch favicon');
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 保存到缓存
        fs.writeFileSync(iconPath, buffer);

        // 返回图标
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=31536000',
            },
        });
    } catch (error: any) {
        console.error('Icon fetch error:', error.message);

        // Return default icon on error
        try {
            const defaultIconPath = path.join(process.cwd(), 'public', 'default-source-icon.png');
            if (fs.existsSync(defaultIconPath)) {
                const iconBuffer = fs.readFileSync(defaultIconPath);
                return new NextResponse(iconBuffer, {
                    headers: {
                        'Content-Type': 'image/png',
                        'Cache-Control': 'no-cache',
                    },
                });
            }
        } catch (e) {
            console.error('Failed to serve default icon:', e);
        }

        return NextResponse.json({ error: 'Failed to fetch icon' }, { status: 500 });
    }
}
