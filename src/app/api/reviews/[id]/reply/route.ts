/**
 * AI生成评价回复API
 * POST /api/reviews/[id]/reply
 * 
 * 功能：
 * 1. 使用次数限制检查
 * 2. 差评挽回场景优化
 * 3. 分析差评类型并生成针对性回复
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chat } from '@/lib/xiaomi-api'
import { getTokenFromRequest, verifyToken, checkUsageLimit, incrementUsage } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { style = 'sincere', customInstruction, skipAuth } = body

    // 认证检查（skipAuth用于开发测试）
    let userId = null
    if (!skipAuth) {
      const token = getTokenFromRequest(request)
      if (!token) {
        return NextResponse.json(
          { success: false, message: '请先登录' },
          { status: 401 }
        )
      }

      const session = await verifyToken(token)
      if (!session) {
        return NextResponse.json(
          { success: false, message: '登录已过期，请重新登录' },
          { status: 401 }
        )
      }

      userId = session.userId

      // 检查使用次数限制
      const usageInfo = await checkUsageLimit(userId)
      if (!usageInfo.allowed) {
        return NextResponse.json(
          { 
            success: false, 
            message: `今日使用次数已用完（${usageInfo.limit}/${usageInfo.limit}）`,
            code: 'USAGE_LIMIT_EXCEEDED',
            data: {
              remaining: 0,
              limit: usageInfo.limit,
              upgradeUrl: '/subscription',
            }
          },
          { status: 403 }
        )
      }
    }

    // Get review with product info
    const review = await db.review.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, title: true, price: true },
        },
        shop: {
          select: { id: true, name: true },
        },
      },
    })

    if (!review) {
      return NextResponse.json(
        { success: false, message: '评价不存在' },
        { status: 404 }
      )
    }

    // 分析差评类型
    const reviewAnalysis = analyzeReview(review.content, review.rating, review.sentiment)

    // 根据评价类型构建针对性的prompt
    const systemPrompt = buildPrompt(review, reviewAnalysis, style, customInstruction)

    // Generate AI replies using Xiaomi API
    const aiResponse = await chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '请按照上述要求生成回复。' },
      ],
    })

    let replyOptions: string[]
    try {
      const content = aiResponse.choices[0]?.message?.content || '[]'
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      replyOptions = jsonMatch ? JSON.parse(jsonMatch[0]) : []
      if (!Array.isArray(replyOptions) || replyOptions.length === 0) {
        replyOptions = [content.trim()]
      }
    } catch {
      // 解析失败时返回默认回复
      replyOptions = [
        `感谢您的评价！${review.rating >= 4 ? '很高兴您对商品感到满意，我们会继续保持品质。' : '非常抱歉给您带来不好的体验，我们会积极改进。'}如有任何问题，欢迎随时联系我们的客服团队。`,
      ]
    }

    // Save generated replies to database
    const savedReplies = await Promise.all(
      replyOptions.map((content, index) =>
        db.reviewReply.create({
          data: {
            reviewId: id,
            content,
            type: 'ai_generated',
            aiScore: Math.max(0.6, 0.95 - index * 0.1),
          },
        })
      )
    )

    // 增加使用次数
    if (userId) {
      await incrementUsage(userId)
      // 获取更新后的使用信息
      const usageInfo = await checkUsageLimit(userId)
      return NextResponse.json({
        success: true,
        data: {
          replies: savedReplies,
          reviewId: id,
          analysis: reviewAnalysis,
        },
        usage: {
          remaining: usageInfo.remaining,
          limit: usageInfo.limit,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        replies: savedReplies,
        reviewId: id,
        analysis: reviewAnalysis,
      },
    })
  } catch (error) {
    console.error('Generate reply error:', error)
    return NextResponse.json(
      { success: false, message: '生成回复失败', error: String(error) },
      { status: 500 }
    )
  }
}

/**
 * 分析评价类型
 */
