import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { GameButton } from './GameButton';
import { Plus, Play, Users, Calendar, BarChart3, LogOut, Trash2, Eye, Settings } from 'lucide-react';

interface QuizSession {
  id: string;
  created_at: string;
  current_phase: string;
  players_count: number;
  questions_count: number;
  title?: string | null;
}

interface UserDashboardProps {
  onCreateNewQuiz: () => void;
  className?: string;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ 
  onCreateNewQuiz, 
  className = '' 
}) => {
  const { user, signOut } = useAuth();
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);

  useEffect(() => {
    loadUserSessions();
  }, [user]);

  const loadUserSessions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch user's sessions with player and question counts
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('game_sessions')
        .select(`
          id,
          created_at,
          current_phase,
          user_id,
          title
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (sessionsError) {
        throw sessionsError;
      }

      // Get player counts for each session
      const sessionsWithCounts = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const [playersResult, questionsResult] = await Promise.all([
            supabase
              .from('players')
              .select('id', { count: 'exact' })
              .eq('session_id', session.id),
            supabase
              .from('custom_questions')
              .select('id', { count: 'exact' })
              .eq('session_id', session.id)
          ]);

          return {
            ...session,
            players_count: playersResult.count || 0,
            questions_count: questionsResult.count || 0
          };
        })
      );

      setSessions(sessionsWithCounts);
      console.log('✅ Loaded user sessions:', sessionsWithCounts.length);

    } catch (err) {
      console.error('❌ Error loading sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load your quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this quiz session? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingSession(sessionId);
      
      const { error } = await supabase
        .from('game_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user?.id); // Extra safety check

      if (error) {
        throw error;
      }

      console.log('✅ Session deleted successfully');
      await loadUserSessions(); // Reload the list
      
    } catch (err) {
      console.error('❌ Error deleting session:', err);
      alert('Failed to delete quiz session. Please try again.');
    } finally {
      setDeletingSession(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPhaseDisplay = (phase: string) => {
    const phaseMap: { [key: string]: { label: string; color: string; icon: string } } = {
      'waiting': { label: 'Waiting for Players', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50', icon: '⏳' },
      'question': { label: 'In Progress', color: 'bg-blue-500/20 text-blue-300 border-blue-400/50', icon: '❓' },
      'results': { label: 'Showing Results', color: 'bg-purple-500/20 text-purple-300 border-purple-400/50', icon: '📊' },
      'final': { label: 'Completed', color: 'bg-green-500/20 text-green-300 border-green-400/50', icon: '✅' },
      'podium': { label: 'Final Results', color: 'bg-green-500/20 text-green-300 border-green-400/50', icon: '🏆' }
    };
    
    const phaseInfo = phaseMap[phase] || { label: phase, color: 'bg-gray-500/20 text-gray-300 border-gray-400/50', icon: '❓' };
    return phaseInfo;
  };

  const openSession = (sessionId: string) => {
    window.open(`/?session=${sessionId}`, '_blank');
  };

  const openAnalytics = (sessionId: string) => {
    window.open(`/admin/analytics?session=${sessionId}`, '_blank');
  };

  const openJumbotron = (sessionId: string) => {
    window.open(`/display/${sessionId}`, '_blank');
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 ${className}`}>
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-sm border-b border-white/20 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              🎮 My Quizzes
            </h1>
            <p className="text-gray-300 mt-1">Welcome back, {user?.email}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <GameButton
              onClick={onCreateNewQuiz}
              variant="primary"
              className="bg-green-500 hover:bg-green-600"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New Quiz
              </div>
            </GameButton>
            
            <button
              onClick={handleSignOut}
              className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg border border-red-400/50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {loading ? (
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-12 border border-white/30 text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-purple-300/30 border-t-purple-300 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Loading Your Quizzes...</h3>
            <p className="text-gray-300">Please wait while we fetch your quiz sessions</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/20 backdrop-blur-sm rounded-2xl p-8 border border-red-400/50 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-2xl font-bold text-red-300 mb-4">Error Loading Quizzes</h3>
            <p className="text-red-200 mb-6">{error}</p>
            <GameButton onClick={loadUserSessions} variant="primary">
              Try Again
            </GameButton>
          </div>
        ) : sessions.length === 0 ? (
          /* Empty State */
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-12 border border-white/30 text-center">
            <div className="text-8xl mb-6 opacity-50">🎮</div>
            <h3 className="text-3xl font-bold text-white mb-4">No Quizzes Yet!</h3>
            <p className="text-gray-300 text-lg mb-8">
              Ready to create your first interactive quiz? Let's get started!
            </p>
            
            <div className="max-w-md mx-auto mb-8">
              <div className="bg-purple-500/20 rounded-lg p-6 border border-purple-400/50">
                <h4 className="text-lg font-bold text-purple-300 mb-3">What you can do:</h4>
                <ul className="text-left text-purple-200 space-y-2">
                  <li>• Create custom quiz questions</li>
                  <li>• Upload questions via CSV</li>
                  <li>• Host live multiplayer sessions</li>
                  <li>• View detailed analytics</li>
                  <li>• Customize sponsor messages</li>
                </ul>
              </div>
            </div>
            
            <GameButton
              onClick={onCreateNewQuiz}
              variant="primary"
              className="bg-green-500 hover:bg-green-600 text-xl px-8 py-4"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-6 h-6" />
                Create Your First Quiz
              </div>
            </GameButton>
          </div>
        ) : (
          /* Quiz Sessions List */
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-6 border border-blue-400/50">
                <div className="flex items-center gap-3 mb-2">
                  <Play className="w-6 h-6 text-blue-400" />
                  <span className="text-blue-300 font-medium">Total Quizzes</span>
                </div>
                <div className="text-3xl font-bold text-white">{sessions.length}</div>
              </div>

              <div className="bg-green-500/20 backdrop-blur-sm rounded-xl p-6 border border-green-400/50">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-6 h-6 text-green-400" />
                  <span className="text-green-300 font-medium">Total Players</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  {sessions.reduce((sum, s) => sum + s.players_count, 0)}
                </div>
              </div>

              <div className="bg-purple-500/20 backdrop-blur-sm rounded-xl p-6 border border-purple-400/50">
                <div className="flex items-center gap-3 mb-2">
                  <Settings className="w-6 h-6 text-purple-400" />
                  <span className="text-purple-300 font-medium">Total Questions</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  {sessions.reduce((sum, s) => sum + s.questions_count, 0)}
                </div>
              </div>

              <div className="bg-yellow-500/20 backdrop-blur-sm rounded-xl p-6 border border-yellow-400/50">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-6 h-6 text-yellow-400" />
                  <span className="text-yellow-300 font-medium">Completed</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  {sessions.filter(s => s.current_phase === 'final' || s.current_phase === 'podium').length}
                </div>
              </div>
            </div>

            {/* Sessions Grid */}
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-white/30">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Your Quiz Sessions</h2>
                <GameButton
                  onClick={onCreateNewQuiz}
                  variant="primary"
                  className="bg-green-500 hover:bg-green-600"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    New Quiz
                  </div>
                </GameButton>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map((session) => {
                  const phaseInfo = getPhaseDisplay(session.current_phase);
                  const isDeleting = deletingSession === session.id;
                  
                  return (
                    <div
                      key={session.id}
                      className="bg-white/10 hover:bg-white/15 rounded-lg p-6 border border-white/20 transition-all duration-200 hover:scale-105 hover:shadow-xl"
                    >
                      {/* Session Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-gray-300">Session</div>
                        <div className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded font-mono">
                          {session.id.slice(-8).toUpperCase()}
                        </div>
                      </div>

                      {/* Session Info */}
                      <div className="mb-4">
                        <div className="text-lg font-bold text-white mb-2">
                          {session.title || 'Untitled Quiz'}
                        </div>
                        <div className="text-sm text-gray-400 mb-3">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          {formatDate(session.created_at)}
                        </div>
                        
                        {/* Status Badge */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${phaseInfo.color}`}>
                          <span>{phaseInfo.icon}</span>
                          {phaseInfo.label}
                        </div>
                      </div>

                      {/* Session Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-black/30 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-blue-400">{session.players_count}</div>
                          <div className="text-xs text-gray-400">Players</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-green-400">{session.questions_count}</div>
                          <div className="text-xs text-gray-400">Questions</div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => openSession(session.id)}
                            className="flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 px-3 py-2 rounded-lg border border-blue-400/50 transition-colors text-sm"
                          >
                            <Play className="w-4 h-4" />
                            Host
                          </button>
                          
                          <button
                            // Disable analytics button if the quiz is not completed
                            disabled={session.current_phase !== 'final' && session.current_phase !== 'podium'}
                            onClick={() => openAnalytics(session.id)}
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
                              session.current_phase === 'final' || session.current_phase === 'podium'
                                ? 'bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border-purple-400/50'
                                : 'bg-gray-500/20 text-gray-400 border-gray-400/50 cursor-not-allowed opacity-50'
                            }`}
                          >
                            <BarChart3 className="w-4 h-4" />
                            Analytics 
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => openJumbotron(session.id)}
                            className="flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/40 text-green-300 px-3 py-2 rounded-lg border border-green-400/50 transition-colors text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            Display
                          </button>
                          
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            disabled={isDeleting}
                            className="flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 px-3 py-2 rounded-lg border border-red-400/50 transition-colors text-sm disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <div className="w-4 h-4 border-2 border-red-300/30 border-t-red-300 rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};