import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET: List templates with optional category filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where: Prisma.ReplyTemplateWhereInput = {}
    if (category) where.category = category

    const templates = await db.replyTemplate.findMany({
      where,
      orderBy: { usageCount: 'desc' },
    })

    return NextResponse.json({ success: true, data: templates })
  } catch (error) {
    console.error('Get templates error:', error)
    return NextResponse.json(
      { success: false, message: '获取回复模板失败' },
      { status: 500 }
    )
  }
}

// POST: Create new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, category, content } = body

    if (!name || !category || !content) {
      return NextResponse.json(
        { success: false, message: '请填写完整的模板信息' },
        { status: 400 }
      )
    }

    const template = await db.replyTemplate.create({
      data: {
        name,
        category,
        content,
        isBuiltIn: false,
      },
    })

    return NextResponse.json({ success: true, data: template }, { status: 201 })
  } catch (error) {
    console.error('Create template error:', error)
    return NextResponse.json(
      { success: false, message: '创建回复模板失败' },
      { status: 500 }
    )
  }
}
