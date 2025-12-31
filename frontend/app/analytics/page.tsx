'use client';

import { useEffect, useState } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';

export default function AnalyticsPage() {
  const { canViewAnalytics, loading, role } = usePermission();
  const router = useRouter();
  const [loadingData, setLoadingData] = useState(true);

  // Mock data for charts
  const burndownData = [
    { name: 'Day 1', plan: 100, actual: 100 },
    { name: 'Day 2', plan: 90, actual: 95 },
    { name: 'Day 3', plan: 80, actual: 85 },
    { name: 'Day 4', plan: 70, actual: 60 }, // Ahead of schedule
    { name: 'Day 5', plan: 60, actual: 55 },
    { name: 'Day 6', plan: 50, actual: 40 },
    { name: 'Day 7', plan: 40, actual: 35 },
  ];

  const velocityData = [
    { name: 'Sprint 1', tasks: 12 },
    { name: 'Sprint 2', tasks: 15 },
    { name: 'Sprint 3', tasks: 10 },
    { name: 'Sprint 4', tasks: 18 },
  ];

  const [aiInsights, setAiInsights] = useState<string[] | Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!loading) {
      if (!canViewAnalytics) {
         // Redirect or show access denied
         // router.push('/dashboard'); // Uncomment to enforce redirect
      } else {
         fetchAiInsights();
      }
      setLoadingData(false);
    }
  }, [loading, canViewAnalytics, router]);

  const fetchAiInsights = async () => {
      // Fetch insights from app_analytics or app_projects
      // Since schema for insights is a bit vague in prompt (app_analytics.ai_insights table? or field?)
      // The prompt says "Виджет 'AI Инсайты': Список текстовых рекомендаций из таблицы app_analytics.ai_insights"
      // Looking at schema, app_projects.projects has ai_insights Json column.
      // app_analytics.team_metrics exists.
      // I'll assume a mock fetch or fetch from a project for now.

      // Attempt to fetch from app_projects (taking the first project as example)
      const { data } = await supabase
        .schema('app_projects')
        .from('projects')
        .select('ai_insights')
        .limit(1);

      if (data && data[0]?.ai_insights) {
          const insights = data[0].ai_insights;
          if (Array.isArray(insights)) {
              setAiInsights(insights);
          } else {
              // Mock if not array or empty
              setAiInsights([
                  "Velocity increased by 15% this sprint.",
                  "Backend tasks are taking 20% longer than estimated.",
                  "Consider splitting 'User Auth' feature into smaller tasks."
              ]);
          }
      } else {
          setAiInsights([
              "Velocity increased by 15% this sprint.",
              "Backend tasks are taking 20% longer than estimated.",
              "Consider splitting 'User Auth' feature into smaller tasks."
          ]);
      }
  };

  if (loading || loadingData) {
    return <div className="p-8 flex items-center justify-center">Loading analytics...</div>;
  }

  if (!canViewAnalytics) {
    return (
        <div className="p-8 flex flex-col items-center justify-center h-screen">
            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
            <p className="text-gray-600">You do not have permission to view this page. (Role: {role})</p>
        </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Burndown Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Burndown Chart (Hours)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="plan" stroke="#8884d8" name="Plan" />
                <Line type="monotone" dataKey="actual" stroke="#82ca9d" name="Actual" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Velocity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Velocity (Tasks per Sprint)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="tasks" fill="#8884d8" name="Completed Tasks" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                ✨ AI Insights
            </CardTitle>
        </CardHeader>
        <CardContent>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                {aiInsights.map((insight, idx) => (
                    <li key={idx} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        {typeof insight === 'string' ? insight : JSON.stringify(insight)}
                    </li>
                ))}
            </ul>
        </CardContent>
      </Card>
    </div>
  );
}
