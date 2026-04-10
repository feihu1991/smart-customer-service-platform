'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatsCard } from '@/components/shared/stats-card'
import {
  Clock, Zap, ThumbsUp, BarChart3, TrendingUp,
  Target, Award, Users
} from 'lucide-react'

type Period = '7' | '30' | '90'

interface AnalyticsData {
  totalReviews: number
  negativeReviews: number
  aiProcessRate: number
  avgReplyTime: number
  satisfactionRate: number
  recoveryRate: number
  trendData: { date: string; count: number; positive: number; negative: number; neutral: number }[]
  badReviewReasons: { name: string; count: number }[]
  categories: { name: string; count: number }[]
}

export function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('7')

  const loadData = useCallback(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handlePeriodChange = (p: Period) => {
    setLoading(true)
    setPeriod(p)
    loadData()
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  if (!data) return <div className="p-6 text-center text-muted-foreground">加载数据失败</div>

  const periodLabels: Record<Period, string> = { '7': '7天', '30': '30天', '90': '90天' }

  return (
    <div className="p-6 space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">统计周期：</span>
        {(['7', '30', '90'] as Period[]).map(p => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            size="sm"
            className={`h-8 ${period === p ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
            onClick={() => handlePeriodChange(p)}
          >
            {periodLabels[p]}
          </Button>
        ))}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="AI处理量"
          value={Math.round(data.totalReviews * data.aiProcessRate / 100)}
          change={23}
          icon={Zap}
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
        />
        <StatsCard
          title="平均回复时间"
          value={`${data.avgReplyTime}分钟`}
          change={-15}
          icon={Clock}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
        />
        <StatsCard
          title="好评挽回率"
          value={`${data.recoveryRate}%`}
          change={8}
          icon={ThumbsUp}
          iconBg="bg-green-50"
          iconColor="text-green-500"
        />
        <StatsCard
          title="客户满意度"
          value={`${data.satisfactionRate}%`}
          change={5}
          icon={Award}
          iconBg="bg-purple-50"
          iconColor="text-purple-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bad Review Reasons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-red-500" />
              差评原因分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.badReviewReasons.map((reason, i) => {
                const maxCount = Math.max(...data.badReviewReasons.map(r => r.count), 1)
                const pct = Math.round((reason.count / maxCount) * 100)
                const colors = ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500']
                return (
                  <div key={reason.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 font-medium">{reason.name}</span>
                      <span className="text-muted-foreground">{reason.count}条 ({Math.round(reason.count / 12 * 100)}%)</span>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className={`h-full rounded-lg ${colors[i % colors.length]} transition-all duration-700 flex items-center px-3`}
                        style={{ width: `${pct}%` }}
                      >
                        <span className="text-xs text-white font-medium">{reason.count}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Reply Effect Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              回复效果趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-orange-500" />
                回复率
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-green-500" />
                好评率
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                满意度
              </div>
            </div>

            {/* Line Chart (CSS-based) */}
            <div className="relative h-48">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-4 w-8 flex flex-col justify-between text-[10px] text-muted-foreground">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>

              {/* Grid lines */}
              <div className="ml-10 h-full relative">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="absolute w-full h-px bg-gray-100" style={{ bottom: `${i * 25}%` }} />
                ))}

                {/* Data lines */}
                {[
                  { color: 'bg-orange-500', data: [65, 70, 68, 75, 78, 82, 85] },
                  { color: 'bg-green-500', data: [60, 58, 62, 65, 68, 72, 75] },
                  { color: 'bg-blue-500', data: [80, 82, 79, 85, 88, 86, 90] },
                ].map((line, li) => {
                  const points = line.data.map((v, i) => ({
                    x: `${(i / (line.data.length - 1)) * 100}%`,
                    y: `${100 - v}%`,
                  }))
                  // Create SVG polyline
                  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${parseFloat(p.x) / 100 * 100} ${(parseFloat(p.y) / 100 * 100)}`).join(' ')
                  return (
                    <svg
                      key={li}
                      className="absolute inset-0 w-full h-full"
                      preserveAspectRatio="none"
                      viewBox="0 0 100 100"
                    >
                      <polyline
                        fill="none"
                        stroke={li === 0 ? '#f97316' : li === 1 ? '#22c55e' : '#3b82f6'}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={line.data.map((v, i) => `${(i / (line.data.length - 1)) * 100},${100 - v}`).join(' ')}
                      />
                      {/* Dots */}
                      {line.data.map((v, i) => (
                        <circle
                          key={i}
                          cx={(i / (line.data.length - 1)) * 100}
                          cy={100 - v}
                          r="2"
                          fill={li === 0 ? '#f97316' : li === 1 ? '#22c55e' : '#3b82f6'}
                        />
                      ))}
                    </svg>
                  )
                })}

                {/* X-axis labels */}
                <div className="absolute -bottom-4 left-0 right-0 flex justify-between text-[10px] text-muted-foreground">
                  {data.trendData.map((d, i) => (
                    <span key={i}>{d.date}</span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CS KPI Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-500" />
            客服KPI概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900">{data.totalReviews}</p>
              <p className="text-xs text-muted-foreground mt-1">总评价数</p>
              <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-red-500">{data.negativeReviews}</p>
              <p className="text-xs text-muted-foreground mt-1">差评总数</p>
              <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${(data.negativeReviews / data.totalReviews) * 100}%` }} />
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-green-500">{data.recoveryRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">好评挽回率</p>
              <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${data.recoveryRate}%` }} />
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-500">{data.aiProcessRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">AI自动化率</p>
              <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${data.aiProcessRate}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
