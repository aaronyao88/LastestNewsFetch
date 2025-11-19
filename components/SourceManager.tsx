'use client';

import { useState, useEffect } from 'react';

interface Source {
    url: string;
    category: string;
    source: string;
}

export function SourceManager() {
    const [sources, setSources] = useState<Source[]>([]);
    const [newSource, setNewSource] = useState({ url: '', category: 'AI', source: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSources();
    }, []);

    const loadSources = async () => {
        const res = await fetch('/api/sources');
        const data = await res.json();
        setSources(data.sources || []);
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

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">信息源管理</h2>

            {/* Add Source Form */}
            <div className="mb-6 p-4 bg-gray-50 rounded">
                <h3 className="font-semibold mb-3">添加新信息源</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                        type="text"
                        placeholder="RSS URL"
                        value={newSource.url}
                        onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                        className="px-3 py-2 border rounded text-sm"
                    />
                    <select
                        value={newSource.category}
                        onChange={(e) => setNewSource({ ...newSource, category: e.target.value })}
                        className="px-3 py-2 border rounded text-sm"
                    >
                        <option value="AI">AI</option>
                        <option value="Technology">Technology</option>
                        <option value="US Stocks">US Stocks</option>
                        <option value="US Economy">US Economy</option>
                    </select>
                    <input
                        type="text"
                        placeholder="来源名称"
                        value={newSource.source}
                        onChange={(e) => setNewSource({ ...newSource, source: e.target.value })}
                        className="px-3 py-2 border rounded text-sm"
                    />
                    <button
                        onClick={addSource}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                        添加
                    </button>
                </div>
            </div>

            {/* Sources List */}
            <div className="space-y-2">
                <h3 className="font-semibold mb-2">当前信息源 ({sources.length})</h3>
                {sources.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100">
                        <div className="flex-grow">
                            <div className="font-medium text-sm">{s.source}</div>
                            <div className="text-xs text-gray-500 truncate">{s.url}</div>
                            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{s.category}</span>
                        </div>
                        <button
                            onClick={() => deleteSource(s.url)}
                            disabled={loading}
                            className="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-xs"
                        >
                            删除
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
