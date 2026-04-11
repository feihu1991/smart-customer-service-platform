'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  MessageSquare, CheckCircle2, Clock, TrendingUp,
  AlertCircle, UserCheck, XCircle, BarChart3, PieChart
} from 'lucide-react'

type Period = '7' | '30' | 'all'

interface DashboardData {
  period: string
  overview: {
    totalReviews: number
    pendingReviews: number
    repliedReviews: number
    recoveredReviews: number
    replyRate: number
    recoveryRate: number
  }
  byRating: {
    negative: number
    neutral: number
    positive: number
  }
  statusDistribution: {
    pending: number
    contacted: number
    recovered: number
    failed: number
  }
}

interface TrendData {
  period: string
  days: number
  trendData: Array<{
    date: string
    total: number
    replied: number
    recovered: number
    negative: number
    positive: number
    replyRate: number
    recoveryRate: number
  }>
}

interface CategoryData {
  period: string
  byRating: Array<{ type: string; rating: number; count: number; percentage: number }>
  byReplyStatus: Array<{ status: string; label: string; count: number }>
  byRecoveryStatus: Array<{ status: string; label: string; count: number }>
  byCategory: Array<{ category: string; count: number }>
  byPlatform: Array<{ platform: string; label: string; count: number }>
}

// 简单的饼图组件
function SimplePieChart({ data, title }: { data: Array<{ label: string; value: number; color: string }>; title: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        暂无数据
      </div>
    )
  }

  // 计算百分比和角度
  let currentAngle = 0
  const slices = data.map(item => {
    const percentage = (item.value / total) * 100
    const angle = percentage * 3.6 // 360 / 100
    const slice = {
      ...item,
      percentage,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
    }
    currentAngle += angle
    return slice
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {slices.map((slice, i) => {
              const startRad = (slice.startAngle * Math.PI) / 180
              const endRad = (slice.endAngle * Math.PI) / 180
              const x1 = 50 + 40 * Math.cos(startRad)
              const y1 = 50 + 40 * Math.sin(startRad)
              const x2 = 50 + 40 * Math.cos(endRad)
              const y2 = 50 + 40 * Math.sin(endRad)
              const largeArc = slice.percentage > 50 ? 1 : 0
              
              if (slice.percentage === 100) {
                return (
                  <circle
                    key={i}
                    cx="50"
                    cy="50"
                    r="40"
                    fill={slice.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                )
              }
              
              return (
                <path
                  key={i}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={slice.color}
                  stroke="white"
                  strokeWidth="2"
                />
              )
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{total}</span>
            <span className="text-xs text-muted-foreground">总计</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="text-sm">{slice.label}</span>
            <span className="text-sm font-medium">{slice.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// 简单的柱状图组件
function SimpleBarChart({ data, title }: { data: Array<{ label: string; value: number; color: string }>; title: string }) {
  const maxValue = Math.max(...data.map(d => d.value), 1)
  
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
          <div className="h-6 bg-gray-100 rounded-lg overflow-hidden">
            <div
              className="h-full rounded-lg transition-all duration-500 flex items-center px-2"
              style={{ 
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color 
              }}
            >
              {item.value > 0 && (
                <span className="text-xs text-white font-medium">{item.value}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// 趋势图组件
function TrendChart({ data }: { data: TrendData['trendData'] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        暂无数据
      </div>
    )
  }

  // 采样数据点，避免太密集
  const sampleRate = Math.max(1, Math.floor(data.length / 14))
  const sampledData = data.filter((_, i) => i % sampleRate === 0 || i === data.length - 1)
  const maxRate = 100

  // 绘制折线
  const points = sampledData.map((d, i) => ({
    x: (i / (sampledData.length - 1)) * 100,
    y: 100 - (d.recoveryRate || 0),
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className="relative h-48">
      {/* Y轴标签 */}
      <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-muted-foreground">
        <span>100%</span>
        <span>50%</span>
        <span>0%</span>
      </div>

      {/* 图表区域 */}
      <div className="ml-12 h-full relative">
        {/* 网格线 */}
        {[0, 50, 100].map((v) => (
          <div
            key={v}
            className="absolute w-full h-px bg-gray-100"
            style={{ bottom: `${v}%` }}
          />
        ))}

        {/* SVG 图表 */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* 回复率线（橙色） */}
          <polyline
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={sampledData.map((d, i) => `${(i / (sampledData.length - 1)) * 100},${100 - d.replyRate}`).join(' ')}
          />
          
          {/* 挽回率线（绿色） */}
          <polyline
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
          />

          {/* 数据点 */}
          {sampledData.map((d, i) => (
            <g key={i}>
              {/* 回复率点 */}
              <circle
                cx={(i / (sampledData.length - 1)) * 100}
                cy={100 - d.replyRate}
                r="2"
                fill="#f97316"
              />
              {/* 挽回率点 */}
              <circle
                cx={(i / (sampledData.length - 1)) * 100}
                cy={100 - (d.recoveryRate || 0)}
                r="2"
                fill="#22c55e"
              />
            </g>
          ))}
        </svg>

        {/* X轴标签 */}
        <div className="absolute -bottom-4 left-0 right-0 flex justify-between text-xs text-muted-foreground">
          {sampledData.length > 0 && (
            <>
              <span>{sampledData[0]?.date}</span>
              {sampledData.length > 2 && <span>{sampledData[Math.floor(sampledData.length / 2)]?.date}</span>}
              <span>{sampledData[sampledData.length - 1]?.date}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function RecoveryDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [trendData, setTrendData] = useState<TrendData | null>(null)
  const [categoryData, setCategoryData] = useState<CategoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('30')

  const loadData = useCallback(() => {
    setLoading(true)
    const params = `?period=${period}`

    Promise.all([
      fetch(`/api/analytics/dashboard${params}`).then(r => r.json()),
      fetch(`/api/analytics/trend${params}`).then(r => r.json()),
      fetch(`/api/analytics/category${params}`).then(r => r.json()),
    ])
      .then(([dashboard, trend, category]) => {
        if (dashboard.success) setDashboardData(dashboard.data)
        if (trend.success) setTrendData(trend.data)
        if (category.success) setCategoryData(category.data)
      })
      .finally(() => setLoading(false))
  }, [period])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
  }

  const periodLabels: Record<Period, string> = { '7': '7天', '30': '30天', 'all': '全部' }

  if (loading) {
    return (
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-16" />)}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  const overview = dashboardData?.overview || {
    totalReviews: 0,
    pendingReviews: 0,
    repliedReviews: 0,
    recoveredReviews: 0,
    replyRate: 0,
    recoveryRate: 0,
  }

  const statusDist = dashboardData?.statusDistribution || {
    pending: 0,
    contacted: 0,
    recovered: 0,
    failed: 0,
  }

  // 计算百分比
  const totalStatus = statusDist.pending + statusDist.contacted + statusDist.recovered + statusDist.failed
  const getPercentage = (value: number) => totalStatus > 0 ? Math.round((value / totalStatus) * 100) : 0

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* 标题和周期选择 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">挽回效果看板</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">统计周期：</span>
          {(['7', '30', 'all'] as Period[]).map(p => (
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
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-50 p-2 rounded-lg">
                <MessageSquare className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overview.totalReviews}</p>
                <p className="text-xs text-muted-foreground">总评价数</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overview.pendingReviews}</p>
                <p className="text-xs text-muted-foreground">待回复</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 p-2 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overview.recoveredReviews}</p>
                <p className="text-xs text-muted-foreground">挽回成功</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overview.recoveryRate}%</p>
                <p className="text-xs text-muted-foreground">挽回率</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 趋势图和分类图 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 趋势图 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              挽回趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 图例 */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-orange-500" />
                回复率
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-green-500" />
                挽回率
              </div>
            </div>
            <TrendChart data={trendData?.trendData || []} />
          </CardContent>
        </Card>

        {/* 挽回状态分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4 text-blue-500" />
              挽回状态分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimplePieChart
              data={[
                { label: '待挽回', value: statusDist.pending, color: '#94a3b8' },
                { label: '已联系', value: statusDist.contacted, color: '#3b82f6' },
                { label: '挽回成功', value: statusDist.recovered, color: '#22c55e' },
                { label: '挽回失败', value: statusDist.failed, color: '#ef4444' },
              ]}
              title="挽回状态分布"
            />
          </CardContent>
        </Card>
      </div>

      {/* 详细统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 回复状态统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              回复状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>待回复</span>
                </div>
                <span className="font-bold">{overview.pendingReviews}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>已回复</span>
                </div>
                <span className="font-bold text-green-600">{overview.repliedReviews}</span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>回复率</span>
                  <span className="font-medium">{overview.replyRate}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${overview.replyRate}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 评价类型统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              评价类型分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={[
                { label: '好评 (4-5星)', value: dashboardData?.byRating.positive || 0, color: '#22c55e' },
                { label: '中评 (3星)', value: dashboardData?.byRating.neutral || 0, color: '#f59e0b' },
                { label: '差评 (1-2星)', value: dashboardData?.byRating.negative || 0, color: '#ef4444' },
              ]}
              title="评价类型分布"
            />
          </CardContent>
        </Card>
      </div>

      {/* 分类统计 */}
      {categoryData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4 text-orange-500" />
              分类统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 按挽回状态 */}
              <div>
                <h4 className="text-sm font-medium mb-3">挽回状态明细</h4>
                <div className="space-y-2">
                  {categoryData.byRecoveryStatus.map(item => (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.status === 'recovered' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {item.status === 'contacted' && <MessageSquare className="h-4 w-4 text-blue-500" />}
                        {item.status === 'pending' && <Clock className="h-4 w-4 text-gray-400" />}
                        {item.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.count}</span>
                        <span className="text-xs text-muted-foreground">
                          ({totalStatus > 0 ? Math.round((item.count / totalStatus) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 按回复状态 */}
              <div>
                <h4 className="text-sm font-medium mb-3">回复状态明细</h4>
                <div className="space-y-2">
                  {categoryData.byReplyStatus.map(item => (
                    <div key={item.status} className="flex items-center justify-between">
                      <span className="text-sm">{item.label}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
