import fs from 'fs';
import path from 'path';
import { DailyReport } from '@/types';
import { ReportView } from '@/components/ReportView';
import { Sidebar } from '@/components/Sidebar';
import { TriggerButton } from '@/components/TriggerButton';
import Link from 'next/link';
import { Suspense } from 'react';

async function getReport(date?: string): Promise<DailyReport | null> {
  const reportsDir = path.join(process.cwd(), 'data', 'reports');
  if (!fs.existsSync(reportsDir)) return null;

  let filename = '';
  if (date) {
    filename = `${date}.json`;
  } else {
    const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json')).sort().reverse();
    if (files.length === 0) return null;
    filename = files[0];
  }

  const filePath = path.join(reportsDir, filename);
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function loadTopicsMap() {
  try {
    const topicsPath = path.join(process.cwd(), 'data', 'topics.json');
    if (fs.existsSync(topicsPath)) {
      const data = fs.readFileSync(topicsPath, 'utf-8');
      const config = JSON.parse(data);
      const map: Record<string, { name: string; color: string }> = {};
      config.topics.forEach((t: any) => {
        map[t.id] = { name: t.name, color: t.color };
      });
      return map;
    }
  } catch (error) {
    console.error('Error loading topics:', error);
  }
  return {};
}

function getDates(): string[] {
  const reportsDir = path.join(process.cwd(), 'data', 'reports');
  if (!fs.existsSync(reportsDir)) return [];

  return fs.readdirSync(reportsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort()
    .reverse();
}

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams;
  const report = await getReport(params.date);
  const topicsMap = loadTopicsMap();
  const dates = getDates();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Suspense fallback={<div className="w-64 bg-white border-r h-screen" />}>
        <Sidebar dates={dates} />
      </Suspense>
      <main className="flex-1 ml-64 p-10">
        <div className="flex justify-between items-center mb-8 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">AI与科技新闻聚合</h1>
          <div className="flex items-center gap-4">
            <Link href="/topics" className="text-sm text-blue-600 hover:underline">
              专题管理
            </Link>
            <Link href="/sources" className="text-sm text-blue-600 hover:underline">
              信息源管理
            </Link>
            <TriggerButton />
          </div>
        </div>

        {report ? (
          <ReportView report={report} topicsMap={topicsMap} />
        ) : (
          <div className="text-center py-20 max-w-4xl mx-auto">
            <p className="text-gray-500 text-lg">
              {params.date ? `未找到 ${params.date} 的报告` : '还没有生成任何报告'}
            </p>
            {!params.date && (
              <p className="text-gray-400 mt-2">点击上方按钮生成第一份报告</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
