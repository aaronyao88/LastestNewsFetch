'use client';

import { useState, useEffect } from 'react';

interface Source {
    url: string;
    category: string;
    source: string;
}

const CATEGORIES = ['AI', 'Technology', 'US Stocks', 'US Economy'];

export function SourceManager() {
    const [sources, setSources] = useState<Source[]>([]);
    const [newSource, setNewSource] = useState({ url: '', category: 'AI', source: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSources();
    }, []);

    const loadSources = async () => {
        try {
            const res = await fetch('/api/sources');
            if (!res.ok) throw new Error('Failed to fetch sources');
            const data = await res.json();
            setSources(data?.sources || []);
        } catch (error) {
            console.error('Error loading sources:', error);
            setSources([]);
        }
    };

    const addSource = async () => {
        if (!newSource.url || !newSource.source) {
            alert('请填写完整信息');
            return;
        }
        setLoading(true);
        await fetch('/api/sources', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSource)
        });
        setNewSource({ url: '', category: 'AI', source: '' });
        await loadSources();
        setLoading(false);
    };

    const deleteSource = async (url: string) => {
        if (!confirm('确定要删除这个信息源吗？')) return;
        setLoading(true);
        await fetch(`/api/sources?url=${encodeURIComponent(url)}`, { method: 'DELETE' });
        await loadSources();
        setLoading(false);
    };

    // Group sources by category
    const groupedSources = CATEGORIES.reduce((acc, category) => {
        acc[category] = sources.filter(s => s.category === category);
        return acc;
    }, {} as Record<string, Source[]>);

    // Helper to get icon URL
    const getIconUrl = (url: string) => `/api/icon?url=${encodeURIComponent(url)}`;

    return (
        <div className="space-y-8">
            {/* Add Source Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
                    添加新信息源
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">RSS 地址</label>
                        <input
                            type="text"
                            placeholder="https://example.com/feed"
                            value={newSource.url}
                            onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">来源名称</label>
                        <input
                            type="text"
                            placeholder="例如: 36氪"
                            value={newSource.source}
                            onChange={(e) => setNewSource({ ...newSource, source: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">分类</label>
                        <select
                            value={newSource.category}
                            onChange={(e) => setNewSource({ ...newSource, category: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2 flex items-end">
                        <button
                            onClick={addSource}
                            disabled={loading}
                            className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            {loading ? '添加中...' : '添加源'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Sources List by Category */}
            <div className="space-y-6">
                {CATEGORIES.map(category => {
                    const categorySources = groupedSources[category] || [];
                    if (categorySources.length === 0) return null;

                    return (
                        <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    {category}
                                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full font-medium">
                                        {categorySources.length}
                                    </span>
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {categorySources.map((s, idx) => (
                                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className="flex-shrink-0 w-10 h-10 bg-white border border-gray-200 rounded-lg p-1.5 flex items-center justify-center shadow-sm">
                                                {/* Use standard img tag to avoid Next.js Image config issues with dynamic API URLs */}
                                                <img
                                                    src={getIconUrl(s.url)}
                                                    alt={s.source}
                                                    width={24}
                                                    height={24}
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = '/default-source-icon.png';
                                                    }}
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-gray-900 text-base mb-0.5">{s.source}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-md font-mono bg-gray-100 px-1.5 py-0.5 rounded inline-block">
                                                    {s.url}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteSource(s.url)}
                                            disabled={loading}
                                            className="ml-4 px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md text-sm font-medium transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        >
                                            删除
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
