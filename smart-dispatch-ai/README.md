# 粵語 AI 智能接線及派單系統

> Cantonese AI Intelligent Call Answering & Work Order Dispatch System
> Powered by **Retell AI** + **Anthropic Claude**

一個基於 AI 的 24 小時電話接線系統。Retell AI 負責處理電話接入、粵語語音識別（STT）及語音合成（TTS），Claude AI 負責粵語對話理解及工單提取。

---

## 架構（Retell Custom LLM 模式）

```
來電
 └─▶ Retell AI（電話 + STT + TTS）
       └─▶ WebSocket /llm-websocket（本伺服器）
             └─▶ Claude Sonnet 4（粵語對話 + 工單提取）
                   └─▶ SQLite 工單存儲
                         └─▶ Dashboard（瀏覽器）
```

**相比舊方案（Twilio + Google STT/TTS）的優勢：**
- ✅ 無需 Google Cloud 帳號和憑證
- ✅ 無需 Twilio + Google 雙重配置
- ✅ Retell 內建高質量粵語 STT/TTS
- ✅ 代碼大幅簡化（移除 400+ 行音頻處理代碼）

---

## 快速開始

### 1. 安裝依賴

```bash
cd smart-dispatch-ai
npm install
```

### 2. 配置環境變量

```bash
cp .env.example .env
```

填入：

```env
RETELL_API_KEY=key_xxxxxxxxxxxxxxxxxxxxxxxx   # Retell 控制台取得
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx  # Anthropic 控制台取得
PORT=3000
BASE_URL=https://your-ngrok-url.ngrok.io
```

### 3. 啟動伺服器

```bash
npm run dev
```

### 4. 使用 ngrok 獲取公開 URL

```bash
ngrok http 3000
```

複製 HTTPS URL（如 `https://abc123.ngrok.io`），更新 `.env` 中的 `BASE_URL`。

### 5. 在 Retell 控制台配置 Custom LLM Agent

1. 登入 [Retell AI Dashboard](https://dashboard.retellai.com)
2. 進入 **LLM → Create LLM → Custom LLM**
3. 填入：
   - **WebSocket URL**: `wss://your-ngrok-url.ngrok.io/llm-websocket`
4. 創建 **Agent**：
   - LLM: 選擇剛才創建的 Custom LLM
   - Language: `Chinese (Cantonese)` 或 `Chinese (Mandarin)` + 粵語 TTS 聲音
   - Voice: 選擇支持粵語的聲音（如 ElevenLabs 廣東話聲音）
5. 購買或導入電話號碼，綁定到該 Agent

### 6. 打電話測試

撥打綁定的電話號碼，AI 助手會用粵語接聽。

### 7. 查看管理 Dashboard

打開瀏覽器：**http://localhost:3000**

---

## 本地文字模擬測試（無需 Retell 帳號）

只需 `ANTHROPIC_API_KEY` 即可測試完整對話邏輯：

```bash
# 互動模式：手動輸入文字對話
npm run test-call

# 自動模式：跑預設兩個測試用例
npm run test-call:auto
```

---

## 工單格式範例

```
個案編號: 3-9289278301
日期(Open Date): 08/03/2026  13:52:23
日期(Ref/ Date): 08/03/2026  13:59:09
聯絡方法: 66523615
情況: 投訴坪洲坪利路有一支街燈FA0130不著
街燈編號: FA0130
詳情: 投訴人投訴坪洲坪利路有一支街燈FA0130不著，要求部門維修，要求部門跟進及回覆。
[V26039844]
```

---

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| `WS` | `/llm-websocket` | Retell Custom LLM 接入點 |
| `GET` | `/api/work-orders` | 獲取所有工單 |
| `GET` | `/api/work-orders/:id` | 獲取單個工單 |
| `PATCH` | `/api/work-orders/:id/status` | 更新工單狀態 |
| `GET` | `/api/stats` | 統計數據 |
| `GET` | `/api/health` | 健康檢查 |

---

## 項目結構

```
smart-dispatch-ai/
├── src/
│   ├── index.ts                 # Express 主伺服器
│   ├── retell/
│   │   └── llm-handler.ts       # Retell Custom LLM WebSocket 處理器
│   ├── ai/
│   │   ├── conversation.ts      # Claude 對話邏輯（支持 Retell transcript 格式）
│   │   ├── prompts.ts           # 粵語系統 prompt
│   │   └── extractor.ts         # 從 AI 回應提取結構化工單數據
│   ├── work-order/
│   │   ├── generator.ts         # 工單生成器
│   │   ├── id-generator.ts      # 個案編號 + V編號
│   │   └── types.ts             # TypeScript 類型
│   └── db/store.ts              # SQLite 工單存儲
├── public/index.html            # 管理後台 Dashboard
└── scripts/test-call.ts         # 本地文字模擬測試
```

---

## 技術棧

| 組件 | 技術 |
|------|------|
| 電話 + STT + TTS | Retell AI |
| AI 對話 | Anthropic Claude Sonnet 4 |
| 後端 | Node.js + TypeScript + Express |
| 實時通信 | WebSocket（Retell Custom LLM 協議）|
| 數據庫 | SQLite（better-sqlite3）|
| 前端 | React（CDN，無需構建）|
