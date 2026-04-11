'use client'

import { useEffect, useState } from 'react'
import { ExportPanel } from '@/components/reports/export-panel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Download, ArrowLeft, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Link from 'next/link'

interface ReportData {
  type: string
  period: string
  generatedAt: string
  overview: {
    totalReviews: number
    totalReplies: number
    totalRecovered: number
    replyRate: number
    recoveryRate: number
  }
  byRating: {
    positive: number
    neutral: number
    negative: number
  }
  byStatus: {
    pending: number
    contacted: number
    recovered: number
    failed: number
  }
  trends: {
    date: string
    reviews: number
    replies: number
    recovered: number
  }[]
  topProducts: {
    productTitle: string
    reviewCount: number
    avgRating: number
  }[]
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  useEffect(() => {
    loadReport()
  }, [reportType])

  const loadReport = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports?type=${reportType}`)
      const result = await response.json()
      if (result.success) {
        setReport(result.data)
      }
    } catch (error) {
      console.error('Failed to load report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = async () => {
    try {
      const params = new URLSearchParams()
      params.set('format', 'csv')
      params.set('period', reportType === 'daily' ? '1' : reportType === 'weekly' ? '7' : '30')

      const response = await fetch(`/api/export/analytics?${params}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">数据报表</h1>
              <p className="text-sm text-muted-foreground">查看和导出各类数据报表</p>
            </div>
          </div>
          <Button onClick={handleExportReport} size="sm">
            <Download className="h-4 w-4 mr-2" />
            导出报表
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Report Type Tabs */}
        <div className="flex gap-2 bg-white rounded-lg p-1 border">
          <button
            onClick={() => setReportType('daily')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              reportType === 'daily'
                ? 'bg-blue-500 text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            今日日报
          </button>
          <button
            onClick={() => setReportType('weekly')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              reportType === 'weekly'
                ? 'bg-blue-500 text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            本周周报
          </button>
          <button
            onClick={() => setReportType('monthly')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              reportType === 'monthly'
                ? 'bg-blue-500 text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            本月月报
          </button>
        </div>

        {/* Report Content */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">评价总数</p>
                      <p className="text-2xl font-bold">{report.overview.totalReviews}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">回复数</p>
                      <p className="text-2xl font-bold">{report.overview.totalReplies}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">回复率</p>
                      <p className="text-2xl font-bold">{report.overview.replyRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">挽回率</p>
                      <p className="text-2xl font-bold">{report.overview.recoveryRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Rating Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">评价分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-green-600">好评 (4-5星)</span>
                        <span className="font-medium">{report.byRating.positive}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(report.byRating.positive / report.overview.totalReviews) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">中评 (3星)</span>
                        <span className="font-medium">{report.byRating.neutral}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-400 rounded-full"
                          style={{ width: `${(report.byRating.neutral / report.overview.totalReviews) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-red-600">差评 (1-2星)</span>
                        <span className="font-medium">{report.byRating.negative}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${(report.byRating.negative / report.overview.totalReviews) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recovery Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">挽回状态</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                      <p className="text-2xl font-bold text-amber-600">{report.byStatus.pending}</p>
                      <p className="text-sm text-muted-foreground">待联系</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{report.byStatus.contacted}</p>
                      <p className="text-sm text-muted-foreground">已联系</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{report.byStatus.recovered}</p>
                      <p className="text-sm text-muted-foreground">已挽回</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{report.byStatus.failed}</p>
                      <p className="text-sm text-muted-foreground">失败</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trends */}
            {report.trends && report.trends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">每日趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium">日期</th>
                          <th className="text-right py-2 px-3 font-medium">评价数</th>
                          <th className="text-right py-2 px-3 font-medium">回复数</th>
                          <th className="text-right py-2 px-3 font-medium">挽回数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.trends.slice(0, 7).map((trend, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2 px-3">{trend.date}</td>
                            <td className="text-right py-2 px-3">{trend.reviews}</td>
                            <td className="text-right py-2 px-3">{trend.replies}</td>
                            <td className="text-right py-2 px-3 text-green-600">{trend.recovered}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Products */}
            {report.topProducts && report.topProducts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">热门商品</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.topProducts.map((product, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                            {i + 1}
                          </span>
                          <span className="font-medium">{product.productTitle}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{product.reviewCount} 条评价</p>
                          <p className="text-xs text-muted-foreground">平均 {product.avgRating.toFixed(1)} 星</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated Info */}
            <p className="text-center text-sm text-muted-foreground">
              报表生成时间: {report.generatedAt}
            </p>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              暂无报表数据
            </CardContent>
          </Card>
        )}

        {/* Export Panel */}
        <ExportPanel />
      </div>
    </div>
  )
}
