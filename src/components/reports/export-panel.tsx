'use client'

import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, BarChart3, Calendar, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

interface ReportPreview {
  type: string
  period: string
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
}

export function ExportPanel() {
  const [loading, setLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [preview, setPreview] = useState<ReportPreview | null>(null)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const handleExport = async (type: 'reviews' | 'replies' | 'analytics', format: 'csv' | 'json') => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateRange.start) params.set('startDate', dateRange.start)
      if (dateRange.end) params.set('endDate', dateRange.end)
      params.set('format', format)

      const response = await fetch(`/api/export/${type}?${params}`)
      if (format === 'csv' && response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `${type}-export.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const result = await response.json()
        if (!response.ok) throw new Error(result.message)
        // JSON格式时下载文件
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('导出失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handlePreviewReport = async (type: 'daily' | 'weekly' | 'monthly') => {
    setReportLoading(true)
    try {
      const response = await fetch(`/api/reports?type=${type}`)
      const result = await response.json()
      if (result.success) {
        setPreview(result.data)
      }
    } catch (error) {
      console.error('Preview failed:', error)
    } finally {
      setReportLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 导出功能卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 评价导出 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              评价数据导出
            </CardTitle>
            <CardDescription>导出评价列表及回复状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 px-3 py-1.5 text-sm border rounded-md"
                  value={dateRange.start}
                  onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  placeholder="开始日期"
                />
                <input
                  type="date"
                  className="flex-1 px-3 py-1.5 text-sm border rounded-md"
                  value={dateRange.end}
                  onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  placeholder="结束日期"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span className="ml-2">导出评价</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('reviews', 'csv')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    导出 CSV 格式
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('reviews', 'json')}>
                    <FileText className="h-4 w-4 mr-2" />
                    导出 JSON 格式
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* 回复导出 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-green-500" />
              回复数据导出
            </CardTitle>
            <CardDescription>导出AI回复及质量评分</CardDescription>
          </CardHeader>
          <CardContent>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  <span className="ml-2">导出回复</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('replies', 'csv')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  导出 CSV 格式
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('replies', 'json')}>
                  <FileText className="h-4 w-4 mr-2" />
                  导出 JSON 格式
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>

        {/* 统计导出 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              统计数据导出
            </CardTitle>
            <CardDescription>导出汇总数据及趋势</CardDescription>
          </CardHeader>
          <CardContent>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  <span className="ml-2">导出统计</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('analytics', 'csv')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  导出 CSV 格式
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('analytics', 'json')}>
                  <FileText className="h-4 w-4 mr-2" />
                  导出 JSON 格式
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      </div>

      {/* 报表预览 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            报表预览
          </CardTitle>
          <CardDescription>快速查看日报、周报、月报数据</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" onValueChange={(v) => handlePreviewReport(v as 'daily' | 'weekly' | 'monthly')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">日报</TabsTrigger>
              <TabsTrigger value="weekly">周报</TabsTrigger>
              <TabsTrigger value="monthly">月报</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-4">
              {reportLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-32" />
                </div>
              ) : preview ? (
                <ReportSummary report={preview} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  点击标签页查看报表
                </div>
              )}
            </TabsContent>

            <TabsContent value="weekly" className="mt-4">
              {reportLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-32" />
                </div>
              ) : preview ? (
                <ReportSummary report={preview} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  点击标签页查看报表
                </div>
              )}
            </TabsContent>

            <TabsContent value="monthly" className="mt-4">
              {reportLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-32" />
                </div>
              ) : preview ? (
                <ReportSummary report={preview} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  点击标签页查看报表
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function ReportSummary({ report }: { report: ReportPreview }) {
  return (
    <div className="space-y-4">
      {/* 概览统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-600">评价总数</p>
          <p className="text-2xl font-bold text-blue-700">{report.overview.totalReviews}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-sm text-green-600">回复总数</p>
          <p className="text-2xl font-bold text-green-700">{report.overview.totalReplies}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <p className="text-sm text-amber-600">回复率</p>
          <p className="text-2xl font-bold text-amber-700">{report.overview.replyRate}%</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="text-sm text-purple-600">挽回率</p>
          <p className="text-2xl font-bold text-purple-700">{report.overview.recoveryRate}%</p>
        </div>
      </div>

      {/* 评分分布 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border rounded-lg p-3 text-center">
          <p className="text-sm text-muted-foreground">好评(4-5星)</p>
          <Badge variant="default" className="bg-green-500 mt-1">{report.byRating.positive}</Badge>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <p className="text-sm text-muted-foreground">中评(3星)</p>
          <Badge variant="secondary" className="mt-1">{report.byRating.neutral}</Badge>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <p className="text-sm text-muted-foreground">差评(1-2星)</p>
          <Badge variant="destructive" className="mt-1">{report.byRating.negative}</Badge>
        </div>
      </div>

      {/* 挽回状态 */}
      <div className="border rounded-lg p-3">
        <p className="text-sm font-medium mb-2">挽回状态分布</p>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <p className="text-muted-foreground">待联系</p>
            <p className="font-bold">{report.byStatus.pending}</p>
          </div>
          <div>
            <p className="text-muted-foreground">已联系</p>
            <p className="font-bold">{report.byStatus.contacted}</p>
          </div>
          <div>
            <p className="text-muted-foreground">已挽回</p>
            <p className="font-bold text-green-600">{report.byStatus.recovered}</p>
          </div>
          <div>
            <p className="text-muted-foreground">失败</p>
            <p className="font-bold text-red-600">{report.byStatus.failed}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
