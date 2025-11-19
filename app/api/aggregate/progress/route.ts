import { NextResponse } from 'next/server';

// In-memory progress tracking (for demo; use Redis/DB in production)
let currentProgress = {
    status: 'idle',
    current: 0,
    total: 0,
    message: ''
};

export async function GET() {
    return NextResponse.json(currentProgress);
}

export async function POST(request: Request) {
    const body = await request.json();
    currentProgress = { ...currentProgress, ...body };
    return NextResponse.json({ success: true });
}
