import { SourceManager } from '@/components/SourceManager';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { Suspense } from 'react';

function getDates(): string[] {
    const reportsDir = path.join(process.cwd(), 'data', 'reports');
    if (!fs.existsSync(reportsDir)) return [];

    return fs.readdirSync(reportsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
        .sort()
        .reverse();
}

export default function SourcesPage() {
    const dates = getDates();

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Suspense fallback={<div className="w-64 bg-white border-r h-screen" />}>
                <Sidebar dates={dates} />
            </Suspense>
            <main className="flex-1 ml-64 p-10">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">信息源管理</h1>
                        <Link href="/" className="text-blue-600 hover:underline text-sm">
                            ← 返回首页
                        </Link>
                    </div>
                    <SourceManager />
                </div>
            </main>
        </div>
    );
}
