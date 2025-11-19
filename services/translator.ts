import OpenAI from 'openai';
import { NewsItem } from '@/types';

// Configuration for Kimi (Moonshot) or OpenAI
const getClient = () => {
    const kimiKey = process.env.KIMI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (kimiKey) {
        return {
            client: new OpenAI({
                apiKey: kimiKey,
                baseURL: 'https://api.moonshot.cn/v1',
                dangerouslyAllowBrowser: true
            }),
            model: 'moonshot-v1-8k'
        };
    } else if (openAiKey) {
        return {
            client: new OpenAI({
                apiKey: openAiKey,
                dangerouslyAllowBrowser: true
            }),
            model: 'gpt-4o'
        };
    }
    return null;
};

export async function translateNewsItem(item: NewsItem): Promise<NewsItem> {
    const config = getClient();

    if (!config) {
        console.warn('No Translation API Key (Kimi/OpenAI) found, skipping translation');
        return item;
    }

    try {
        const completion = await config.client.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert tech news analyst and translator. Your task is to process a raw news item and convert it into a structured Chinese report.
          
          Based on the provided Title and Content/Summary, generate a JSON response with the following fields:
          1. "title": Translate the title to Chinese (attractive, click-baity but accurate).
          2. "summary": A detailed summary in Chinese, at least 100 words. Cover the key facts, context, and significance.
          3. "marketReaction": Analyze the potential impact on the market, stock prices, or industry trends. If not explicitly mentioned, infer reasonable reactions based on the news type. Write in Chinese.
          4. "comments": Generate 5 distinct, realistic "user comments" that represent different viewpoints (e.g., excited, skeptical, analytical, humorous) regarding this news. Write in Chinese.
          
          Ensure the tone is professional yet engaging for a tech-savvy audience.`
                },
                {
                    role: "user",
                    content: `Title: ${item.title}\nContent: ${item.summary}`
                }
            ],
            model: config.model,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        if (content) {
            const result = JSON.parse(content);
            return {
                ...item,
                originalTitle: item.title,
                originalSummary: item.summary,
                title: result.title || item.title,
                summary: result.summary || item.summary,
                marketReaction: result.marketReaction || '暂无市场反应',
                comments: result.comments || []
            };
        };
    } catch (error: any) {
        console.error(`Translation error for "${item.title}":`, error?.message || error);
    }

    return item;
}
