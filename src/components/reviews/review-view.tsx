'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Star, Filter, MessageSquare, ThumbsUp, ThumbsDown, Minus, 
  ChevronDown, ArrowUpDown, Clock, Sparkles, Copy, Check
} from 'lucide-react'
import { toast } from 'sonner'
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

type SortField = 'createdAt' | 'rating'
type SortOrder = 'asc' | 'desc'

export function ReviewView() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [totalReviews, setTotalReviews] = useState(0)
  const [loading, setLoading] = useState(true)
  
  // 筛选状态
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [filterSentiment, setFilterSentiment] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterReplyStatus, setFilterReplyStatus] = useState<string | null>(null)
  
  // 排序状态
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  
  // 批量选择状态
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set())
  const [showBatchDialog, setShowBatchDialog] = useState(false)
  
  // 单个回复对话框
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [showAiDialog, setShowAiDialog] = useState(false)
  
  // 复制历史
  const [copyHistory, setCopyHistory] = useState<Array<{content: string; time: Date}>>([])

  const doFetch = useCallback((params: URLSearchParams) => {
    fetch(`/api/reviews?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setReviews(data.data)
          setTotalReviews(data.pagination?.total || data.data.length)
        }
      })
      .catch(() => setReviews([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterRating) params.set('rating', filterRating.toString())
    if (filterSentiment) params.set('sentiment', filterSentiment)
    if (filterCategory) params.set('category', filterCategory)
    if (filterReplyStatus) params.set('replyStatus', filterReplyStatus)
    setLoading(true)
    doFetch(params)
  }, [filterRating, filterSentiment, filterCategory, filterReplyStatus, doFetch])

  // 排序后的数据
  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      let comparison = 0
      if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      } else if (sortField === 'rating') {
        comparison = a.rating - b.rating
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [reviews, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const handleFilterRating = (r: number | null) => {
    setFilterRating(r)
  }

  const handleFilterSentiment = (s: string | null) => {
    setFilterSentiment(s)
  }

  const handleFilterCategory = (c: string | null) => {
    setFilterCategory(c)
  }

  const handleFilterReplyStatus = (s: string | null) => {
    setFilterReplyStatus(s)
  }

  const refreshReviews = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterRating) params.set('rating', filterRating.toString())
    if (filterSentiment) params.set('sentiment', filterSentiment)
    if (filterCategory) params.set('category', filterCategory)
    if (filterReplyStatus) params.set('replyStatus', filterReplyStatus)
    doFetch(params)
  }, [filterRating, filterSentiment, filterCategory, filterReplyStatus, doFetch])

  // 批量选择逻辑
  const toggleSelectReview = (id: string) => {
    setSelectedReviews(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAllPending = () => {
    const pendingIds = reviews
      .filter(r => r.replyStatus === 'pending')
      .map(r => r.id)
    setSelectedReviews(new Set(pendingIds))
    toast.success(`已选择 ${pendingIds.length} 条待回复评价`)
  }

  const clearSelection = () => {
    setSelectedReviews(new Set())
  }

  const handleAiReply = (review: Review) => {
    setSelectedReview(review)
    setShowAiDialog(true)
  }

  const handleBatchAiReply = () => {
    if (selectedReviews.size > 0) {
      toast.info(`已选择 ${selectedReviews.size} 条评价，将批量生成回复`)
      // 选择第一个进行AI回复
      const firstSelected = reviews.find(r => r.id === Array.from(selectedReviews)[0])
      if (firstSelected) {
        handleAiReply(firstSelected)
      }
    }
  }

  // 复制到剪贴板
  const copyToClipboard = async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyHistory(prev => [{
        content: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        time: new Date()
      }, ...prev.slice(0, 9)])
      toast.success(label ? `${label}已复制` : '已复制到剪贴板')
    } catch {
      toast.error('复制失败，请手动复制')
    }
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
    // 英文类别
    'quality': 'bg-red-100 text-red-700',
    'logistics': 'bg-blue-100 text-blue-700',
    'service': 'bg-pink-100 text-pink-700',
    'description': 'bg-purple-100 text-purple-700',
  }

  const categoryOptions = [
    { key: null, label: '全部' },
    { key: '质量问题', label: '质量问题' },
    { key: '物流问题', label: '物流问题' },
    { key: '服务态度', label: '服务态度' },
    { key: '描述不符', label: '描述不符' },
    { key: '质量好评', label: '质量好评' },
    { key: '尺码问题', label: '尺码问题' },
    { key: '功能建议', label: '功能建议' },
  ]

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const pendingCount = reviews.filter(r => r.replyStatus === 'pending').length

  return (
    <>
      <div className="p-2 sm:p-3 md:p-6 space-y-2 sm:space-y-4">
        {/* Filter Bar */}
        <Card>
          <CardContent className="p-2 sm:p-4">
            <div className="space-y-2 sm:space-y-3">
              {/* 第一行：筛选条件 */}
              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-600 shrink-0 hidden sm:inline">筛选：</span>
                </div>
                
                {/* 评分筛选 */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600 shrink-0 hidden xs:inline">评分：</span>
                  <div className="flex gap-0.5 sm:gap-1">
                    {[null, 1, 2, 3, 4, 5].map(r => (
                      <Button
                        key={r}
                        variant={filterRating === r ? 'default' : 'outline'}
                        size="sm"
                        className={`h-6 sm:h-7 text-[10px] sm:text-xs px-1 sm:px-2 touch-manipulation ${filterRating === r ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                        onClick={() => handleFilterRating(r)}
                      >
                        {r === null ? '全部' : (
                          <span className="flex items-center gap-0.5">
                            {r}
                            <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 第二行：情感筛选 */}
              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-1.5 sm:gap-2">
                <span className="text-xs text-gray-600 shrink-0 hidden xs:inline">情感：</span>
                <div className="flex gap-1 flex-wrap">
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
                      className={`h-6 sm:h-7 text-[10px] sm:text-xs px-1.5 sm:px-2 touch-manipulation ${filterSentiment === s.key ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                      onClick={() => handleFilterSentiment(s.key)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 第三行：类型、状态筛选 + 排序 */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* 类型筛选 */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600 shrink-0 hidden sm:inline">类型：</span>
                  <div className="flex gap-0.5 flex-wrap">
                    {categoryOptions.slice(0, 4).map(c => (
                      <Button
                        key={c.key || 'all'}
                        variant={filterCategory === c.key ? 'default' : 'outline'}
                        size="sm"
                        className={`h-6 sm:h-7 text-[10px] sm:text-xs px-1 sm:px-2 touch-manipulation ${filterCategory === c.key ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                        onClick={() => handleFilterCategory(c.key)}
                      >
                        {c.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 状态筛选 */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600 shrink-0 hidden xs:inline">状态：</span>
                  <div className="flex gap-0.5 sm:gap-1">
                    {[
                      { key: null, label: '全部' },
                      { key: 'pending', label: '待回复' },
                      { key: 'replied', label: '已回复' },
                    ].map(s => (
                      <Button
                        key={s.key}
                        variant={filterReplyStatus === s.key ? 'default' : 'outline'}
                        size="sm"
                        className={`h-6 sm:h-7 text-[10px] sm:text-xs px-1 sm:px-2 touch-manipulation ${filterReplyStatus === s.key ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                        onClick={() => handleFilterReplyStatus(s.key)}
                      >
                        {s.key === 'pending' && pendingCount > 0 ? (
                          <span className="flex items-center gap-0.5">
                            {s.label.slice(0, 2)}
                            <Badge variant="secondary" className="ml-0.5 h-3 sm:h-4 text-[8px] sm:text-[10px] bg-amber-200 text-amber-800">
                              {pendingCount}
                            </Badge>
                          </span>
                        ) : s.label.slice(0, 2)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 排序 */}
                <div className="ml-auto flex items-center gap-1 sm:gap-2">
                  <span className="text-xs text-gray-600 shrink-0 hidden sm:inline">排序：</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 sm:h-7 text-[10px] sm:text-xs touch-manipulation ${sortField === 'createdAt' ? 'bg-orange-50 text-orange-600' : ''}`}
                    onClick={() => handleSort('createdAt')}
                  >
                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 sm:mr-0.5" />
                    <span className="hidden sm:inline">时间</span>{sortField === 'createdAt' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 sm:h-7 text-[10px] sm:text-xs touch-manipulation ${sortField === 'rating' ? 'bg-orange-50 text-orange-600' : ''}`}
                    onClick={() => handleSort('rating')}
                  >
                    <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 sm:mr-0.5" />
                    <span className="hidden sm:inline">评分</span>{sortField === 'rating' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Batch Action Bar */}
        {selectedReviews.size > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-2 sm:p-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-orange-800">
                    已选 {selectedReviews.size}
                  </span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 sm:h-7 text-[10px] sm:text-xs touch-manipulation"
                    onClick={selectAllPending}
                  >
                    全选待回复
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 sm:h-7 text-[10px] sm:text-xs touch-manipulation"
                    onClick={clearSelection}
                  >
                    清除
                  </Button>
                  <Button
                    size="sm"
                    className="h-6 sm:h-7 text-[10px] sm:text-xs bg-orange-500 hover:bg-orange-600 touch-manipulation px-2 sm:px-3"
                    onClick={handleBatchAiReply}
                  >
                    <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 sm:mr-1" />
                    <span className="hidden sm:inline">批量生成回复</span>
                    <span className="sm:hidden">批量AI</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : sortedReviews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">暂无符合条件的评价</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedReviews.map(review => {
              const sentiment = sentimentConfig[review.sentiment]
              const replyStatus = replyStatusConfig[review.replyStatus]
              const isSelected = selectedReviews.has(review.id)
              
              return (
                <Card 
                  key={review.id} 
                  className={`hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-orange-300 border-orange-200' : ''}`}
                >
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex gap-3 sm:gap-4">
                      {/* Selection Checkbox */}
                      {review.replyStatus === 'pending' && (
                        <div className="shrink-0 flex items-start pt-0.5 sm:pt-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectReview(review.id)}
                            className="touch-manipulation"
                          />
                        </div>
                      )}

                      {/* Buyer Avatar */}
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-gray-600 shrink-0">
                        {review.buyerName.charAt(0)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-semibold text-gray-900">{review.buyerName}</span>
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                        </div>

                        {/* Review Text */}
                        <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3 leading-relaxed line-clamp-2 sm:line-clamp-none">{review.content}</p>

                        {/* Product Info - Hidden on very small screens */}
                        <div className="hidden xs:flex items-center gap-2 mb-2 sm:mb-3 p-2 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded flex items-center justify-center shrink-0">
                            <span className="text-[8px] sm:text-[10px] text-gray-400">商品</span>
                          </div>
                          <span className="text-xs text-gray-600 truncate flex-1">{review.product.title}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 sm:h-6 sm:w-auto sm:px-2 text-xs touch-manipulation"
                            onClick={() => copyToClipboard(review.product.title, '商品名称')}
                          >
                            <Copy className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">复制</span>
                          </Button>
                        </div>

                        {/* Tags & Actions */}
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                          <Badge variant="secondary" className={`${sentiment.color} text-[10px] sm:text-xs py-0 px-1 sm:py-0.5 sm:px-1.5 touch-manipulation`}>
                            <sentiment.icon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                            <span className="hidden xs:inline">{sentiment.label}</span>
                            <span className="xs:hidden">{sentiment.label.slice(0, 1)}</span>
                          </Badge>
                          {review.category && (
                            <Badge variant="secondary" className={`${categoryColors[review.category] || 'bg-gray-100 text-gray-700'} text-[10px] sm:text-xs py-0 px-1 sm:py-0.5 sm:px-1.5 touch-manipulation`}>
                              {review.category.slice(0, 3)}
                            </Badge>
                          )}
                          <Badge variant="secondary" className={`${replyStatus.color} text-[10px] sm:text-xs py-0 px-1 sm:py-0.5 sm:px-1.5 touch-manipulation`}>
                            <span className="hidden xs:inline">{replyStatus.label}</span>
                            <span className="xs:hidden">{review.replyStatus === 'pending' ? '待' : '已'}</span>
                          </Badge>
                          <div className="flex-1" />
                          
                          {/* Quick Copy Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 sm:h-7 text-[10px] sm:text-xs text-gray-500 hover:text-gray-700 touch-manipulation px-1 sm:px-2"
                            onClick={() => copyToClipboard(review.content, '评价内容')}
                          >
                            <Copy className="h-2.5 w-2.5 sm:h-3 sm:w-3 sm:mr-1" />
                            <span className="hidden sm:inline">复制评价</span>
                          </Button>
                          
                          {review.replyStatus === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 sm:h-7 text-[10px] sm:text-xs border-orange-200 text-orange-600 hover:bg-orange-50 touch-manipulation px-2 sm:px-3"
                              onClick={() => handleAiReply(review)}
                            >
                              <MessageSquare className="h-2.5 w-2.5 sm:h-3 sm:w-3 sm:mr-1" />
                              <span className="hidden xs:inline">AI回复</span>
                              <span className="xs:hidden">AI</span>
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

        {/* Stats Footer */}
        <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
          <span>共 {totalReviews || reviews.length} 条评价</span>
          <span>待回复：{pendingCount} 条</span>
        </div>

        {/* Copy History (Collapsed) */}
        {copyHistory.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              复制历史 ({copyHistory.length})
            </summary>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-1">
              {copyHistory.slice(0, 5).map((item, i) => (
                <div key={i} className="text-xs text-gray-600 flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-500 shrink-0" />
                  <span className="truncate">{item.content}</span>
                  <span className="text-gray-400 shrink-0">
                    {item.time.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </details>
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
