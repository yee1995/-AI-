# 粵語 AI 智能接線及派單系統

> Cantonese AI Intelligent Call Answering & Work Order Dispatch System

一個基於 AI 的 24 小時電話接線系統，專為工程維護公司設計。系統通過 Twilio 接收真實電話，使用 Claude AI 進行粵語對話，自動收集報修信息並生成標準化工單。

---

## 系統架構

```
來電 → Twilio → WebSocket 媒體流 → Google STT（粵語識別）
                                        ↓
                               Claude AI（粵語對話）
                                        ↓
                               工單生成器 → SQLite 數據庫
                                        ↓
                               Google TTS → 語音回應 → 來電者
                                        ↓
                               SMS 確認短信 → 來電者
                                        ↓
                               Dashboard（瀏覽器查看工單）
```

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

編輯 `.env` 填入以下配置：

```env
# Twilio（在 twilio.com 申請）
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+852XXXXXXXX

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx

# Google Cloud（語音識別和合成）
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json

# 伺服器
PORT=3000
BASE_URL=https://your-ngrok-url.ngrok.io
```

### 3. Google Cloud 設置（語音功能）

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 啟用 **Cloud Speech-to-Text API** 和 **Cloud Text-to-Speech API**
3. 創建服務帳號並下載 JSON 金鑰
4. 將金鑰文件保存為項目根目錄的 `google-credentials.json`

### 4. 本地測試（文字模擬，無需電話）

```bash
# 互動模式：手動輸入對話
npm run test-call

# 自動模式：跑預設測試用例
npm run test-call:auto
```

### 5. 啟動伺服器

```bash
npm run dev
```

### 6. 使用 ngrok 獲取公開 URL

```bash
# 在另一個終端視窗執行
ngrok http 3000
```

複製 ngrok 提供的 HTTPS URL（如 `https://abc123.ngrok.io`），更新 `.env` 中的 `BASE_URL`。

### 7. 配置 Twilio Webhook

1. 登入 [Twilio Console](https://console.twilio.com)
2. 進入 **Phone Numbers → Manage → Active numbers**
3. 點擊你的電話號碼
4. 在 **Voice & Fax** 部分：
   - **A CALL COMES IN** → Webhook → `https://your-ngrok-url.ngrok.io/api/voice/incoming`
   - **Call Status Changes** → `https://your-ngrok-url.ngrok.io/api/voice/status`
5. 保存設置

### 8. 打電話測試

撥打你的 Twilio 電話號碼，AI 助手會用粵語接聽。

### 9. 查看管理 Dashboard

打開瀏覽器訪問：**http://localhost:3000**

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
| `GET` | `/api/work-orders` | 獲取所有工單 |
| `GET` | `/api/work-orders/:id` | 獲取單個工單 |
| `PATCH` | `/api/work-orders/:id/status` | 更新工單狀態 |
| `GET` | `/api/stats` | 獲取統計數據 |
| `POST` | `/api/voice/incoming` | Twilio 來電 Webhook |
| `POST` | `/api/voice/status` | Twilio 狀態回調 |
| `WS` | `/api/voice/stream` | Twilio 媒體流 WebSocket |

---

## 項目結構

```
smart-dispatch-ai/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts                 # Express 主伺服器
│   ├── twilio/
│   │   ├── voice-handler.ts     # 來電處理、TwiML、WebSocket 媒體流
│   │   └── sms.ts               # SMS 確認短信
│   ├── ai/
│   │   ├── conversation.ts      # 對話狀態機 + Claude API
│   │   ├── prompts.ts           # 系統 prompt 和粵語模板
│   │   └── extractor.ts         # 從 AI 回應提取結構化數據
│   ├── speech/
│   │   ├── stt.ts               # Google Cloud STT（粵語）
│   │   └── tts.ts               # Google Cloud TTS
│   ├── work-order/
│   │   ├── generator.ts         # 工單生成器
│   │   ├── id-generator.ts      # 個案編號 + V編號生成
│   │   └── types.ts             # TypeScript 類型定義
│   └── db/
│       └── store.ts             # SQLite 數據存儲
├── public/
│   └── index.html               # 管理後台 Dashboard
└── scripts/
    └── test-call.ts             # 本地文字模擬測試
```

---

## 常見問題

**Q: 粵語識別效果不理想怎麼辦？**

Google Cloud STT 支持 `yue-Hant-HK`（廣東話），若識別率不理想可在 `src/speech/stt.ts` 中調整 `languageCode` 為 `zh-Hant-HK`（普通話）作為備選，Claude AI 仍會以粵語理解和回應。

**Q: 如何在沒有 Google Cloud 的情況下測試？**

使用 `npm run test-call` 跑文字模擬測試，完全不需要 Google Cloud 或 Twilio，只需要 Anthropic API Key。

**Q: 工單數據存在哪裡？**

SQLite 數據庫位於 `data/workorders.db`，可用任何 SQLite 工具查看。

**Q: 如何部署到生產環境？**

推薦使用 Railway、Render 或 Fly.io 部署，配合永久域名替換 ngrok。

---

## 技術棧

- **後端**: Node.js + TypeScript + Express.js
- **電話**: Twilio Voice + Media Streams
- **AI**: Anthropic Claude Sonnet 4
- **語音識別**: Google Cloud Speech-to-Text（粵語 yue-Hant-HK）
- **語音合成**: Google Cloud Text-to-Speech
- **數據庫**: SQLite（better-sqlite3）
- **前端**: React（CDN，無需構建）
