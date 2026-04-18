/**
 * AI生成评价回复API
 * POST /api/reviews/[id]/reply
 * 
 * 功能：
 * 1. 使用次数限制检查
 * 2. 差评挽回场景优化
 * 3. 分析差评类型并生成针对性回复
 * 4. 回复质量评分
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
    let userId: string | null = null
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

    // 分析差评类型（增强版）
    const reviewAnalysis = analyzeReview(review.content, review.rating, review.sentiment)

    // 根据评价类型构建针对性的prompt（优化版）
    const systemPrompt = buildPrompt(review, reviewAnalysis, style, customInstruction)

    // Generate AI replies using Xiaomi API
    const aiResponse = await chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '请按照上述要求生成回复。' },
      ],
    })

    let replyOptions: Array<{ text: string; score: number; reason: string }>
    try {
      const content = aiResponse.choices[0]?.message?.content || '[]'
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : []
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 新格式：[{text, score, reason}, ...]
        if (typeof parsed[0] === 'object') {
          replyOptions = parsed.slice(0, 3)
        } else {
          // 兼容旧格式：[string, string, ...]
          replyOptions = parsed.slice(0, 3).map((text, index) => ({
            text: String(text),
            score: Math.max(0.6, 0.95 - index * 0.1),
            reason: 'AI生成',
          }))
        }
      } else {
        replyOptions = [{
          text: content.trim(),
          score: 0.6,
          reason: '解析失败，使用原始内容',
        }]
      }
    } catch {
      // 解析失败时返回默认回复
      replyOptions = [{
        text: `感谢您的评价！${review.rating >= 4 ? '很高兴您对商品感到满意，我们会继续保持品质。' : '非常抱歉给您带来不好的体验，我们会积极改进。如有任何问题，欢迎随时联系我们的客服团队。'}`,
        score: 0.6,
        reason: '解析失败，使用默认回复',
      }]
    }

    // 对回复进行质量评分
    const scoredReplies = replyOptions.map(reply => {
      const qualityScore = scoreReplyQuality(reply.text, reviewAnalysis)
      return {
        ...reply,
        qualityScore,
        factors: qualityScore.factors,
      }
    })

    // Save generated replies to database
    const savedReplies = await Promise.all(
      scoredReplies.map(reply =>
        db.reviewReply.create({
          data: {
            reviewId: id,
            content: reply.text,
            type: 'ai_generated',
            aiScore: reply.score,
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
          scoredReplies,
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
        scoredReplies,
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
 * 增强版差评分析
 * @returns 结构化分析结果
 */
