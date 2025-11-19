import { translateNewsItem } from '../services/translator';
import { NewsItem } from '../types';
import dotenv from 'dotenv';

// Load env vars manually for this script
dotenv.config({ path: '.env.local' });

async function test() {
    console.log('KIMI_API_KEY:', process.env.KIMI_API_KEY ? 'Found' : 'Not Found');
    console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Found' : 'Not Found');

    const mockItem: NewsItem = {
        id: '1',
        title: 'OpenAI releases GPT-5 with amazing capabilities',
        category: 'AI',
        summary: 'OpenAI has just announced the release of GPT-5, which promises to revolutionize the field of artificial intelligence with its enhanced reasoning and multimodal capabilities.',
        publishDate: new Date().toISOString(),
        url: 'https://example.com',
        source: 'Test Source',
        comments: [],
        heatIndex: 1000
    };

    console.log('Original:', mockItem.title);
    const translated = await translateNewsItem(mockItem);
    console.log('Translated Title:', translated.title);
    console.log('Translated Summary:', translated.summary);
    console.log('Market Reaction:', translated.marketReaction);
}

test();
