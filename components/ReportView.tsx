'use client';

import { DailyReport, Category } from '@/types';
import Link from 'next/link';
import { useState } from 'react';
import { clsx } from 'clsx';
import Image from 'next/image';
import { TopicBadge } from './TopicBadge';
import { renderHighlightedText } from '@/lib/text-utils';

const CATEGORIES: (Category | 'All')[] = ['All', 'AI', 'Technology', 'US Stocks', 'US Economy', 'Other'];

// 获取信息源的 favicon (使用缓存 API)
const getSourceIcon = (source: string, url: string) => {
    // 使用我们的缓存 API
    try {
        return `/api/icon?url=${encodeURIComponent(url)}`;
    } catch {
        return '/default-source-icon.png';
    }
};

// 获取信息源的颜色主题
const getSourceColor = (source: string) => {
    if (source.includes('X.com') || source.includes('Twitter')) return 'bg-black';
    if (source.includes('OpenAI')) return 'bg-green-600';
    if (source.includes('Google')) return 'bg-blue-600';
    if (source.includes('TechCrunch')) return 'bg-green-500';
    if (source.includes('CNBC')) return 'bg-red-600';
    if (source.includes('Yahoo')) return 'bg-purple-600';
    return 'bg-gray-600';
};

interface ReportViewProps {
    report: DailyReport;
    topicsMap?: Record<string, { name: string; color: string }>;
}

