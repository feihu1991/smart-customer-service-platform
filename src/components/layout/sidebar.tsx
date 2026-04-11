'use client'

import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, MessageCircle, Star, Package, 
  FileText, BarChart3, ChevronLeft, ChevronRight,
  Store, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useState, useEffect } from 'react'

export type ViewType = 'dashboard' | 'shops' | 'chat' | 'reviews' | 'orders' | 'templates' | 'analytics'

interface SidebarProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
  unreadCounts?: Record<string, number>
  mobileOpen?: boolean
  onMobileClose?: () => void
}

const navItems: { id: ViewType; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: '工作台', icon: LayoutDashboard },
  { id: 'shops', label: '店铺管理', icon: Store },
  { id: 'chat', label: '实时聊天', icon: MessageCircle },
  { id: 'reviews', label: '评价管理', icon: Star },
  { id: 'orders', label: '订单管理', icon: Package },
  { id: 'templates', label: '回复模板', icon: FileText },
  { id: 'analytics', label: '数据报表', icon: BarChart3 },
]

function SidebarContent({ activeView, onViewChange, unreadCounts, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Brand */}
      <div className="p-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">智能客服</h1>
            <p className="text-xs text-slate-400">AI驱动 · 高效服务</p>
          </div>
        </div>
      </div>

      {/* Shop Selector */}
      <div className="p-4 border-b border-slate-700/50">
        <Select defaultValue="shop1">
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm h-9">
            <Store className="h-4 w-4 mr-2 text-orange-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="shop1">优品旗舰店</SelectItem>
            <SelectItem value="shop2">品质生活馆</SelectItem>
            <SelectItem value="shop3">潮流前线</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeView === item.id
          const unread = unreadCounts?.[item.id]
          return (
            <button
              key={item.id}
              onClick={() => {
                onViewChange(item.id)
                onNavigate?.()
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {unread && unread > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs bg-red-500 hover:bg-red-500">
                  {unread}
                </Badge>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-sm font-bold">
            客
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">客服小橙</p>
            <p className="text-xs text-slate-400">在线</p>
          </div>
          <div className="w-2 h-2 bg-green-400 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ activeView, onViewChange, unreadCounts }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-300 border-r border-slate-700/50',
          collapsed ? 'w-[68px]' : 'w-[260px]'
        )}
      >
        <SidebarContent activeView={activeView} onViewChange={onViewChange} unreadCounts={unreadCounts} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full items-center justify-center border border-slate-600 text-slate-300"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-2 left-2 z-50 bg-slate-900 text-white hover:bg-slate-800 h-8 w-8"
          >
            <LayoutDashboard className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[260px] bg-slate-900 border-slate-700 pt-[env(safe-area-inset-top)]">
          <SidebarContent activeView={activeView} onViewChange={onViewChange} unreadCounts={unreadCounts} />
        </SheetContent>
      </Sheet>
    </>
  )
}
