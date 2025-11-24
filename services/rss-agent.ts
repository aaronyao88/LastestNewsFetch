import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { getLangChainClient } from "@/lib/llm";
import { searchWeb, fetchPageContent } from "@/lib/search-tool";
import Parser from "rss-parser";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { logAgent } from "@/lib/logger";

// Define State using Annotation
const AgentState = Annotation.Root({
    keyword: Annotation<string>,
    plan: Annotation<string[]>({
        reducer: (x, y) => y,
        default: () => []
    }),
    currentStep: Annotation<number>({
        reducer: (x, y) => y,
        default: () => 0
    }),
    searchQuery: Annotation<string>({
        reducer: (x, y) => y,
        default: () => ""
    }),
    searchResults: Annotation<any[]>({
        reducer: (x, y) => [...x, ...y], // Accumulate search results
        default: () => []
    }),
    candidates: Annotation<string[]>({
        reducer: (x, y) => [...x, ...y], // Accumulate candidates
        default: () => []
    }),
    finalResult: Annotation<any>({
        reducer: (x, y) => y,
        default: () => null
    }),
    logs: Annotation<string[]>({
        reducer: (x, y) => [...x, ...y],
        default: () => []
    }),
    attempts: Annotation<number>({
        reducer: (x, y) => y,
        default: () => 0
    }),
    validationAttempts: Annotation<number>({
        reducer: (x, y) => y,
        default: () => 0
    })
});

// Node 1: Planner
// The planner decides what to do next based on the keyword and current state.
async function plannerNode(state: typeof AgentState.State) {
    const llm = getLangChainClient();
    if (!llm) throw new Error("No LLM configured");

    logAgent(`[Agent] Planning for: ${state.keyword}`);

    const prompt = `
    You are an expert RSS feed finder agent.
    Your goal is to find a valid RSS feed for the user's request: "${state.keyword}".
    
    Current State:
    - Search Results Found: ${state.searchResults.length}
    - Candidates Found: ${state.candidates.length}
    
    Devise a step-by-step plan to find the RSS feed.
    Available Actions:
    1. "search": Search Google/Baidu. You can try English names or specific terms like "feed", "xml".
    2. "extract": Analyze search results to find potential RSS URLs.
    3. "validate": Check if found candidates are valid RSS feeds.
    4. "finish": If a valid feed is found or if you give up.

    Return a JSON object with a "plan" key containing an array of action strings.
    
    Example Plan: ["search", "extract", "validate"]
    `;

    const response = await llm.invoke([
        new SystemMessage("You are a planning agent. Output JSON only."),
        new HumanMessage(prompt)
    ]);

    let plan: string[] = ["search", "extract", "validate"]; // Default plan
    try {
        const content = response.content.toString();
        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.plan && Array.isArray(parsed.plan)) {
            plan = parsed.plan;
        }
    } catch (e) {
        console.error("Failed to parse plan", e);
    }

    logAgent(`[Agent] Plan: ${plan.join(' -> ')}`);
    return {
        plan,
        currentStep: 0,
        logs: [`Plan: ${plan.join(' -> ')}`]
    };
}

// Node 2: Executor (Router)
// ...

// Node: Search
async function searchNode(state: typeof AgentState.State) {
    // Use the specific search query if provided by the agent, otherwise default to keyword + RSS
    const query = state.searchQuery || `${state.keyword} RSS feed`;
    logAgent(`[Agent] Executing Search for: ${query}`);

    // Search both engines
    const [googleResults, baiduResults] = await Promise.all([
        searchWeb(query, 'google'),
        searchWeb(query, 'baidu')
    ]);

    const combined = [...googleResults, ...baiduResults];
    logAgent(`[Agent] Found ${combined.length} search results`);

    return {
        searchResults: combined,
        logs: [`Executed Search for '${query}': Found ${combined.length} results.`]
    };
}

