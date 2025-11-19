import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TOPICS_PATH = path.join(process.cwd(), 'data', 'topics.json');

interface Topic {
    id: string;
    name: string;
    keywords: string[];
    priority: number;
    enabled: boolean;
    color: string;
}

interface TopicConfig {
    topics: Topic[];
}

// GET - 获取所有专题
export async function GET() {
    try {
        if (!fs.existsSync(TOPICS_PATH)) {
            return NextResponse.json({ topics: [] });
        }

        const data = fs.readFileSync(TOPICS_PATH, 'utf-8');
        const config: TopicConfig = JSON.parse(data);

        return NextResponse.json(config);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - 添加或更新专题
export async function POST(request: NextRequest) {
    try {
        const topic: Topic = await request.json();

        let config: TopicConfig = { topics: [] };

        if (fs.existsSync(TOPICS_PATH)) {
            const data = fs.readFileSync(TOPICS_PATH, 'utf-8');
            config = JSON.parse(data);
        }

        // 检查是否已存在
        const existingIndex = config.topics.findIndex(t => t.id === topic.id);

        if (existingIndex >= 0) {
            // 更新
            config.topics[existingIndex] = topic;
        } else {
            // 添加
            config.topics.push(topic);
        }

        fs.writeFileSync(TOPICS_PATH, JSON.stringify(config, null, 2));

        return NextResponse.json({ success: true, topic });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - 删除专题
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Topic ID required' }, { status: 400 });
        }

        if (!fs.existsSync(TOPICS_PATH)) {
            return NextResponse.json({ error: 'Topics file not found' }, { status: 404 });
        }

        const data = fs.readFileSync(TOPICS_PATH, 'utf-8');
        const config: TopicConfig = JSON.parse(data);

        config.topics = config.topics.filter(t => t.id !== id);

        fs.writeFileSync(TOPICS_PATH, JSON.stringify(config, null, 2));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
