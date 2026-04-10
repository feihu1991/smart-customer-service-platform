/**
 * 小米API调用工具
 * 用于调用小米大模型API
 */
import { NextResponse } from 'next/server'

const XIAOMI_API_KEY = process.env.XIAOMI_API_KEY || ''
const XIAOMI_BASE_URL = process.env.XIAOMI_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1'
const AI_MODEL = process.env.AI_MODEL || 'xiaomi/lh-llama3-8b-instruct-adapter'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
}

/**
 * 调用小米API进行对话
 */
export async function chat(options: ChatOptions): Promise<{
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}> {
  const { messages, temperature = 0.7, max_tokens = 2048 } = options

  try {
    const response = await fetch(`${XIAOMI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XIAOMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        temperature,
        max_tokens,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Xiaomi API Error:', response.status, errorText)
      throw new Error(`API调用失败: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Chat API Error:', error)
    throw error
  }
}

/**
 * 简化的聊天接口（兼容ZAI SDK格式）
 */
export const ZAI = {
  chat: async (options: { messages: ChatMessage[] }) => {
    const result = await chat({
      messages: options.messages,
      temperature: 0.7,
      max_tokens: 2048,
    })
    return result
  },
}
