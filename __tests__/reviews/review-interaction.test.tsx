/**
 * 评价管理交互测试
 * 测试评价列表功能、回复预览、复制功能
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReviewView } from '@/components/reviews/review-view'
import { AiReplyDialog } from '@/components/reviews/ai-reply-dialog'

// Mock clipboard API
const mockClipboard = {
  writeText: jest.fn().mockResolvedValue(undefined),
  readText: jest.fn().mockResolvedValue(''),
}
Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
  configurable: true,
})

// Mock fetch API
global.fetch = jest.fn()

describe('评价列表功能测试', () => {
  const mockReviews = [
    {
      id: '1',
      buyerName: '张三',
      rating: 5,
      content: '商品质量很好，物流很快！',
      sentiment: 'positive',
      category: '质量好评',
      replyStatus: 'pending',
      createdAt: '2024-01-15T10:30:00Z',
      product: { id: 'p1', title: '测试商品1', imageUrl: null },
    },
    {
      id: '2',
      buyerName: '李四',
      rating: 2,
      content: '收到货有损坏，很失望',
      sentiment: 'negative',
      category: '质量问题',
      replyStatus: 'pending',
      createdAt: '2024-01-14T15:20:00Z',
      product: { id: 'p2', title: '测试商品2', imageUrl: null },
    },
    {
      id: '3',
      buyerName: '王五',
      rating: 4,
      content: '整体不错，但包装可以改进',
      sentiment: 'neutral',
      category: '包装问题',
      replyStatus: 'replied',
      createdAt: '2024-01-13T09:00:00Z',
      product: { id: 'p3', title: '测试商品3', imageUrl: null },
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        success: true,
        data: mockReviews,
        pagination: { total: 3, page: 1, pageSize: 10, totalPages: 1 },
      }),
    })
  })

  describe('筛选功能', () => {
    it('应该支持按评分筛选', async () => {
      render(<ReviewView />)
      
      // 等待加载完成
      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })
      
      // 点击5星筛选
      const fiveStarButton = screen.getByRole('button', { name: /5.*星/ })
      fireEvent.click(fiveStarButton)
      
      // 验证API调用包含rating参数
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('rating=5'),
          expect.any(Object)
        )
      })
    })

    it('应该支持按情感筛选', async () => {
      render(<ReviewView />)
      
      await waitFor(() => {
        expect(screen.getByText('好评')).toBeInTheDocument()
      })
      
      // 点击差评筛选
      const negativeButton = screen.getByRole('button', { name: '差评' })
      fireEvent.click(negativeButton)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('sentiment=negative'),
          expect.any(Object)
        )
      })
    })

    it('应该支持按状态筛选', async () => {
      render(<ReviewView />)
      
      await waitFor(() => {
        expect(screen.getByText('待回复')).toBeInTheDocument()
      })
      
      // 点击待回复状态筛选
      const pendingButton = screen.getByRole('button', { name: /待回复/ })
      fireEvent.click(pendingButton)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('replyStatus=pending'),
          expect.any(Object)
        )
      })
    })
  })

  describe('排序功能', () => {
    it('应该支持按时间排序', async () => {
      render(<ReviewView />)
      
      await waitFor(() => {
        expect(screen.getByText('时间')).toBeInTheDocument()
      })
      
      // 点击时间排序按钮
      const timeSortButton = screen.getByRole('button', { name: /时间/ })
      fireEvent.click(timeSortButton)
      
      // 验证排序状态切换
      await waitFor(() => {
        expect(screen.getByText(/时间↑/)).toBeInTheDocument()
      })
    })

    it('应该支持按评分排序', async () => {
      render(<ReviewView />)
      
      await waitFor(() => {
        expect(screen.getByText('评分')).toBeInTheDocument()
      })
      
      // 点击评分排序按钮
      const ratingSortButton = screen.getByRole('button', { name: /评分/ })
      fireEvent.click(ratingSortButton)
      
      // 验证评分排序激活
      await waitFor(() => {
        expect(screen.getByText(/评分↓/)).toBeInTheDocument()
      })
    })
  })

  describe('批量选择功能', () => {
    it('应该支持选择多个评价', async () => {
      render(<ReviewView />)
      
      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })
      
      // 查找复选框并点击
      const checkboxes = screen.getAllByRole('checkbox')
      if (checkboxes.length > 0) {
        fireEvent.click(checkboxes[0])
        
        // 验证批量操作栏出现
        await waitFor(() => {
          expect(screen.getByText(/已选择/)).toBeInTheDocument()
        })
      }
    })
  })
})

describe('AI回复对话框测试', () => {
  const mockReview = {
    id: '1',
    buyerName: '测试用户',
    rating: 4,
    content: '测试评价内容',
    sentiment: 'positive',
    category: '质量好评',
    product: { title: '测试商品' },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        success: true,
        data: [
          { id: 'r1', content: '回复内容1', aiScore: 90 },
          { id: 'r2', content: '回复内容2', aiScore: 85 },
          { id: 'r3', content: '回复内容3', aiScore: 88 },
        ],
      }),
    })
  })

  describe('回复预览功能', () => {
    it('应该显示多个回复选项', async () => {
      render(
        <AiReplyDialog
          review={mockReview}
          open={true}
          onClose={jest.fn()}
          onSend={jest.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('方案1')).toBeInTheDocument()
      })

      // 验证显示3个方案
      expect(screen.getAllByText(/方案\d/).length).toBeGreaterThanOrEqual(3)
    })

    it('应该显示回复评分', async () => {
      render(
        <AiReplyDialog
          review={mockReview}
          open={true}
          onClose={jest.fn()}
          onSend={jest.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/评分/)).toBeInTheDocument()
      })

      // 验证评分显示
      expect(screen.getByText('90分')).toBeInTheDocument()
    })

    it('应该支持切换对比模式', async () => {
      render(
        <AiReplyDialog
          review={mockReview}
          open={true}
          onClose={jest.fn()}
          onSend={jest.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('对比回复')).toBeInTheDocument()
      })

      // 点击对比按钮
      fireEvent.click(screen.getByText('对比回复'))

      await waitFor(() => {
        expect(screen.getByText('退出对比')).toBeInTheDocument()
      })
    })
  })

  describe('复制功能', () => {
    it('应该显示复制按钮', async () => {
      render(
        <AiReplyDialog
          review={mockReview}
          open={true}
          onClose={jest.fn()}
          onSend={jest.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('复制全部')).toBeInTheDocument()
      })
    })

    it('应该能复制回复内容', async () => {
      render(
        <AiReplyDialog
          review={mockReview}
          open={true}
          onClose={jest.fn()}
          onSend={jest.fn()}
        />
      )

      await waitFor(() => {
        const copyButtons = screen.getAllByText('复制')
        expect(copyButtons.length).toBeGreaterThan(0)
      })

      // 点击复制全部
      fireEvent.click(screen.getByText('复制全部'))

      // 验证剪贴板调用
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled()
      })
    })
  })
})

describe('集成测试', () => {
  it('评价列表和回复对话框应该正确交互', async () => {
    const mockReviews = [
      {
        id: '1',
        buyerName: '测试用户',
        rating: 5,
        content: '测试评价',
        sentiment: 'positive',
        category: '质量好评',
        replyStatus: 'pending',
        createdAt: '2024-01-15T10:00:00Z',
        product: { id: 'p1', title: '测试商品', imageUrl: null },
      },
    ]

    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockReviews,
          pagination: { total: 1 },
        }),
      })
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          success: true,
          data: [{ id: 'r1', content: 'AI回复', aiScore: 90 }],
        }),
      })

    render(<ReviewView />)

    await waitFor(() => {
      expect(screen.getByText('测试用户')).toBeInTheDocument()
    })

    // 点击AI生成回复按钮
    const aiButton = screen.getByText('AI生成回复')
    fireEvent.click(aiButton)

    // 验证对话框打开
    await waitFor(() => {
      expect(screen.getByText('AI智能回复')).toBeInTheDocument()
    })
  })
})
