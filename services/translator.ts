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

    // Helper to strip HTML and truncate
    const cleanAndTruncate = (text: string, maxLength: number = 4000) => {
        const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (plainText.length <= maxLength) return plainText;
        return plainText.substring(0, maxLength) + '...';
    };

    const cleanedContent = cleanAndTruncate(item.summary);

    let retries = 2;
    while (retries >= 0) {
        try {
            const completion = await config.client.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are an expert tech news analyst and translator. Your task is to process a raw news item and convert it into a structured Chinese report.
              
              Based on the provided Title and Content/Summary, generate a JSON response with the following fields:
              1. "title": Translate the title to Chinese (attractive, click-baity but accurate).
              2. "summary": A detailed summary in **Simplified Chinese**, between 150-300 words. Cover the key facts, context, and significance. Remove redundancy. **IMPORTANT**: Use **double asterisks** to highlight key terms, numbers, company names, and important concepts (e.g., **Microsoft**, **GPT-4**, **增长50%**).
              3. "marketReaction": Analyze the potential impact on the market, stock prices, or industry trends. If not explicitly mentioned, infer reasonable reactions based on the news type. Write in **Simplified Chinese**. **IMPORTANT**: Use **double asterisks** to highlight key metrics, stock symbols, and important market terms.
              4. "comments": Generate 5 distinct, realistic "user comments" that represent different viewpoints (e.g., excited, skeptical, analytical, humorous) regarding this news. Write in **Simplified Chinese**.
              
              Ensure the tone is professional yet engaging for a tech-savvy audience. The output MUST be in Chinese.`
                    },
                    {
                        role: "user",
                        content: `Title: ${item.title}\nContent: ${cleanedContent}`
                    }
                ],
                model: config.model,
                response_format: { type: "json_object" },
                temperature: 0.7,
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

            // If content is empty, treat as error to trigger retry
            throw new Error('Empty response from LLM');

        } catch (error: any) {
            console.error(`Translation error for "${item.title}" (Attempt ${3 - retries}):`, error?.message || error);
            retries--;
            if (retries < 0) break;
            // Exponential backoff: 1s, 2s
            await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries)));
        }
    }

    return item;
}
