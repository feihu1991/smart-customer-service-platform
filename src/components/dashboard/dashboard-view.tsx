'use client'

import { useEffect, useState } from 'react'
import { StatsCard } from '@/components/shared/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Star, MessageCircle, TrendingUp, Shield, AlertTriangle, Clock, Package } from 'lucide-react'

interface DashboardData {
  totalReviews: number
  negativeReviews: number
  repliedReviews: number
  replyRate: number
  aiProcessRate: number
  activeChats: number
  totalOrders: number
  pendingOrders: number
  trendData: { date: string; count: number; positive: number; negative: number; neutral: number }[]
  categories: { name: string; count: number }[]
  recentNegatives: { id: string; buyerName: string; content: string; rating: number; createdAt: string; product: { title: string } }[]
}

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!data) return <div className="p-6 text-center text-muted-foreground">加载数据失败</div>

  const maxTrend = Math.max(...data.trendData.map(d => d.count), 1)

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="今日评价"
          value={data.totalReviews}
          change={12}
          icon={Star}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
        />
        <StatsCard
          title="差评数"
          value={data.negativeReviews}
          change={-8}
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
        <StatsCard
          title="回复率"
          value={`${data.replyRate}%`}
          change={5}
          icon={MessageCircle}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
        />
        <StatsCard
          title="AI处理率"
          value={`${data.aiProcessRate}%`}
          change={15}
          icon={Shield}
          iconBg="bg-green-50"
          iconColor="text-green-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">评价趋势（近7天）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  总评价
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  好评
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  差评
                </div>
              </div>
              {/* Chart */}
              <div className="flex items-end gap-2 h-40">
                {data.trendData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center gap-0.5 h-32">
                      {/* Stacked bars */}
                      <div className="w-full flex flex-col justify-end h-full gap-px">
                        <div
                          className="w-full bg-green-400 rounded-t-md transition-all duration-500"
                          style={{ height: `${(d.positive / maxTrend) * 100}%` }}
                        />
                        <div
                          className="w-full bg-orange-400 transition-all duration-500"
                          style={{ height: `${(d.neutral / maxTrend) * 100}%` }}
                        />
                        <div
                          className="w-full bg-red-400 rounded-b-md transition-all duration-500"
                          style={{ height: `${(d.negative / maxTrend) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{d.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <MessageCircle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">活跃会话</p>
                  <p className="text-2xl font-bold">{data.activeChats}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-500">
                <TrendingUp className="h-3 w-3" />
                较昨日 +2
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">待发货订单</p>
                  <p className="text-2xl font-bold">{data.pendingOrders}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                共 {data.totalOrders} 笔订单
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Negative Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              最近差评
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentNegatives.map((review) => (
              <div key={review.id} className="flex gap-3 p-3 bg-red-50/50 rounded-lg border border-red-100">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold text-red-600 shrink-0">
                  {review.buyerName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{review.buyerName}</span>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{review.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{review.product.title}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">评价分类分布</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.categories.map((cat) => {
              const maxCount = Math.max(...data.categories.map(c => c.count), 1)
              const pct = Math.round((cat.count / maxCount) * 100)
              const colors = ['bg-orange-500', 'bg-amber-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500']
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 font-medium">{cat.name}</span>
                    <span className="text-muted-foreground">{cat.count}条</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors[Math.floor(Math.random() * colors.length)]} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