function analyzeReview(content: string, rating: number, sentiment: string) {
  // 空内容处理
  if (!content || content.trim().length === 0) {
    return {
      category: 'mixed' as const,
      emotion: 'neutral' as const,
      intensity: 'weak' as const,
      severity: 'minor' as const,
      recoveryDifficulty: 'easy' as const,
      keywords: { quality: false, logistics: false, service: false, expectation: false },
      isNegative: false,
      needsCompensation: false,
      analysis: '无法分析空内容',
    }
  }

  // ========== 差评类型检测 ==========
  let category: 'quality' | 'logistics' | 'service' | 'expectation' | 'malicious' | 'mixed' = 'mixed'
  
  // 质量问题关键词
  const qualityKeywords = ['质量', '质量差', '破损', '坏', '瑕疵', '次品', '假货', '劣质', '有问题', '不好用', '不好使', '不能用', '变质', '腐烂', '不新鲜', '不熟', '死包']
  // 物流问题关键词
  const logisticsKeywords = ['物流', '快递', '发货', '慢', '迟迟不', '等了很久', '包装', '损坏', '压坏', '破', '摔坏', '少件', '漏发', '延迟', '迟迟']
  // 服务问题关键词
  const serviceKeywords = ['客服', '服务', '态度', '不理', '不回', '不接', '推诿', '敷衍', '恶劣', '差劲', '傲慢', '爱答不理']
  // 期望差距关键词
  const expectationKeywords = ['不符', '不一样', '不像', '图片', '描述', '宣传', '夸大', '虚标', '不值', '图片骗人', '货不对板', '色差', '大小不符']
  // 恶意差评关键词
  const maliciousKeywords = ['骗子', '假货满天飞', '垃圾店铺', '再也', '永远', '诅咒', '太垃圾', '黑店', '无良商家', '坑人', '诈骗', '恶心']

  const qualityCount = qualityKeywords.filter(k => content.includes(k)).length
  const logisticsCount = logisticsKeywords.filter(k => content.includes(k)).length
  const serviceCount = serviceKeywords.filter(k => content.includes(k)).length
  const expectationCount = expectationKeywords.filter(k => content.includes(k)).length
  const maliciousCount = maliciousKeywords.filter(k => content.includes(k)).length

  // 恶意差评检测
  if (maliciousCount >= 2 || rating === 1) {
    category = 'malicious'
  } else if (rating <= 2) {
    const counts = [
      { type: 'quality' as const, count: qualityCount },
      { type: 'logistics' as const, count: logisticsCount },
      { type: 'service' as const, count: serviceCount },
      { type: 'expectation' as const, count: expectationCount },
    ]
    counts.sort((a, b) => b.count - a.count)
    category = counts[0].count > 0 ? counts[0].type : 'mixed'
  }

  // ========== 情感强度分析 ==========
  let intensity: 'weak' | 'medium' | 'strong' = 'medium'
  
  // 基于评分判断
  if (rating === 1) {
    intensity = 'strong'
  } else if (rating === 2) {
    intensity = 'medium'
  } else if (rating === 3) {
    intensity = 'weak'
  }
  
  // 基于关键词强度调整
  const strongEmotionWords = ['非常', '特别', '极其', '超级', '简直', '太', '太差', '完全', '彻底', '极其', '忍无可忍', '愤怒', '生气', '失望透顶']
  const weakEmotionWords = ['有点', '稍微', '略微', '可能', '大概', '似乎', '感觉']
  
  const strongCount = strongEmotionWords.filter(w => content.includes(w)).length
  const weakCount = weakEmotionWords.filter(w => content.includes(w)).length
  
  if (strongCount > weakCount) {
    intensity = 'strong'
  } else if (weakCount > strongCount && intensity !== 'weak') {
    intensity = 'medium'
  }

  // ========== 问题严重度评估 ==========
  let severity: 'minor' | 'moderate' | 'severe' = 'moderate'
  
  // 基于评分
  if (rating === 1) {
    severity = 'severe'
  } else if (rating === 2) {
    severity = 'moderate'
  } else if (rating === 3) {
    severity = 'minor'
  }
  
  // 严重问题关键词
  const severeKeywords = ['假货', '诈骗', '欺骗', '索赔', '投诉', '315', '曝光', '食品安全', '中毒', '过敏']
  const minorKeywords = ['还好', '还行', '一般般', '凑合', '将就', '勉强']
  
  if (severeKeywords.some(k => content.includes(k))) {
    severity = 'severe'
  } else if (minorKeywords.some(k => content.includes(k))) {
    severity = 'minor'
  }

  // ========== 挽回难度评估 ==========
  let recoveryDifficulty: 'easy' | 'medium' | 'hard' = 'medium'
  
  // 恶意差评难度最高
  if (category === 'malicious') {
    recoveryDifficulty = 'hard'
  } else if (category === 'quality' && severity === 'severe') {
    // 严重质量问题难以挽回
    recoveryDifficulty = 'hard'
  } else if (category === 'logistics' || category === 'expectation') {
    // 物流和期望问题相对容易处理
    recoveryDifficulty = 'easy'
  } else if (category === 'service') {
    // 服务问题需要更多沟通
    recoveryDifficulty = 'medium'
  }
  
  // 情感强度影响挽回难度
  if (intensity === 'strong' && recoveryDifficulty !== 'hard') {
    recoveryDifficulty = recoveryDifficulty === 'easy' ? 'medium' : 'hard'
  }

  // 根据评分和情感调整
  if (rating === 1 && intensity === 'strong') {
    recoveryDifficulty = 'hard'
  } else if (rating >= 3 && intensity === 'weak') {
    recoveryDifficulty = 'easy'
  }

  // ========== 情感判断 ==========
  let emotion = 'neutral'
  if (rating >= 4) emotion = 'positive'
  else if (rating <= 2) emotion = 'negative'
  
  if (sentiment === 'negative' && rating <= 2) {
    emotion = 'negative'
  }

  return {
    category,
    emotion,
    intensity,
    severity,
    recoveryDifficulty,
    keywords: {
      quality: qualityCount > 0,
      logistics: logisticsCount > 0,
      service: serviceCount > 0,
      expectation: expectationCount > 0,
    },
    isNegative: rating <= 2,
    needsCompensation: category !== 'malicious' && rating <= 2,
    analysis: `检测到${category}类问题，情感强度${intensity}，严重度${severity}，挽回难度${recoveryDifficulty}`,
  }
}

