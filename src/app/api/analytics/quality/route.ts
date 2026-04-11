/**
 * AI回复质量统计API
 * GET /api/analytics/quality
 * 
 * 返回数据：
 * 1. 总体质量统计（平均分、分布等）
 * 2. 低质量回复列表
 * 3. 质量趋势（按日期）
 * 4. 各维度平均分
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const days = parseInt(searchParams.get('days') || '7', 10)

    // 构建查询条件
    const whereClause: any = {}
    if (shopId) {
      whereClause.reply = {
        review: {
          shopId
        }
      }
    }

    // 1. 总体统计
    const totalEvaluated = await db.replyQuality.count()
    
    const qualityStats = await db.replyQuality.aggregate({
      _avg: {
        score: true,
        relevance: true,
        politeness: true,
        professionalism: true,
        recoveryPotential: true,
      },
      _min: {
        score: true,
      },
      _max: {
        score: true,
      },
      where: whereClause,
    })

    // 2. 质量分布
    const scoreDistribution = {
      excellent: await db.replyQuality.count({ where: { ...whereClause, score: { gte: 90 } } }),  // 优秀 90+
      good: await db.replyQuality.count({ where: { ...whereClause, score: { gte: 75, lt: 90 } } }), // 良好 75-89
      fair: await db.replyQuality.count({ where: { ...whereClause, score: { gte: 60, lt: 75 } } }), // 一般 60-74
      poor: await db.replyQuality.count({ where: { ...whereClause, score: { lt: 60 } } }), // 较差 <60
    }

    // 3. 低质量回复列表
    const lowQualityReplies = await db.replyQuality.findMany({
      where: { ...whereClause, isLowQuality: true },
      orderBy: { score: 'asc' },
      take: 20,
      include: {
        reply: {
          select: {
            id: true,
            content: true,
            type: true,
            createdAt: true,
            review: {
              select: {
                id: true,
                content: true,
                rating: true,
                buyerName: true,
                shop: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        }
      }
    })

    // 4. 质量趋势（最近N天）
    const trendData = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayStats = await db.replyQuality.aggregate({
        _avg: { score: true },
        _count: { id: true },
        where: {
          ...whereClause,
          evaluatedAt: { gte: date, lt: nextDate }
        }
      })

      trendData.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        avgScore: dayStats._avg.score ? Math.round(dayStats._avg.score) : null,
        count: dayStats._count.id,
      })
    }

    // 5. 各维度平均分
    const dimensions = {
      relevance: Math.round(qualityStats._avg.relevance || 0),
      politeness: Math.round(qualityStats._avg.politeness || 0),
      professionalism: Math.round(qualityStats._avg.professionalism || 0),
      recoveryPotential: Math.round(qualityStats._avg.recoveryPotential || 0),
    }

    // 6. 待评估回复数量
    const totalReplies = await db.reviewReply.count()
    const evaluatedReplies = await db.replyQuality.count()
    const pendingReplies = totalReplies - evaluatedReplies

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalEvaluated,
          pendingEvaluations: pendingReplies,
          avgScore: Math.round(qualityStats._avg.score || 0),
          minScore: qualityStats._min.score || 0,
          maxScore: qualityStats._max.score || 0,
        },
        distribution: scoreDistribution,
        dimensions,
        trend: trendData,
        lowQualityReplies: lowQualityReplies.map(q => ({
          id: q.id,
          replyId: q.reply.id,
          content: q.reply.content.substring(0, 100) + (q.reply.content.length > 100 ? '...' : ''),
          score: q.score,
          reviewContent: q.reply.review.content.substring(0, 50) + (q.reply.review.content.length > 50 ? '...' : ''),
          buyerName: q.reply.review.buyerName,
          shopName: q.reply.review.shop.name,
          evaluatedAt: q.evaluatedAt,
        })),
      }
    })
  } catch (error) {
    console.error('Quality analytics error:', error)
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    )
  }
}
