import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { style = 'sincere', customInstruction } = body

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

    // Build system prompt based on style
    const styleInstructions: Record<string, string> = {
      sincere: '语气真诚恳切，表达歉意和感谢，让顾客感受到店家的诚意。可以适当使用亲昵的称呼如"亲"。',
      professional: '语气专业规范，条理清晰，突出解决方案和售后服务流程。体现品牌专业形象。',
      compensate: '语气热情大方，主动提出补偿方案（如优惠券、赠品、退款等），表达强烈的挽留意愿。',
    }

    const systemPrompt = `你是一位专业的淘宝客服代表，负责回复顾客的评价。回复应该礼貌、有同理心，并针对顾客的关切做出回应。

${styleInstructions[style] || styleInstructions.sincere}

${customInstruction ? `额外要求：${customInstruction}` : ''}

评价信息：
- 商品名称：${review.product.title}
- 评分：${review.rating}星
- 评价内容：${review.content}
- 顾客情绪：${review.sentiment === 'positive' ? '正面' : review.sentiment === 'negative' ? '负面' : '中性'}
${review.category ? `- 问题类别：${review.category}` : ''}

请生成3个不同风格的回复选项，每个回复50-150字，用JSON数组格式返回，格式如下：
["回复1", "回复2", "回复3"]

注意：只返回JSON数组，不要有任何其他文字。`

    // Generate AI replies
    const aiResponse = await ZAI.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '请为这条评价生成3个回复选项。' },
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

    return NextResponse.json({
      success: true,
      data: savedReplies,
      reviewId: id,
    })
  } catch (error) {
    console.error('Generate reply error:', error)
    return NextResponse.json(
      { success: false, message: '生成回复失败', error: String(error) },
      { status: 500 }
    )
  }
}