export function ReportView({ report, topicsMap = {} }: ReportViewProps) {
    const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');

    const filteredItems = selectedCategory === 'All'
        ? report.items
        : report.items.filter(item => item.category === selectedCategory);

    // Sort by heat index descending
    filteredItems.sort((a, b) => b.heatIndex - a.heatIndex);

    // Calculate counts
    const counts = report.items.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const totalCount = report.items.length;

    const formatHeatIndex = (num: number) => {
        if (num >= 100000000) {
            return (num / 100000000).toFixed(1) + '亿';
        }
        if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        }
        return num.toString();
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 bg-white shadow-lg rounded-lg">
            {/* Success Banner */}
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-3 sm:p-4 rounded-r-lg">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">
                            报告生成成功！
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                            生成时间: {new Date(report.createdAt).toLocaleString('zh-CN', {
                                timeZone: 'Asia/Shanghai',
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                            })} (北京时间)
                        </p>
                    </div>
                </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-900 px-4 sm:px-0">{report.title}</h1>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 sticky top-0 bg-white z-10 py-4 border-b px-4 sm:px-0 -mx-4 sm:mx-0">
                {CATEGORIES.map(cat => {
                    const count = cat === 'All' ? totalCount : (counts[cat as string] || 0);
                    return (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={clsx(
                                "px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2",
                                selectedCategory === cat
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            <span>{cat === 'All' ? '全部' : cat}</span>
                            <span className={clsx(
                                "text-xs py-0.5 px-1.5 rounded-full",
                                selectedCategory === cat ? "bg-white/20" : "bg-gray-200"
                            )}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Main News Items */}
            <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-12 px-4 sm:px-0">
                {filteredItems.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">该分类下暂无内容。</p>
                ) : (
                    filteredItems.map((item, index) => (
                        <div key={item.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow relative">
                            {/* Header: Title & Heat */}
                            <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex justify-between items-start gap-3 sm:gap-4">
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                        {/* Source Icon */}
                                        <div className="flex-shrink-0 relative group">
                                            <img
                                                src={getSourceIcon(item.source, item.url)}
                                                alt={item.source}
                                                title={item.source}
                                                className="w-6 h-6 sm:w-7 sm:h-7 rounded cursor-help transition-transform group-hover:scale-110"
                                                onError={(e) => {
                                                    // 如果图标加载失败，使用文字缩写
                                                    e.currentTarget.style.display = 'none';
                                                    const parent = e.currentTarget.parentElement;
                                                    if (parent && !parent.querySelector('.source-fallback')) {
                                                        const fallback = document.createElement('div');
                                                        fallback.className = `source-fallback w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center text-white text-xs font-bold ${getSourceColor(item.source)} cursor-help transition-transform group-hover:scale-110`;
                                                        fallback.title = item.source;
                                                        fallback.textContent = item.source.substring(0, 2).toUpperCase();
                                                        parent.appendChild(fallback);
                                                    }
                                                }}
                                            />
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                                                {item.source}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                            </div>
                                        </div>
                                        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">
                                            {item.title}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                        <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {item.category}
                                        </span>

                                        {/* Topic Badges */}
                                        {item.matchedTopics && item.matchedTopics.length > 0 && (
                                            <>
                                                {item.matchedTopics.map(topicId => {
                                                    const topic = topicsMap[topicId];
                                                    if (!topic) return null;
                                                    return (
                                                        <TopicBadge
                                                            key={topicId}
                                                            topicId={topicId}
                                                            topicName={topic.name}
                                                            topicColor={topic.color}
                                                        />
                                                    );
                                                })}
                                            </>
                                        )}
                                    </div>
                                </div>
                                {/* Heat Index Badge */}
                                <div className="flex-shrink-0 flex flex-col items-end">
                                    <div className="bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-md">
                                        <div className="text-xs font-medium opacity-90 hidden sm:block">热度指数</div>
                                        <div className="text-base sm:text-xl font-bold flex items-center gap-1">
                                            {formatHeatIndex(item.heatIndex)}
                                            {item.matchedTopics && item.matchedTopics.length > 0 && (
                                                <span className="text-xs sm:text-sm">↑</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Body Content */}
                            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">

                                {/* 1) Summary */}
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                                        1) 内容总结
                                    </h3>
                                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed text-justify">
                                        {renderHighlightedText(item.summary)}
                                    </p>
                                </div>

                                {/* 2) Market Reaction */}
                                {item.marketReaction && (
                                    <div>
                                        <h3 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                                            2) 市场反应
                                        </h3>
                                        <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                                            {renderHighlightedText(item.marketReaction)}
                                        </p>
                                    </div>
                                )}

                                {/* 3) Date */}
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-wider mb-1 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-green-500 rounded-full"></span>
                                        3) 发布时间
                                    </h3>
                                    <p className="text-gray-600 text-xs sm:text-sm font-mono break-all">
                                        {new Date(item.publishDate).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })} (北京时间)
                                    </p>
                                </div>

                                {/* 4) Comments */}
                                {item.comments && item.comments.length > 0 && (
                                    <div>
                                        <h3 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                                            4) 热点评论
                                        </h3>
                                        <ul className="space-y-2">
                                            {item.comments.slice(0, 5).map((c, i) => (
                                                <li key={i} className="flex gap-2 text-gray-700 text-sm sm:text-base bg-gray-50 p-2 sm:p-3 rounded">
                                                    <span className="text-gray-400 font-mono select-none">{i + 1}.</span>
                                                    <span>{c}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* 5) Link */}
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-gray-500 rounded-full"></span>
                                        5) 相关链接
                                    </h3>
                                    <Link
                                        href={item.url}
                                        target="_blank"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline break-all text-xs sm:text-sm font-medium"
                                    >
                                        {item.url}
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </Link>
                                </div>

                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Shorts Section */}
            {report.shorts && report.shorts.length > 0 && (
                <div className="bg-gray-50 p-4 sm:p-6 rounded-lg mx-4 sm:mx-0">
                    <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-800">快讯区</h2>
                    <ul className="space-y-2 sm:space-y-3">
                        {report.shorts.map((short, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <span className="font-bold text-gray-500 text-sm sm:text-base">{idx + 1}.</span>
                                <div>
                                    <p className="text-gray-800 inline text-sm sm:text-base">{short.description} </p>
                                    <Link href={short.url} target="_blank" className="text-blue-500 hover:underline text-xs sm:text-sm">
                                        [链接]
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
