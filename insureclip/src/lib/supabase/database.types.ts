export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          license_no: string | null
          company: string | null
          language_pref: string
          plan_tier: string
          avatar_count: number
          videos_used_this_month: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      avatars: {
        Row: {
          id: string
          user_id: string
          heygen_avatar_id: string
          voice_id: string | null
          status: string
          name: string
          preview_url: string | null
          quality_score: number | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['avatars']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['avatars']['Insert']>
      }
      scripts: {
        Row: {
          id: string
          user_id: string
          topic_id: string | null
          topic_title: string
          language: string
          tone: string
          length: number
          structure: string
          cta: string
          content: string
          compliance_status: string
          compliance_notes: Json
          word_count: number | null
          estimated_duration: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['scripts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['scripts']['Insert']>
      }
      videos: {
        Row: {
          id: string
          user_id: string
          avatar_id: string | null
          script_id: string
          heygen_video_id: string | null
          status: string
          output_url: string | null
          watermarked_url: string | null
          thumbnail_url: string | null
          duration: number | null
          format: string
          aspect_ratio: string | null
          file_size_bytes: number | null
          error_message: string | null
          include_intro_outro: boolean
          include_subtitles: boolean
          background_music: boolean
          created_at: string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['videos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['videos']['Insert']>
      }
      topics: {
        Row: {
          id: string
          category: string
          title_en: string
          title_zh: string
          description_en: string | null
          description_zh: string | null
          season: string | null
          tags: string[]
          active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['topics']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['topics']['Insert']>
      }
      calendar_suggestions: {
        Row: {
          id: string
          user_id: string
          topic_id: string
          suggested_date: string
          status: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['calendar_suggestions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['calendar_suggestions']['Insert']>
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string
          video_id: string | null
          event_type: string
          metadata: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['analytics_events']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['analytics_events']['Insert']>
      }
    }
  }
}
