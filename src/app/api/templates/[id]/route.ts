import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, category, content } = body

    if (!name || !content) {
      return NextResponse.json(
        { success: false, message: '请填写完整信息' },
        { status: 400 }
      )
    }

    const template = await db.replyTemplate.findUnique({ where: { id } })
    if (!template) {
      return NextResponse.json(
        { success: false, message: '模板不存在' },
        { status: 404 }
      )
    }

    const updated = await db.replyTemplate.update({
      where: { id },
      data: { name, category: category || template.category, content },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update template error:', error)
    return NextResponse.json(
      { success: false, message: '更新模板失败' },
      { status: 500 }
    )
  }
}

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
