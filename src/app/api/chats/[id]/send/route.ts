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
    const { content, type = 'text', sender = 'customer_service' } = body

    if (!content) {
      return NextResponse.json(
        { success: false, message: '消息内容不能为空' },
        { status: 400 }
      )
    }

    // Verify session exists
    const session = await db.chatSession.findUnique({
      where: { id },
      include: {
        shop: { select: { name: true } },
      },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, message: '聊天会话不存在' },
        { status: 404 }
      )
    }

    // Save the user message
    const userMessage = await db.chatMessage.create({
      data: {
        sessionId: id,
        sender,
        content,
        type,
      },
    })

    const result: { messages: typeof userMessage[] } = { messages: [userMessage] }

    // If sender is "ai", generate an AI response
    if (sender === 'ai') {
      // Get recent chat history for context
      const recentMessages = await db.chatMessage.findMany({
        where: { sessionId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      const chatHistory = recentMessages
        .reverse()
        .map((msg) => ({
          role: msg.sender === 'customer' ? 'user' : 'assistant',
          content: msg.content,
        }))

      const aiResponse = await (ZAI as any).chat({
        messages: [
          {
            role: 'system',
            content: `你是"${session.shop.name}"的专业淘宝客服代表。你的职责是：
1. 热情礼貌地回答顾客的问题
2. 提供准确的商品信息和售后服务
3. 保持专业、耐心的态度
4. 使用适当的淘宝客服用语（如"亲"、"您好"等）
5. 回复要简洁明了，不要过于冗长
6. 如果不确定信息，诚实地告知顾客你会核实后回复

请用中文回复，保持友好的语气。`,
          },
          ...chatHistory,
        ],
      })

      const aiContent = aiResponse.choices[0]?.message?.content || '抱歉，我暂时无法回复，请稍后再试。'

      const aiMessage = await db.chatMessage.create({
        data: {
          sessionId: id,
          sender: 'customer_service',
          content: aiContent,
          type: 'text',
        },
      })

      result.messages.push(aiMessage)
    }

    // Update session timestamp
    await db.chatSession.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { success: false, message: '发送消息失败', error: String(error) },
      { status: 500 }
    )
  }
}
