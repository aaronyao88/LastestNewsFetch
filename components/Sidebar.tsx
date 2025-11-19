import fs from 'fs';
import path from 'path';
import Link from 'next/link';

export function Sidebar() {
    const reportsDir = path.join(process.cwd(), 'data', 'reports');
    let dates: string[] = [];

    if (fs.existsSync(reportsDir)) {
        dates = fs.readdirSync(reportsDir)
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace('.json', ''))
            .sort()
            .reverse();
    }

    return (
        <aside className="w-64 bg-white border-r h-screen overflow-y-auto fixed left-0 top-0 p-4 shadow-sm">
            <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-3">历史报告</h2>
            <nav className="space-y-1">
                {dates.map(date => (
                    <Link
                        key={date}
                        href={`/?date=${date}`}
                        className="block px-4 py-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors border border-transparent hover:border-blue-200 font-medium"
                    >
                        📅 {date}
                    </Link>
                ))}
                {dates.length === 0 && (
                    <p className="text-gray-400 text-sm px-4 py-2">暂无报告</p>
                )}
            </nav>
        </aside>
    );
}
