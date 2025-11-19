import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const sourcesPath = path.join(process.cwd(), 'data', 'sources.json');

export async function GET() {
    try {
        const data = fs.readFileSync(sourcesPath, 'utf-8');
        const sources = JSON.parse(data);
        return NextResponse.json({ sources });
    } catch (error) {
        return NextResponse.json({ sources: [] });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { url, category, source } = body;

        const data = fs.readFileSync(sourcesPath, 'utf-8');
        const sources = JSON.parse(data);

        sources.push({ url, category, source });
        fs.writeFileSync(sourcesPath, JSON.stringify(sources, null, 2));

        return NextResponse.json({ success: true, sources });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const url = searchParams.get('url');

        const data = fs.readFileSync(sourcesPath, 'utf-8');
        let sources = JSON.parse(data);

        sources = sources.filter((s: any) => s.url !== url);
        fs.writeFileSync(sourcesPath, JSON.stringify(sources, null, 2));

        return NextResponse.json({ success: true, sources });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
