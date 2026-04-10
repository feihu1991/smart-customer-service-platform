'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Star, Filter, MessageSquare, ThumbsUp, ThumbsDown, Minus, ChevronDown } from 'lucide-react'
import { AiReplyDialog } from './ai-reply-dialog'

interface Review {
  id: string
  buyerName: string
  rating: number
  content: string
  sentiment: string
  category: string | null
  replyStatus: string
  createdAt: string
  product: { id: string; title: string; imageUrl: string | null }
}

export function ReviewView() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterSentiment, setFilterSentiment] = useState<string | null>(null)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [showAiDialog, setShowAiDialog] = useState(false)

  const doFetch = useCallback((rating: number | null, sentiment: string | null) => {
    const params = new URLSearchParams()
    if (rating) params.set('rating', rating.toString())
    if (sentiment) params.set('sentiment', sentiment)
    fetch(`/api/reviews?${params}`)
      .then(res => res.json())
      .then(setReviews)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    doFetch(filterRating, filterSentiment)
  }, [filterRating, filterSentiment, doFetch])

  const handleFilterRating = (r: number | null) => {
    setLoading(true)
    setFilterRating(r)
  }

  const handleFilterSentiment = (s: string | null) => {
    setLoading(true)
    setFilterSentiment(s)
  }

  const refreshReviews = useCallback(() => {
    setLoading(true)
    doFetch(filterRating, filterSentiment)
  }, [filterRating, filterSentiment, doFetch])

  const handleAiReply = (review: Review) => {
    setSelectedReview(review)
    setShowAiDialog(true)
  }

  const sentimentConfig: Record<string, { label: string; color: string; icon: typeof ThumbsUp }> = {
    positive: { label: '好评', color: 'bg-green-100 text-green-700', icon: ThumbsUp },
    neutral: { label: '中评', color: 'bg-gray-100 text-gray-700', icon: Minus },
    negative: { label: '差评', color: 'bg-red-100 text-red-700', icon: ThumbsDown },
  }

  const replyStatusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: '待回复', color: 'bg-amber-100 text-amber-700' },
    replied: { label: '已回复', color: 'bg-green-100 text-green-700' },
  }

  const categoryColors: Record<string, string> = {
    '质量问题': 'bg-red-100 text-red-700',
    '描述不符': 'bg-purple-100 text-purple-700',
    '服务态度': 'bg-pink-100 text-pink-700',
    '物流问题': 'bg-blue-100 text-blue-700',
    '质量好评': 'bg-green-100 text-green-700',
    '尺码问题': 'bg-amber-100 text-amber-700',
    '包装问题': 'bg-gray-100 text-gray-700',
    '功能建议': 'bg-cyan-100 text-cyan-700',
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  return (
    <>
      <div className="p-6 space-y-4">
        {/* Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Rating Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">评分：</span>
                <div className="flex gap-1">
                  {[null, 1, 2, 3, 4, 5].map(r => (
                    <Button
                      key={r}
                      variant={filterRating === r ? 'default' : 'outline'}
                      size="sm"
                      className={`h-7 text-xs ${filterRating === r ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                      onClick={() => handleFilterRating(r)}
                    >
                      {r === null ? '全部' : (
                        <span className="flex items-center gap-0.5">
                          {r}
                          <Star className="h-3 w-3" />
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Sentiment Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">情感：</span>
                <div className="flex gap-1">
                  {[
                    { key: null, label: '全部' },
                    { key: 'positive', label: '好评' },
                    { key: 'neutral', label: '中评' },
                    { key: 'negative', label: '差评' },
                  ].map(s => (
                    <Button
                      key={s.key}
                      variant={filterSentiment === s.key ? 'default' : 'outline'}
                      size="sm"
                      className={`h-7 text-xs ${filterSentiment === s.key ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                      onClick={() => handleFilterSentiment(s.key)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Count */}
              <div className="ml-auto text-sm text-muted-foreground">
                共 {reviews.length} 条评价
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => {
              const sentiment = sentimentConfig[review.sentiment]
              const replyStatus = replyStatusConfig[review.replyStatus]
              return (
                <Card key={review.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      {/* Buyer Avatar */}
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                        {review.buyerName.charAt(0)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{review.buyerName}</span>
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                        </div>

                        {/* Review Text */}
                        <p className="text-sm text-gray-700 mb-3 leading-relaxed">{review.content}</p>

                        {/* Product Info */}
                        <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center shrink-0">
                            <span className="text-[10px] text-gray-400">商品</span>
                          </div>
                          <span className="text-xs text-gray-600 truncate">{review.product.title}</span>
                        </div>

                        {/* Tags & Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className={sentiment.color}>
                            <sentiment.icon className="h-3 w-3 mr-1" />
                            {sentiment.label}
                          </Badge>
                          {review.category && (
                            <Badge variant="secondary" className={categoryColors[review.category] || 'bg-gray-100 text-gray-700'}>
                              {review.category}
                            </Badge>
                          )}
                          <Badge variant="secondary" className={replyStatus.color}>
                            {replyStatus.label}
                          </Badge>
                          <div className="flex-1" />
                          {review.replyStatus === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
                              onClick={() => handleAiReply(review)}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              AI生成回复
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* AI Reply Dialog */}
      {selectedReview && showAiDialog && (
        <AiReplyDialog
          review={selectedReview}
          open={showAiDialog}
          onClose={() => {
            setShowAiDialog(false)
            setSelectedReview(null)
          }}
          onSend={() => {
            setShowAiDialog(false)
            setSelectedReview(null)
            refreshReviews()
          }}
        />
      )}
    </>
  )
}
