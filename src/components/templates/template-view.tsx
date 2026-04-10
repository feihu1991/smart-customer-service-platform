'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, Trash2, FileText, Copy, Search, X } from 'lucide-react'

interface Template {
  id: string
  name: string
  category: string
  content: string
  usageCount: number
  isBuiltIn: boolean
}

const categoryTabs = [
  { key: 'all', label: '全部' },
  { key: '物流问题', label: '物流问题' },
  { key: '质量问题', label: '质量问题' },
  { key: '服务态度', label: '服务态度' },
  { key: '描述不符', label: '描述不符' },
  { key: '通用', label: '通用' },
]

const categoryColors: Record<string, string> = {
  '物流问题': 'bg-blue-100 text-blue-700',
  '质量问题': 'bg-red-100 text-red-700',
  '服务态度': 'bg-pink-100 text-pink-700',
  '描述不符': 'bg-purple-100 text-purple-700',
  '通用': 'bg-gray-100 text-gray-700',
  '尺码问题': 'bg-amber-100 text-amber-700',
}

export function TemplateView() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState({ name: '', category: '通用', content: '' })
  const [creating, setCreating] = useState(false)

  const doFetch = useCallback((category: string) => {
    const params = new URLSearchParams()
    if (category !== 'all') params.set('category', category)
    fetch(`/api/templates?${params}`)
      .then(res => res.json())
      .then(setTemplates)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    doFetch(activeTab)
  }, [activeTab, doFetch])

  const refreshTemplates = useCallback(() => {
    setLoading(true)
    doFetch(activeTab)
  }, [activeTab, doFetch])

  const handleTabChange = (tab: string) => {
    setLoading(true)
    setActiveTab(tab)
  }

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.content.trim()) return
    setCreating(true)
    try {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      setShowCreateDialog(false)
      setFormData({ name: '', category: '通用', content: '' })
      refreshTemplates()
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/templates?id=${id}`, { method: 'DELETE' })
    refreshTemplates()
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setFormData({ name: template.name, category: template.category, content: template.content })
  }

  const handleSaveEdit = async () => {
    if (!editingTemplate) return
    // Simulate edit - in a real app this would call a PUT endpoint
    setEditingTemplate(null)
    setFormData({ name: '', category: '通用', content: '' })
    refreshTemplates()
  }

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {categoryTabs.map(tab => (
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
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-9 w-[200px] text-sm"
            />
          </div>
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            size="sm"
            onClick={() => {
              setFormData({ name: '', category: '通用', content: '' })
              setShowCreateDialog(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            新建模板
          </Button>
        </div>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-500" />
                    <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
                  </div>
                  <Badge variant="secondary" className={categoryColors[template.category] || 'bg-gray-100 text-gray-700'}>
                    {template.category}
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed">
                  {template.content}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    已使用 {template.usageCount} 次
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        navigator.clipboard.writeText(template.content)
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 text-gray-500" />
                    </Button>
                    {!template.isBuiltIn && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(template)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingTemplate} onOpenChange={() => {
        setShowCreateDialog(false)
        setEditingTemplate(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? '编辑模板' : '新建模板'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">模板名称</label>
              <Input
                placeholder="输入模板名称"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">分类</label>
              <Select
                value={formData.category}
                onValueChange={v => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryTabs.filter(t => t.key !== 'all').map(tab => (
                    <SelectItem key={tab.key} value={tab.key}>{tab.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">模板内容</label>
              <Textarea
                placeholder="输入回复模板内容..."
                rows={6}
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowCreateDialog(false)
                setEditingTemplate(null)
              }}>
                取消
              </Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600"
                onClick={editingTemplate ? handleSaveEdit : handleCreate}
                disabled={creating || !formData.name.trim() || !formData.content.trim()}
              >
                {creating ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
