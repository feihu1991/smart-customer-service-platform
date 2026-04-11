import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface ReportData {
  type: 'daily' | 'weekly' | 'monthly'
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

// 获取日报
async function generateDailyReport(shopId?: string): Promise<ReportData> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const where: Record<string, unknown> = {
    createdAt: { gte: today, lt: tomorrow },
  }
  if (shopId) where.shopId = shopId

  return generateReport('daily', today, tomorrow, where, shopId)
}

// 获取周报
async function generateWeeklyReport(shopId?: string): Promise<ReportData> {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  weekAgo.setHours(0, 0, 0, 0)

  const where: Record<string, unknown> = {
    createdAt: { gte: weekAgo, lt: today },
  }
  if (shopId) where.shopId = shopId

  return generateReport('weekly', weekAgo, today, where, shopId)
}

// 获取月报
async function generateMonthlyReport(shopId?: string): Promise<ReportData> {
  const today = new Date()
  const monthAgo = new Date(today)
  monthAgo.setMonth(monthAgo.getMonth() - 1)
  monthAgo.setHours(0, 0, 0, 0)

  const where: Record<string, unknown> = {
    createdAt: { gte: monthAgo, lt: today },
  }
  if (shopId) where.shopId = shopId

  return generateReport('monthly', monthAgo, today, where, shopId)
}

// 通用报表生成函数
async function generateReport(
  type: 'daily' | 'weekly' | 'monthly',
  startDate: Date,
  endDate: Date,
  where: Record<string, unknown>,
  shopId?: string
): Promise<ReportData> {
  const [
    totalReviews,
    pendingReviews,
    repliedReviews,
    recoveredReviews,
    negativeReviews,
    neutralReviews,
    positiveReviews,
    totalReplies,
    statusDistribution,
  ] = await Promise.all([
    db.review.count({ where }),
    db.review.count({ where: { ...where, replyStatus: 'pending' } }),
    db.review.count({ where: { ...where, replyStatus: { not: 'pending' } } }),
    db.review.count({ where: { ...where, recoveryStatus: 'recovered' } }),
    db.review.count({ where: { ...where, rating: { lte: 2 } } }),
    db.review.count({ where: { ...where, rating: 3 } }),
    db.review.count({ where: { ...where, rating: { gte: 4 } } }),
    db.reviewReply.count({ where: { review: where } }),
    db.review.groupBy({
      by: ['recoveryStatus'],
      where,
      _count: true,
    }),
  ])

  const statusCount = { pending: 0, contacted: 0, recovered: 0, failed: 0 }
  statusDistribution.forEach(item => {
    if (item.recoveryStatus in statusCount) {
      statusCount[item.recoveryStatus as keyof typeof statusCount] = item._count
    }
  })

  const replyRate = totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 10000) / 100 : 0
  const recoveryRate = repliedReviews > 0 ? Math.round((recoveredReviews / repliedReviews) * 10000) / 100 : 0

  // 获取每日趋势
  const reviews = await db.review.findMany({
    where,
    select: { createdAt: true, rating: true, replyStatus: true, recoveryStatus: true },
    orderBy: { createdAt: 'asc' },
  })

  const dateMap: Record<string, { reviews: number; replies: number; recovered: number }> = {}
  reviews.forEach(review => {
    const date = new Date(review.createdAt).toISOString().split('T')[0]
    if (!dateMap[date]) {
      dateMap[date] = { reviews: 0, replies: 0, recovered: 0 }
    }
    dateMap[date].reviews++
    if (review.replyStatus !== 'pending') dateMap[date].replies++
    if (review.recoveryStatus === 'recovered') dateMap[date].recovered++
  })

  const trends = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      ...stats,
    }))

  // 获取热门商品
  const productStats = await db.review.groupBy({
    by: ['productId'],
    where,
    _count: true,
    orderBy: { _count: { productId: 'desc' } },
    take: 5,
  })

  const topProducts = await Promise.all(
    productStats.map(async item => {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        select: { title: true },
      })
      const avgRatingResult = await db.review.aggregate({
        where: { ...where, productId: item.productId },
        _avg: { rating: true },
      })
      return {
        productTitle: product?.title || '未知商品',
        reviewCount: item._count,
        avgRating: avgRatingResult._avg.rating || 0,
      }
    })
  )

  const periodLabel = type === 'daily' ? new Date().toLocaleDateString('zh-CN') :
                      type === 'weekly' ? `近7天 (${new Date(startDate).toLocaleDateString('zh-CN')})` :
                      `近30天 (${new Date(startDate).toLocaleDateString('zh-CN')})`

  return {
    type,
    period: periodLabel,
    generatedAt: new Date().toLocaleString('zh-CN'),
    overview: {
      totalReviews,
      totalReplies,
      totalRecovered: recoveredReviews,
      replyRate,
      recoveryRate,
    },
    byRating: {
      positive: positiveReviews,
      neutral: neutralReviews,
      negative: negativeReviews,
    },
    byStatus: statusCount,
    trends,
    topProducts,
  }
}

// GET /api/reports - 获取报表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'daily'
    const shopId = searchParams.get('shopId')

    let report: ReportData

    switch (type) {
      case 'daily':
        report = await generateDailyReport(shopId || undefined)
        break
      case 'weekly':
        report = await generateWeeklyReport(shopId || undefined)
        break
      case 'monthly':
        report = await generateMonthlyReport(shopId || undefined)
        break
      default:
        return NextResponse.json(
          { success: false, message: '无效的报表类型' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error) {
    console.error('Generate report error:', error)
    return NextResponse.json(
      { success: false, message: '生成报表失败' },
      { status: 500 }
    )
  }
}
