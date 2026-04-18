import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

// GET /api/analytics/recovery - 获取挽回统计数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 构建查询条件
    const where: Record<string, unknown> = {};

    if (shopId) {
      where.shopId = shopId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    // 获取所有评价数据
    const reviews = await prisma.review.findMany({
      where,
      select: {
        id: true,
        rating: true,
        category: true,
        recoveryStatus: true,
        replyStatus: true,
        replySentAt: true,
        recoveredAt: true,
        createdAt: true,
      },
    });

    // 计算统计数据
    const totalReviews = reviews.length;
    const totalReplied = reviews.filter(r => r.replyStatus === 'sent' || r.replySentAt !== null).length;
    const totalRecovered = reviews.filter(r => r.recoveryStatus === 'recovered').length;
    const totalContacted = reviews.filter(r => r.recoveryStatus === 'contacted').length;
    const totalFailed = reviews.filter(r => r.recoveryStatus === 'failed').length;
    const totalPending = reviews.filter(r => r.recoveryStatus === 'pending').length;

    // 计算挽回率（已回复且最终成功挽回的）
    const replyRate = totalReviews > 0 ? (totalReplied / totalReviews) * 100 : 0;
    const recoveryRate = totalReplied > 0 ? (totalRecovered / totalReplied) * 100 : 0;

    // 按评分统计
    const ratingStats: Record<number, { total: number; recovered: number; rate: number }> = {};
    for (let rating = 1; rating <= 5; rating++) {
      const ratingReviews = reviews.filter(r => r.rating === rating);
      const ratingRecovered = ratingReviews.filter(r => r.recoveryStatus === 'recovered').length;
      ratingStats[rating] = {
        total: ratingReviews.length,
        recovered: ratingRecovered,
        rate: ratingReviews.length > 0 ? (ratingRecovered / ratingReviews.length) * 100 : 0,
      };
    }

    // 按类型统计（基于category字段）
    const categoryStats: Record<string, { total: number; recovered: number; rate: number }> = {};
    const categories: string[] = [...new Set(reviews.map(r => r.category || 'unknown'))];
    for (const category of categories) {
      const categoryReviews = reviews.filter(r => (r.category || 'unknown') === category);
      const categoryRecovered = categoryReviews.filter(r => r.recoveryStatus === 'recovered').length;
      categoryStats[category] = {
        total: categoryReviews.length,
        recovered: categoryRecovered,
        rate: categoryReviews.length > 0 ? (categoryRecovered / categoryReviews.length) * 100 : 0,
      };
    }

    // 按恢复状态分布
    const statusDistribution = {
      pending: totalPending,
      contacted: totalContacted,
      recovered: totalRecovered,
      failed: totalFailed,
    };

    // 计算平均挽回时间（从天数计算）
    const recoveryTimes = reviews
      .filter(r => r.recoveryStatus === 'recovered' && r.replySentAt && r.recoveredAt)
      .map(r => {
        const replyTime = r.replySentAt!.getTime();
        const recoverTime = r.recoveredAt!.getTime();
        return (recoverTime - replyTime) / (1000 * 60 * 60 * 24); // 转换为天数
      });

    const avgRecoveryDays = recoveryTimes.length > 0
      ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length
      : 0;

    // 按月统计趋势
    const monthlyStats: Record<string, { total: number; recovered: number; rate: number }> = {};
    for (const review of reviews) {
      const monthKey = `${review.createdAt.getFullYear()}-${String(review.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { total: 0, recovered: 0, rate: 0 };
      }
      monthlyStats[monthKey].total++;
      if (review.recoveryStatus === 'recovered') {
        monthlyStats[monthKey].recovered++;
      }
    }

    // 计算每月挽回率
    for (const month in monthlyStats) {
      monthlyStats[month].rate = monthlyStats[month].total > 0
        ? (monthlyStats[month].recovered / monthlyStats[month].total) * 100
        : 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalReviews,
          totalReplied,
          totalRecovered,
          replyRate: Math.round(replyRate * 100) / 100,
          recoveryRate: Math.round(recoveryRate * 100) / 100,
          avgRecoveryDays: Math.round(avgRecoveryDays * 100) / 100,
        },
        ratingStats,
        categoryStats,
        statusDistribution,
        monthlyStats,
      },
    });
  } catch (error) {
    console.error('获取挽回统计数据失败:', error);
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
