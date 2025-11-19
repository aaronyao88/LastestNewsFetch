import { runAggregation } from '../services/aggregator';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testPerformance() {
    console.log('=== 性能测试 ===\n');
    console.log('开始生成测试报告...\n');

    const startTime = Date.now();

    try {
        const testDate = '2025-11-20'; // 使用测试日期
        await runAggregation(testDate);

        const endTime = Date.now();
        const totalSeconds = ((endTime - startTime) / 1000).toFixed(1);

        console.log('\n=== 性能测试结果 ===');
        console.log(`总耗时: ${totalSeconds} 秒`);
        console.log(`\n优化效果:`);
        console.log(`- 之前: 每条新闻 1 秒延迟 (20条 = 20秒+)`);
        console.log(`- 现在: 批量并行处理 (5条/批，延迟 0.2秒)`);
        console.log(`- 预计提升: 约 5-10倍速度提升`);

    } catch (error: any) {
        console.error('测试失败:', error.message);
    }
}

testPerformance();
