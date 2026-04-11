import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 通用工具函数：将数据转为CSV格式
function convertToCSV(data: Record<string, unknown>[], headers: Record<string, string>): string {
  const headerRow = Object.values(headers).join(',')
  const rows = data.map(row => {
    return Object.keys(headers).map(key => {
      const value = row[key]
      if (value === null || value === undefined) return ''
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  })
  return [headerRow, ...rows].join('\n')
}

// GET /api/export/analytics - 导出统计报表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const format = searchParams.get('format') || 'csv'
    const period = searchParams.get('period') || '30'

    // 计算时间范围
    const days = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // 构建查询条件
    const where: Record<string, unknown> = {}
    if (shopId) where.shopId = shopId
    where.createdAt = { gte: startDate }

    // 获取评价统计数据
    const [
      totalReviews,
      pendingReviews,
      repliedReviews,
      recoveredReviews,
      negativeReviews,
      neutralReviews,
      positiveReviews,
    ] = await Promise.all([
      db.review.count({ where }),
      db.review.count({ where: { ...where, replyStatus: 'pending' } }),
      db.review.count({ where: { ...where, replyStatus: { not: 'pending' } } }),
      db.review.count({ where: { ...where, recoveryStatus: 'recovered' } }),
      db.review.count({ where: { ...where, rating: { lte: 2 } } }),
      db.review.count({ where: { ...where, rating: 3 } }),
      db.review.count({ where: { ...where, rating: { gte: 4 } } }),
    ])

    // 获取回复统计数据
    const totalReplies = await db.reviewReply.count({
      where: {
        review: where as Record<string, unknown>,
      },
    })

    // 获取挽回状态分布
    const statusDistribution = await db.review.groupBy({
      by: ['recoveryStatus'],
      where,
      _count: true,
    })

    const statusCount: Record<string, number> = {
      pending: 0,
      contacted: 0,
      recovered: 0,
      failed: 0,
    }
    statusDistribution.forEach(item => {
      if (item.recoveryStatus in statusCount) {
        statusCount[item.recoveryStatus] = item._count
      }
    })

    // 获取每日趋势数据
    const dailyStats = await db.review.groupBy({
      by: ['createdAt'],
      where,
      _count: true,
    })

    // 按日期聚合
    const dateMap: Record<string, { total: number; positive: number; negative: number; neutral: number }> = {}
    const allReviews = await db.review.findMany({
      where,
      select: { createdAt: true, rating: true },
    })
    allReviews.forEach(review => {
      const date = new Date(review.createdAt).toISOString().split('T')[0]
      if (!dateMap[date]) {
        dateMap[date] = { total: 0, positive: 0, negative: 0, neutral: 0 }
      }
      dateMap[date].total++
      if (review.rating >= 4) dateMap[date].positive++
      else if (review.rating <= 2) dateMap[date].negative++
      else dateMap[date].neutral++
    })

    // 计算比率
    const replyRate = totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 10000) / 100 : 0
    const recoveryRate = repliedReviews > 0 ? Math.round((recoveredReviews / repliedReviews) * 10000) / 100 : 0

    // 导出数据
    const exportData = [
      {
        metric: '统计周期',
        value: `近${days}天`,
      },
      {
        metric: '评价总数',
        value: totalReviews,
      },
      {
        metric: '待回复评价',
        value: pendingReviews,
      },
      {
        metric: '已回复评价',
        value: repliedReviews,
      },
      {
        metric: '回复率',
        value: `${replyRate}%`,
      },
      {
        metric: '挽回成功',
        value: recoveredReviews,
      },
      {
        metric: '挽回率',
        value: `${recoveryRate}%`,
      },
      {
        metric: '好评数(4-5星)',
        value: positiveReviews,
      },
      {
        metric: '中评数(3星)',
        value: neutralReviews,
      },
      {
        metric: '差评数(1-2星)',
        value: negativeReviews,
      },
      {
        metric: '回复总数',
        value: totalReplies,
      },
      {
        metric: '挽回待联系',
        value: statusCount.pending,
      },
      {
        metric: '挽回已联系',
        value: statusCount.contacted,
      },
      {
        metric: '挽回失败',
        value: statusCount.failed,
      },
    ]

    // 每日趋势数据
    const trendData = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        total: stats.total,
        positive: stats.positive,
        neutral: stats.neutral,
        negative: stats.negative,
      }))

    if (format === 'csv') {
      // 汇总数据CSV
      const summaryCSV = convertToCSV(exportData, {
        metric: '指标',
        value: '数值',
      })

      // 趋势数据CSV
      const trendCSV = convertToCSV(trendData, {
        date: '日期',
        total: '总评价',
        positive: '好评',
        neutral: '中评',
        negative: '差评',
      })

      // 合并两个CSV
      const combinedCSV = `${summaryCSV}\n\n=== 每日趋势 ===\n\n${trendCSV}`

      return new NextResponse(combinedCSV, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="analytics-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: exportData,
        trend: trendData,
      },
    })
  } catch (error) {
    console.error('Export analytics error:', error)
    return NextResponse.json(
      { success: false, message: '导出统计数据失败' },
      { status: 500 }
    )
  }
}
