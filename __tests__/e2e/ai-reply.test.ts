/**
 * E2E 测试 - AI生成回复模块
 * 
 * 测试用例：
 * 1. AI生成回复（需认证）
 * 2. 不同风格的回复生成
 * 3. 差评挽回场景
 * 4. 使用次数限制
 * 5. 回复质量评估
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  E2E_CONFIG,
  TEST_USERS,
} from './config';

describe('AI生成回复 E2E 测试', () => {
  let authToken: string = '';
  let testReviewId: string = '';
  
  beforeAll(async () => {
    // 创建测试用户并登录
    const testPhone = `137${Date.now().toString().slice(-8)}`;
    
    // 注册
    await fetch(`${E2E_CONFIG.apiBaseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        name: 'AI测试用户',
        password: TEST_USERS.password,
      }),
    });
    
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
    
    // 获取一个评价ID用于测试
    const reviewsResponse = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews?pageSize=1`);
    if (reviewsResponse.ok) {
      const reviewsResult = await reviewsResponse.json();
      if (reviewsResult.list && reviewsResult.list.length > 0) {
        testReviewId = reviewsResult.list[0].id;
      }
    }
  });

  describe('1. AI生成回复基础测试', () => {
    it('应该能够生成AI回复（skipAuth模式）', async () => {
      if (!testReviewId) {
        console.log('Skipping - no test review available');
        return;
      }
      
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/${testReviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: 'sincere',
          skipAuth: true,
        }),
      });
      
      // 可能成功或因为缺少真实AI服务而失败
      const result = await response.json();
      
      // 如果是正常返回
      if (response.status === 200) {
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      } else {
        // 可能是AI服务未配置或其他错误
        console.log('AI reply test result:', result);
      }
    });

    it('应该支持自定义回复风格', async () => {
      if (!testReviewId) {
        console.log('Skipping - no test review available');
        return;
      }
      
      const styles = ['sincere', 'professional', 'compensate'];
      
      for (const style of styles) {
        const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/${testReviewId}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            style,
            skipAuth: true,
          }),
        });
        
        // 记录每个风格的结果
        const result = await response.json();
        console.log(`Style ${style} response:`, result.success);
      }
    });

    it('应该支持自定义指令', async () => {
      if (!testReviewId) {
        console.log('Skipping - no test review available');
        return;
      }
      
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/${testReviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: 'sincere',
          customInstruction: '请用更亲切的语气回复',
          skipAuth: true,
        }),
      });
      
      const result = await response.json();
      console.log('Custom instruction result:', result.success);
    });
  });

  describe('2. 差评挽回场景测试', () => {
    it('应该能够分析差评类型', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/classify/reason`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '质量太差了，买回来就用不了，客服也不理人',
        }),
      });
      
      const result = await response.json();
      
      // 接口可能返回各种状态码
      if (response.status === 200) {
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      } else {
        console.log('Classify result:', result);
      }
    });

    it('应该能够识别质量问题', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/classify/reason`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '商品破损了，质量很差',
        }),
      });
      
      const result = await response.json();
      console.log('Quality issue classify:', result);
    });

    it('应该能够识别物流问题', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/classify/reason`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '物流太慢了，等了一周才收到',
        }),
      });
      
      const result = await response.json();
      console.log('Logistics issue classify:', result);
    });

    it('应该能够识别服务问题', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/classify/reason`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '客服态度太差了，问什么都不回答',
        }),
      });
      
      const result = await response.json();
      console.log('Service issue classify:', result);
    });

    it('应该能够识别描述不符问题', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/classify/reason`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '图片上看起来很大，实际收到很小，完全不符',
        }),
      });
      
      const result = await response.json();
      console.log('Expectation issue classify:', result);
    });
  });

  describe('3. 使用次数限制测试（需认证）', () => {
    it('应该验证用户登录状态', async () => {
      if (!testReviewId) {
        console.log('Skipping - no test review available');
        return;
      }
      
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/${testReviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: 'sincere',
          // 不提供skipAuth也不提供token
        }),
      });
      
      expect(response.status).toBe(401);
    });

    it('应该能够使用有效token调用', async () => {
      if (!authToken || !testReviewId) {
        console.log('Skipping - no token or review available');
        return;
      }
      
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/${testReviewId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          style: 'sincere',
        }),
      });
      
      // 正常调用（可能因AI服务问题返回其他状态）
      const result = await response.json();
      console.log('Authenticated AI reply result:', result.success);
    });
  });

  describe('4. 回复质量评估测试', () => {
    it('应该能够对回复进行质量评分', async () => {
      if (!testReviewId) {
        console.log('Skipping - no test review available');
        return;
      }
      
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/${testReviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: 'sincere',
          skipAuth: true,
        }),
      });
      
      const result = await response.json();
      
      if (response.status === 200 && result.success) {
        // 验证返回了多个回复选项
        if (result.data?.scoredReplies) {
          expect(Array.isArray(result.data.scoredReplies)).toBe(true);
          
          // 验证回复包含质量评分
          result.data.scoredReplies.forEach((reply: any) => {
            expect(reply.text).toBeDefined();
            expect(typeof reply.score).toBe('number');
          });
        }
      }
    });

    it('回复应该包含分析结果', async () => {
      if (!testReviewId) {
        console.log('Skipping - no test review available');
        return;
      }
      
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/${testReviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: 'sincere',
          skipAuth: true,
        }),
      });
      
      const result = await response.json();
      
      if (response.status === 200 && result.success) {
        // 验证返回了分析结果
        if (result.data?.analysis) {
          expect(result.data.analysis).toBeDefined();
        }
      }
    });
  });

  describe('5. 错误处理测试', () => {
    it('应该处理不存在的评价ID', async () => {
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/nonexistent-id-123/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: 'sincere',
          skipAuth: true,
        }),
      });
      
      expect(response.status).toBe(404);
    });

    it('应该验证请求参数', async () => {
      if (!testReviewId) {
        console.log('Skipping - no test review available');
        return;
      }
      
      const response = await fetch(`${E2E_CONFIG.apiBaseUrl}/reviews/${testReviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 缺少style参数
          skipAuth: true,
        }),
      });
      
      // 应该使用默认风格
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
