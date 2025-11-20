'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface SidebarProps {
    dates: string[];
}

export function Sidebar({ dates }: SidebarProps) {
    const searchParams = useSearchParams();
    const currentDate = searchParams.get('date');
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
                aria-label="Toggle menu"
            >
                <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                </svg>
            </button>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                w-64 bg-white border-r h-screen overflow-y-auto p-4 shadow-sm
                fixed left-0 top-0 z-40 transition-transform duration-300
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0
            `}>
                <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-3">历史报告</h2>
                <nav className="space-y-1">
                    {dates.map(date => {
                        const isActive = currentDate === date || (!currentDate && date === dates[0]);

                        return (
                            <Link
                                key={date}
                                href={`/?date=${date}`}
                                onClick={() => setIsOpen(false)}
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
        </>
    );
}
