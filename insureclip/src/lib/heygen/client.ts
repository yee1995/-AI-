// HeyGen API client
// Documentation: https://docs.heygen.com/reference/

const HEYGEN_BASE_URL = 'https://api.heygen.com'

interface HeyGenAvatarCreateParams {
  name: string
  video_url: string // Pre-signed URL of the uploaded calibration video
}

interface HeyGenAvatarCreateResponse {
  code: number
  data: {
    avatar_id: string
    talking_photo_id?: string
  }
  message: string
}

interface HeyGenVideoGenerateParams {
  avatar_id: string
  voice_id?: string
  script: string
  language?: string
  dimension: {
    width: number
    height: number
  }
  aspect_ratio?: string
  title?: string
}

interface HeyGenVideoGenerateResponse {
  code: number
  data: {
    video_id: string
  }
  message: string
}

interface HeyGenVideoStatusResponse {
  code: number
  data: {
    video_id: string
    status: 'processing' | 'completed' | 'failed' | 'waiting'
    video_url?: string
    thumbnail_url?: string
    duration?: number
    error?: string
  }
  message: string
}

interface HeyGenVoiceCloneParams {
  name: string
  audio_url: string
}

interface HeyGenVoiceCloneResponse {
  code: number
  data: {
    voice_id: string
  }
  message: string
}

// Aspect ratio dimensions for each export format
export const FORMAT_DIMENSIONS = {
  instagram_reels: { width: 1080, height: 1920 },
  youtube_shorts: { width: 1080, height: 1920 },
  tiktok: { width: 1080, height: 1920 },
  linkedin: { width: 1080, height: 1080 },
  whatsapp: { width: 1080, height: 1920 },
  general: { width: 1920, height: 1080 },
} as const

// HeyGen language codes
export const HEYGEN_LANGUAGE_MAP = {
  cantonese: 'zh-HK',
  mandarin: 'zh-TW',
  english: 'en-US',
} as const

async function heygenFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${HEYGEN_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'X-Api-Key': process.env.HEYGEN_API_KEY!,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `HeyGen API error ${response.status}: ${errorText}`
    )
  }

  return response.json() as Promise<T>
}

export async function createAvatar(
  params: HeyGenAvatarCreateParams
): Promise<HeyGenAvatarCreateResponse> {
  return heygenFetch<HeyGenAvatarCreateResponse>('/v2/avatar', {
    method: 'POST',
    body: JSON.stringify({
      talking_photo_url: params.video_url,
      name: params.name,
    }),
  })
}

export async function createVoiceClone(
  params: HeyGenVoiceCloneParams
): Promise<HeyGenVoiceCloneResponse> {
  return heygenFetch<HeyGenVoiceCloneResponse>('/v2/voice_clone', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      url: params.audio_url,
    }),
  })
}

export async function generateVideo(
  params: HeyGenVideoGenerateParams
): Promise<HeyGenVideoGenerateResponse> {
  const body = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: params.avatar_id,
          avatar_style: 'normal',
        },
        voice: {
          type: 'text',
          input_text: params.script,
          voice_id: params.voice_id,
        },
      },
    ],
    dimension: params.dimension,
    title: params.title || 'InsureClip Video',
  }

  return heygenFetch<HeyGenVideoGenerateResponse>('/v2/video/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getVideoStatus(
  videoId: string
): Promise<HeyGenVideoStatusResponse> {
  return heygenFetch<HeyGenVideoStatusResponse>(
    `/v1/video_status.get?video_id=${videoId}`
  )
}

export async function pollVideoStatus(
  videoId: string,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<HeyGenVideoStatusResponse['data']> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await getVideoStatus(videoId)

    if (response.data.status === 'completed') {
      return response.data
    }

    if (response.data.status === 'failed') {
      throw new Error(
        `HeyGen video generation failed: ${response.data.error || 'Unknown error'}`
      )
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error('Video generation timed out after maximum polling attempts')
}

export async function uploadVideoForAvatar(
  videoBuffer: Buffer,
  fileName: string
): Promise<string> {
  // Get upload URL from HeyGen
  const uploadResponse = await heygenFetch<{
    code: number
    data: { url: string; upload_url: string }
  }>('/v1/asset', {
    method: 'POST',
    body: JSON.stringify({
      name: fileName,
      type: 'video',
    }),
  })

  const { url, upload_url } = uploadResponse.data

  // Upload the video to the pre-signed URL
  await fetch(upload_url, {
    method: 'PUT',
    body: videoBuffer,
    headers: {
      'Content-Type': 'video/mp4',
    },
  })

  return url
}
