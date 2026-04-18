import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

// PATCH /api/reviews/[id]/status - 更新回复状态
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { replySent, recoveryStatus, buyerFeedback } = body;

    // 构建更新数据
    const updateData: Record<string, unknown> = {};

    // 如果设置了replySent为true，更新replySentAt
    if (replySent === true) {
      updateData.replySentAt = new Date();
      updateData.replyStatus = 'sent';
    }

    // 更新恢复状态
    if (recoveryStatus) {
      const validStatuses = ['pending', 'contacted', 'recovered', 'failed'];
      if (!validStatuses.includes(recoveryStatus)) {
        return NextResponse.json(
          { error: '无效的恢复状态，有效值: pending, contacted, recovered, failed' },
          { status: 400 }
        );
      }
      updateData.recoveryStatus = recoveryStatus;

      // 如果状态为recovered，记录挽回成功时间
      if (recoveryStatus === 'recovered') {
        updateData.recoveredAt = new Date();
      }
    }

    // 更新买家反馈
    if (buyerFeedback !== undefined) {
      updateData.buyerFeedback = buyerFeedback;
    }

    // 如果没有要更新的字段
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '没有提供要更新的字段' },
        { status: 400 }
      );
    }

    // 更新数据库
    const updated = await prisma.review.update({
      where: { id },
      data: updateData,
      include: {
        shop: true,
        product: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: '状态更新成功',
    });
  } catch (error) {
    console.error('更新回复状态失败:', error);
    return NextResponse.json(
      { error: '更新失败' },
      { status: 500 }
    );
  }
}

// GET /api/reviews/[id]/status - 获取回复状态
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        shop: true,
        product: true,
        replies: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: '评价不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: review.id,
        replyStatus: review.replyStatus,
        replySentAt: review.replySentAt,
        recoveryStatus: review.recoveryStatus,
        recoveredAt: review.recoveredAt,
        buyerFeedback: review.buyerFeedback,
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    console.error('获取回复状态失败:', error);
    return NextResponse.json(
      { error: '获取状态失败' },
      { status: 500 }
    );
  }
}
