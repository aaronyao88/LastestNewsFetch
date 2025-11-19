export type Category = 'AI' | 'Technology' | 'US Stocks' | 'US Economy' | 'Other';

export interface NewsItem {
  id: string;
  title: string;
  category: Category;
  summary: string;
  marketReaction?: string;
  publishDate: string; // ISO string
  comments: string[];
  url: string;
  heatIndex: number;
  source: string;
  originalTitle?: string;
  originalSummary?: string;
  matchedTopics?: string[]; // 匹配的专题 ID
}

export interface ShortNewsItem {
  description: string;
  url: string;
}

export interface DailyReport {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  items: NewsItem[];
  shorts: ShortNewsItem[];
  createdAt: string;
}
