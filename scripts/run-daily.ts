import { runAggregation } from '../services/aggregator';
import dotenv from 'dotenv';

// Load env vars from .env.local
dotenv.config({ path: '.env.local' });

async function main() {
    try {
        await runAggregation();
        console.log('Daily aggregation completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Daily aggregation failed:', error);
        process.exit(1);
    }
}

main();
