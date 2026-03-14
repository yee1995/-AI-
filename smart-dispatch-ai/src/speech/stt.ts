/* eslint-disable @typescript-eslint/no-explicit-any */
import { SpeechClient } from '@google-cloud/speech';

let speechClient: SpeechClient | null = null;

function getClient(): SpeechClient {
  if (!speechClient) {
    speechClient = new SpeechClient();
  }
  return speechClient;
}

/**
 * Transcribe a single audio buffer using Google Cloud Speech-to-Text.
 * Primary: Cantonese (yue-Hant-HK), fallback: Mandarin (zh-Hant-HK)
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  encoding: 'MULAW' | 'LINEAR16' = 'MULAW',
  sampleRateHertz = 8000
): Promise<string> {
  const client = getClient();

  const request = {
    audio: { content: audioBuffer.toString('base64') },
    config: {
      encoding: encoding as any,
      sampleRateHertz,
      languageCode: 'yue-Hant-HK',
      alternativeLanguageCodes: ['zh-Hant-HK'],
      enableAutomaticPunctuation: true,
      model: 'default',
    },
  };

  try {
    const [response] = await client.recognize(request as any);
    const results = (response as any).results as any[] | undefined;
    const transcript = results
      ?.map((r: any) => r.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim();
    return transcript || '';
  } catch (err) {
    console.error('[STT] Google Speech error:', err);
    return '';
  }
}

/**
 * Create a streaming speech recognition session for real-time Twilio audio
 */
export function createStreamingRecognizeSession(
  onTranscript: (text: string, isFinal: boolean) => void
) {
  const client = getClient();

  const recognizeStream = (client as any)
    .streamingRecognize({
      config: {
        encoding: 'MULAW',
        sampleRateHertz: 8000,
        languageCode: 'yue-Hant-HK',
        alternativeLanguageCodes: ['zh-Hant-HK'],
        enableAutomaticPunctuation: true,
        interimResults: true,
      },
      interimResults: true,
    })
    .on('data', (data: any) => {
      const result = data.results?.[0];
      if (result) {
        const transcript = result.alternatives?.[0]?.transcript || '';
        const isFinal = result.isFinal || false;
        if (transcript) {
          onTranscript(transcript, isFinal);
        }
      }
    })
    .on('error', (err: Error) => {
      console.error('[STT] Streaming error:', err);
    });

  return recognizeStream;
}