// Node: Extract
async function extractNode(state: typeof AgentState.State) {
    const llm = getLangChainClient();
    if (!llm) throw new Error("No LLM configured");

    logAgent(`[Agent] Executing Extraction...`);

    const resultsText = state.searchResults.map((r, i) => `${i + 1}. [${r.title}](${r.link}) - ${r.snippet || ''}`).join('\n');

    const prompt = `
    Analyze the search results for "${state.keyword}" to find RSS feeds.
    
    Search Results:
    ${resultsText}
    
    Return JSON with "candidates" (array of URLs).
    STRATEGY:
    1. Direct RSS links (.xml, .rss, /feed/).
    2. Guess common paths for main sites (e.g. /feed, /rss).
    3. LOOK FOR SYNDICATION DOMAINS: For big media, feeds often live on separate domains (e.g. feeds.content.dowjones.io for WSJ, rss.nytimes.com).
    4. If you see a URL that looks like a feed (contains 'rss', 'feed', 'xml'), INCLUDE IT.
    `;

    const response = await llm.invoke([
        new SystemMessage("Extract RSS candidates. Output JSON only."),
        new HumanMessage(prompt)
    ]);

    let candidates: string[] = [];
    try {
        const content = response.content.toString();
        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        candidates = parsed.candidates || [];
    } catch (e) {
        console.error("Extraction failed", e);
    }

    logAgent(`[Agent] Extracted ${candidates.length} candidates`);

    return {
        candidates,
        logs: [`Executed Extraction: Found ${candidates.length} candidates.`]
    };
}

// Helper function to normalize URL (handle http -> https redirects)
function normalizeUrl(url: string): string[] {
    const urls = [url];
    // If URL is http, also try https version
    if (url.startsWith('http://')) {
        urls.push(url.replace('http://', 'https://'));
    }
    // If URL is https, also try http version
    if (url.startsWith('https://')) {
        urls.push(url.replace('https://', 'http://'));
    }
    return urls;
}

// Helper function to validate RSS feed with direct fetch
async function validateWithFetch(url: string, parser: Parser): Promise<{ feed: any; success: boolean }> {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache'
            },
            redirect: 'follow', // Follow redirects
            signal: AbortSignal.timeout(15000) // 15 second timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('xml') && !contentType.includes('rss') && !contentType.includes('atom')) {
            // Still try to parse, some servers don't set content-type correctly
            logAgent(`[Agent] Warning: Unexpected content-type ${contentType} for ${url}, attempting to parse anyway`);
        }

        const text = await response.text();
        if (!text || text.trim().length === 0) {
            throw new Error('Empty response');
        }

        const feed = await parser.parseString(text);
        return { feed, success: true };
    } catch (e) {
        return { feed: null, success: false };
    }
}

