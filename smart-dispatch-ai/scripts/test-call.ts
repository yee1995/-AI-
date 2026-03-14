/**
 * 本地文字模擬測試腳本
 * 無需真實電話，直接在終端輸入文字測試完整對話流程
 *
 * 用法:
 *   npm run test-call
 *   npm run test-call -- --auto  (自動跑測試用例)
 */

import 'dotenv/config';
import * as readline from 'readline';
import { createConversationState, processUserMessage, getGreeting } from '../src/ai/conversation';
import { formatWorkOrderText } from '../src/work-order/generator';

// ─── Colors for terminal output ───────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
};

function printBanner() {
  console.log('\n' + colors.cyan + colors.bold + `
╔══════════════════════════════════════════════════════╗
║  粵語 AI 智能接線系統 - 本地文字模擬測試               ║
║  Cantonese AI Dispatch - Text Simulation Test        ║
╚══════════════════════════════════════════════════════╝
` + colors.reset);
}

function printAI(text: string) {
  console.log(`\n${colors.blue}${colors.bold}[AI 助手]${colors.reset} ${colors.blue}${text}${colors.reset}\n`);
}

function printUser(text: string) {
  console.log(`${colors.green}${colors.bold}[來電者]${colors.reset} ${colors.green}${text}${colors.reset}`);
}

function printWorkOrder(text: string) {
  console.log('\n' + colors.yellow + colors.bold + '═'.repeat(56) + colors.reset);
  console.log(colors.yellow + colors.bold + '  📋 工單已生成' + colors.reset);
  console.log(colors.yellow + colors.bold + '═'.repeat(56) + colors.reset);
  console.log(colors.bold + text + colors.reset);
  console.log(colors.yellow + '═'.repeat(56) + colors.reset + '\n');
}

function printInfo(text: string) {
  console.log(colors.gray + `[系統] ${text}` + colors.reset);
}

function printError(text: string) {
  console.log(colors.red + `[錯誤] ${text}` + colors.reset);
}

// ─── Interactive Mode ─────────────────────────────────────────────────────
async function runInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const callSid = `TEST-${Date.now()}`;
  const callerPhone = '66666666';
  const state = createConversationState(callSid, callerPhone);

  printBanner();
  console.log(colors.magenta + '模式: 互動模式 (輸入 "exit" 結束)' + colors.reset);
  console.log(colors.gray + `模擬來電 SID: ${callSid}` + colors.reset + '\n');

  // Print initial greeting
  const greeting = getGreeting();
  printAI(greeting);

  const askQuestion = () => {
    if (state.isComplete) {
      rl.close();
      return;
    }

    rl.question(colors.green + '你: ' + colors.reset, async (input) => {
      const trimmed = input.trim();

      if (trimmed.toLowerCase() === 'exit' || trimmed === '') {
        printInfo('對話結束');
        rl.close();
        return;
      }

      printUser(trimmed);

      try {
        const result = await processUserMessage(state, trimmed);
        printAI(result.response);

        if (result.workOrder) {
          printWorkOrder(formatWorkOrderText(result.workOrder));
          printInfo('工單已生成（在真實環境中會自動儲存到資料庫）');
        }

        if (result.needsTransfer) {
          printInfo('⚠️  來電者要求轉接真人，系統已標記');
        }

        if (result.isComplete) {
          printInfo('對話完成，通話結束');
          rl.close();
          return;
        }
      } catch (err) {
        printError(`AI 回應失敗: ${(err as Error).message}`);
        printInfo('請確認 ANTHROPIC_API_KEY 已正確設置');
      }

      askQuestion();
    });
  };

  askQuestion();

  rl.on('close', () => {
    console.log('\n' + colors.cyan + '測試結束，再見！' + colors.reset + '\n');
    process.exit(0);
  });
}

// ─── Automated Test Mode ──────────────────────────────────────────────────
interface TestCase {
  name: string;
  inputs: string[];
  expectedEquipmentId?: string | null;
  expectedEquipmentType?: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: '測試用例 1: 街燈故障（有設備編號）',
    inputs: [
      '我想投訴坪洲坪利路有支街燈唔著',
      '個編號好似係 FA0130',
      '我電話 66523615',
      '係，冇問題',
    ],
    expectedEquipmentId: 'FA0130',
    expectedEquipmentType: '街燈',
  },
  {
    name: '測試用例 2: 樹木倒塌（無設備編號）',
    inputs: [
      '喂，大嶼山東涌果邊有棵樹跌咗落條路度',
      '唔知，我唔知個編號',
      '我電話係 98765432',
      '係啱嘅',
    ],
    expectedEquipmentId: null,
    expectedEquipmentType: '樹木',
  },
];

