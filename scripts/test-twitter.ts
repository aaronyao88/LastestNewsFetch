import { fetchTwitterNews } from '../services/twitter-fetcher';
import dotenv from 'dotenv';

// Load env vars manually for this script
dotenv.config({ path: '.env.local' });

async function test() {
    console.log('=== Twitter Integration Test ===\n');
    console.log('TWITTER_BEARER_TOKEN:', process.env.TWITTER_BEARER_TOKEN ? 'Found ✓' : 'Not Found ✗');

    if (!process.env.TWITTER_BEARER_TOKEN) {
        console.error('Error: No Twitter Bearer Token found in .env.local');
        process.exit(1);
    }

    console.log('\nFetching tweets from tracked accounts...\n');

    try {
        const tweets = await fetchTwitterNews();

        console.log(`\n✓ Successfully fetched ${tweets.length} tweets\n`);

        if (tweets.length > 0) {
            console.log('Sample tweets:\n');
            tweets.slice(0, 3).forEach((tweet, idx) => {
                console.log(`${idx + 1}. ${tweet.title}`);
                console.log(`   Source: ${tweet.source}`);
                console.log(`   Heat Index: ${tweet.heatIndex}`);
                console.log(`   URL: ${tweet.url}`);
                console.log(`   Date: ${new Date(tweet.publishDate).toLocaleString('zh-CN')}`);
                console.log('');
            });
        } else {
            console.log('Note: No tweets found in the last 24 hours from tracked accounts.');
            console.log('This is normal if the accounts haven\'t posted recently.');
        }

        console.log('✓ Twitter integration is working correctly!');
    } catch (error: any) {
        console.error('\n✗ Error testing Twitter integration:');
        console.error(error?.message || error);
        process.exit(1);
    }
}

test();