/**
 * 构建AI prompt（优化版）
 */
function buildPrompt(review: any, analysis: ReturnType<typeof analyzeReview>, style: string, customInstruction?: string) {
  const { product, shop, rating, content } = review
  
  // ========== 基础风格指令 ==========
  const styleInstructions: Record<string, string> = {
    sincere: '语气真诚恳切，表达歉意和感谢，让顾客感受到店家的诚意。适当使用亲昵的称呼如"亲"。回复长度控制在50-100字。',
    professional: '语气专业规范，条理清晰，突出解决方案和售后服务流程。体现品牌专业形象。回复长度控制在60-120字。',
    compensate: '语气热情大方，主动提出补偿方案（如优惠券、赠品、退款等），表达强烈的挽留意愿。回复长度控制在80-150字。',
  }

  // ========== 差评类型专项prompt（水果电商行业知识） ==========
  const categoryPrompts: Record<string, { instruction: string; strategies: string[]; examples: string[] }> = {
    quality: {
      instruction: `
【质量问题回复要点】
1. 首先真诚道歉，承认商品可能存在的质量问题
2. 表达对顾客体验的重视
3. 提供具体的解决方案（如退换货、补偿）
4. 强调店铺对品质的重视和后续改进措施
5. 邀请顾客再次联系，承诺妥善处理`,
      strategies: [
        '质量问题优先提供退换货服务',
        '可根据商品价值提供5%-30%的补偿',
        '强调生鲜水果的特殊性（运输风险）',
        '提供后续购买优惠作为补偿',
      ],
      examples: [
        '亲，非常抱歉给您带来了不好的体验。我们榴莲都是精选A级果，出现这种情况实在不应该。我们会立即为您安排退款或补发，同时赠送您一张20元无门槛优惠券，希望您能再给我们一次机会！',
      ],
    },
    logistics: {
      instruction: `
【物流问题回复要点】
1. 对物流问题表示歉意（可能是快递公司原因或包装不够完善）
2. 说明如果商品有损坏可以提供退换或补偿
3. 感谢顾客的理解和支持
4. 承诺会与物流公司沟通改进`,
      strategies: [
        '物流问题通常非商家可控，但应主动承担责任',
        '提供补发或退款选项',
        '强调包装升级措施',
        '可赠送运费券作为补偿',
      ],
      examples: [
        '亲，抱歉让您的等待时间过长！我们深知生鲜水果对时效的要求很高，已经在和快递公司沟通加速。关于您收到的商品，我们会第一时间为您处理补发或退款，同时赠送您一张满59减10元的优惠券，感谢您的耐心等待！',
      ],
    },
    service: {
      instruction: `
【服务问题回复要点】
1. 对服务不周表示诚挚歉意
2. 询问具体的服务问题，表示会认真调查
3. 承诺加强客服培训
4. 邀请顾客直接联系店铺负责人解决问题`,
      strategies: [
        '服务问题需要高度重视，及时响应',
        '提供专属客服跟进',
        '可给予较大力度补偿以挽回口碑',
        '记录问题用于内部培训改进',
      ],
      examples: [
        '亲，非常抱歉我们的客服没有及时回复您，这是我们的失职。为了表达歉意，我们愿意为您提供专属客服服务，同时补偿您30元店铺红包。如果您方便的话，可以直接联系我们店长（联系方式见店铺首页），我们会第一时间为您解决问题！',
      ],
    },
    expectation: {
      instruction: `
【期望差距回复要点】
1. 感谢顾客的反馈，理解顾客的期望
2. 解释商品实际情况与描述的差异（如光线、色差、个体差异等）
3. 如果确实存在描述不符，提供退换或补偿
4. 强调实物与图片尽量保持一致的努力`,
      strategies: [
        '水果存在个体差异是正常的（如榴莲果肉数量、甜度等）',
        '如实说明商品特性，避免过度美化的图片',
        '对于明显不符的情况提供退款或补发',
        '可提供色差说明或实物对比图供参考',
      ],
      examples: [
        '亲，感谢您的反馈！关于您提到的情况，需要说明一下：榴莲属于天然农产品，受光照、气候等因素影响，甜度和口感会有个体差异，我们在详情页已经尽量如实展示。对于这次给您带来的困扰，我们愿意为您办理部分退款（10-20元）或提供补发服务，希望能得到您的理解！',
      ],
    },
    malicious: {
      instruction: `
【恶意差评处理注意事项】
1. 保持礼貌和克制，不与顾客争执或对骂
2. 不要承认任何不实的指控
3. 表达愿意沟通解决问题的态度
4. 可以委婉说明情况，但不反驳顾客
5. 引导顾客通过客服渠道私下沟通
6. 保持专业形象，不影响其他顾客`,
      strategies: [
        '恶意差评不要正面冲突',
        '表明店铺诚信经营的立场',
        '邀请顾客私聊解决问题',
        '收集证据必要时申诉',
        '其他顾客会通过回复判断店铺态度',
      ],
      examples: [
        '亲，感谢您的反馈。对于您提到的问题，我们希望能直接与您沟通了解具体情况。店铺一直秉承诚信经营的原则，绝不会做出您提到的事情。如果有任何误会，希望能通过我们的客服热线（400-xxx-xxxx）为您解决。感谢您的监督，我们会持续改进！',
      ],
    },
    mixed: {
      instruction: `
【综合问题回复要点】
1. 真诚感谢顾客的反馈
2. 对顾客不好的体验表示歉意
3. 全面了解问题后提供解决方案
4. 承诺会持续改进服务`,
      strategies: [
        '综合问题需要逐一回应',
        '优先解决最核心的问题',
        '提供合理的补偿方案',
        '表达改进的诚意',
      ],
      examples: [
        '亲，非常感谢您认真反馈了这几个问题！我们会逐一排查改进：物流方面我们会更换更靠谱的快递；品质方面会加强抽检；服务方面会培训客服团队。为了表达歉意，赠送您一张30元店铺优惠券，期待您下次光临时会看到一个更好的我们！',
      ],
    },
  }

  const currentCategoryPrompt = categoryPrompts[analysis.category] || categoryPrompts.mixed

  // ========== 补偿建议（水果电商特色） ==========
  let compensationPrompt = ''
  if (analysis.needsCompensation && analysis.category !== 'malicious') {
    const compensationTiers = {
      easy: ['无门槛优惠券5-10元', '下次购买9折优惠', '小额红包5元'],
      medium: ['无门槛优惠券10-20元', '退款商品金额的10-20%', '下次购买8折优惠'],
      hard: ['全额退款或补发', '高额优惠券20-50元', 'VIP会员折扣'],
    }
    
    compensationPrompt = `
【补偿建议】（挽回难度：${analysis.recoveryDifficulty === 'easy' ? '较易' : analysis.recoveryDifficulty === 'medium' ? '中等' : '较难'}）
可选的补偿方式（根据问题严重度选择1-2种）：
${compensationTiers[analysis.recoveryDifficulty].map(c => `- ${c}`).join('\n')}
水果电商特有补偿参考：
- 榴莲/芒果等易腐水果：优先提供补发或全额退款
- 生鲜类：可提供保鲜期补偿券
选择补偿时请考虑：商品价格（¥${product.price}）、顾客购买金额、问题的严重程度`
  }

  // ========== 水果电商行业知识 ==========
  const fruitIndustryKnowledge = `
【水果电商行业知识】
- 榴莲：马来西亚/泰国进口，注意死包、成熟度、口感差异
- 生鲜：对温度和时效要求高，运输损耗难以完全避免
- 农产品特性：大小、口感、甜度存在个体差异属正常
- 应季水果：品质波动较大，需做好品控和说明
- 包装要求：防震、防压、冷链配送`

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
- 情感强度：${analysis.intensity === 'strong' ? '强烈（需要重点安抚）' : analysis.intensity === 'medium' ? '中等' : '较弱'}
- 问题严重度：${analysis.severity === 'severe' ? '严重（需优先处理）' : analysis.severity === 'moderate' ? '中等' : '轻微'}
- 挽回难度：${analysis.recoveryDifficulty === 'easy' ? '较易' : analysis.recoveryDifficulty === 'medium' ? '中等' : '较难'}
${analysis.keywords.quality ? '- 关键词：质量相关' : ''}
${analysis.keywords.logistics ? '- 关键词：物流相关' : ''}
${analysis.keywords.service ? '- 关键词：服务相关' : ''}
${analysis.keywords.expectation ? '- 关键词：期望差距' : ''}

${categoryPrompts.industryKnowledge ? '' : fruitIndustryKnowledge}

【回复风格】
${styleInstructions[style] || styleInstructions.sincere}

【专项回复策略】
${currentCategoryPrompt.instruction}

${currentCategoryPrompt.strategies.map(s => `- ${s}`).join('\n')}

【回复示例参考】
${currentCategoryPrompt.examples.join('\n')}

${compensationPrompt}

${customInstruction ? `【额外要求】\n${customInstruction}` : ''}

【输出要求】
请生成3个不同风格的回复选项，用JSON数组格式返回，每个回复包含以下字段：
- text: 回复文本内容
- score: 自信度评分（0.5-1.0），第一条为最佳推荐
- reason: 为什么这个回复适合这个场景

格式示例：
[
  {"text": "回复内容1", "score": 0.95, "reason": "理由1"},
  {"text": "回复内容2", "score": 0.85, "reason": "理由2"},
  {"text": "回复内容3", "score": 0.75, "reason": "理由3"}
]

回复要求：
1. 每个回复50-150字
2. 第一条为最佳推荐回复
3. 回复要自然、真诚，避免生硬的模板感
4. 如果是差评挽回，在回复中体现解决问题的诚意
5. 只返回JSON数组，不要有任何其他文字`

  return systemPrompt
}

/**
 * 回复质量评分
 * 对AI生成的回复进行多维度质量评估
 */
function scoreReplyQuality(
  reply: string, 
  analysis: ReturnType<typeof analyzeReview>
): { total: number; factors: Record<string, { score: number; reason: string }> } {
  
  const factors: Record<string, { score: number; reason: string }> = {}
  
  // 1. 道歉真诚度
  const apologyWords = ['抱歉', '对不起', '歉意', '不好意思', '非常抱歉', '对不起亲', '抱歉亲']
  const hasApology = apologyWords.some(w => reply.includes(w))
  factors.apology = {
    score: hasApology ? 10 : 5,
    reason: hasApology ? '包含道歉表达' : '缺少道歉，建议添加真诚道歉',
  }

  // 2. 解决方案有效性
  const solutionWords = ['退款', '补发', '退换', '补偿', '处理', '解决', '优惠券', '红包', '折扣']
  const solutionCount = solutionWords.filter(w => reply.includes(w)).length
  let solutionScore = 5
  let solutionReason = '缺少明确的解决方案'
  
  if (solutionCount >= 2) {
    solutionScore = 10
    solutionReason = '提供了多种解决方案'
  } else if (solutionCount === 1) {
    solutionScore = 7
    solutionReason = '提供了一个解决方案'
  }
  
  // 根据差评类型调整
  if (analysis.category === 'malicious') {
    // 恶意差评不需要解决方案
    solutionScore = 5
    solutionReason = '恶意差评保持礼貌即可'
  }
  
  factors.solution = { score: solutionScore, reason: solutionReason }

  // 3. 补偿建议合理性
  const compensationWords = ['优惠券', '红包', '折扣', '退款', '补发', '无门槛', '赠送']
  const hasCompensation = compensationWords.some(w => reply.includes(w))
  
  let compensationScore = 5
  let compensationReason = '未提及补偿'
  
  if (hasCompensation) {
    if (analysis.needsCompensation) {
      compensationScore = 10
      compensationReason = '提供了补偿建议'
    } else {
      compensationScore = 7
      compensationReason = '提供了补偿（但可能不需要）'
    }
  }
  
  factors.compensation = { score: compensationScore, reason: compensationReason }

  // 4. 语气恰当性
  let toneScore = 7
  let toneReason = '语气基本合适'
  
  const positiveTone = ['感谢', '谢谢', '希望', '期待', '理解', '支持']
  const negativeTone = ['但是', '只是', '不过', '谁让你', '你自己', '怪']
  
  const positiveCount = positiveTone.filter(w => reply.includes(w)).length
  const negativeCount = negativeTone.filter(w => reply.includes(w)).length
  
  if (positiveCount > negativeCount && positiveCount >= 2) {
    toneScore = 10
    toneReason = '语气积极正向'
  } else if (negativeCount > positiveCount) {
    toneScore = 5
    toneReason = '语气可能显得推卸责任'
  }
  
  factors.tone = { score: toneScore, reason: toneReason }

  // 5. 长度合理性
  const length = reply.length
  let lengthScore = 7
  let lengthReason = '长度适中'
  
  if (length < 30) {
    lengthScore = 5
    lengthReason = '内容过短，可能显得敷衍'
  } else if (length > 200) {
    lengthScore = 6
    lengthReason = '内容偏长，建议精简'
  } else if (length >= 50 && length <= 150) {
    lengthScore = 10
    lengthReason = '长度合适'
  }
  
  factors.length = { score: lengthScore, reason: lengthReason }

  // 6. 针对恶意差评的特殊评估
  if (analysis.category === 'malicious') {
    const defensiveWords = ['不是', '没有', '不可能', '冤枉', '诋毁']
    const hasDefense = defensiveWords.some(w => reply.includes(w))
    
    if (hasDefense) {
      factors.maliciousDefense = { 
        score: 3, 
        reason: '恶意差评不应正面反驳，容易激化矛盾' 
      }
    } else {
      factors.maliciousDefense = { 
        score: 10, 
        reason: '恶意差评处理得当，保持礼貌' 
      }
    }
  }

  // 计算总分
  const factorScores = Object.values(factors).map(f => f.score)
  const total = Math.round((factorScores.reduce((a, b) => a + b, 0) / factorScores.length) * 10) / 10

  return { total, factors }
}
