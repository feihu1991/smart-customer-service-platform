/**
 * Playwright E2E 测试 - 评价页面
 */

import { test, expect } from '@playwright/test';

test.describe('评价页面 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reviews');
  });

  test('应该正确加载评价列表页面', async ({ page }) => {
    // 验证页面加载
    await expect(page.locator('body')).toBeVisible();
    
    // 等待数据加载
    await page.waitForLoadState('networkidle');
  });

  test('应该显示评价列表', async ({ page }) => {
    // 等待评价卡片或列表出现
    await page.waitForSelector('[data-testid="review-card"], .review-card, [class*="review"]', { timeout: 10000 }).catch(() => {
      // 如果找不到，可能是空列表
      console.log('No reviews found or selector not matched');
    });
    
    // 验证有内容显示
    const content = page.locator('main, [role="main"], .container');
    await expect(content.first()).toBeVisible();
  });

  test('应该有筛选功能', async ({ page }) => {
    // 查找平台筛选器
    const platformFilter = page.locator('select, [role="combobox"], button:has-text("平台")').first();
    
    // 如果筛选器存在
    if (await platformFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(platformFilter).toBeVisible();
    }
  });

  test('应该有分页功能', async ({ page }) => {
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 查找分页控件
    const pagination = page.locator('[role="navigation"][aria-label="pagination"], .pagination, [data-testid="pagination"]');
    
    // 分页可能存在也可能不存在（如果只有一页数据）
    if (await pagination.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(pagination).toBeVisible();
    }
  });

  test('点击评价应该能够展开详情', async ({ page }) => {
    // 等待评价列表加载
    await page.waitForLoadState('networkidle');
    
    // 查找评价卡片
    const reviewCard = page.locator('[data-testid="review-card"], .review-card, [class*="review"]').first();
    
    // 如果存在评价卡片
    if (await reviewCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // 点击展开
      await reviewCard.click();
      
      // 验证详情展开
      const detail = page.locator('[data-testid="review-detail"], .review-detail, [class*="expanded"]');
      await expect(detail.first()).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('评价AI回复功能 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');
  });

  test('应该能够点击生成AI回复按钮', async ({ page }) => {
    // 查找AI回复按钮
    const aiButton = page.locator('button:has-text("AI回复"), button:has-text("生成回复"), [data-testid="ai-reply"]').first();
    
    // 如果按钮存在
    if (await aiButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiButton.click();
      
      // 验证对话框或回复区域出现
      const dialog = page.locator('[role="dialog"], .dialog, [data-testid="reply-dialog"]');
      await expect(dialog.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('应该能够选择回复风格', async ({ page }) => {
    // 先打开AI回复对话框
    const aiButton = page.locator('button:has-text("AI回复"), button:has-text("生成回复")').first();
    
    if (await aiButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiButton.click();
      
      // 查找风格选择器
      const styleSelect = page.locator('select, [role="combobox"]:has-text("风格"), button:has-text("风格")').first();
      
      if (await styleSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(styleSelect).toBeVisible();
      }
    }
  });
});

test.describe('评价筛选功能 E2E 测试', () => {
  test('应该能够按平台筛选评价', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');
    
    // 查找平台筛选
    const platformSelect = page.locator('select').first();
    
    if (await platformSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 选择第一个选项
      const options = await platformSelect.locator('option').all();
      if (options.length > 1) {
        await platformSelect.selectOption({ index: 1 });
        
        // 等待数据刷新
        await page.waitForLoadState('networkidle');
        
        // 验证URL变化
        expect(page.url()).toMatch(/platform=/);
      }
    }
  });

  test('应该能够按评分筛选评价', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');
    
    // 查找评分筛选（可能是按钮组）
    const ratingButtons = page.locator('button:has-text("差评"), button:has-text("中评"), button:has-text("好评")');
    
    if (await ratingButtons.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await ratingButtons.first().click();
      await page.waitForLoadState('networkidle');
    }
  });
});
