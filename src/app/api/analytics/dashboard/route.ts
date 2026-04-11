import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/analytics/dashboard - 看板汇总数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const period = searchParams.get('period') || '30' // 7天/30天/全部

    // 计算时间范围
    let startDate: Date | undefined
    if (period !== 'all') {
      const days = parseInt(period)
      startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      startDate.setHours(0, 0, 0, 0)
    }

    // 构建查询条件
    const where: Record<string, unknown> = {}
    if (shopId) where.shopId = shopId
    if (startDate) where.createdAt = { gte: startDate }

    // 查询统计数据
    const [
      totalReviews,
      pendingReviews,
      repliedReviews,
      recoveredReviews,
    ] = await Promise.all([
      db.review.count({ where }),
      db.review.count({ where: { ...where, replyStatus: 'pending' } }),
      db.review.count({ where: { ...where, replyStatus: { not: 'pending' } } }),
      db.review.count({ where: { ...where, recoveryStatus: 'recovered' } }),
    ])

    // 计算挽回率（已回复的挽回率）
    const recoveryRate = repliedReviews > 0 
      ? Math.round((recoveredReviews / repliedReviews) * 100 * 100) / 100 
      : 0

    // 回复率
    const replyRate = totalReviews > 0 
      ? Math.round((repliedReviews / totalReviews) * 100 * 100) / 100 
      : 0

    // 按评价类型统计
    const negativeReviews = await db.review.count({ 
      where: { ...where, rating: { lte: 2 } } 
    })
    const neutralReviews = await db.review.count({ 
      where: { ...where, rating: 3 } 
    })
    const positiveReviews = await db.review.count({ 
      where: { ...where, rating: { gte: 4 } } 
    })

    // 挽回状态分布
    const statusDistribution = await db.review.groupBy({
      by: ['recoveryStatus'],
      where,
      _count: true,
    })

    const statusCount = {
      pending: 0,
      contacted: 0,
      recovered: 0,
      failed: 0,
    }
    statusDistribution.forEach(item => {
      if (item.recoveryStatus in statusCount) {
        statusCount[item.recoveryStatus as keyof typeof statusCount] = item._count
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        period,
        overview: {
          totalReviews,
          pendingReviews,
          repliedReviews,
          recoveredReviews,
          replyRate,
          recoveryRate,
        },
        byRating: {
          negative: negativeReviews,
          neutral: neutralReviews,
          positive: positiveReviews,
        },
        statusDistribution: statusCount,
      },
    })
  } catch (error) {
    console.error('Get dashboard analytics error:', error)
    return NextResponse.json(
      { success: false, message: '获取看板数据失败' },
      { status: 500 }
    )
  }
}
