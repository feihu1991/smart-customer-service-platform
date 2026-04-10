import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const totalReviews = await db.review.count()
    const negativeReviews = await db.review.count({ where: { rating: { lte: 2 } } })
    const repliedReviews = await db.review.count({ where: { replyStatus: 'replied' } })
    const activeChats = await db.chatSession.count({ where: { status: 'active' } })
    const totalOrders = await db.order.count()
    const pendingOrders = await db.order.count({ where: { status: 'pending' } })
    const totalTemplates = await db.replyTemplate.count()

    // Generate trend data from actual DB data (last 7 days)
    const trendData = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayReviews = await db.review.findMany({
        where: { createdAt: { gte: date, lt: nextDate } },
        select: { sentiment: true },
      })

      trendData.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        count: dayReviews.length,
        positive: dayReviews.filter(r => r.sentiment === 'positive').length,
        negative: dayReviews.filter(r => r.sentiment === 'negative').length,
        neutral: dayReviews.filter(r => r.sentiment === 'neutral').length,
      })
    }

    // Category distribution from actual data
    const categories = await db.review.groupBy({
      by: ['category'],
      _count: { id: true },
    })

    // Bad review reasons from actual data
    const badReviewCategories = categories.filter(
      c => c.category && ['质量问题', '物流问题', '服务态度', '描述不符', '包装问题', '尺码问题'].includes(c.category)
    )

    // AI processed reviews count
    const aiProcessedReviews = await db.reviewReply.count({
      where: { type: 'ai_generated', isSent: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        totalReviews,
        negativeReviews,
        repliedReviews,
        replyRate: totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 100) : 0,
        aiProcessRate: totalReviews > 0 ? Math.round((aiProcessedReviews / totalReviews) * 100) : 0,
        activeChats,
        totalOrders,
        pendingOrders,
        totalTemplates,
        trendData,
        categories: categories.map(c => ({ name: c.category || '未分类', count: c._count.id })),
        badReviewReasons: badReviewCategories.map(c => ({ name: c.category!, count: c._count.id })),
        recentNegatives: await db.review.findMany({
          where: { rating: { lte: 2 } },
          include: { product: { select: { title: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        avgReplyTime: 15,
        satisfactionRate: 89,
        recoveryRate: 76,
      },
    })
  } catch (error) {
    console.error('Get analytics error:', error)
    return NextResponse.json({ success: false, message: '获取数据失败' }, { status: 500 })
  }
}