async function runAutoTest() {
  printBanner();
  console.log(colors.magenta + '模式: 自動測試模式' + colors.reset + '\n');

  let passCount = 0;
  let failCount = 0;

  for (const testCase of TEST_CASES) {
    console.log('\n' + colors.cyan + colors.bold + `▶ ${testCase.name}` + colors.reset);
    console.log('─'.repeat(56));

    const callSid = `TEST-AUTO-${Date.now()}`;
    const state = createConversationState(callSid, '00000000');

    const greeting = getGreeting();
    printAI(greeting);

    let workOrderGenerated = false;
    let finalWorkOrder = null;

    for (const input of testCase.inputs) {
      printUser(input);

      try {
        const result = await processUserMessage(state, input);
        printAI(result.response);

        if (result.workOrder) {
          finalWorkOrder = result.workOrder;
          workOrderGenerated = true;
          printWorkOrder(formatWorkOrderText(result.workOrder));
        }

        if (result.isComplete) {
          break;
        }

        // Small delay between messages to avoid rate limiting
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        printError(`AI 回應失敗: ${(err as Error).message}`);
        failCount++;
        break;
      }
    }

    // Validate results
    console.log('\n' + colors.bold + '驗證結果:' + colors.reset);

    if (workOrderGenerated && finalWorkOrder) {
      const raw = finalWorkOrder.raw_extracted;
      let passed = true;

      // Check equipment ID
      if (testCase.expectedEquipmentId !== undefined) {
        const idMatch = raw.equipment_id === testCase.expectedEquipmentId;
        console.log(
          `  設備編號: ${idMatch ? colors.green + '✓' : colors.red + '✗'} ` +
          `(預期: ${testCase.expectedEquipmentId || '無'}, 實際: ${raw.equipment_id || '無'})` +
          colors.reset
        );
        if (!idMatch) passed = false;
      }

      // Check equipment type
      if (testCase.expectedEquipmentType) {
        const typeMatch = raw.equipment_type === testCase.expectedEquipmentType;
        console.log(
          `  設備類型: ${typeMatch ? colors.green + '✓' : colors.red + '✗'} ` +
          `(預期: ${testCase.expectedEquipmentType}, 實際: ${raw.equipment_type})` +
          colors.reset
        );
        if (!typeMatch) passed = false;
      }

      // Check required fields
      const hasLocation = !!raw.location;
      const hasPhone = !!raw.caller_phone;
      const hasSummary = !!raw.summary;
      console.log(`  地點字段: ${hasLocation ? colors.green + '✓' : colors.red + '✗'}` + colors.reset);
      console.log(`  電話字段: ${hasPhone ? colors.green + '✓' : colors.red + '✗'}` + colors.reset);
      console.log(`  摘要字段: ${hasSummary ? colors.green + '✓' : colors.red + '✗'}` + colors.reset);

      if (!hasLocation || !hasPhone || !hasSummary) passed = false;

      if (passed) {
        console.log(colors.green + colors.bold + '\n  ✓ 測試通過' + colors.reset);
        passCount++;
      } else {
        console.log(colors.red + colors.bold + '\n  ✗ 測試失敗' + colors.reset);
        failCount++;
      }
    } else {
      console.log(colors.red + '  ✗ 未能生成工單' + colors.reset);
      failCount++;
    }
  }

  // Summary
  console.log('\n' + colors.bold + '═'.repeat(56));
  console.log(`測試總結: ${passCount} 通過 / ${failCount} 失敗 / ${TEST_CASES.length} 總計`);
  if (failCount === 0) {
    console.log(colors.green + '✓ 全部測試通過！' + colors.reset);
  } else {
    console.log(colors.red + `✗ ${failCount} 個測試失敗` + colors.reset);
  }
  console.log('═'.repeat(56) + colors.reset + '\n');

  process.exit(failCount > 0 ? 1 : 0);
}

// ─── Entry Point ──────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const isAuto = args.includes('--auto') || args.includes('-a');

  if (!process.env.ANTHROPIC_API_KEY) {
    printError('ANTHROPIC_API_KEY 未設置！請先複製 .env.example 到 .env 並填寫 API Key。');
    process.exit(1);
  }

  if (isAuto) {
    await runAutoTest();
  } else {
    await runInteractive();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
