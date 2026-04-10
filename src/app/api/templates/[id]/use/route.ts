/**
 * 模板使用次数更新API
 * POST /api/templates/[id]/use
 * 
 * 功能：
 * 1. 增加模板使用次数
 * 2. 返回更新后的模板信息
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const template = await db.replyTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json(
        { success: false, message: '模板不存在' },
        { status: 404 }
      )
    }

    const updated = await db.replyTemplate.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('Update template usage error:', error)
    return NextResponse.json(
      { success: false, message: '更新模板使用次数失败' },
      { status: 500 }
    )
  }
}
