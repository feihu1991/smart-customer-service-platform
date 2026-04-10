import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')

    if (!shopId) {
      return NextResponse.json(
        { success: false, message: '请提供店铺ID' },
        { status: 400 }
      )
    }

    const where: Prisma.ReviewWhereInput = { shopId }

    // ===== Core Stats =====
    const [
      totalReviews,
      negativeReviews,
      repliedReviews,
      reviewsWithAiReplies,
    ] = await Promise.all([
      db.review.count({ where }),
      db.review.count({ where: { ...where, sentiment: 'negative' } }),
      db.review.count({ where: { ...where, replyStatus: 'replied' } }),
      // Count reviews that have at least one AI-generated reply
      db.reviewReply.groupBy({
        by: ['reviewId'],
        where: { review: { shopId } },
      }),
    ])

    const replyRate = totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 100) / 100 : 0
    const aiProcessRate = totalReviews > 0
      ? Math.round((reviewsWithAiReplies.length / totalReviews) * 100) / 100
      : 0

    // ===== Review Trend (last 7 days) =====
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const recentReviews = await db.review.findMany({
      where: {
        shopId,
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        sentiment: true,
        createdAt: true,
      },
    })

    const reviewTrend: { date: string; positive: number; neutral: number; negative: number }[] = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayReviews = recentReviews.filter((r) => {
        const rDate = r.createdAt.toISOString().split('T')[0]
        return rDate === dateStr
      })

      reviewTrend.push({
        date: dateStr,
        positive: dayReviews.filter((r) => r.sentiment === 'positive').length,
        neutral: dayReviews.filter((r) => r.sentiment === 'neutral').length,
        negative: dayReviews.filter((r) => r.sentiment === 'negative').length,
      })
    }

    // ===== Category Distribution =====
    const categoryData = await db.review.groupBy({
      by: ['category'],
      where: { shopId, category: { not: null } },
      _count: { category: true },
    })

    const categoryDistribution = categoryData.map((item) => ({
      name: item.category || '未分类',
      value: item._count.category,
    }))

    // Add uncategorized count
    const uncategorized = await db.review.count({
      where: { shopId, category: null },
    })
    if (uncategorized > 0) {
      categoryDistribution.push({ name: '其他', value: uncategorized })
    }

    // ===== Active Chat Sessions & Pending Orders =====
    const [activeChatSessions, pendingOrders] = await Promise.all([
      db.chatSession.count({
        where: { shopId, status: 'active' },
      }),
      db.order.count({
        where: { shopId, status: { in: ['pending', 'paid'] } },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalReviews,
        negativeReviews,
        replyRate,
        aiProcessRate,
        reviewTrend,
        categoryDistribution,
        activeChatSessions,
        pendingOrders,
      },
    })
  } catch (error) {
    console.error('Get dashboard error:', error)
    return NextResponse.json(
      { success: false, message: '获取仪表盘数据失败' },
      { status: 500 }
    )
  }
}
