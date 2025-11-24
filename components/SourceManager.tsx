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

    // Smart Add State
    const [addMode, setAddMode] = useState<'manual' | 'smart'>('smart');
    const [smartKeyword, setSmartKeyword] = useState('');
    const [smartResult, setSmartResult] = useState<Source | null>(null);
    const [smartLogs, setSmartLogs] = useState<string[]>([]);
    const [showLogs, setShowLogs] = useState(false);

    // Toast notification state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Auto-dismiss toast after 4 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleSmartSearch = async () => {
        if (!smartKeyword.trim()) return;
        setLoading(true);
        setSmartResult(null);
        setSmartLogs([]);
        try {
            const res = await fetch('/api/sources/smart-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: smartKeyword })
            });

            if (!res.ok) {
                // Try to parse error message from response
                let errorMessage = '搜索失败，请重试';
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    // If response is not JSON, use status text
                    errorMessage = res.statusText || errorMessage;
                }
                setToast({ message: errorMessage, type: 'error' });
                return;
            }

            const data = await res.json();

            if (data.logs) {
                setSmartLogs(data.logs);
            }

            if (data.error) {
                setToast({ message: data.error, type: 'error' });
            } else if (data.result) {
                setSmartResult(data.result);
            } else {
                setToast({ message: '未找到结果', type: 'error' });
            }
        } catch (error) {
            console.error('Smart search failed:', error);
            const errorMessage = error instanceof Error ? error.message : '搜索失败，请重试';
            setToast({ message: errorMessage, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const confirmSmartAdd = async () => {
        if (!smartResult) return;
        setLoading(true);
        try {
            await fetch('/api/sources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(smartResult)
            });
            setSmartResult(null);
            setSmartKeyword('');
            setSmartLogs([]);
            setShowLogs(false);
            await loadSources();
            setToast({ message: '添加成功！', type: 'success' });
        } catch (error) {
            console.error('Add source failed:', error);
            setToast({ message: '添加失败', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

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
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg border-2 animate-in fade-in slide-in-from-top-5 ${toast.type === 'success'
                    ? 'bg-green-50 border-green-500 text-green-800'
                    : 'bg-red-50 border-red-500 text-red-800'
                    }`}>
                    <div className="flex items-center gap-3">
                        {toast.type === 'success' ? (
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                        <span className="font-medium">{toast.message}</span>
                    </div>
                </div>
            )}

            {/* Add Source Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
                        添加新信息源
                    </h2>
                    <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
                        <button
                            onClick={() => setAddMode('smart')}
                            className={`flex-1 sm:flex-none px-3 py-1.5 text-sm font-medium rounded-md transition-all ${addMode === 'smart'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            智能搜索
                        </button>
                        <button
                            onClick={() => setAddMode('manual')}
                            className={`flex-1 sm:flex-none px-3 py-1.5 text-sm font-medium rounded-md transition-all ${addMode === 'manual'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            手动添加
                        </button>
                    </div>
                </div>

                {addMode === 'smart' ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">关键词 / 网站名</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    placeholder="例如: OpenAI Blog, TechCrunch, 晚点"
                                    value={smartKeyword}
                                    onChange={(e) => setSmartKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}
                                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                                <button
                                    onClick={handleSmartSearch}
                                    disabled={loading || !smartKeyword.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm whitespace-nowrap w-full sm:w-auto"
                                >
                                    {loading ? '搜索中...' : '搜索 RSS'}
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                                输入网站名称或话题，AI 将自动查找可用的 RSS 源。
                            </p>
                        </div>

                        {/* Logs Section */}
                        {smartLogs.length > 0 && (
                            <div className="mt-2">
                                <button
                                    onClick={() => setShowLogs(!showLogs)}
                                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                >
                                    {showLogs ? '隐藏搜索日志' : '查看搜索日志'}
                                    <svg className={`w-3 h-3 transition-transform ${showLogs ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {showLogs && (
                                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs font-mono text-gray-600 space-y-1 max-h-40 overflow-y-auto">
                                        {smartLogs.map((log, i) => (
                                            <div key={i} className="break-all">
                                                <span className="text-gray-400 mr-2">[{i + 1}]</span>
                                                {log}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {smartResult && (
                            <div className="mt-4 p-3 sm:p-4 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                                <h3 className="text-sm font-bold text-blue-900 mb-3">找到以下来源:</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-blue-700 mb-1">RSS 地址</label>
                                        <input
                                            type="text"
                                            value={smartResult.url}
                                            onChange={(e) => setSmartResult({ ...smartResult, url: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-blue-800"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-blue-700 mb-1">名称</label>
                                            <input
                                                type="text"
                                                value={smartResult.source}
                                                onChange={(e) => setSmartResult({ ...smartResult, source: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-blue-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-blue-700 mb-1">分类</label>
                                            <select
                                                value={smartResult.category}
                                                onChange={(e) => setSmartResult({ ...smartResult, category: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-blue-800"
                                            >
                                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        onClick={confirmSmartAdd}
                                        className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                    >
                                        确认添加
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">RSS 地址</label>
                            <input
                                type="text"
                                placeholder="https://example.com/feed"
                                value={newSource.url}
                                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">来源名称</label>
                            <input
                                type="text"
                                placeholder="例如: 36氪"
                                value={newSource.source}
                                onChange={(e) => setNewSource({ ...newSource, source: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                )}
            </div>

            {/* Sources List by Category */}
            <div className="space-y-4 sm:space-y-6">
                {CATEGORIES.map(category => {
                    const categorySources = groupedSources[category] || [];
                    if (categorySources.length === 0) return null;

                    return (
                        <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-4 sm:px-6 py-2 sm:py-3 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                                    {category}
                                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full font-medium">
                                        {categorySources.length}
                                    </span>
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {categorySources.map((s, idx) => (
                                    <div key={idx} className="p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                        <div className="flex items-center gap-2 sm:gap-4 overflow-hidden flex-1 min-w-0">
                                            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-white border border-gray-200 rounded-lg p-1 sm:p-1.5 flex items-center justify-center shadow-sm">
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
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-gray-900 text-sm sm:text-base mb-0.5">{s.source}</div>
                                                <div className="text-xs text-gray-500 truncate font-mono bg-gray-100 px-1.5 py-0.5 rounded inline-block max-w-full">
                                                    {s.url}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteSource(s.url)}
                                            disabled={loading}
                                            className="ml-2 sm:ml-4 px-2 sm:px-3 py-1 sm:py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md text-xs sm:text-sm font-medium transition-colors sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 flex-shrink-0"
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
