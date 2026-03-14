/* eslint-disable @typescript-eslint/no-explicit-any */
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import * as fs from 'fs';
import * as path from 'path';

let ttsClient: TextToSpeechClient | null = null;

function getClient(): TextToSpeechClient {
  if (!ttsClient) {
    ttsClient = new TextToSpeechClient();
  }
  return ttsClient;
}

/**
 * Convert text to speech audio buffer using Google Cloud TTS.
 * Uses Cantonese voice (yue-Hant-HK).
 */
export async function synthesizeSpeech(
  text: string,
  outputFormat: 'MP3' | 'LINEAR16' | 'MULAW' = 'MP3'
): Promise<Buffer> {
  const client = getClient();

  const request = {
    input: { text },
    voice: {
      languageCode: 'yue-Hant-HK',
      ssmlGender: 'FEMALE',
    },
    audioConfig: {
      audioEncoding: outputFormat,
      speakingRate: 1.0,
      pitch: 0,
    },
  };

  try {
    const [response] = await (client as any).synthesizeSpeech(request);
    if (response.audioContent) {
      return Buffer.from(response.audioContent as Uint8Array);
    }
    throw new Error('No audio content in TTS response');
  } catch (err) {
    console.error('[TTS] Google TTS error:', err);
    throw err;
  }
}

/**
 * Save synthesized speech to a temp file and return its path.
 * Used for Twilio <Play> verb.
 */
export async function synthesizeSpeechToFile(
  text: string,
  filename?: string
): Promise<string> {
  const audioBuffer = await synthesizeSpeech(text, 'MP3');
  const dir = path.join(process.cwd(), 'public', 'audio');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const fname = filename || `tts_${Date.now()}.mp3`;
  const filePath = path.join(dir, fname);
  fs.writeFileSync(filePath, audioBuffer);
  return `/audio/${fname}`;
}

/**
 * Fallback: Generate a TwiML <Say> response using Twilio's built-in TTS
 * when Google Cloud TTS is unavailable.
 */
export function getTwimlSayAttributes(): { language: string; voice: string } {
  return {
    language: 'zh-HK',
    voice: 'Polly.Hiujin',
  };
}
