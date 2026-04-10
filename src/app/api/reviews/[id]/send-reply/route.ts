import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { replyId } = body

    if (!replyId) {
      return NextResponse.json(
        { success: false, message: '请提供回复ID' },
        { status: 400 }
      )
    }

    // Verify the reply belongs to this review
    const reply = await db.reviewReply.findUnique({
      where: { id: replyId },
    })

    if (!reply || reply.reviewId !== id) {
      return NextResponse.json(
        { success: false, message: '回复不存在或不属于该评价' },
        { status: 404 }
      )
    }

    // Mark reply as sent and update review status
    const [updatedReply, updatedReview] = await Promise.all([
      db.reviewReply.update({
        where: { id: replyId },
        data: { isSent: true },
      }),
      db.review.update({
        where: { id },
        data: { replyStatus: 'replied' },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        reply: updatedReply,
        review: updatedReview,
      },
    })
  } catch (error) {
    console.error('Send reply error:', error)
    return NextResponse.json(
      { success: false, message: '发送回复失败' },
      { status: 500 }
    )
  }
}
