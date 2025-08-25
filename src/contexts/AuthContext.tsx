import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
        } else {
          console.log('🔐 Initial session:', initialSession ? 'Found' : 'None');
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }
      } catch (error) {
        console.error('❌ Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, session ? 'Session exists' : 'No session');
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            console.log('✅ User signed in:', session?.user?.email);
            break;
          case 'SIGNED_OUT':
            console.log('👋 User signed out');
            // Clear only auth-related data, preserve game session data
            const keysToPreserve = ['host_id', 'player_id', 'player_name', 'game_session'];
            const preservedData: Record<string, string> = {};
            
            // Save game-related data before clearing
            keysToPreserve.forEach(key => {
              const value = localStorage.getItem(key);
              if (value) preservedData[key] = value;
            });
            
            // Clear all storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Restore game-related data
            Object.entries(preservedData).forEach(([key, value]) => {
              localStorage.setItem(key, value);
            });
            
            console.log('🎮 Preserved game session data during logout');
            break;
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token refreshed');
            break;
          case 'USER_UPDATED':
            console.log('👤 User updated');
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      console.log('📝 Attempting to sign up user:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('❌ Sign up error:', error);
        return { user: null, error };
      }

      console.log('✅ Sign up successful:', data.user?.email);
      return { user: data.user, error: null };
      
    } catch (error) {
      console.error('❌ Sign up exception:', error);
      return { 
        user: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error during sign up',
          name: 'SignUpError',
          status: 500
        } as AuthError 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 Attempting to sign in user:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        return { user: null, error };
      }

      console.log('✅ Sign in successful:', data.user?.email);
      return { user: data.user, error: null };
      
    } catch (error) {
      console.error('❌ Sign in exception:', error);
      return { 
        user: null, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error during sign in',
          name: 'SignInError',
          status: 500
        } as AuthError 
      };
    }
  };

  const signOut = async () => {
    try {
      console.log('👋 Attempting to sign out user');
      
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Sign out error:', error);
        return { error };
      }

      console.log('✅ Sign out successful');
      return { error: null };
      
    } catch (error) {
      console.error('❌ Sign out exception:', error);
      return { 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error during sign out',
          name: 'SignOutError',
          status: 500
        } as AuthError 
      };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('🔄 Attempting to reset password for:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        console.error('❌ Password reset error:', error);
        return { error };
      }

      console.log('✅ Password reset email sent');
      return { error: null };
      
    } catch (error) {
      console.error('❌ Password reset exception:', error);
      return { 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error during password reset',
          name: 'PasswordResetError',
          status: 500
        } as AuthError 
      };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};