import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if template exists
    const template = await db.replyTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json(
        { success: false, message: '模板不存在' },
        { status: 404 }
      )
    }

    // Don't allow deleting built-in templates
    if (template.isBuiltIn) {
      return NextResponse.json(
        { success: false, message: '内置模板不可删除' },
        { status: 403 }
      )
    }

    await db.replyTemplate.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: '模板已删除' })
  } catch (error) {
    console.error('Delete template error:', error)
    return NextResponse.json(
      { success: false, message: '删除模板失败' },
      { status: 500 }
    )
  }
}
