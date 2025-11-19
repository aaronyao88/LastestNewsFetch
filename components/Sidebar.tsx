'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface SidebarProps {
    dates: string[];
}

export function Sidebar({ dates }: SidebarProps) {
    const searchParams = useSearchParams();
    const currentDate = searchParams.get('date');

    return (
        <aside className="w-64 bg-white border-r h-screen overflow-y-auto fixed left-0 top-0 p-4 shadow-sm">
            <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-3">历史报告</h2>
            <nav className="space-y-1">
                {dates.map(date => {
                    const isActive = currentDate === date || (!currentDate && date === dates[0]);

                    return (
                        <Link
                            key={date}
                            href={`/?date=${date}`}
                            className={`block px-4 py-3 rounded-lg transition-colors border font-medium ${isActive
                                    ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
                                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 border-transparent hover:border-blue-200'
                                }`}
                        >
                            📅 {date}
                        </Link>
                    );
                })}
                {dates.length === 0 && (
                    <p className="text-gray-400 text-sm px-4 py-2">暂无报告</p>
                )}
            </nav>
        </aside>
    );
}
