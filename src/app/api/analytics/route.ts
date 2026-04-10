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

    // Generate trend data (last 7 days)
    const trendData = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)
      const count = Math.floor(Math.random() * 15) + 5
      trendData.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        count,
        positive: Math.floor(count * 0.6),
        negative: Math.floor(count * 0.3),
        neutral: Math.floor(count * 0.1),
      })
    }

    // Category distribution
    const categories = await db.review.groupBy({
      by: ['category'],
      _count: { id: true },
    })

    // Bad review reasons
    const badReviewReasons = [
      { name: '质量问题', count: 4 },
      { name: '物流问题', count: 2 },
      { name: '服务态度', count: 2 },
      { name: '描述不符', count: 3 },
      { name: '包装问题', count: 1 },
    ]

    return NextResponse.json({
      totalReviews,
      negativeReviews,
      repliedReviews,
      replyRate: totalReviews > 0 ? Math.round((repliedReviews / totalReviews) * 100) : 0,
      aiProcessRate: Math.round(Math.random() * 20 + 60),
      activeChats,
      totalOrders,
      pendingOrders,
      totalTemplates,
      trendData,
      categories: categories.map(c => ({ name: c.category || '未分类', count: c._count.id })),
      badReviewReasons,
      recentNegatives: await db.review.findMany({
        where: { rating: { lte: 2 } },
        include: { product: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      avgReplyTime: Math.floor(Math.random() * 30 + 10),
      satisfactionRate: Math.round(Math.random() * 10 + 85),
      recoveryRate: Math.round(Math.random() * 15 + 70),
    })
  } catch (error) {
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 })
  }
}
