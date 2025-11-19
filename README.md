# Tech News Aggregator

A Next.js application that aggregates AI and Tech news daily, translates it to Chinese, and presents it in a dashboard.

## Features
- **Daily Aggregation**: Fetches news from RSS feeds (and extensible for other sources).
- **Translation**: Auto-translates content to Chinese using OpenAI (requires API Key).
- **Dashboard**: View latest and archived reports.
- **Scheduling**: Includes a script and LaunchAgent for daily automation.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

## Environment Setup

1. Create a `.env.local` file in the root directory.
2. Add your API keys:

```bash
# Kimi (Moonshot) API Key (Preferred for Chinese translation)
KIMI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx

# OpenAI API Key (Fallback)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx

# Twitter/X.com API Bearer Token (Optional, for X.com integration)
# Get your token at: https://developer.twitter.com/en/portal/dashboard
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAxxxxxxxxxxxxxxxxx
```

If `KIMI_API_KEY` is present, the system will use the Moonshot AI model (`moonshot-v1-8k`) for translations. Otherwise, it falls back to OpenAI (`gpt-4o`).

If `TWITTER_BEARER_TOKEN` is present, the system will fetch tweets from key AI/tech influencers on X.com.

3. **Run Locally**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000).

4. **Manual Aggregation**
   Run the script directly:
   ```bash
   npx tsx scripts/run-daily.ts
   ```
   Or click the "Trigger Aggregation" button in the UI.

## Scheduling (macOS)

To run the aggregation daily at 10:00 AM:

1. Edit `com.user.newsaggregator.plist` to ensure paths are correct (check `which npx`).
2. Copy the plist to LaunchAgents:
   ```bash
   cp com.user.newsaggregator.plist ~/Library/LaunchAgents/
   ```
3. Load the job:
   ```bash
   launchctl load ~/Library/LaunchAgents/com.user.newsaggregator.plist
   ```

## Project Structure
- `app/`: Next.js App Router pages and API.
- `services/`: Core logic (Fetcher, Translator, Aggregator).
- `scripts/`: Standalone scripts for automation.
- `data/reports/`: JSON storage for daily reports.


##testtest