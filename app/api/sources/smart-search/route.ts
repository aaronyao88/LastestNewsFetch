import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Parser from 'rss-parser';
import { findRssWithAgent } from '@/services/rss-agent';
import fs from 'fs';
import path from 'path';
import { getClient } from '@/lib/llm';

export async function POST(request: Request) {
    try {
        let keyword: string;
        try {
            const body = await request.json();
            keyword = body?.keyword;
        } catch (e) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
            return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
        }

        // Check Feature Flag
        let useAgent = false;
        try {
            const featuresPath = path.join(process.cwd(), 'data/features.json');
            if (fs.existsSync(featuresPath)) {
                const features = JSON.parse(fs.readFileSync(featuresPath, 'utf-8'));
                useAgent = features?.useAgentSearch === true;
            }
        } catch (e) {
            console.error("Failed to read feature flags", e);
            // Continue with legacy method if feature flag read fails
        }

        if (useAgent) {
            console.log(`[SmartSearch] Using Agent for: ${keyword}`);
            try {
                const agentResult = await findRssWithAgent(keyword);
                if (agentResult?.result) {
                    return NextResponse.json({
                        result: agentResult.result,
                        logs: agentResult.logs || []
                    });
                } else {
                    // Agent didn't find result, fallback to legacy method
                    console.log("Agent did not find result, falling back to legacy search...");
                }
            } catch (e) {
                console.error("Agent search failed:", e);
                // Fallback to legacy method if agent crashes
                console.log("Falling back to legacy search due to agent error...");
            }
        }

        // Legacy Method (Direct LLM)
        const config = getClient();
        if (!config) {
            return NextResponse.json({ error: 'No API Key configured' }, { status: 500 });
        }

        // 1. Ask LLM for potential RSS feeds (multiple candidates)
        const completion = await config.client.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert at finding RSS feeds. 
                    User will provide a keyword, website name, or topic.
                    Your goal is to find the most likely VALID RSS feed URL for it.
                    
                    Return a JSON object with:
                    - "candidates": A list of strings, each being a potential RSS feed URL. List the most likely ones first. Provide at least 3 variations if possible (e.g. /feed, /rss, /atom.xml, /blog/feed).
                    - "source": A short, displayable name for the source.
                    - "category": One of ["AI", "Technology", "US Stocks", "US Economy"]. Choose the best fit.
                    
                    If the keyword is a general topic (e.g. "Tech News"), provide a popular, high-quality source (e.g. TechCrunch, Verge).
                    `
                },
                {
                    role: "user",
                    content: `Find RSS feed for: ${keyword}`
                }
            ],
            model: config.model,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            return NextResponse.json({ error: 'Failed to generate suggestion' }, { status: 500 });
        }

        const suggestion = JSON.parse(content);
        // Handle both 'candidates' array and legacy/fallback 'url' field
        const candidates = Array.isArray(suggestion.candidates)
            ? suggestion.candidates
            : (suggestion.url ? [suggestion.url] : []);

        if (candidates.length === 0) {
            return NextResponse.json({ error: 'AI could not find any RSS candidates.' }, { status: 404 });
        }

        // 2. Validate the RSS feeds - check if accessible AND has news items
        const parser = new Parser({
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)' }
        });

        let validUrl = null;
        let feedHasItems = false;

        for (const url of candidates) {
            try {
                console.log(`Checking URL: ${url}`);
                const feed = await parser.parseURL(url);

                // Check if feed has at least one item
                if (feed.items && feed.items.length > 0) {
                    validUrl = url;
                    feedHasItems = true;
                    console.log(`✓ Valid RSS with ${feed.items.length} items: ${url}`);
                    break; // Found a valid one with content
                } else {
                    console.log(`RSS accessible but no items found: ${url}`);
                }
            } catch (e) {
                console.log(`Validation failed for ${url}: ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
        }

        if (!validUrl || !feedHasItems) {
            return NextResponse.json({
                error: '未找到可访问且包含新闻的 RSS 源，请尝试其他关键词或使用手动添加'
            }, { status: 404 });
        }

        return NextResponse.json({
            result: {
                url: validUrl,
                source: suggestion.source,
                category: suggestion.category
            }
        });

    } catch (error: any) {
        console.error('Smart search error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
