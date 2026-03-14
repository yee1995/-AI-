import { ExtractedData } from '../work-order/types';

/**
 * Attempt to parse structured JSON from the AI assistant response.
 * The AI is instructed to embed a JSON block only when confirmed=true.
 */
export function extractJsonFromResponse(response: string): ExtractedData | null {
  // Look for JSON block in the response (may be wrapped in code fences or bare)
  const jsonPatterns = [
    /```json\s*([\s\S]*?)\s*```/i,
    /```\s*([\s\S]*?)\s*```/i,
    /(\{[\s\S]*"confirmed"\s*:\s*true[\s\S]*\})/,
    /(\{[\s\S]*"location"[\s\S]*\})/,
  ];

  for (const pattern of jsonPatterns) {
    const match = response.match(pattern);
    if (match) {
      try {
        const raw = JSON.parse(match[1].trim()) as Partial<ExtractedData>;
        if (raw.confirmed && raw.location) {
          return normalizeExtracted(raw);
        }
      } catch {
        // continue trying
      }
    }
  }
  return null;
}

/**
 * Check if the response signals a transfer request
 */
export function isTransferRequest(response: string): boolean {
  return response.includes('幫你轉接同事') || response.includes('轉接');
}

/**
 * Check if the conversation is complete (AI said goodbye)
 */
export function isConversationComplete(response: string): boolean {
  return (
    response.includes('拜拜') ||
    response.includes('祝你有愉快') ||
    response.includes('多謝你嘅來電')
  );
}

function normalizeExtracted(raw: Partial<ExtractedData>): ExtractedData {
  const validTypes: ExtractedData['equipment_type'][] = [
    '街燈', '水管', '路面', '電力', '樹木', '其他',
  ];
  const equipType = validTypes.includes(raw.equipment_type as ExtractedData['equipment_type'])
    ? (raw.equipment_type as ExtractedData['equipment_type'])
    : '其他';

  return {
    location: raw.location || '',
    equipment_id: raw.equipment_id || null,
    equipment_type: equipType,
    fault_description: raw.fault_description || '',
    caller_phone: raw.caller_phone || '',
    summary: raw.summary || '',
    detail: raw.detail || '',
    confirmed: true,
    needs_transfer: raw.needs_transfer || false,
  };
}
