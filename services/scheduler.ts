
import cron from 'node-cron';
import { runAggregation } from './aggregator';

// Prevent multiple initializations in development
const globalForScheduler = global as unknown as { schedulerInitialized: boolean };

export function initScheduler() {
    if (globalForScheduler.schedulerInitialized) {
        console.log('[Scheduler] Already initialized, skipping...');
        return;
    }

    console.log('[Scheduler] Initializing cron jobs...');

    // Check for API keys
    const hasKimiKey = !!process.env.KIMI_API_KEY;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    console.log(`[Scheduler] Environment Check: KIMI_API_KEY=${hasKimiKey}, OPENAI_API_KEY=${hasOpenAIKey}`);

    // Schedule for 10:00 AM daily
    cron.schedule('0 10 * * *', async () => {
        console.log('[Scheduler] Running scheduled task: 10:00 AM Fetch');
        try {
            await runAggregation();
        } catch (error) {
            console.error('[Scheduler] 10:00 AM task failed:', error);
        }
    }, {
        timezone: "Asia/Shanghai"
    });

    // Schedule for 6:00 PM (18:00) daily
    cron.schedule('0 18 * * *', async () => {
        console.log('[Scheduler] Running scheduled task: 6:00 PM Fetch');
        try {
            await runAggregation();
        } catch (error) {
            console.error('[Scheduler] 6:00 PM task failed:', error);
        }
    }, {
        timezone: "Asia/Shanghai"
    });

    console.log('[Scheduler] Jobs scheduled for 10:00 AM and 18:00 PM (Asia/Shanghai)');
    globalForScheduler.schedulerInitialized = true;
}
