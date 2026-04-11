'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Award, TrendingUp, AlertTriangle, CheckCircle2,
  MessageSquare, RefreshCw, Target, Heart, Zap
} from 'lucide-react'

interface QualityMetrics {
  relevance: number
  politeness: number
  professionalism: number
  recoveryPotential: number
}

interface QualityTrend {
  date: string
  avgScore: number | null
  count: number
}

interface LowQualityReply {
  id: string
  replyId: string
  content: string
  score: number
  reviewContent: string
  buyerName: string
  shopName: string
  evaluatedAt: string
}

interface QualityAnalytics {
  summary: {
    totalEvaluated: number
    pendingEvaluations: number
    avgScore: number
    minScore: number
    maxScore: number
  }
  distribution: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
  dimensions: QualityMetrics
  trend: QualityTrend[]
  lowQualityReplies: LowQualityReply[]
}

export function QualityDashboard() {
  const [data, setData] = useState<QualityAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [evaluating, setEvaluating] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/quality')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch (error) {
      console.error('Failed to load quality data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const handleEvaluateAll = async () => {
    if (data?.summary.pendingEvaluations === 0) return
    
    setEvaluating(true)
    try {
      const res = await fetch('/api/replies/evaluate-all', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        alert(`评估完成！共评估 ${json.data.evaluated} 条回复`)
        loadData()
      } else {
        alert('评估失败')
      }
    } catch (error) {
      alert('评估请求失败')
    } finally {
      setEvaluating(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">暂无数据</p>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-blue-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-50 border-green-200'
    if (score >= 75) return 'bg-blue-50 border-blue-200'
    if (score >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const totalDistribution = data.distribution.excellent + data.distribution.good + 
    data.distribution.fair + data.distribution.poor

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-6 w-6 text-orange-600" />
          <h2 className="text-xl font-semibold">AI回复质量监控</h2>
        </div>
        <div className="flex items-center gap-2">
          {data?.summary.pendingEvaluations && data.summary.pendingEvaluations > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEvaluateAll}
              disabled={evaluating}
              className="bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100"
            >
              <Zap className={`h-4 w-4 mr-2 ${evaluating ? 'animate-spin' : ''}`} />
              评估待处理 ({data.summary.pendingEvaluations})
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Score */}
        <Card className={`${getScoreBgColor(data.summary.avgScore)} border-2`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">平均质量分</p>
                <p className={`text-3xl font-bold ${getScoreColor(data.summary.avgScore)}`}>
                  {data.summary.avgScore}
                </p>
              </div>
              <TrendingUp className={`h-10 w-10 ${getScoreColor(data.summary.avgScore)} opacity-50`} />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              最高 {data.summary.maxScore} / 最低 {data.summary.minScore}
            </p>
          </CardContent>
        </Card>

        {/* Evaluated Count */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已评估回复</p>
                <p className="text-3xl font-bold text-blue-600">{data.summary.totalEvaluated}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-blue-600 opacity-50" />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              待评估 {data.summary.pendingEvaluations} 条
            </p>
          </CardContent>
        </Card>

        {/* Excellent Rate */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">优秀率</p>
                <p className="text-3xl font-bold text-green-600">
                  {totalDistribution > 0 ? Math.round((data.distribution.excellent / totalDistribution) * 100) : 0}%
                </p>
              </div>
              <Award className="h-10 w-10 text-green-600 opacity-50" />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              90分以上 {data.distribution.excellent} 条
            </p>
          </CardContent>
        </Card>

        {/* Low Quality Count */}
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">低质量回复</p>
                <p className="text-3xl font-bold text-red-600">{data.distribution.poor}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-600 opacity-50" />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              需优化 {data.lowQualityReplies.length} 条
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution & Dimensions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-600" />
              质量分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">优秀 (90+)</span>
                </div>
                <span className="text-sm font-medium">{data.distribution.excellent}</span>
              </div>
              <Progress 
                value={totalDistribution > 0 ? (data.distribution.excellent / totalDistribution) * 100 : 0} 
                className="h-2 bg-gray-100 [&>div]:bg-green-500" 
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">良好 (75-89)</span>
                </div>
                <span className="text-sm font-medium">{data.distribution.good}</span>
              </div>
              <Progress 
                value={totalDistribution > 0 ? (data.distribution.good / totalDistribution) * 100 : 0} 
                className="h-2 bg-gray-100 [&>div]:bg-blue-500" 
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">一般 (60-74)</span>
                </div>
                <span className="text-sm font-medium">{data.distribution.fair}</span>
              </div>
              <Progress 
                value={totalDistribution > 0 ? (data.distribution.fair / totalDistribution) * 100 : 0} 
                className="h-2 bg-gray-100 [&>div]:bg-yellow-500" 
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">较差 (&lt;60)</span>
                </div>
                <span className="text-sm font-medium">{data.distribution.poor}</span>
              </div>
              <Progress 
                value={totalDistribution > 0 ? (data.distribution.poor / totalDistribution) * 100 : 0} 
                className="h-2 bg-gray-100 [&>div]:bg-red-500" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Dimensions Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-5 w-5 text-orange-600" />
              各维度评分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { key: 'relevance', label: '相关性', desc: '回复与评价的关联度' },
                { key: 'politeness', label: '礼貌度', desc: '回复的语气和用词' },
                { key: 'professionalism', label: '专业性', desc: '内容完整度和专业程度' },
                { key: 'recoveryPotential', label: '挽回潜力', desc: '对差评挽回的效果' },
              ].map((dim) => {
                const value = data.dimensions[dim.key as keyof QualityMetrics]
                return (
                  <div key={dim.key}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-sm font-medium">{dim.label}</span>
                        <p className="text-xs text-gray-400">{dim.desc}</p>
                      </div>
                      <span className={`text-lg font-bold ${getScoreColor(value)}`}>{value}</span>
                    </div>
                    <Progress 
                      value={value} 
                      className={`h-2 bg-gray-100 ${getScoreColor(value).replace('text-', '[&>div]:bg-')}`}
                    />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            质量趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {data.trend.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full bg-orange-200 rounded-t transition-all hover:bg-orange-300"
                  style={{ height: `${item.avgScore ? (item.avgScore / 100) * 120 : 10}px` }}
                />
                <span className="text-xs text-gray-400">{item.date}</span>
                <span className="text-xs font-medium">{item.avgScore || '-'}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Low Quality Replies */}
      {data.lowQualityReplies.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              需优化的回复 ({data.lowQualityReplies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.lowQualityReplies.slice(0, 5).map((reply) => (
                <div 
                  key={reply.id} 
                  className="p-3 bg-red-50 rounded-lg border border-red-100"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {reply.shopName}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(reply.evaluatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="text-gray-400">买家：</span>{reply.buyerName}
                      </p>
                      <p className="text-xs text-gray-500 mb-1">
                        <span className="text-gray-400">原评价：</span>{reply.reviewContent}
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-400">AI回复：</span>{reply.content}
                      </p>
                    </div>
                    <Badge variant="destructive" className="shrink-0">
                      {reply.score}分
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
