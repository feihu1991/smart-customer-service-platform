/**
 * 回复质量评估API
 * POST /api/replies/[id]/evaluate
 * 
 * 功能：
 * 1. 基于规则评估回复质量（后续可接入AI评分）
 * 2. 评估维度：相关性、礼貌度、专业性、挽回潜力
 * 3. 综合评分及低质量标记
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

  // 1. 相关性评估 - 检查回复是否针对评价内容
  const positiveKeywords = ['感谢', '满意', '好评', '支持', '信赖', '回购', '五星', '赞']
  const negativeKeywords = ['抱歉', '对不起', '问题', '差评', '投诉', '退款', '赔偿']
  const apologyKeywords = ['抱歉', '对不起', '歉意', '遗憾']
  const solutionKeywords = ['处理', '解决', '联系', '反馈', '跟进', '改善', '补偿', '换货', '退货']
  const politeKeywords = ['感谢', '谢谢', '亲', '尊敬', '惠顾', '支持', '光临']
  const professionalKeywords = ['您好', '核实', '确认', '了解', '详情', '情况', '可能', '建议']

  const replyLower = replyContent.toLowerCase()
  const reviewLower = reviewContent.toLowerCase()

  // 检查回复是否回应了评价中的负面内容
  let matchedNegative = 0
  negativeKeywords.forEach(keyword => {
    if (reviewLower.includes(keyword) && replyLower.includes(keyword)) {
      matchedNegative++
    }
  })
  
  // 检查回复是否包含解决方案
  let hasSolution = 0
  solutionKeywords.forEach(keyword => {
    if (replyLower.includes(keyword)) hasSolution++
  })

  // 检查回复是否有道歉
  let hasApology = 0
  apologyKeywords.forEach(keyword => {
    if (replyLower.includes(keyword)) hasApology++
  })

  // 计算相关性 (30-100)
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

  // 2. 礼貌度评估 (30-100)
  let politeCount = 0
  politeKeywords.forEach(keyword => {
    if (replyLower.includes(keyword)) politeCount++
  })
  politeness = Math.min(30 + politeCount * 15, 100)

  // 3. 专业性评估 (40-100)
  // 长度合理 (20-200字)
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
  
  // 检查是否过于简短或重复
  const hasMinimumLength = length >= 15
  const noExcessiveRepeat = !/(.)\1{4,}/.test(replyContent) // 无5个以上连续重复字符
  
  professionalism = Math.min(40 + professionalCount * 10 + (hasMinimumLength ? 20 : 0) + (noExcessiveRepeat ? 10 : -10) + lengthScore / 5, 100)

  // 4. 挽回潜力评估 (0-100)
  // 针对差评：是否有道歉+解决方案+补偿承诺
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
    // 好评回复：表达感谢和期待
    recoveryPotential = 60 + (replyLower.includes('期待') || replyLower.includes('再次') ? 20 : 0)
  }

  // 综合评分 (加权平均)
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 获取回复及关联的评价内容
    const reply = await db.reviewReply.findUnique({
      where: { id },
      include: {
        review: {
          select: { content: true, rating: true }
        }
      }
    })

    if (!reply) {
      return NextResponse.json(
        { success: false, message: '回复不存在' },
        { status: 404 }
      )
    }

    // 执行质量评估
    const evaluation = evaluateReplyQuality(reply.content, reply.review.content)

    // 判断是否为低质量回复（综合评分低于60分）
    const isLowQuality = evaluation.score < 60

    // 保存或更新质量评估记录
    const quality = await db.replyQuality.upsert({
      where: { replyId: id },
      update: {
        score: evaluation.score,
        relevance: evaluation.relevance,
        politeness: evaluation.politeness,
        professionalism: evaluation.professionalism,
        recoveryPotential: evaluation.recoveryPotential,
        isLowQuality,
        evaluatedAt: new Date(),
      },
      create: {
        replyId: id,
        score: evaluation.score,
        relevance: evaluation.relevance,
        politeness: evaluation.politeness,
        professionalism: evaluation.professionalism,
        recoveryPotential: evaluation.recoveryPotential,
        isLowQuality,
      }
    })

    return NextResponse.json({
      success: true,
      message: '质量评估完成',
      data: {
        id: quality.id,
        replyId: id,
        score: quality.score,
        metrics: {
          relevance: quality.relevance,
          politeness: quality.politeness,
          professionalism: quality.professionalism,
          recoveryPotential: quality.recoveryPotential,
        },
        isLowQuality: quality.isLowQuality,
        evaluatedAt: quality.evaluatedAt,
      }
    })
  } catch (error) {
    console.error('Quality evaluation error:', error)
    return NextResponse.json(
      { success: false, message: '评估失败' },
      { status: 500 }
    )
  }
}

// 获取单条回复的质量评估结果
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const quality = await db.replyQuality.findUnique({
      where: { replyId: id },
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
                buyerName: true
              }
            }
          }
        }
      }
    })

    if (!quality) {
      return NextResponse.json(
        { success: false, message: '暂无质量评估记录' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: quality
    })
  } catch (error) {
    console.error('Get quality error:', error)
    return NextResponse.json(
      { success: false, message: '获取失败' },
      { status: 500 }
    )
  }
}
