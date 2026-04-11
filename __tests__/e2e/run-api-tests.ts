/**
 * E2E 测试 - 测试运行脚本
 * 
 * 使用方式：
 * 1. API测试: npx tsx __tests__/e2e/run-api-tests.ts
 * 2. 完整测试: npx tsx __tests__/e2e/run-api-tests.ts --all
 * 3. 指定模块: npx tsx __tests__/e2e/run-api-tests.ts --module auth
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 解析命令行参数
const args = process.argv.slice(2);
const module = args.find(arg => arg.startsWith('--module='))?.split('=')[1];
const runAll = args.includes('--all') || args.includes('--api');

// 测试模块映射
const testModules = {
  auth: join(__dirname, 'auth.test.ts'),
  reviews: join(__dirname, 'reviews.test.ts'),
  'ai-reply': join(__dirname, 'ai-reply.test.ts'),
  subscription: join(__dirname, 'subscription.test.ts'),
};

async function checkServer(baseUrl: string, maxRetries = 10): Promise<boolean> {
  console.log(`检查服务器 ${baseUrl} 是否运行中...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${baseUrl}/api/packages`);
      if (response.ok) {
        console.log('✅ 服务器已启动');
        return true;
      }
    } catch {
      console.log(`等待服务器启动... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('❌ 服务器未启动，请先运行 npm run dev');
  return false;
}

async function runTests() {
  const baseUrl = process.env.E2E_API_URL || 'http://localhost:3000/api';
  
  console.log('='.repeat(60));
  console.log('E2E 测试 - 智能客服平台');
  console.log('='.repeat(60));
  console.log('');
  
  // 检查服务器
  const serverRunning = await checkServer(baseUrl.replace('/api', ''));
  if (!serverRunning) {
    console.log('');
    console.log('提示：启动开发服务器命令: npm run dev');
    process.exit(1);
  }
  
  console.log('');
  console.log('开始运行测试...');
  console.log('');
  
  if (module && testModules[module as keyof typeof testModules]) {
    // 运行指定模块
    console.log(`运行模块测试: ${module}`);
    console.log('-'.repeat(60));
    
    const testFile = testModules[module as keyof typeof testModules];
    await runVitest(testFile);
  } else if (runAll) {
    // 运行所有API测试
    console.log('运行所有API测试模块');
    console.log('-'.repeat(60));
    
    for (const [name, testFile] of Object.entries(testModules)) {
      console.log('');
      console.log(`>>> 模块: ${name}`);
      console.log('-'.repeat(40));
      await runVitest(testFile);
    }
  } else {
    // 默认：运行认证测试作为示例
    console.log('运行认证测试（示例）');
    console.log('使用 --all 参数运行所有测试');
    console.log('使用 --module=<name> 运行指定模块');
    console.log('-'.repeat(60));
    
    console.log('');
    console.log('可用模块:');
    for (const name of Object.keys(testModules)) {
      console.log(`  - ${name}`);
    }
    console.log('');
    
    await runVitest(testModules.auth);
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

function runVitest(testFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['vitest', 'run', testFile, '--reporter=verbose'], {
      stdio: 'inherit',
      shell: true,
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`测试失败，退出码: ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

// 运行测试
runTests().catch(console.error);
