'use client'

import { useState, useEffect, useCallback } from 'react'
import { Store, Plus, Edit, Trash2, Check, X, RefreshCw, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'

interface Shop {
  id: string
  name: string
  platform: string
  shopId: string | null
  logo: string | null
  status: string
  isActive: boolean
  createdAt: string
  _count?: {
    reviews: number
    orders: number
    chatSessions: number
    products: number
  }
}

interface ShopLimitInfo {
  shops: Shop[]
  shopLimit: number
  shopCount: number
}

const platformOptions = [
  { value: 'taobao', label: '淘宝', icon: '🛒' },
  { value: 'jd', label: '京东', icon: '📦' },
  { value: 'pdd', label: '拼多多', icon: '🛍️' },
]

export function ShopView() {
  const { token } = useAuth()
  const [shops, setShops] = useState<Shop[]>([])
  const [shopLimit, setShopLimit] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 添加店铺弹窗状态
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingShop, setEditingShop] = useState<Shop | null>(null)

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    platform: 'taobao',
    shopId: '',
    logo: '',
  })

  // 获取店铺列表
  const fetchShops = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/shops', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setShops(data.data.shops)
        setShopLimit(data.data.shopLimit)
      }
    } catch (err) {
      console.error('Failed to fetch shops:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchShops()
  }, [fetchShops])

  // 重置表单
  const resetForm = () => {
    setFormData({ name: '', platform: 'taobao', shopId: '', logo: '' })
    setEditingShop(null)
  }

  // 打开编辑弹窗
  const openEditDialog = (shop: Shop) => {
    setEditingShop(shop)
    setFormData({
      name: shop.name,
      platform: shop.platform,
      shopId: shop.shopId || '',
      logo: shop.logo || '',
    })
    setAddDialogOpen(true)
  }

  // 添加/更新店铺
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError(null)

    try {
      const url = editingShop ? `/api/shops/${editingShop.id}` : '/api/shops'
      const method = editingShop ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (data.success) {
        await fetchShops()
        setAddDialogOpen(false)
        resetForm()
      } else {
        setError(data.message || '操作失败')
      }
    } catch (err) {
      setError('操作失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 删除店铺
  const handleDelete = async (shopId: string) => {
    if (!token) return
    try {
      const res = await fetch(`/api/shops/${shopId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        await fetchShops()
      } else {
        setError(data.message || '删除失败')
      }
    } catch (err) {
      setError('删除失败，请重试')
    }
  }

  // 切换店铺状态
  const toggleStatus = async (shop: Shop) => {
    if (!token) return
    try {
      const res = await fetch(`/api/shops/${shop.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !shop.isActive }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchShops()
      }
    } catch (err) {
      console.error('Toggle status failed:', err)
    }
  }

  const getPlatformInfo = (platform: string) => {
    return platformOptions.find(p => p.value === platform) || platformOptions[0]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">店铺管理</h2>
          <p className="text-gray-500 mt-1">
            已添加 {shops.length}/{shopLimit} 个店铺
            {shops.length >= shopLimit && (
              <span className="ml-2 text-orange-500">(已达上限)</span>
            )}
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={(open) => {
          setAddDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              disabled={shops.length >= shopLimit && !editingShop}
            >
              <Plus className="h-4 w-4 mr-2" />
              添加店铺
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingShop ? '编辑店铺' : '添加店铺'}</DialogTitle>
                <DialogDescription>
                  {editingShop ? '修改店铺信息' : '添加新的电商平台店铺'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {error && (
                  <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">店铺名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：优品旗舰店"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform">电商平台 *</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(value) => setFormData({ ...formData, platform: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {platformOptions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.icon} {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopId">店铺ID（可选）</Label>
                  <Input
                    id="shopId"
                    value={formData.shopId}
                    onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                    placeholder="平台店铺ID（模拟）"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo">店铺Logo（可选）</Label>
                  <Input
                    id="logo"
                    value={formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    placeholder="Logo图片URL"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setAddDialogOpen(false)
                  resetForm()
                }}>
                  取消
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={saving}>
                  {saving ? '保存中...' : (editingShop ? '保存修改' : '添加店铺')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 店铺列表 */}
      {shops.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">暂无店铺</p>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              添加第一个店铺
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((shop) => {
            const platform = getPlatformInfo(shop.platform)
            return (
              <Card key={shop.id} className={!shop.isActive ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center text-2xl">
                        {platform.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{shop.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          {platform.label}
                          {shop.shopId && (
                            <span className="text-xs text-gray-400">#{shop.shopId.slice(0, 8)}</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={shop.isActive ? 'default' : 'secondary'}>
                      {shop.isActive ? '启用' : '停用'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* 统计 */}
                  <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                    <div className="bg-slate-50 rounded p-2">
                      <div className="text-gray-500">评价</div>
                      <div className="font-semibold">{shop._count?.reviews || 0}</div>
                    </div>
                    <div className="bg-slate-50 rounded p-2">
                      <div className="text-gray-500">订单</div>
                      <div className="font-semibold">{shop._count?.orders || 0}</div>
                    </div>
                    <div className="bg-slate-50 rounded p-2">
                      <div className="text-gray-500">会话</div>
                      <div className="font-semibold">{shop._count?.chatSessions || 0}</div>
                    </div>
                    <div className="bg-slate-50 rounded p-2">
                      <div className="text-gray-500">商品</div>
                      <div className="font-semibold">{shop._count?.products || 0}</div>
                    </div>
                  </div>
                  {/* 操作 */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleStatus(shop)}
                    >
                      {shop.isActive ? (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          停用
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          启用
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(shop)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要删除店铺「{shop.name}」吗？此操作不可恢复，店铺下的所有数据都将被删除。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(shop.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            确认删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 订阅提示 */}
      {shops.length >= shopLimit && (
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Store className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-semibold text-orange-800">店铺数量已达上限</p>
                <p className="text-sm text-orange-600">升级套餐可解锁更多店铺</p>
              </div>
            </div>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => window.location.href = '/subscription'}
            >
              升级套餐
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
