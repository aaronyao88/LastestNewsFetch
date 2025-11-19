import { NextResponse } from 'next/server';
import { runAggregation } from '@/services/aggregator';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date') || undefined;

        const report = await runAggregation(date);
        return NextResponse.json({ success: true, report });
    } catch (error) {
        console.error('Aggregation failed:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
