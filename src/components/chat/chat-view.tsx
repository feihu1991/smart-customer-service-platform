'use client'

import { useEffect, useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Send, Bot, User, Search, MoreVertical, Phone, ImagePlus, Smile, MessageCircle } from 'lucide-react'

interface ChatMessage {
  id: string
  sender: string
  content: string
  type: string
  createdAt: string
}

interface ChatSession {
  id: string
  buyerName: string
  buyerAvatar: string | null
  status: string
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}

const aiReplies: Record<string, string> = {
  default: '您好，我已了解您的问题，让我为您查询一下，请稍等片刻~',
  shipping: '亲，您的包裹目前物流信息显示已到达您所在城市的分拣中心，预计明天就能送达，请您耐心等待~',
  quality: '非常抱歉给您带来不好的体验！这个问题我们会高度重视，麻烦您提供一下订单号和问题照片，我们会尽快为您处理。',
  return: '好的亲，退换货流程很简单：1.在订单页面申请退换 → 2.等待审核通过 → 3.寄回商品 → 4.退款到账。运费险已覆盖哦~',
  size: '亲，这款产品的尺码信息可以在商品详情页找到。根据您的描述，建议选择M码。如果收到后不合适，7天内可以免费退换哦~',
}

export function ChatView() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [aiMode, setAiMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingAi, setSendingAi] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/chat')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setSessions(result.data)
          if (result.data.length > 0) setActiveSession(result.data[0])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages])

  const handleSend = async () => {
    if (!messageInput.trim() || !activeSession) return

    const content = messageInput
    setMessageInput('')

    // Optimistically add message to UI
    const optimisticMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'customer_service',
      content,
      type: 'text',
      createdAt: new Date().toISOString(),
    }
    const updatedSession = {
      ...activeSession,
      messages: [...activeSession.messages, optimisticMsg],
    }
    setActiveSession(updatedSession)
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s))

    try {
      const res = await fetch(`/api/chats/${activeSession.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, sender: 'customer_service' }),
      })
      if (!res.ok) return
    } catch {
      // Silent fail - message already shown optimistically
    }
  }

  const handleAiReply = async () => {
    if (!activeSession) return
    setSendingAi(true)

    // Add a loading message
    const loadingMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'customer_service',
      content: '🤖 AI正在思考中...',
      type: 'text',
      createdAt: new Date().toISOString(),
    }
    let updatedSession = {
      ...activeSession,
      messages: [...activeSession.messages, loadingMsg],
    }
    setActiveSession(updatedSession)

    try {
      const res = await fetch(`/api/chats/${activeSession.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '请根据对话上下文生成合适的回复', sender: 'ai' }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          sender: 'customer_service',
          content: `🤖 [AI生成] ${data.data.content || data.data}`,
          type: 'text',
          createdAt: new Date().toISOString(),
        }
        updatedSession = {
          ...activeSession,
          messages: [...activeSession.messages, aiMsg],
        }
        setActiveSession(updatedSession)
        setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s))
      }
    } catch {
      // Fallback to local simulation
      const lastBuyerMsg = [...activeSession.messages].reverse().find(m => m.sender === 'customer')
      const context = lastBuyerMsg?.content || ''
      let reply = aiReplies.default
      if (context.includes('物流') || context.includes('快递') || context.includes('发货')) reply = aiReplies.shipping
      else if (context.includes('退') || context.includes('换')) reply = aiReplies.return
      else if (context.includes('质量') || context.includes('问题') || context.includes('坏了')) reply = aiReplies.quality
      else if (context.includes('码') || context.includes('尺码') || context.includes('大小')) reply = aiReplies.size

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'customer_service',
        content: `🤖 [AI生成] ${reply}`,
        type: 'text',
        createdAt: new Date().toISOString(),
      }
      updatedSession = {
        ...activeSession,
        messages: [...activeSession.messages, aiMsg],
      }
      setActiveSession(updatedSession)
      setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s))
    } finally {
      setSendingAi(false)
    }
  }

  const filteredSessions = sessions.filter(s =>
    s.buyerName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return `${Math.floor(diff / 86400000)}天前`
  }

  const formatMsgTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex">
        <Skeleton className="w-80 border-r" />
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-12 rounded-lg" />
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 rounded-lg w-3/4" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Session List */}
      <div className="w-80 border-r bg-gray-50 flex flex-col shrink-0 hidden md:flex">
        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索买家..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm bg-white"
            />
          </div>
        </div>

        {/* Session Items */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredSessions.map(session => {
              const lastMsg = session.messages[session.messages.length - 1]
              const isActive = activeSession?.id === session.id
              return (
                <button
                  key={session.id}
                  onClick={() => setActiveSession(session)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    isActive ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {session.buyerName.charAt(0)}
                      </div>
                      {session.status === 'active' && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{session.buyerName}</span>
                        <span className="text-xs text-gray-400">{formatTime(session.updatedAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {lastMsg?.content || '暂无消息'}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </ScrollArea>

        {/* Session count */}
        <div className="p-3 border-t text-xs text-muted-foreground text-center">
          共 {filteredSessions.length} 个会话 · {sessions.filter(s => s.status === 'active').length} 个进行中
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeSession ? (
          <>
            {/* Chat Header */}
            <div className="h-14 border-b flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="md:hidden w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {activeSession.buyerName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{activeSession.buyerName}</p>
                  <p className="text-xs text-green-500">在线</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Phone className="h-4 w-4 text-gray-500" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4 text-gray-500" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {/* Date separator */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-muted-foreground">今天</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {activeSession.messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2.5 ${msg.sender === 'customer_service' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      msg.sender === 'customer'
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-orange-500 text-white'
                    }`}>
                      {msg.sender === 'customer' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    {/* Bubble */}
                    <div className={`max-w-[70%] ${msg.sender === 'customer_service' ? 'text-right' : ''}`}>
                      <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.sender === 'customer'
                          ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                          : msg.content.startsWith('🤖')
                            ? 'bg-gradient-to-r from-orange-50 to-amber-50 text-gray-800 border border-orange-200 rounded-tr-sm'
                            : 'bg-orange-500 text-white rounded-tr-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <p className={`text-[10px] text-gray-400 mt-1 ${msg.sender === 'customer_service' ? 'text-right' : ''}`}>
                        {formatMsgTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t bg-white p-4">
              <div className="max-w-3xl mx-auto">
                {/* Tools */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-2 mr-auto">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-orange-500" />
                    <span className="text-xs text-gray-600">AI自动回复</span>
                    <Switch checked={aiMode} onCheckedChange={setAiMode} />
                  </div>
                </div>
                {/* Input */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={aiMode ? 'AI模式已开启，将自动生成回复...' : '输入消息...'}
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!messageInput.trim()}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <MessageCircle className="h-12 w-12 mx-auto text-gray-300" />
              <p>选择一个会话开始聊天</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

