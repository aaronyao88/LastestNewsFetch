
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { runAggregation } from '../services/aggregator';

async function trigger() {
    console.log('Manually triggering aggregation...');
    try {
        await runAggregation();
        console.log('Aggregation completed successfully.');
    } catch (error) {
        console.error('Aggregation failed:', error);
    }
}

trigger();
