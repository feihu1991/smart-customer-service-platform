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
import { Plus, Pencil, Trash2, FileText, Copy, Search, Star, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Template {
  id: string
  name: string
  category: string
  content: string
  usageCount: number
  isBuiltIn: boolean
  createdAt?: string
}

const categoryConfig = [
  { key: 'all', label: '全部' },
  { key: 'quality', label: '质量问题', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { key: 'logistics', label: '物流问题', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { key: 'service', label: '服务态度', color: 'bg-pink-100 text-pink-700 hover:bg-pink-200' },
  { key: 'expectation', label: '描述不符', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
  { key: 'mixed', label: '综合问题', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
]

const categoryBadgeColors: Record<string, string> = {
  quality: 'bg-red-100 text-red-700',
  logistics: 'bg-blue-100 text-blue-700',
  service: 'bg-pink-100 text-pink-700',
  expectation: 'bg-purple-100 text-purple-700',
  mixed: 'bg-gray-100 text-gray-700',
}

const categoryLabels: Record<string, string> = {
  quality: '质量问题',
  logistics: '物流问题',
  service: '服务态度',
  expectation: '描述不符',
  mixed: '综合问题',
}

export function TemplateView() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState({ name: '', category: 'mixed', content: '' })
  const [creating, setCreating] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const { toast } = useToast()

  const doFetch = useCallback((category: string) => {
    const params = new URLSearchParams()
    if (category !== 'all') params.set('category', category)
    fetch(`/api/templates?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTemplates(data.data)
        } else {
          toast({
            title: '获取失败',
            description: data.message || '获取模板列表失败',
            variant: 'destructive',
          })
        }
      })
      .catch(() => {
        toast({
          title: '网络错误',
          description: '无法连接服务器',
          variant: 'destructive',
        })
        setTemplates([])
      })
      .finally(() => setLoading(false))
  }, [toast])

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
    if (!formData.name.trim() || !formData.content.trim()) {
      toast({
        title: '请填写完整',
        description: '模板名称和内容不能为空',
        variant: 'destructive',
      })
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        toast({
          title: '创建成功',
          description: '模板已成功创建',
        })
        setShowCreateDialog(false)
        setFormData({ name: '', category: 'mixed', content: '' })
        refreshTemplates()
      } else {
        toast({
          title: '创建失败',
          description: data.message || '创建模板失败',
          variant: 'destructive',
        })
      }
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (template: Template) => {
    if (!confirm(`确定要删除模板"${template.name}"吗？`)) return
    
    try {
      const res = await fetch(`/api/templates/${template.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast({
          title: '删除成功',
          description: '模板已删除',
        })
        refreshTemplates()
      } else {
        toast({
          title: '删除失败',
          description: data.message || '删除模板失败',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: '网络错误',
        description: '无法连接服务器',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setFormData({ 
      name: template.name, 
      category: template.category, 
      content: template.content 
    })
  }

  const handleSaveEdit = async () => {
    if (!editingTemplate) return
    if (!formData.name.trim() || !formData.content.trim()) {
      toast({
        title: '请填写完整',
        description: '模板名称和内容不能为空',
        variant: 'destructive',
      })
      return
    }
    setCreating(true)
    try {
      const res = await fetch(`/api/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        toast({
          title: '更新成功',
          description: '模板已更新',
        })
        setEditingTemplate(null)
        setFormData({ name: '', category: 'mixed', content: '' })
        refreshTemplates()
      } else {
        toast({
          title: '更新失败',
          description: data.message || '更新模板失败',
          variant: 'destructive',
        })
      }
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async (template: Template) => {
    try {
      await navigator.clipboard.writeText(template.content)
      toast({
        title: '复制成功',
        description: '模板内容已复制到剪贴板',
      })
    } catch {
      toast({
        title: '复制失败',
        description: '无法复制到剪贴板',
        variant: 'destructive',
      })
    }
  }

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderVariablePreview = (content: string) => {
    // 替换变量占位符为实际显示
    return content.replace(/\{([^}]+)\}/g, '<span class="bg-yellow-100 text-yellow-800 px-1 rounded mx-0.5">{$1}</span>')
  }

  return (
    <div className="p-3 sm:p-6 space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
          {categoryConfig.map(tab => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'outline'}
              size="sm"
              className={`h-8 text-sm whitespace-nowrap ${
                activeTab === tab.key 
                  ? 'bg-orange-500 hover:bg-orange-600' 
                  : tab.color
              }`}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-9 lg:w-[200px] text-sm"
            />
          </div>
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            size="sm"
            onClick={() => {
              setFormData({ name: '', category: activeTab !== 'all' ? activeTab : 'mixed', content: '' })
              setShowCreateDialog(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            新建模板
          </Button>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>共 {filteredTemplates.length} 个模板</span>
          <span>|</span>
          <span>内置 {templates.filter(t => t.isBuiltIn).length} 个</span>
          <span>|</span>
          <span>自定义 {templates.filter(t => !t.isBuiltIn).length} 个</span>
        </div>
      )}

      {/* Template Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无模板</h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchQuery ? '没有找到匹配的模板' : '点击"新建模板"创建您的第一个回复模板'}
          </p>
          {!searchQuery && (
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              新建模板
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <h3 className="text-sm font-semibold text-gray-900 truncate" title={template.name}>
                      {template.name}
                    </h3>
                    {template.isBuiltIn && (
                      <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" title="内置模板" />
                    )}
                  </div>
                  <Badge variant="secondary" className={categoryBadgeColors[template.category] || 'bg-gray-100 text-gray-700'}>
                    {categoryLabels[template.category] || template.category}
                  </Badge>
                </div>

                <div 
                  className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed cursor-pointer"
                  onClick={() => setPreviewTemplate(template)}
                  dangerouslySetInnerHTML={{ __html: renderVariablePreview(template.content) }}
                />
                
                {template.content.includes('{') && (
                  <p className="text-xs text-muted-foreground mb-3">
                    <span className="bg-yellow-50 px-1 rounded">变量说明</span>：模板支持 {template.content.match(/\{([^}]+)\}/g)?.join(', ')}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    已使用 {template.usageCount} 次
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPreviewTemplate(template)}
                      title="预览"
                    >
                      <FileText className="h-3.5 w-3.5 text-gray-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCopy(template)}
                      title="复制"
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
                          title="编辑"
                        >
                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDelete(template)}
                          title="删除"
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? '编辑模板' : '新建模板'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">模板名称 <span className="text-red-500">*</span></label>
              <Input
                placeholder="输入模板名称，如：物流延迟道歉模板"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">分类 <span className="text-red-500">*</span></label>
              <Select
                value={formData.category}
                onValueChange={v => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryConfig.filter(t => t.key !== 'all').map(tab => (
                    <SelectItem key={tab.key} value={tab.key}>{tab.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">模板内容 <span className="text-red-500">*</span></label>
              <Textarea
                placeholder="输入回复模板内容，支持变量占位符：&#10;&#10;示例：亲爱的{买家称呼}，感谢您的反馈！您购买的{商品名}..."
                rows={6}
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                支持变量占位符：<code className="bg-gray-100 px-1 rounded">{'{商品名}'}</code>、<code className="bg-gray-100 px-1 rounded">{'{买家称呼}'}</code>、<code className="bg-gray-100 px-1 rounded">{'{补偿金额}'}</code>
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
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

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              {previewTemplate?.name}
              {previewTemplate?.isBuiltIn && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  <Star className="h-3 w-3 mr-1" />
                  内置模板
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">分类：</span>
              <Badge variant="secondary" className={categoryBadgeColors[previewTemplate?.category || '']}>
                {categoryLabels[previewTemplate?.category || ''] || previewTemplate?.category}
              </Badge>
              <span className="text-muted-foreground">使用次数：</span>
              <span>{previewTemplate?.usageCount}</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">模板内容预览：</label>
              <div 
                className="p-4 bg-gray-50 rounded-lg text-sm leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: renderVariablePreview(previewTemplate?.content || '') }}
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <p className="text-xs text-muted-foreground">
                提示：点击复制按钮将模板内容复制到剪贴板
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => previewTemplate && handleCopy(previewTemplate)}
              >
                <Copy className="h-4 w-4 mr-1" />
                复制内容
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
