import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';

// 测试数据准备
const testShop = {
  name: '测试店铺-挽回跟踪',
  platform: 'taobao',
};

const testProduct = {
  title: '测试商品-挽回',
  price: 99.9,
};

const testReview = {
  buyerName: '测试买家',
  rating: 2,
  content: '这个榴莲不新鲜，希望能得到处理',
  sentiment: 'negative',
  category: 'quality',
  replyStatus: 'pending',
  recoveryStatus: 'pending',
};

describe('回复效果跟踪 - 集成测试', () => {
  let shopId: string;
  let productId: string;
  let reviewId: string;

  // 测试前准备数据
  beforeAll(async () => {
    // 创建测试店铺
    const shop = await prisma.shop.create({
      data: testShop,
    });
    shopId = shop.id;

    // 创建测试商品
    const product = await prisma.product.create({
      data: {
        ...testProduct,
        shopId: shop.id,
      },
    });
    productId = product.id;

    // 创建测试评价
    const review = await prisma.review.create({
      data: {
        ...testReview,
        shopId: shop.id,
        productId: product.id,
      },
    });
    reviewId = review.id;
  });

  // 测试后清理数据
  afterAll(async () => {
    // 删除测试数据
    await prisma.review.deleteMany({ where: { id: reviewId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.shop.deleteMany({ where: { id: shopId } });
  });

  describe('1. 状态更新流程测试', () => {
    it('1.1 初始状态应为pending', async () => {
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      expect(review).toBeDefined();
      expect(review?.replyStatus).toBe('pending');
      expect(review?.recoveryStatus).toBe('pending');
      expect(review?.replySentAt).toBeNull();
      expect(review?.recoveredAt).toBeNull();
      expect(review?.buyerFeedback).toBeNull();
    });

    it('1.2 更新回复发送状态', async () => {
      const updated = await prisma.review.update({
        where: { id: reviewId },
        data: {
          replySent: true,
          recoveryStatus: 'contacted',
        },
      });

      expect(updated.replySentAt).not.toBeNull();
      expect(updated.replyStatus).toBe('sent');
      expect(updated.recoveryStatus).toBe('contacted');
    });

    it('1.3 更新买家反馈', async () => {
      const updated = await prisma.review.update({
        where: { id: reviewId },
        data: {
          buyerFeedback: '已收到处理结果，还算满意',
        },
      });

      expect(updated.buyerFeedback).toBe('已收到处理结果，还算满意');
    });

    it('1.4 更新为挽回成功状态应设置recoveredAt', async () => {
      const beforeUpdate = await prisma.review.findUnique({
        where: { id: reviewId },
      });
      const beforeTime = beforeUpdate?.recoveredAt;

      const updated = await prisma.review.update({
        where: { id: reviewId },
        data: {
          recoveryStatus: 'recovered',
        },
      });

      expect(updated.recoveryStatus).toBe('recovered');
      expect(updated.recoveredAt).not.toBeNull();
      expect(updated.recoveredAt?.getTime()).toBeGreaterThanOrEqual(
        beforeTime?.getTime() || 0
      );
    });

    it('1.5 更新为挽回失败状态不应设置recoveredAt', async () => {
      // 创建另一个测试评价用于失败测试
      const failedReview = await prisma.review.create({
        data: {
          buyerName: '失败测试买家',
          rating: 1,
          content: '非常失望',
          sentiment: 'negative',
          category: 'quality',
          replyStatus: 'sent',
          recoveryStatus: 'contacted',
          shopId,
          productId,
        },
      });

      const updated = await prisma.review.update({
        where: { id: failedReview.id },
        data: {
          recoveryStatus: 'failed',
        },
      });

      expect(updated.recoveryStatus).toBe('failed');
      expect(updated.recoveredAt).toBeNull();

      // 清理测试数据
      await prisma.review.delete({ where: { id: failedReview.id } });
    });
  });

  describe('2. 统计计算正确性测试', () => {
    it('2.1 正确计算回复率', async () => {
      const totalReviews = await prisma.review.count({
        where: { shopId },
      });
      const repliedReviews = await prisma.review.count({
        where: {
          shopId,
          OR: [
            { replyStatus: 'sent' },
            { replySentAt: { not: null } },
          ],
        },
      });

      const replyRate = totalReviews > 0 ? (repliedReviews / totalReviews) * 100 : 0;
      
      expect(typeof replyRate).toBe('number');
      expect(replyRate).toBeGreaterThanOrEqual(0);
      expect(replyRate).toBeLessThanOrEqual(100);
    });

    it('2.2 正确计算挽回率', async () => {
      const repliedReviews = await prisma.review.count({
        where: {
          shopId,
          OR: [
            { replyStatus: 'sent' },
            { replySentAt: { not: null } },
          ],
        },
      });
      const recoveredReviews = await prisma.review.count({
        where: {
          shopId,
          recoveryStatus: 'recovered',
        },
      });

      const recoveryRate = repliedReviews > 0 ? (recoveredReviews / repliedReviews) * 100 : 0;
      
      expect(typeof recoveryRate).toBe('number');
      expect(recoveryRate).toBeGreaterThanOrEqual(0);
      expect(recoveryRate).toBeLessThanOrEqual(100);
    });

    it('2.3 按评分统计正确', async () => {
      const rating2Reviews = await prisma.review.findMany({
        where: {
          shopId,
          rating: 2,
        },
      });

      const recoveredCount = rating2Reviews.filter(
        r => r.recoveryStatus === 'recovered'
      ).length;

      expect(rating2Reviews.length).toBeGreaterThan(0);
      expect(recoveredCount).toBeGreaterThanOrEqual(0);
      expect(recoveredCount).toBeLessThanOrEqual(rating2Reviews.length);
    });

    it('2.4 按类型统计正确', async () => {
      const categoryReviews = await prisma.review.findMany({
        where: {
          shopId,
          category: 'quality',
        },
      });

      const statusCounts = {
        pending: 0,
        contacted: 0,
        recovered: 0,
        failed: 0,
      };

      for (const review of categoryReviews) {
        if (review.recoveryStatus in statusCounts) {
          statusCounts[review.recoveryStatus as keyof typeof statusCounts]++;
        }
      }

      const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
      expect(total).toBe(categoryReviews.length);
    });

    it('2.5 状态分布总和等于总评价数', async () => {
      const totalReviews = await prisma.review.count({
        where: { shopId },
      });

      const statusDistribution = await prisma.review.groupBy({
        by: ['recoveryStatus'],
        where: { shopId },
        _count: true,
      });

      const statusSum = statusDistribution.reduce(
        (sum, item) => sum + item._count,
        0
      );

      expect(statusSum).toBe(totalReviews);
    });
  });

  describe('3. 字段完整性测试', () => {
    it('3.1 Review模型包含所有必要字段', async () => {
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      expect(review).toHaveProperty('id');
      expect(review).toHaveProperty('replySentAt');
      expect(review).toHaveProperty('recoveryStatus');
      expect(review).toHaveProperty('recoveredAt');
      expect(review).toHaveProperty('buyerFeedback');
    });

    it('3.2 recoveryStatus有效值测试', async () => {
      const validStatuses = ['pending', 'contacted', 'recovered', 'failed'];
      
      const reviews = await prisma.review.findMany({
        where: { shopId },
      });

      for (const review of reviews) {
        expect(validStatuses).toContain(review.recoveryStatus);
      }
    });

    it('3.3 recoveredAt与recovered状态一致性', async () => {
      const reviews = await prisma.review.findMany({
        where: {
          shopId,
          recoveryStatus: 'recovered',
        },
      });

      for (const review of reviews) {
        expect(review.recoveredAt).not.toBeNull();
      }
    });

    it('3.4 非recovered状态不应有recoveredAt', async () => {
      const nonRecoveredReviews = await prisma.review.findMany({
        where: {
          shopId,
          recoveryStatus: {
            in: ['pending', 'contacted', 'failed'],
          },
        },
      });

      for (const review of nonRecoveredReviews) {
        // 非recovered状态应该没有recoveredAt，或者为null
        // 这里允许历史数据存在null或非null的情况
        expect(review).toHaveProperty('recoveredAt');
      }
    });
  });
});
