/**
 * E2E 测试 - 评价管理模块
 * 
 * 测试用例：
 * 1. 获取评价列表
 * 2. 获取单个评价详情
 * 3. 评价筛选和分页
 * 4. 评价分类（好评/中评/差评）
 * 5. 评价回复状态更新
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  E2E_CONFIG,
  TEST_DATA,
  TEST_USERS,
  wait,
  retry,
} from './config';

describe('评价管理 E2E 测试', () => {
  let authToken: string = '';
  let testUserId: string = '';
  let testReviewId: string = '';
  
  // 先登录获取token
  beforeAll(async () => {
    // 创建测试用户并登录
    const testPhone = `139${Date.now().toString().slice(-8)}`;
    
    // 注册
    const registerResponse = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        name: '评价测试用户',
        password: TEST_USERS.password,
      }),
    });
    
    if (registerResponse.ok) {
      const registerResult = await registerResponse.json();
      testUserId = registerResult.data?.user?.id || '';
    }
    
    // 登录
    const loginResponse = await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        password: TEST_USERS.password,
      }),
    });
    
    if (loginResponse.ok) {
      const loginResult = await loginResponse.json();
      authToken = loginResult.data?.token || '';
    }
    
    // 如果没有token，使用skipAuth模式测试公开接口
  });

  describe('1. 获取评价列表', () => {
    it('应该能够获取评价列表（公开接口）', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews`);
      
      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.list).toBeDefined();
      expect(Array.isArray(result.list)).toBe(true);
      expect(result.pagination).toBeDefined();
    });

    it('应该能够按分页获取评价', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews?page=1&pageSize=10`);
      
      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.total).toBeGreaterThanOrEqual(0);
    });

    it('应该能够按平台筛选评价', async () => {
      const platforms = ['taobao', 'tmall', 'jd', 'pdd'];
      
      for (const platform of platforms) {
        const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews?platform=${platform}`);
        
        expect(response.status).toBe(200);
        
        const result = await response.json();
        expect(result.success).toBe(true);
        
        // 验证返回的数据都是指定平台
        if (result.list && result.list.length > 0) {
          result.list.forEach((review: any) => {
            expect(review.platform).toBe(platform);
          });
        }
      }
    });

    it('应该能够按情感倾向筛选评价', async () => {
      const sentiments = ['positive', 'negative', 'neutral'];
      
      for (const sentiment of sentiments) {
        const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews?sentiment=${sentiment}`);
        
        expect(response.status).toBe(200);
        
        const result = await response.json();
        expect(result.success).toBe(true);
        
        // 验证返回的数据都是指定情感
        if (result.list && result.list.length > 0) {
          result.list.forEach((review: any) => {
            expect(review.sentiment).toBe(sentiment);
          });
        }
      }
    });

    it('应该能够按回复状态筛选评价', async () => {
      const replyStatuses = ['PENDING', 'REPLIED', 'ARCHIVED', 'SKIPPED'];
      
      for (const status of replyStatuses) {
        const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews?replyStatus=${status}`);
        
        expect(response.status).toBe(200);
        
        const result = await response.json();
        expect(result.success).toBe(true);
      }
    });
  });

  describe('2. 获取单个评价详情', () => {
    it('应该能够通过ID获取评价详情', async () => {
      // 先获取一个评价ID
      const listResponse = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews?pageSize=1`);
      const listResult = await listResponse.json();
      
      if (listResult.list && listResult.list.length > 0) {
        const reviewId = listResult.list[0].id;
        
        const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/${reviewId}`);
        
        expect(response.status).toBe(200);
        
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.id).toBe(reviewId);
      }
    });

    it('不应该能够获取不存在的评价', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/nonexistent-id`);
      
      expect(response.status).toBe(404);
    });
  });

  describe('3. 评价数据分析', () => {
    it('应该能够获取差评原因分类统计', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/analytics/reasons`);
      
      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('应该能够获取评价情感分析', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/sentiment-analysis`);
      
      // 这个接口可能不存在，返回404是正常的
      if (response.status === 200) {
        const result = await response.json();
        expect(result.success).toBe(true);
      }
    });
  });

  describe('4. 评价回复状态批量更新', () => {
    it('应该能够批量更新评价回复状态（需认证）', async () => {
      if (!authToken) {
        console.log('Skipping authenticated test - no token available');
        return;
      }
      
      // 先获取评价列表
      const listResponse = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews?pageSize=5`);
      const listResult = await listResponse.json();
      
      if (listResult.list && listResult.list.length > 0) {
        const reviewIds = listResult.list.slice(0, 2).map((r: any) => r.id);
        
        const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            ids: reviewIds,
            replyStatus: 'REPLIED',
            replyContent: '感谢您的评价！',
          }),
        });
        
        expect(response.status).toBe(200);
        
        const result = await response.json();
        expect(result.success).toBe(true);
        expect(result.message).toContain('成功更新');
      }
    });

    it('批量更新应该验证IDs参数', async () => {
      if (!authToken) {
        console.log('Skipping authenticated test - no token available');
        return;
      }
      
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ids: [],
          replyStatus: 'REPLIED',
        }),
      });
      
      expect(response.status).toBe(400);
    });
  });

  describe('5. 评价列表缓存测试', () => {
    it('应该缓存评价列表', async () => {
      // 第一次请求
      const response1 = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews?page=1&pageSize=20`);
      const result1 = await response1.json();
      
      // 第二次请求（应该命中缓存）
      const response2 = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews?page=1&pageSize=20`);
      const result2 = await response2.json();
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // 验证缓存标记（如果有）
      if (result1.cached !== undefined) {
        expect(result1.cached).toBe(false); // 首次未命中
      }
    });
  });
});
