'use client'

import { useState } from 'react'
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
import { Star, Sparkles, Check, Copy, Edit3, Send } from 'lucide-react'

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
  style: string
  styleLabel: string
  content: string
  score: number
}

interface AiReplyDialogProps {
  review: Review
  open: boolean
  onClose: () => void
  onSend: () => void
}

function generateAiReplies(review: Review): AiReplyOption[] {
  const productName = review.product.title
  const name = review.buyerName

  const replies: AiReplyOption[] = [
    {
      style: 'professional',
      styleLabel: '专业诚恳',
      content: `尊敬的${name}，非常感谢您对${productName}的评价。我们非常重视您提出的每一个问题，已将您的反馈转达给相关部门。对于给您带来的不便，我们深表歉意。我们将不断改进，努力为您提供更优质的商品和服务。如有任何疑问，欢迎随时联系我们的客服团队，我们将竭诚为您服务。`,
      score: 92,
    },
    {
      style: 'warm',
      styleLabel: '亲切温暖',
      content: `亲亲~看到您的评价我们很揪心呢🙏 您说的问题我们马上核实！${productName}是我们的热销款，之前买家反馈都挺好的，您的体验确实不应该出现这种情况呢。我们已经安排专员跟进处理啦，一定会给您一个满意的解决方案~ 期待您再次给我们机会，让我们证明自己！❤️`,
      score: 88,
    },
    {
      style: 'solution',
      styleLabel: '解决方案',
      content: `${name}您好，针对您反馈的${productName}的问题，我们深表歉意。已为您提出以下解决方案：1. 如商品存在质量问题，我们将为您免费更换新品；2. 如您希望退款，我们将第一时间为您处理，运费由我们承担；3. 为了表达歉意，无论您选择哪种方案，我们都将额外赠送您一张优惠券。请通过旺旺联系我们选择方案，感谢您的理解与支持！`,
      score: 95,
    },
  ]
  return replies
}

export function AiReplyDialog({ review, open, onClose, onSend }: AiReplyDialogProps) {
  const [replies] = useState<AiReplyOption[]>(() => generateAiReplies(review))
  const [selectedReply, setSelectedReply] = useState<AiReplyOption | null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSelect = (reply: AiReplyOption) => {
    setSelectedReply(reply)
    setEditedContent(reply.content)
    setIsEditing(false)
  }

  const handleSend = async () => {
    setSending(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    setSending(false)
    onSend()
  }

  const sentimentColor = review.sentiment === 'negative' ? 'text-red-500' : review.sentiment === 'positive' ? 'text-green-500' : 'text-gray-500'
  const sentimentLabel = review.sentiment === 'negative' ? '差评' : review.sentiment === 'positive' ? '好评' : '中评'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            AI智能回复
          </DialogTitle>
        </DialogHeader>

        {/* Original Review */}
        <div className="p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
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
          <p className="text-sm text-gray-700">{review.content}</p>
          <p className="text-xs text-muted-foreground mt-1">商品：{review.product.title}</p>
        </div>

        {/* AI Reply Options */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">AI生成的回复方案（点击选择）</p>
          {replies.map((reply, index) => (
            <Card
              key={reply.style}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedReply?.style === reply.style
                  ? 'border-orange-500 ring-2 ring-orange-100'
                  : 'hover:border-orange-200'
              }`}
              onClick={() => handleSelect(reply)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      方案{index + 1}
                    </Badge>
                    <span className="text-sm font-medium">{reply.styleLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <Sparkles className="h-3 w-3" />
                      质量评分 {reply.score}
                    </div>
                    {selectedReply?.style === reply.style && (
                      <Check className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{reply.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Area */}
        {selectedReply && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">编辑回复内容</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  {isEditing ? '预览' : '编辑'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(editedContent)
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  复制
                </Button>
              </div>
            </div>
            <Textarea
              value={editedContent}
              onChange={e => setEditedContent(e.target.value)}
              rows={5}
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