function analyzeReview(content: string, rating: number, sentiment: string) {
  const lowerContent = content.toLowerCase()
  
  // 差评类型检测
  let category: 'quality' | 'logistics' | 'service' | 'expectation' | 'malicious' | 'mixed' = 'mixed'
  
  // 质量问题关键词
  const qualityKeywords = ['质量', '质量差', '破损', '坏', '瑕疵', '次品', '假货', '劣质', '有问题', '不好用', '不好使', '不能用']
  // 物流问题关键词
  const logisticsKeywords = ['物流', '快递', '发货', '慢', '迟迟不', '等了很久', '包装', '损坏', '压坏', '破']
  // 服务问题关键词
  const serviceKeywords = ['客服', '服务', '态度', '不理', '不回', '不接', '推诿', '敷衍']
  // 期望差距关键词
  const expectationKeywords = ['不符', '不一样', '不像', '图片', '描述', '宣传', '夸大', '虚标', '不值']
  // 恶意差评关键词（可能是同行的恶意攻击）
  const maliciousKeywords = ['骗子', '假货满天飞', '垃圾店铺', '再也', '永远', '诅咒', '太垃圾']

  const qualityCount = qualityKeywords.filter(k => content.includes(k)).length
  const logisticsCount = logisticsKeywords.filter(k => content.includes(k)).length
  const serviceCount = serviceKeywords.filter(k => content.includes(k)).length
  const expectationCount = expectationKeywords.filter(k => content.includes(k)).length
  const maliciousCount = maliciousKeywords.filter(k => content.includes(k)).length

  // 恶意差评检测（多个恶意词汇或评分异常低）
  if (maliciousCount >= 2 || rating === 1) {
    category = 'malicious'
  } else if (rating <= 2) {
    // 找出最主要的差评原因
    const counts = [
      { type: 'quality' as const, count: qualityCount },
      { type: 'logistics' as const, count: logisticsCount },
      { type: 'service' as const, count: serviceCount },
      { type: 'expectation' as const, count: expectationCount },
    ]
    counts.sort((a, b) => b.count - a.count)
    category = counts[0].count > 0 ? counts[0].type : 'mixed'
  }

  // 根据评分判断情绪
  let emotion = 'neutral'
  if (rating >= 4) emotion = 'positive'
  else if (rating <= 2) emotion = 'negative'
  
  // 如果已有情感分析且评级较低，使用该分析
  if (sentiment === 'negative' && rating <= 2) {
    emotion = 'negative'
  }

  return {
    category,
    emotion,
    keywords: {
      quality: qualityCount > 0,
      logistics: logisticsCount > 0,
      service: serviceCount > 0,
      expectation: expectationCount > 0,
    },
    isNegative: rating <= 2,
    needsCompensation: category !== 'malicious' && rating <= 2, // 非恶意差评可能需要补偿
  }
}

/**
 * 构建AI prompt
 */
