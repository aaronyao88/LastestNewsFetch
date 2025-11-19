import { SourceManager } from '@/components/SourceManager';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';

export default function SourcesPage() {
    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />
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
