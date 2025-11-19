import { NewsItem } from '@/types';
import fs from 'fs';
import path from 'path';

export interface Topic {
    id: string;
    name: string;
    keywords: string[];
    priority: number;
    enabled: boolean;
    color: string;
}

interface TopicConfig {
    topics: Topic[];
}

// 加载专题配置
function loadTopics(): Topic[] {
    try {
        const topicsPath = path.join(process.cwd(), 'data', 'topics.json');
        if (fs.existsSync(topicsPath)) {
            const data = fs.readFileSync(topicsPath, 'utf-8');
            const config: TopicConfig = JSON.parse(data);
            return config.topics.filter(t => t.enabled);
        }
    } catch (error) {
        console.error('Error loading topics:', error);
    }
    return [];
}

// 计算文本与专题的匹配度
function calculateMatchScore(text: string, keywords: string[]): number {
    const lowerText = text.toLowerCase();
    let score = 0;

    for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase();
        if (lowerText.includes(lowerKeyword)) {
            // 完整词匹配得分更高
            const regex = new RegExp(`\\b${lowerKeyword}\\b`, 'i');
            if (regex.test(text)) {
                score += 2;
            } else {
                score += 1;
            }
        }
    }

    return score;
}

// 为新闻匹配专题
export function matchTopics(newsItem: NewsItem): { topics: string[]; boostFactor: number } {
    const topics = loadTopics();
    const matchedTopics: string[] = [];
    let totalBoost = 0;

    // 组合标题和摘要进行匹配
    const searchText = `${newsItem.title} ${newsItem.summary}`;

    for (const topic of topics) {
        const score = calculateMatchScore(searchText, topic.keywords);

        // 如果匹配分数 >= 2，认为匹配成功
        if (score >= 2) {
            matchedTopics.push(topic.id);
            // 根据优先级计算热度提升
            totalBoost += topic.priority / 100;
        }
    }

    return {
        topics: matchedTopics,
        boostFactor: 1 + totalBoost
    };
}

// 应用专题匹配到新闻列表
export function applyTopicMatching(newsItems: NewsItem[]): NewsItem[] {
    return newsItems.map(item => {
        const { topics, boostFactor } = matchTopics(item);

        return {
            ...item,
            matchedTopics: topics,
            heatIndex: Math.round(item.heatIndex * boostFactor)
        };
    });
}

// 获取专题信息
export function getTopicInfo(topicId: string): Topic | null {
    const topics = loadTopics();
    return topics.find(t => t.id === topicId) || null;
}
