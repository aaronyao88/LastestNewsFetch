import OpenAI from 'openai';
import { ChatOpenAI } from "@langchain/openai";

export const getClient = () => {
    const kimiKey = process.env.KIMI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (kimiKey) {
        return {
            client: new OpenAI({
                apiKey: kimiKey,
                baseURL: 'https://api.moonshot.cn/v1',
            }),
            model: 'kimi-k2-turbo-preview',
            provider: 'kimi'
        };
    } else if (openAiKey) {
        return {
            client: new OpenAI({
                apiKey: openAiKey,
            }),
            model: 'gpt-4o',
            provider: 'openai'
        };
    }
    return null;
};

export const getLangChainClient = () => {
    const config = getClient();
    if (!config) return null;

    if (config.provider === 'kimi') {
        return new ChatOpenAI({
            apiKey: process.env.KIMI_API_KEY, // Use 'apiKey' instead of 'openAIApiKey' for newer SDK versions or just to be safe
            configuration: {
                baseURL: 'https://api.moonshot.cn/v1',
            },
            modelName: 'kimi-k2-turbo-preview',
            temperature: 0
        });
    } else {
        return new ChatOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            modelName: 'gpt-4o',
            temperature: 0
        });
    }
};
