import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const READ_STATUS_FILE = path.join(DATA_DIR, 'read-status.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to get read status
function getReadStatus(): Record<string, boolean> {
    try {
        if (fs.existsSync(READ_STATUS_FILE)) {
            const data = fs.readFileSync(READ_STATUS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error reading read status:', error);
    }
    return {};
}

// Helper to save read status
function saveReadStatus(status: Record<string, boolean>) {
    try {
        fs.writeFileSync(READ_STATUS_FILE, JSON.stringify(status, null, 2));
    } catch (error) {
        console.error('Error saving read status:', error);
    }
}

export async function GET() {
    const status = getReadStatus();
    return NextResponse.json(status);
}

export async function POST(request: Request) {
    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const status = getReadStatus();

        // If already read, no need to write
        if (status[id]) {
            return NextResponse.json({ success: true });
        }

        status[id] = true;
        saveReadStatus(status);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
