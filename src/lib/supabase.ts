import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Enhanced debugging for environment variables
console.log('🔧 Supabase Configuration:', {
  url: supabaseUrl ? '✅ Set' : '❌ Missing',
  key: supabaseAnonKey ? '✅ Set' : '❌ Missing',
  urlValue: supabaseUrl,
  keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Not set',
  envMode: import.meta.env.MODE,
  envDev: import.meta.env.DEV
});

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 'Missing Supabase environment variables. Please ensure .env file exists with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  console.error('❌', errorMsg);
  console.warn('⚠️ Creating mock Supabase client to prevent app crash. All features will not work.');
  
  // Show user-friendly error in browser
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      alert('Supabase configuration missing! Please check your .env file and restart the development server.');
    }, 1000);
  }
}

// Create Supabase client with fallback values to prevent app crash
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key', 
  {
  realtime: {
    params: {
      eventsPerSecond: 100, // Increased for paid tier
    },
    heartbeatIntervalMs: 30000, // Less frequent heartbeats for stability
    reconnectAfterMs: (tries: number) => Math.min(2000 * Math.pow(1.5, tries), 60000), // More gradual backoff
    logger: (level: string, message: string, data?: any) => {
      if (level === 'error') {
        console.error('🔌 Realtime Error:', message, data);
      } else if (import.meta.env.DEV && level === 'info') {
        console.log('🔌 Realtime Info:', message);
      }
    }
  },
  auth: {
    persistSession: true, // Enable auth session persistence
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
});

// Test the connection and log results
supabase.from('game_sessions').select('count').limit(1).then(
  ({ data, error }) => {
    if (error) {
      console.error('❌ Supabase connection test failed:', error);
    } else {
      console.log('✅ Supabase connection test successful');
    }
  }
);

export type Database = {
  public: {
    Tables: {
      game_sessions: {
        Row: {
          id: string;
          host_id: string;
          current_question: number;
          current_phase: 'waiting' | 'question' | 'results' | 'sponsor1' | 'sponsor2' | 'podium' | 'final'; // ✅ FIXED
          question_start_time: string | null;
          created_at: string;
          current_question_options_shuffled?: string[] | null; // ✅ NEW
          num_sponsor_breaks: number;
          user_id: string | null;
          version: number;
          updated_at: string;
          title: string | null; // ✅ NEW: Quiz title
        };
        Insert: {
          id?: string;
          host_id: string;
          current_question?: number;
          current_phase?: 'waiting' | 'question' | 'results' | 'sponsor1' | 'sponsor2' | 'podium' | 'final'; // ✅ FIXED
          question_start_time?: string | null;
          created_at?: string;
          current_question_options_shuffled?: string[] | null; // ✅ NEW
          num_sponsor_breaks?: number;
          user_id?: string | null;
          version?: number;
          updated_at?: string;
          title?: string | null; // ✅ NEW: Quiz title
        };
        Update: {
          id?: string;
          host_id?: string;
          current_question?: number;
          current_phase?: 'waiting' | 'question' | 'results' | 'sponsor1' | 'sponsor2' | 'podium' | 'final'; // ✅ FIXED
          question_start_time?: string | null;
          created_at?: string;
          current_question_options_shuffled?: string[] | null; // ✅ NEW
          num_sponsor_breaks?: number;
          user_id?: string | null;
          version?: number;
          updated_at?: string;
          title?: string | null; // ✅ NEW: Quiz title
        };
      };
      players: {
        Row: {
          id: string;
          session_id: string;
          name: string;
          score: number;
          joined_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          name: string;
          score?: number;
          joined_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          name?: string;
          score?: number;
          joined_at?: string;
        };
      };
      player_answers: {
        Row: {
          id: string;
          player_id: string;
          session_id: string;
          question_index: number;
          answer: string;
          is_correct: boolean;
          response_time: number;
          answered_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          session_id: string;
          question_index: number;
          answer: string;
          is_correct: boolean;
          response_time: number;
          answered_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          session_id?: string;
          question_index?: number;
          answer?: string;
          is_correct?: boolean;
          response_time?: number;
          answered_at?: string;
        };
      };
      custom_questions: {
        Row: {
          id: string;
          session_id: string;
          prompt: string;
          correct_answer: string;
          wrong_answers: string[];
          sarcasm_level: number;
          image_url: string | null; // ✅ NEW: Image URL column
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          prompt: string;
          correct_answer: string;
          wrong_answers: string[];
          sarcasm_level: number;
          image_url?: string | null; // ✅ NEW: Optional image URL for inserts
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          prompt?: string;
          correct_answer?: string;
          wrong_answers?: string[];
          sarcasm_level?: number;
          image_url?: string | null; // ✅ NEW: Optional image URL for updates
          created_at?: string;
        };
      };
    };
  };
};