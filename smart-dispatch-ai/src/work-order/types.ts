export interface ExtractedData {
  location: string;
  equipment_id: string | null;
  equipment_type: '街燈' | '水管' | '路面' | '電力' | '樹木' | '其他';
  fault_description: string;
  caller_phone: string;
  summary: string;
  detail: string;
  confirmed: boolean;
  needs_transfer?: boolean;
}

export interface WorkOrder {
  id: string;                  // 個案編號 e.g. 3-9289278301
  open_date: string;           // DD/MM/YYYY  HH:MM:SS
  ref_date: string;            // DD/MM/YYYY  HH:MM:SS (open_date + 3-10 min)
  contact_method: string;      // 聯絡電話
  situation: string;           // 情況摘要
  equipment_id: string;        // 街燈編號 or "無"
  detail: string;              // 詳情
  v_number: string;            // V + 8 digits
  status: 'new' | 'processing' | 'completed';
  created_at: Date;
  raw_extracted: ExtractedData;
  call_sid?: string;
  formatted_text?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationState {
  callSid: string;
  startTime: Date;
  messages: ConversationMessage[];
  step: ConversationStep;
  extractedData: Partial<ExtractedData>;
  isComplete: boolean;
  needsTransfer: boolean;
  callerPhone: string;
}

export type ConversationStep =
  | 'greeting'
  | 'identify_purpose'
  | 'collect_location'
  | 'collect_equipment'
  | 'collect_fault'
  | 'collect_contact'
  | 'confirm'
  | 'complete'
  | 'transfer';
