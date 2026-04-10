'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Star, Sparkles, Check, Copy, Edit3, Send, 
  Eye, GitCompare, ThumbsUp, Clock, RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Review {
  id: string
  buyerName: string
  rating: number
  content: string
  sentiment: string
  category: string | null
  product: { title: string }
}

interface AiReplyOption {
  id?: string
  style: string
  styleLabel: string
  content: string
  score: number
  quality?: string
  tone?: string
  length?: number
}

interface CopyState {
  [key: string]: boolean
}

const fallbackReplies: AiReplyOption[] = [
  {
    style: 'professional',
    styleLabel: '专业诚恳',
    content: `尊敬的顾客，非常感谢您对商品的评价。我们非常重视您提出的每一个问题，已将您的反馈转达给相关部门。对于给您带来的不便，我们深表歉意。我们将不断改进，努力为您提供更优质的商品和服务。如有任何疑问，欢迎随时联系我们的客服团队。`,
    score: 90,
    quality: '高',
    tone: '正式',
    length: 78,
  },
  {
    style: 'warm',
    styleLabel: '亲切温暖',
    content: `亲亲~看到您的评价我们很揪心呢🙏 您说的问题我们马上核实！这个问题之前买家反馈都挺好的，您的体验确实不应该出现这种情况呢。我们已经安排专员跟进处理啦，一定会给您一个满意的解决方案~ 期待您再次给我们机会！❤️`,
    score: 86,
    quality: '中',
    tone: '亲切',
    length: 72,
  },
  {
    style: 'solution',
    styleLabel: '解决方案',
    content: `您好，针对您反馈的问题，我们深表歉意。已为您提出以下解决方案：1. 如商品存在质量问题，我们将为您免费更换新品；2. 如您希望退款，我们将第一时间为您处理，运费由我们承担；3. 为了表达歉意，无论您选择哪种方案，我们都将额外赠送您一张优惠券。请通过旺旺联系我们选择方案。`,
    score: 93,
    quality: '高',
    tone: '务实',
    length: 95,
  },
]

