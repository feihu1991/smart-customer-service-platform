'use client'

import { useState, useEffect } from 'react'
import { Sidebar, type ViewType } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { ChatView } from '@/components/chat/chat-view'
import { ReviewView } from '@/components/reviews/review-view'
import { OrderView } from '@/components/orders/order-view'
import { TemplateView } from '@/components/templates/template-view'
import { AnalyticsView } from '@/components/analytics/analytics-view'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

const viewConfig: Record<ViewType, { title: string; description: string }> = {
  dashboard: { title: '工作台', description: '总览店铺客服运营数据' },
  chat: { title: '实时聊天', description: '与买家进行实时沟通' },
  reviews: { title: '评价管理', description: '查看和管理商品评价' },
  orders: { title: '订单管理', description: '管理店铺订单' },
  templates: { title: '回复模板', description: '管理常用回复模板' },
  analytics: { title: '数据报表', description: '客服运营数据分析' },
}

export default function Home() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard')
  const [seeded, setSeeded] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/api/seed', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) setSeeded(true)
      })
      .catch(() => {})
  }, [])

  const config = viewConfig[activeView]

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />
      case 'chat':
        return <ChatView />
      case 'reviews':
        return <ReviewView />
      case 'orders':
        return <OrderView />
      case 'templates':
        return <TemplateView />
      case 'analytics':
        return <AnalyticsView />
      default:
        return <DashboardView />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        unreadCounts={{ chat: 3, reviews: 5 }}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Header title={config.title} description={config.description} />
        <div className="flex-1 overflow-y-auto">
          {renderView()}
        </div>
      </main>
    </div>
  )
}
