/**
 * 批量评估回复质量API
 * POST /api/replies/evaluate-all
 * 
 * 功能：
 * 1. 对所有未评估的回复进行质量评估
 * 2. 返回评估结果统计
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 质量评估函数（基于规则）
function evaluateReplyQuality(replyContent: string, reviewContent: string): {
  score: number
  relevance: number
  politeness: number
  professionalism: number
  recoveryPotential: number
} {
  let relevance = 50
  let politeness = 50
  let professionalism = 50
  let recoveryPotential = 50

  const positiveKeywords = ['感谢', '满意', '好评', '支持', '信赖', '回购', '五星', '赞']
  const negativeKeywords = ['抱歉', '对不起', '问题', '差评', '投诉', '退款', '赔偿']
  const apologyKeywords = ['抱歉', '对不起', '歉意', '遗憾']
  const solutionKeywords = ['处理', '解决', '联系', '反馈', '跟进', '改善', '补偿', '换货', '退货']
  const politeKeywords = ['感谢', '谢谢', '亲', '尊敬', '惠顾', '支持', '光临']
  const professionalKeywords = ['您好', '核实', '确认', '了解', '详情', '情况', '可能', '建议']

  const replyLower = replyContent.toLowerCase()
  const reviewLower = reviewContent.toLowerCase()

  let matchedNegative = 0
  negativeKeywords.forEach(keyword => {
    if (reviewLower.includes(keyword) && replyLower.includes(keyword)) {
      matchedNegative++
    }
  })
  
  let hasSolution = 0
  solutionKeywords.forEach(keyword => {
    if (replyLower.includes(keyword)) hasSolution++
  })

  let hasApology = 0
  apologyKeywords.forEach(keyword => {
    if (replyLower.includes(keyword)) hasApology++
  })

  if (reviewLower.includes('差评') || reviewLower.includes('投诉')) {
    if (hasSolution > 0 && hasApology > 0) {
      relevance = 90
    } else if (hasSolution > 0 || hasApology > 0) {
      relevance = 75
    } else {
      relevance = 50
    }
  } else {
    relevance = 80 + Math.min(matchedNegative * 5, 20)
  }

  let politeCount = 0
  politeKeywords.forEach(keyword => {
    if (replyLower.includes(keyword)) politeCount++
  })
  politeness = Math.min(30 + politeCount * 15, 100)

  const length = replyContent.length
  let lengthScore = 50
  if (length >= 30 && length <= 100) {
    lengthScore = 50
  } else if (length >= 20 && length <= 150) {
    lengthScore = 40
  }
  
  let professionalCount = 0
  professionalKeywords.forEach(keyword => {
    if (replyLower.includes(keyword)) professionalCount++
  })
  
  const hasMinimumLength = length >= 15
  const noExcessiveRepeat = !/(.)\1{4,}/.test(replyContent)
  
  professionalism = Math.min(40 + professionalCount * 10 + (hasMinimumLength ? 20 : 0) + (noExcessiveRepeat ? 10 : -10) + lengthScore / 5, 100)

  const isNegativeReview = negativeKeywords.some(k => reviewLower.includes(k))
  
  if (isNegativeReview) {
    let recoveryScore = 30
    if (hasApology > 0) recoveryScore += 25
    if (hasSolution > 0) recoveryScore += 30
    if (replyLower.includes('补偿') || replyLower.includes('退款') || replyLower.includes('换货')) {
      recoveryScore += 15
    }
    recoveryPotential = Math.min(recoveryScore, 100)
  } else {
    recoveryPotential = 60 + (replyLower.includes('期待') || replyLower.includes('再次') ? 20 : 0)
  }

  const score = Math.round(
    relevance * 0.3 +
    politeness * 0.2 +
    professionalism * 0.25 +
    recoveryPotential * 0.25
  )

  return {
    score: Math.min(Math.max(score, 0), 100),
    relevance: Math.min(Math.max(relevance, 0), 100),
    politeness: Math.min(Math.max(politeness, 0), 100),
    professionalism: Math.min(Math.max(professionalism, 0), 100),
    recoveryPotential: Math.min(Math.max(recoveryPotential, 0), 100),
  }
}

export async function POST(request: NextRequest) {
  try {
    // 获取所有未评估的回复
    const unevaluatedReplies = await db.reviewReply.findMany({
      where: {
        NOT: {
          quality: {
            is: undefined
          }
        }
      },
      include: {
        review: {
          select: { content: true }
        }
      }
    })

    // 找出真正未评估的回复
    const allReplies = await db.reviewReply.findMany({
      include: {
        review: {
          select: { content: true }
        },
        quality: true
      }
    })

    const repliesToEvaluate = allReplies.filter(r => !r.quality)

    let evaluated = 0
    let skipped = 0
    const results: Array<{ replyId: string; score: number; isLowQuality: boolean }> = []

    for (const reply of repliesToEvaluate) {
      try {
        const evaluation = evaluateReplyQuality(reply.content, reply.review.content)
        const isLowQuality = evaluation.score < 60

        await db.replyQuality.create({
          data: {
            replyId: reply.id,
            score: evaluation.score,
            relevance: evaluation.relevance,
            politeness: evaluation.politeness,
            professionalism: evaluation.professionalism,
            recoveryPotential: evaluation.recoveryPotential,
            isLowQuality,
          }
        })

        results.push({
          replyId: reply.id,
          score: evaluation.score,
          isLowQuality
        })
        evaluated++
      } catch (e) {
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      message: `批量评估完成`,
      data: {
        total: repliesToEvaluate.length,
        evaluated,
        skipped,
        results: results.slice(0, 20), // 最多返回20条结果
        lowQualityCount: results.filter(r => r.isLowQuality).length
      }
    })
  } catch (error) {
    console.error('Batch evaluation error:', error)
    return NextResponse.json(
      { success: false, message: '批量评估失败' },
      { status: 500 }
    )
  }
}
