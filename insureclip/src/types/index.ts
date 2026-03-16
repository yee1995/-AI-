export type PlanTier = 'free' | 'pro' | 'team'
export type Language = 'cantonese' | 'mandarin' | 'english'
export type VideoTone = 'professional' | 'warm_casual' | 'educational'
export type VideoLength = 15 | 30 | 45 | 60
export type ScriptStructure = 'problem_solution' | 'story' | 'list' | 'qa'
export type CallToAction = 'contact_me' | 'book_review' | 'learn_more' | 'none'
export type ComplianceStatus = 'pass' | 'warning' | 'fail'
export type AvatarStatus = 'processing' | 'active' | 'failed'
export type VideoStatus = 'queued' | 'processing' | 'completed' | 'failed'
export type ExportFormat = 'instagram_reels' | 'youtube_shorts' | 'tiktok' | 'linkedin' | 'whatsapp' | 'general'

export interface User {
  id: string
  email: string
  name: string
  license_no?: string
  company?: string
  language_pref: Language
  plan_tier: PlanTier
  avatar_count: number
  videos_used_this_month: number
  created_at: string
}

export interface Avatar {
  id: string
  user_id: string
  heygen_avatar_id: string
  voice_id: string
  status: AvatarStatus
  name: string
  preview_url?: string
  created_at: string
}

export interface Script {
  id: string
  user_id: string
  topic_id?: string
  topic_title: string
  language: Language
  tone: VideoTone
  length: VideoLength
  structure: ScriptStructure
  cta: CallToAction
  content: string
  compliance_status: ComplianceStatus
  compliance_notes?: string[]
  created_at: string
}

export interface Video {
  id: string
  user_id: string
  avatar_id: string
  script_id: string
  heygen_video_id?: string
  status: VideoStatus
  output_url?: string
  watermarked_url?: string
  duration?: number
  format: ExportFormat
  thumbnail_url?: string
  created_at: string
  completed_at?: string
}

export interface Topic {
  id: string
  category: TopicCategory
  title_en: string
  title_zh: string
  season?: string
  tags: string[]
  active: boolean
}

export type TopicCategory =
  | 'product_education'
  | 'life_events'
  | 'market_commentary'
  | 'seasonal'
  | 'client_engagement'

export interface CalendarSuggestion {
  id: string
  user_id: string
  topic_id: string
  topic: Topic
  suggested_date: string
  status: 'pending' | 'used' | 'dismissed'
}

export interface AnalyticsEvent {
  id: string
  user_id: string
  video_id?: string
  event_type: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface ScriptGenerationParams {
  topic_id?: string
  topic_title?: string
  language: Language
  tone: VideoTone
  length: VideoLength
  structure: ScriptStructure
  cta: CallToAction
  agent_name: string
  agent_company?: string
}

export interface ScriptGenerationResult {
  script: string
  compliance_status: ComplianceStatus
  compliance_notes: string[]
  word_count: number
  estimated_duration: number
}

export interface VideoGenerationParams {
  script_id: string
  avatar_id: string
  format: ExportFormat
  include_intro_outro: boolean
  include_subtitles: boolean
  background_music?: boolean
}

export interface ComplianceViolation {
  line: number
  text: string
  rule: string
  severity: 'error' | 'warning'
}