// Node: Validate
async function validateNode(state: typeof AgentState.State) {
    // Increment validation attempts
    const validationAttempts = (state.validationAttempts || 0) + 1;
    
    // If we've tried too many times, give up
    const MAX_VALIDATION_ATTEMPTS = 3;
    if (validationAttempts > MAX_VALIDATION_ATTEMPTS) {
        logAgent(`[Agent] Max validation attempts (${MAX_VALIDATION_ATTEMPTS}) reached. Giving up.`);
        return {
            validationAttempts,
            logs: [`Validation failed: Max attempts (${MAX_VALIDATION_ATTEMPTS}) reached.`]
        };
    }

    logAgent(`[Agent] Validation attempt ${validationAttempts}/${MAX_VALIDATION_ATTEMPTS}`);

    const parser = new Parser({
        timeout: 15000, // Increased timeout
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br'
        }
    });

    logAgent(`[Agent] Executing Validation on ${state.candidates.length} candidates...`);
    let validUrl = null;
    let sourceName = state.keyword;
    let category = "Other";
    
    // Limit the number of candidates to check (avoid checking too many URLs)
    const MAX_CANDIDATES_TO_CHECK = 5;
    const candidatesToCheck = state.candidates.slice(0, MAX_CANDIDATES_TO_CHECK);

    for (const originalUrl of candidatesToCheck) {
        // Try normalized URLs (http/https variants)
        const urlsToTry = normalizeUrl(originalUrl);
        
        for (const url of urlsToTry) {
            try {
                logAgent(`[Agent] Checking ${url}`);
                
                // Method 1: Try rss-parser's parseURL
                try {
                    const feed = await parser.parseURL(url);
                    if (feed.items && feed.items.length > 0) {
                        validUrl = url;
                        sourceName = feed.title || state.keyword;
                        const text = (feed.title + " " + (feed.description || "")).toLowerCase();
                        if (text.includes('ai') || text.includes('intelligence')) category = 'AI';
                        else if (text.includes('tech')) category = 'Technology';
                        else if (text.includes('finance') || text.includes('stock')) category = 'US Stocks';
                        else if (text.includes('economy')) category = 'US Economy';
                        logAgent(`[Agent] Validation SUCCESS with parseURL: ${url}`);
                        break;
                    } else {
                        logAgent(`[Agent] parseURL succeeded but no items found for ${url}, trying other methods...`);
                    }
                } catch (parseUrlError) {
                    logAgent(`[Agent] parseURL failed for ${url}: ${parseUrlError instanceof Error ? parseUrlError.message : String(parseUrlError)}`);
                }
                
                // Method 2: Try direct fetch + parseString (if parseURL failed or found no items)
                if (!validUrl) {
                    try {
                        const { feed, success } = await validateWithFetch(url, parser);
                        if (success && feed && feed.items && feed.items.length > 0) {
                            validUrl = url;
                            sourceName = feed.title || state.keyword;
                            const text = (feed.title + " " + (feed.description || "")).toLowerCase();
                            if (text.includes('ai') || text.includes('intelligence')) category = 'AI';
                            else if (text.includes('tech')) category = 'Technology';
                            else if (text.includes('finance') || text.includes('stock')) category = 'US Stocks';
                            else if (text.includes('economy')) category = 'US Economy';
                            logAgent(`[Agent] Validation SUCCESS with direct fetch: ${url}`);
                            break;
                        } else {
                            logAgent(`[Agent] Direct fetch returned no valid feed for ${url}`);
                        }
                    } catch (fetchError) {
                        logAgent(`[Agent] Direct fetch error for ${url}: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
                    }
                }
                
                // Method 3: Try Puppeteer as last resort (if previous methods failed)
                if (!validUrl) {
                    try {
                        const content = await fetchPageContent(url);
                        const feed = await parser.parseString(content);
                        if (feed.items && feed.items.length > 0) {
                            validUrl = url;
                            sourceName = feed.title || state.keyword;
                            const text = (feed.title + " " + (feed.description || "")).toLowerCase();
                            if (text.includes('ai') || text.includes('intelligence')) category = 'AI';
                            else if (text.includes('tech')) category = 'Technology';
                            else if (text.includes('finance') || text.includes('stock')) category = 'US Stocks';
                            else if (text.includes('economy')) category = 'US Economy';
                            logAgent(`[Agent] Validation SUCCESS with Puppeteer: ${url}`);
                            break;
                        } else {
                            logAgent(`[Agent] Puppeteer found feed but no items for ${url}`);
                        }
                    } catch (puppeteerError) {
                        logAgent(`[Agent] Puppeteer validation failed for ${url}: ${puppeteerError instanceof Error ? puppeteerError.message : String(puppeteerError)}`);
                    }
                }
                
                // If we found a valid URL, break out of the outer loop
                if (validUrl) break;
            } catch (e) {
                logAgent(`[Agent] Unexpected error validating ${url}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
        
        // If we found a valid URL, break out of the candidates loop
        if (validUrl) break;
    }

    if (validUrl) {
        logAgent(`[Agent] Validation Success! Found: ${validUrl}`);
        return {
            finalResult: { url: validUrl, source: sourceName, category },
            validationAttempts,
            logs: [`Executed Validation: Success! Found ${validUrl}`]
        };
    }

    logAgent(`[Agent] Validation failed. No valid feed found in attempt ${validationAttempts}.`);
    return {
        validationAttempts,
        logs: [`Executed Validation: No valid feed found in attempt ${validationAttempts}.`]
    };
}

// Conditional Edge Logic
// Decides which node to go to next based on the plan and current progress.
function routeStep(state: typeof AgentState.State) {
    const plan = state.plan;
    const stepIndex = state.currentStep;

    // If we have a result, stop.
    if (state.finalResult) {
        return END;
    }

    // If we finished the plan, stop.
    if (stepIndex >= plan.length) {
        return END;
    }

    const nextAction = plan[stepIndex];

    // We need to increment the step for the NEXT turn, 
    // but since we are routing to a node, that node should probably increment it 
    // or we increment it in a separate "step manager" node.
    // To keep it simple: We will route to the specific node. 
    // The nodes themselves don't increment 'currentStep' in my previous implementation, 
    // so we might need a "next_step" node to increment.

    return nextAction;
}

// Helper node to increment step
async function nextStepNode(state: typeof AgentState.State) {
    return { currentStep: state.currentStep + 1 };
}

// Re-implementing the graph with the ReAct / Planner flow
export async function findRssWithAgent(keyword: string) {
    const workflow = new StateGraph(AgentState)
        .addNode("planner", plannerNode)
        .addNode("search", searchNode)
        .addNode("extract", extractNode)
        .addNode("validate", validateNode)
        .addNode("next_step", nextStepNode)

        // Start with planning
        .addEdge("__start__", "planner")

    // From planner, go to the first step (via router logic if we wanted dynamic, 
    // but here the planner just outputs a list. We need to execute them in order.)
    // Actually, a simpler ReAct loop is:
    // 1. Think (LLM decides action)
    // 2. Act (Tool execution)
    // 3. Observe (Result)
    // 4. Loop

    // Let's implement a "Brain" node that decides the NEXT action immediately, 
    // rather than a full upfront plan which might be brittle.
    // This is closer to true ReAct.

    // REVISED ARCHITECTURE for ReAct:
    // Node "agent": Decides next tool to call or to finish.
    // Node "tools": Executes the chosen tool.

    // Let's rewrite the graph below to be a true ReAct loop.

    return await findRssWithReAct(keyword);
}

// --- True ReAct Implementation ---

// Node: Initial Planner
async function initialPlannerNode(state: typeof AgentState.State) {
    const llm = getLangChainClient();
    if (!llm) throw new Error("No LLM configured");

    logAgent(`[Agent] Creating Initial Plan for: ${state.keyword}`);

    const prompt = `
    You are an expert RSS feed finder agent.
    Your goal is to find a valid RSS feed for the user's request: "${state.keyword}".
    
    Create a high-level plan to achieve this.
    Typically, the steps are:
    1. Search for the keyword + "RSS" or "feed".
    2. Extract potential URLs from search results.
    3. Validate the URLs to see if they are working RSS feeds.
    
    You can also consider searching for variations of the keyword if the first attempt fails, but start with a standard approach.
    
    Return a JSON object with a "plan" key containing a list of steps (strings) describing your strategy.
    Example: { "plan": ["Search for keyword RSS", "Extract URLs", "Validate URLs"] }
    `;

    const response = await llm.invoke([
        new SystemMessage("You are a planning agent. Output JSON only."),
        new HumanMessage(prompt)
    ]);

    let initialPlan: string[] = [];
    try {
        const content = response.content.toString();
        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        initialPlan = parsed.plan || [];
    } catch (e) {
        console.error("Initial planning failed", e);
        initialPlan = ["Search for RSS", "Extract Candidates", "Validate Candidates"];
    }

    logAgent(`[Agent Plan] Initial Plan: ${initialPlan.join(' -> ')}`);
    return {
        logs: [`Initial Plan: ${initialPlan.join(' -> ')}`]
    };
}

async function agentNode(state: typeof AgentState.State) {
    const llm = getLangChainClient();
    if (!llm) throw new Error("No LLM configured");

    // Increment attempts
    const attempts = (state.attempts || 0) + 1;
    const MAX_ATTEMPTS = 10; // Maximum total iterations

    // If we already have a result, just finish
    if (state.finalResult) {
        return { plan: ["finish"], attempts };
    }

    // If we've tried too many times, give up
    if (attempts >= MAX_ATTEMPTS) {
        logAgent(`[Agent] Max attempts (${MAX_ATTEMPTS}) reached. Giving up.`);
        return { 
            plan: ["finish"], 
            attempts,
            logs: [`Agent stopped: Max attempts (${MAX_ATTEMPTS}) reached.`]
        };
    }

    // If validation has failed multiple times with no new candidates, give up
    const validationAttempts = state.validationAttempts || 0;
    if (validationAttempts >= 3 && state.candidates.length === 0) {
        logAgent(`[Agent] Validation failed ${validationAttempts} times with no candidates. Giving up.`);
        return { 
            plan: ["finish"], 
            attempts,
            logs: [`Agent stopped: Validation failed ${validationAttempts} times with no new candidates.`]
        };
    }

    logAgent(`[Agent] Iteration ${attempts}/${MAX_ATTEMPTS}`);

    const prompt = `
    You are an RSS Finder Agent executing a plan.
    Goal: Find a valid RSS feed for "${state.keyword}".
    
    History:
    ${state.logs.join('\n')}
    
    Available Tools:
    - "search": Search web. You MUST provide a "search_query" if you choose this.
    - "extract": Extract URLs from search results.
    - "validate": Check candidate URLs.
    - "finish": If you found a valid URL or cannot find one.
    
    IMPORTANT RULES:
    1. If you see repeated validation failures with 404 errors, the URLs don't exist. Try searching again with different terms.
    2. If validation failed 3+ times and extract found no new candidates, you should "finish" (give up).
    3. Don't keep validating the same URLs that already failed.
    4. If initial search failed, try searching for the English name or specific terms like "xml", "feed".
    5. For major publications (like WSJ, NYT), look for "syndication" or parent company domains (e.g. dowjones.io for WSJ).
    
    Decide the ONE next best action.
    Return JSON: { "action": "tool_name", "search_query": "optional query string" }
    `;

    const response = await llm.invoke([
        new SystemMessage("Decide next action. JSON only."),
        new HumanMessage(prompt)
    ]);

    let action = "finish";
    let searchQuery = "";

    try {
        const content = response.content.toString();
        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        action = parsed.action || "finish";
        searchQuery = parsed.search_query || "";
    } catch (e) {
        console.error("Agent decision failed", e);
    }

    logAgent(`[ReAct] Decided action: ${action} ${searchQuery ? `(Query: ${searchQuery})` : ''}`);
    logAgent(`[Agent Thought] Based on history, decided to: ${action}`);

    return {
        plan: [action],
        searchQuery, // Update state with new query
        attempts,
        logs: [`Thought: Decided to run ${action} ${searchQuery ? `with query "${searchQuery}"` : ''}`]
    };
}

// Router
function router(state: typeof AgentState.State) {
    const action = state.plan[0];
    if (action === "search") return "search";
    if (action === "extract") return "extract";
    if (action === "validate") return "validate";
    return END;
}

async function findRssWithReAct(keyword: string) {
    const workflow = new StateGraph(AgentState)
        .addNode("planner", initialPlannerNode) // Add planner node
        .addNode("agent", agentNode)
        .addNode("search", searchNode)
        .addNode("extract", extractNode)
        .addNode("validate", validateNode)

        .addEdge("__start__", "planner") // Start with planner
        .addEdge("planner", "agent")      // Then go to agent loop

        .addConditionalEdges("agent", router, {
            search: "search",
            extract: "extract",
            validate: "validate",
            [END]: END
        })

        // After tools, go back to agent to think again
        .addEdge("search", "agent")
        .addEdge("extract", "agent")
        .addEdge("validate", "agent");

    const app = workflow.compile();
    const result = await app.invoke({ keyword });

    return {
        result: result.finalResult,
        logs: result.logs
    };
}
