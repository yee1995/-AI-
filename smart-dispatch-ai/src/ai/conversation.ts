import Anthropic from '@anthropic-ai/sdk';
import { ConversationState, ConversationMessage } from '../work-order/types';
import { SYSTEM_PROMPT, GREETING_MESSAGE } from './prompts';
import { extractJsonFromResponse, isTransferRequest, isConversationComplete } from './extractor';
import { generateWorkOrder } from '../work-order/generator';
import { WorkOrder } from '../work-order/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Create a new conversation state for an incoming call
 */
export function createConversationState(callSid: string, callerPhone: string): ConversationState {
  return {
    callSid,
    startTime: new Date(),
    messages: [],
    step: 'greeting',
    extractedData: {},
    isComplete: false,
    needsTransfer: false,
    callerPhone,
  };
}

/**
 * Process a user message and return the AI response.
 * Mutates the conversation state in place.
 */
export async function processUserMessage(
  state: ConversationState,
  userInput: string
): Promise<{ response: string; workOrder?: WorkOrder; isComplete: boolean; needsTransfer: boolean }> {
  // Add user message to history
  state.messages.push({ role: 'user', content: userInput });

  // Build messages for Claude API
  const apiMessages: Anthropic.MessageParam[] = state.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: apiMessages,
  });

  const assistantText =
    response.content[0].type === 'text' ? response.content[0].text : '';

  // Add assistant response to history
  state.messages.push({ role: 'assistant', content: assistantText });

  // Check for transfer
  if (isTransferRequest(assistantText)) {
    state.needsTransfer = true;
  }

  // Try to extract structured data
  const extracted = extractJsonFromResponse(assistantText);
  let workOrder: WorkOrder | undefined;

  if (extracted) {
    // If caller phone not captured by AI, use the Twilio caller ID
    if (!extracted.caller_phone && state.callerPhone) {
      extracted.caller_phone = state.callerPhone;
    }
    workOrder = generateWorkOrder(extracted, state.startTime, state.callSid);
    state.isComplete = true;
  }

  // Check if conversation is naturally complete even without JSON
  if (isConversationComplete(assistantText)) {
    state.isComplete = true;
  }

  return {
    response: cleanResponseText(assistantText),
    workOrder,
    isComplete: state.isComplete,
    needsTransfer: state.needsTransfer,
  };
}

/**
 * Get the initial greeting message
 */
export function getGreeting(): string {
  return GREETING_MESSAGE;
}

/**
 * Remove any JSON blocks from the AI response before sending to TTS
 */
function cleanResponseText(text: string): string {
  // Remove code fences and JSON blocks
  return text
    .replace(/```json[\s\S]*?```/gi, '')
    .replace(/```[\s\S]*?```/gi, '')
    .replace(/\{[\s\S]*"confirmed"\s*:\s*true[\s\S]*\}/g, '')
    .trim();
}
