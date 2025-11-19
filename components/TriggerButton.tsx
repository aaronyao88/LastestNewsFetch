'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Progress {
    status: string;
    current: number;
    total: number;
    message: string;
}

export function TriggerButton() {
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [progress, setProgress] = useState<Progress | null>(null);
    const router = useRouter();

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (loading) {
            interval = setInterval(async () => {
                const res = await fetch('/api/aggregate/progress');
                const data = await res.json();
                setProgress(data);
                if (data.status === 'complete') {
                    setLoading(false);
                    router.push(`/?date=${date}`);
                    router.refresh();
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [loading, date, router]);

    const handleTrigger = async () => {
        setLoading(true);
        setProgress({ status: 'starting', current: 0, total: 100, message: '开始生成报告...' });

        try {
            fetch(`/api/aggregate?date=${date}`).then(res => {
                if (!res.ok) {
                    alert('生成失败');
                    setLoading(false);
                }
            });
        } catch (error) {
            console.error(error);
            alert('生成出错');
            setLoading(false);
        }
    };

    const percentage = progress && progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : 0;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={loading}
                    className="px-3 py-2 border rounded text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                    onClick={handleTrigger}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 text-sm whitespace-nowrap"
                >
                    {loading ? '生成中...' : '生成报告'}
                </button>
            </div>

            {loading && progress && (
                <div className="w-full">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{progress.message}</span>
                        <span>{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