export function AiReplyDialog({ review, open, onClose, onSend }: AiReplyDialogProps) {
  const [replies, setReplies] = useState<AiReplyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReply, setSelectedReply] = useState<AiReplyOption | null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState('options')
  
  // 复制状态管理
  const [copyStates, setCopyStates] = useState<CopyState>({})
  
  // 对比模式
  const [compareMode, setCompareMode] = useState(false)
  const [compareReplies, setCompareReplies] = useState<AiReplyOption[]>([])

  // Load AI replies when dialog opens
  useEffect(() => {
    if (open) {
      setLoading(true)
      setSelectedReply(null)
      setEditedContent('')
      setCompareMode(false)
      setCompareReplies([])
      
      fetch(`/api/reviews/${review.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: 'professional' }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data && data.data.length > 0) {
            setReplies(data.data.map((r: { content: string; aiScore: number }, i: number) => ({
              id: r.id,
              style: ['professional', 'warm', 'solution'][i] || 'professional',
              styleLabel: ['专业诚恳', '亲切温暖', '解决方案'][i] || '方案' + (i + 1),
              content: r.content,
              score: r.aiScore || 85,
              quality: ['高', '中', '高'][i],
              tone: ['正式', '亲切', '务实'][i],
              length: r.content.length,
            })))
          } else {
            setReplies(fallbackReplies)
          }
        })
        .catch(() => setReplies(fallbackReplies))
        .finally(() => setLoading(false))
    }
  }, [open, review.id])

  const handleSelect = (reply: AiReplyOption) => {
    setSelectedReply(reply)
    setEditedContent(reply.content)
    setIsEditing(false)
    setActiveTab('edit')
  }

  // 复制到剪贴板
  const handleCopy = async (content: string, replyStyle: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopyStates(prev => ({ ...prev, [replyStyle]: true }))
      toast.success('已复制到剪贴板')
      
      // 2秒后恢复按钮状态
      setTimeout(() => {
        setCopyStates(prev => ({ ...prev, [replyStyle]: false }))
      }, 2000)
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  // 批量复制所有回复
  const handleCopyAll = async () => {
    const allContent = replies.map((r, i) => 
      `【方案${i + 1} - ${r.styleLabel}】\n${r.content}`
    ).join('\n\n')
    
    try {
      await navigator.clipboard.writeText(allContent)
      toast.success(`已复制 ${replies.length} 个回复方案`)
    } catch {
      toast.error('复制失败')
    }
  }

  // 切换对比模式
  const toggleCompareMode = () => {
    if (!compareMode) {
      // 进入对比模式，选择2-3个回复对比
      setCompareReplies(replies.slice(0, 3))
    } else {
      setCompareReplies([])
    }
    setCompareMode(!compareMode)
  }

  // 回复评分星级显示
  const renderScoreStars = (score: number) => {
    const stars = Math.ceil(score / 20)
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${i < stars ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
          />
        ))}
      </div>
    )
  }

  const handleSend = async () => {
    if (!selectedReply || !editedContent.trim()) return
    setSending(true)
    try {
      // If the reply has a DB id, send it directly
      if (selectedReply.id) {
        await fetch(`/api/reviews/${review.id}/send-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ replyId: selectedReply.id }),
        })
      } else {
        // Save edited content as a new reply then send
        const res = await fetch(`/api/reviews/${review.id}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ style: 'professional', customInstruction: editedContent }),
        })
        const data = await res.json()
        if (data.success && data.data?.[0]?.id) {
          await fetch(`/api/reviews/${review.id}/send-reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ replyId: data.data[0].id }),
          })
        }
      }
      toast.success('回复发送成功')
      onSend()
    } catch {
      toast.error('发送失败，请重试')
    } finally {
      setSending(false)
    }
  }

  const sentimentColor = review.sentiment === 'negative' ? 'text-red-500' : review.sentiment === 'positive' ? 'text-green-500' : 'text-gray-500'
  const sentimentLabel = review.sentiment === 'negative' ? '差评' : review.sentiment === 'positive' ? '好评' : '中评'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            AI智能回复
          </DialogTitle>
        </DialogHeader>

        {/* Original Review Summary */}
        <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-sm font-semibold">{review.buyerName}</span>
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
              ))}
            </div>
            <Badge variant="secondary" className={`${sentimentColor} bg-opacity-10`}>
              {sentimentLabel}
            </Badge>
            {review.category && (
              <Badge variant="outline" className="text-xs">{review.category}</Badge>
            )}
          </div>
          <p className="text-sm text-gray-700 line-clamp-2">{review.content}</p>
          <p className="text-xs text-muted-foreground mt-1">商品：{review.product.title}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant={compareMode ? 'default' : 'outline'}
              size="sm"
              className={compareMode ? 'bg-orange-500' : ''}
              onClick={toggleCompareMode}
            >
              <GitCompare className="h-3 w-3 mr-1" />
              {compareMode ? '退出对比' : '对比回复'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAll}
            >
              <Copy className="h-3 w-3 mr-1" />
              复制全部
            </Button>
          </div>
          
          {selectedReply && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Check className="h-4 w-4 text-green-500" />
              已选择：{selectedReply.styleLabel}
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                评分 {selectedReply.score}
              </Badge>
            </div>
          )}
        </div>

        {/* Compare Mode */}
        {compareMode ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <GitCompare className="h-4 w-4" />
              回复对比
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {compareReplies.map((reply, index) => (
                <Card
                  key={reply.style + index}
                  className={cn(
                    'cursor-pointer transition-all',
                    selectedReply?.style === reply.style 
                      ? 'border-orange-500 ring-2 ring-orange-100' 
                      : 'hover:border-orange-200'
                  )}
                  onClick={() => handleSelect(reply)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                        方案{index + 1}
                      </Badge>
                      {selectedReply?.style === reply.style && (
                        <Check className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                    <p className="text-sm font-medium mb-2">{reply.styleLabel}</p>
                    <p className="text-xs text-gray-600 line-clamp-4 mb-2">{reply.content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      {renderScoreStars(reply.score)}
                      <span>{reply.length}字</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Quick Preview Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  AI生成的回复方案
                  <span className="text-gray-400 font-normal ml-1">（点击预览或选择）</span>
                </p>
              </div>
              
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {replies.map((reply, index) => (
                    <Card
                      key={reply.style + index}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md group',
                        selectedReply?.style === reply.style 
                          ? 'border-orange-500 ring-2 ring-orange-100' 
                          : 'hover:border-orange-200'
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                              方案{index + 1}
                            </Badge>
                            <span className="text-sm font-medium">{reply.styleLabel}</span>
                          </div>
                          {selectedReply?.style === reply.style && (
                            <Check className="h-5 w-5 text-orange-500" />
                          )}
                        </div>
                        
                        {/* Score Section */}
                        <div className="flex items-center gap-3 mb-2 p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-1">
                            {renderScoreStars(reply.score)}
                          </div>
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
                              style={{ width: `${reply.score}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-orange-600">{reply.score}分</span>
                        </div>
                        
                        {/* Meta Info */}
                        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {reply.quality || '高质量'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {reply.tone || '中性'}
                          </Badge>
                          <span className="ml-auto">{reply.length || reply.content.length}字</span>
                        </div>
                        
                        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{reply.content}</p>
                        
                        {/* Hover Actions */}
                        <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelect(reply)
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            预览
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              'h-7 text-xs',
                              copyStates[reply.style] ? 'text-green-600' : ''
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(reply.content, reply.style)
                            }}
                          >
                            {copyStates[reply.style] ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                已复制
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                复制
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Edit Area (Tabbed) */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="options" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  回复方案
                </TabsTrigger>
                <TabsTrigger value="edit" className="text-xs" disabled={!selectedReply}>
                  <Edit3 className="h-3 w-3 mr-1" />
                  编辑发送{selectedReply && ` (${selectedReply.styleLabel})`}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="options" className="space-y-3">
                <p className="text-sm text-gray-500 text-center py-4">
                  从上方选择一个回复方案进行编辑和发送
                </p>
              </TabsContent>
              
              <TabsContent value="edit" className="space-y-3">
                {selectedReply && (
                  <>
                    {/* Selected Reply Info */}
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                          已选方案
                        </Badge>
                        <span className="text-sm font-medium">{selectedReply.styleLabel}</span>
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <Sparkles className="h-3 w-3" />
                          质量评分 {selectedReply.score}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setEditedContent(selectedReply.content)
                          setIsEditing(false)
                        }}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        重置
                      </Button>
                    </div>
                    
                    {/* Edit/Preview Toggle */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">回复内容</p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={isEditing ? 'ghost' : 'secondary'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setIsEditing(false)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          预览
                        </Button>
                        <Button
                          variant={isEditing ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'h-7 text-xs',
                            copyStates['edited'] ? 'text-green-600' : ''
                          )}
                          onClick={() => handleCopy(editedContent, 'edited')}
                        >
                          {copyStates['edited'] ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              已复制
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              复制
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {isEditing ? (
                      <Textarea
                        value={editedContent}
                        onChange={e => setEditedContent(e.target.value)}
                        rows={6}
                        className="text-sm"
                        placeholder="编辑回复内容..."
                      />
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-lg border min-h-[120px]">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {editedContent}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>字数：{editedContent.length}</span>
                      {editedContent.length > 200 && (
                        <Badge variant="outline" className="text-amber-600 bg-amber-50">
                          内容较长，建议分段发送
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={onClose}>取消</Button>
                      <Button
                        className="bg-orange-500 hover:bg-orange-600"
                        onClick={handleSend}
                        disabled={sending || !editedContent.trim()}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        {sending ? '发送中...' : '确认发送'}
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Type definition for props
interface AiReplyDialogProps {
  review: Review
  open: boolean
  onClose: () => void
  onSend: () => void
}