function buildPrompt(review: any, analysis: ReturnType<typeof analyzeReview>, style: string, customInstruction?: string) {
  const { product, shop, rating, content } = review
  
  // 基础风格指令
  const styleInstructions: Record<string, string> = {
    sincere: '语气真诚恳切，表达歉意和感谢，让顾客感受到店家的诚意。适当使用亲昵的称呼如"亲"。回复长度控制在50-100字。',
    professional: '语气专业规范，条理清晰，突出解决方案和售后服务流程。体现品牌专业形象。回复长度控制在60-120字。',
    compensate: '语气热情大方，主动提出补偿方案（如优惠券、赠品、退款等），表达强烈的挽留意愿。回复长度控制在80-150字。',
  }

  // 差评挽回专项prompt
  let categoryPrompt = ''
  if (analysis.isNegative && analysis.category !== 'malicious') {
    const categoryInstructions: Record<string, string> = {
      quality: `
【质量问题回复要点】
1. 首先真诚道歉，承认商品可能存在的质量问题
2. 表达对顾客体验的重视
3. 提供具体的解决方案（如退换货、补偿）
4. 强调店铺对品质的重视和后续改进措施
5. 邀请顾客再次联系，承诺妥善处理`,
      logistics: `
【物流问题回复要点】
1. 对物流问题表示歉意（可能是快递公司原因或包装不够完善）
2. 说明如果商品有损坏可以提供退换或补偿
3. 感谢顾客的理解和支持
4. 承诺会与物流公司沟通改进`,
      service: `
【服务问题回复要点】
1. 对服务不周表示诚挚歉意
2. 询问具体的服务问题，表示会认真调查
3. 承诺加强客服培训
4. 邀请顾客直接联系店铺负责人解决问题`,
      expectation: `
【期望差距回复要点】
1. 感谢顾客的反馈，理解顾客的期望
2. 解释商品实际情况与描述的差异（如光线、色差等）
3. 如果确实存在描述不符，提供退换或补偿
4. 强调实物与图片尽量保持一致的努力`,
      mixed: `
【综合问题回复要点】
1. 真诚感谢顾客的反馈
2. 对顾客不好的体验表示歉意
3. 全面了解问题后提供解决方案
4. 承诺会持续改进服务`,
      malicious: `
【恶意差评注意事项】
1. 保持礼貌，不与顾客争执
2. 不要承认不实的指控
3. 表达愿意沟通解决问题的态度
4. 可以委婉说明情况，但不反驳
5. 引导顾客通过客服渠道沟通`,
    }
    categoryPrompt = categoryInstructions[analysis.category] || categoryInstructions.mixed
  }

  // 补偿建议（针对差评但非恶意）
  let compensationPrompt = ''
  if (analysis.needsCompensation) {
    compensationPrompt = `
【补偿建议】
可选的补偿方式（根据情况选择1-2种）：
- 现金红包/微信转账（10-50元不等，视商品价格而定）
- 店铺优惠券（满减券或无门槛券）
- 额外赠品
- 免运费/退货运费
- 直接退款（质量问题）
选择补偿时请考虑：商品价格、顾客购买金额、问题的严重程度`
  }

  const systemPrompt = `你是"${shop.name}"的智能客服助手，负责回复顾客的评价。你的目标是：
1. 提升顾客满意度，挽回差评顾客
2. 展示店铺专业、负责任的形象
3. 将负面评价转化为二次消费机会

【评价信息】
- 商品名称：${product.title}
- 商品价格：¥${product.price}
- 评分：${rating}星
- 评价内容："${content}"

【评价分析】
- 差评类型：${analysis.category === 'quality' ? '质量问题' : 
               analysis.category === 'logistics' ? '物流问题' : 
               analysis.category === 'service' ? '服务问题' : 
               analysis.category === 'expectation' ? '期望差距' : 
               analysis.category === 'malicious' ? '疑似恶意差评' : '综合问题'}
- 顾客情绪：${analysis.emotion === 'positive' ? '正面' : analysis.emotion === 'negative' ? '负面' : '中性'}
${analysis.keywords.quality ? '- 关键词：质量相关' : ''}
${analysis.keywords.logistics ? '- 关键词：物流相关' : ''}
${analysis.keywords.service ? '- 关键词：服务相关' : ''}
${analysis.keywords.expectation ? '- 关键词：期望差距' : ''}

【回复风格】
${styleInstructions[style] || styleInstructions.sincere}

${categoryPrompt}
${compensationPrompt}

${customInstruction ? `【额外要求】\n${customInstruction}` : ''}

【输出要求】
请生成3个不同风格的回复选项，用JSON数组格式返回：
["回复1", "回复2", "回复3"]

回复要求：
1. 每个回复50-150字
2. 第一条为最佳推荐回复
3. 回复要自然、真诚，避免生硬的模板感
4. 如果是差评挽回，在回复中体现解决问题的诚意
5. 只返回JSON数组，不要有任何其他文字`

  return systemPrompt
}
