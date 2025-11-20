'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Topic {
    id: string;
    name: string;
    keywords: string[];
    priority: number;
    enabled: boolean;
    color: string;
}

export default function TopicsPage() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTopics();
    }, []);

    const fetchTopics = async () => {
        try {
            const res = await fetch('/api/topics');
            const data = await res.json();
            setTopics(data.topics || []);
        } catch (error) {
            console.error('Failed to fetch topics:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTopic = async (topic: Topic) => {
        try {
            const updated = { ...topic, enabled: !topic.enabled };
            await fetch('/api/topics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
            fetchTopics();
        } catch (error) {
            console.error('Failed to toggle topic:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">加载中...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-10">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">专题管理</h1>
                    <Link href="/" className="text-blue-600 hover:underline text-sm whitespace-nowrap">
                        ← 返回首页
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
                    <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">专题说明</h2>
                    <p className="text-gray-600 text-sm mb-2">
                        专题系统会自动识别新闻内容中的关键词，为匹配的新闻提升热度指数，确保您感兴趣的内容优先展示。
                    </p>
                    <p className="text-gray-600 text-sm">
                        热度提升公式: 新热度 = 原热度 × (1 + 优先级/100)
                    </p>
                </div>

                <div className="space-y-3 sm:space-y-4">
                    {topics.map(topic => (
                        <div key={topic.id} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
                            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
                                <div className="flex-1 w-full sm:w-auto">
                                    <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">{topic.name}</h3>
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${topic.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {topic.enabled ? '已启用' : '已禁用'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        优先级: <span className="font-semibold">{topic.priority}</span> |
                                        热度提升: <span className="font-semibold text-orange-600">+{topic.priority}%</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => toggleTopic(topic)}
                                    className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition-colors text-sm ${topic.enabled
                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    {topic.enabled ? '禁用' : '启用'}
                                </button>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">关键词:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {topic.keywords.map((keyword, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                        >
                                            {keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {topics.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                        <p className="text-gray-500">暂无专题配置</p>
                    </div>
                )}
            </div>
        </div>
    );
}
