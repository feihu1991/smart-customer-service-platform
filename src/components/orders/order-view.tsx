'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Package, Truck, CheckCircle, AlertCircle, Clock,
  ChevronDown, ChevronUp, MapPin, Phone, User
} from 'lucide-react'

interface Order {
  id: string
  orderNo: string
  buyerName: string
  buyerPhone: string | null
  amount: number
  status: string
  address: string | null
  logisticsNo: string | null
  logisticsCompany: string | null
  createdAt: string
  product: { id: string; title: string; imageUrl: string | null; price: number }
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Package }> = {
  pending: { label: '待发货', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  paid: { label: '已付款', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: Package },
  shipped: { label: '已发货', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Truck },
  delivered: { label: '已送达', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Package },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  refunding: { label: '退款中', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
  refunded: { label: '已退款', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: AlertCircle },
}

const statusTabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待发货' },
  { key: 'shipped', label: '已发货' },
  { key: 'completed', label: '已完成' },
  { key: 'refunding', label: '退款中' },
  { key: 'refunded', label: '已退款' },
]

const logisticsSteps = [
  { time: '04-10 14:30', content: '快件已到达【杭州转运中心】', status: 'current' },
  { time: '04-09 20:15', content: '快件已从【上海分拨中心】发出', status: 'done' },
  { time: '04-09 08:00', content: '快件已到达【上海分拨中心】', status: 'done' },
  { time: '04-08 16:45', content: '卖家已发货', status: 'done' },
  { time: '04-08 15:30', content: '订单已打包完成，等待揽收', status: 'done' },
]

export function OrderView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  const loadOrders = useCallback((status: string) => {
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    fetch(`/api/orders?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOrders(data.data)
          setTotalOrders(data.pagination?.total || data.data.length)
        }
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadOrders(activeTab)
  }, [activeTab, loadOrders])

  const handleTabChange = (tab: string) => {
    setLoading(true)
    setActiveTab(tab)
    loadOrders(tab)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="p-3 sm:p-6 space-y-4">
      {/* Status Tabs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {statusTabs.map(tab => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? 'default' : 'outline'}
                size="sm"
                className={`h-8 text-sm whitespace-nowrap ${activeTab === tab.key ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
            <div className="ml-auto text-sm text-muted-foreground">
              共 {totalOrders || orders.length} 笔
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const status = statusConfig[order.status]
            const isExpanded = expandedOrder === order.id

            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  {/* Order Header */}
                  <div className="flex items-center justify-between p-4 border-b bg-gray-50/50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-medium text-gray-600">{order.orderNo}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={status.color}>
                        <status.icon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Order Content */}
                  <div className="p-4">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="h-6 w-6 text-gray-300" />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{order.product.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">买家：{order.buyerName}</p>
                        <p className="text-lg font-bold text-orange-500 mt-1">¥{order.amount.toFixed(2)}</p>
                      </div>
                      {/* Logistics */}
                      {order.logisticsNo && (
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">{order.logisticsCompany}</p>
                          <p className="text-xs text-gray-600 font-mono mt-1">{order.logisticsNo}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t p-4 bg-gray-50/30 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Buyer Info */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                            <User className="h-4 w-4" />
                            买家信息
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-gray-600">{order.buyerName}</span>
                            </div>
                            {order.buyerPhone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-gray-600">{order.buyerPhone}</span>
                              </div>
                            )}
                            {order.address && (
                              <div className="flex items-start gap-2">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                <span className="text-gray-600">{order.address}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Logistics Tracking */}
                        {order.status !== 'pending' && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                              <Truck className="h-4 w-4" />
                              物流跟踪
                            </h4>
                            <div className="space-y-0">
                              {logisticsSteps.map((step, i) => (
                                <div key={i} className="flex gap-3 pb-3 last:pb-0">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-2.5 h-2.5 rounded-full ${
                                      step.status === 'current'
                                        ? 'bg-orange-500 ring-4 ring-orange-100'
                                        : 'bg-gray-300'
                                    }`} />
                                    {i < logisticsSteps.length - 1 && (
                                      <div className={`w-px flex-1 min-h-[24px] ${
                                        step.status === 'done' ? 'bg-gray-300' : 'bg-gray-200'
                                      }`} />
                                    )}
                                  </div>
                                  <div className="pb-1">
                                    <p className={`text-xs ${
                                      step.status === 'current' ? 'font-semibold text-gray-900' : 'text-gray-500'
                                    }`}>
                                      {step.content}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">{step.time}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-2">
                        {order.status === 'pending' && (
                          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-xs">
                            <Truck className="h-3 w-3 mr-1" />
                            发货
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-xs">
                          打印订单
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
