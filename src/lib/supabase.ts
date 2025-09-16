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
  envDev: import.meta.env.DEV,
  currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A'
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
} else {
  // Check for HTTPS/HTTP protocol mismatch
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && import.meta.env.DEV) {
    console.warn('⚠️ PROTOCOL MISMATCH DETECTED!');
    console.warn('You are accessing the app via HTTPS but this is a local development server.');
    console.warn('Please use HTTP instead: http://localhost:5173/');
    console.warn('HTTPS on localhost can cause "Failed to fetch" errors with Supabase.');
  }
}

// Create Supabase client with fallback values to prevent app crash
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key', 
  {
  realtime: {
    params: {
      eventsPerSecond: 50, // Conservative limit to avoid throttling
    },
    heartbeatIntervalMs: 20000, // More frequent for better detection
    reconnectAfterMs: (tries: number) => {
      // Much more conservative backoff to prevent connection storms
      const baseDelay = 2000;
      const maxDelay = 30000;
      return Math.min(baseDelay * Math.pow(1.8, tries), maxDelay);
    },
    logger: (level: string, message: string, data?: any) => {
      if (level === 'error') {
        console.error('🔌 Supabase Realtime Error:', message, data);
      } else if (import.meta.env.DEV && (level === 'info' || level === 'warn')) {
        console.log(`🔌 Supabase Realtime ${level.toUpperCase()}:`, message, data);
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
const testConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...');
    const { data, error } = await supabase.from('game_sessions').select('count').limit(1);
    if (error) {
      console.error('❌ Supabase connection test failed:', error);
      console.warn('🔧 Troubleshooting steps:');
      console.warn('1. Check if your Supabase project is active (not paused)');
      console.warn('2. Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
      console.warn('3. Ensure Realtime is enabled in Supabase dashboard');
      console.warn('4. Check your internet connection');
      console.warn('5. Make sure you are using HTTP (not HTTPS) for localhost development');
      
      // Show user-friendly error for connection issues
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          const isHttps = window.location.protocol === 'https:';
          const message = isHttps 
            ? 'Connection failed! Please use http://localhost:5173/ instead of https://localhost:5173/'
            : 'Supabase connection failed! Please check your .env file and ensure your Supabase project is active.';
          alert(message);
        }, 2000);
      }
    } else {
      console.log('✅ Supabase connection test successful');
    }
  } catch (networkError) {
    console.error('❌ Network error connecting to Supabase:', networkError);
    console.warn('🌐 This appears to be a network connectivity issue.');
    console.warn('Please check:');
    console.warn('- Your internet connection');
    console.warn('- Firewall/VPN settings');
    console.warn('- Supabase project status at https://supabase.com/dashboard');
    console.warn('- Use HTTP instead of HTTPS for localhost: http://localhost:5173/');
    
    // Show user-friendly error for network issues
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const isHttps = window.location.protocol === 'https:';
        const message = isHttps 
          ? 'Network error! Please use http://localhost:5173/ instead of https://localhost:5173/'
          : 'Network error connecting to Supabase! Please check your internet connection and Supabase project status.';
        alert(message);
      }, 2000);
    }
  }
};

// Test connection with better error handling
testConnection();

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
          points_earned: number;
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
          points_earned?: number;
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
          points_earned?: number;
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