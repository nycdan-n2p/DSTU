import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthForm } from '../components/AuthForm';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { ArrowLeft, Users, Target, Clock, TrendingUp, Award, AlertCircle, CheckCircle, XCircle, Calendar, BarChart3 } from 'lucide-react';
import { GameButton } from '../components/GameButton';

interface GameSession {
  id: string;
  created_at: string;
  current_phase: string;
  host_id: string;
}

interface Player {
  id: string;
  name: string;
  score: number;
  joined_at: string;
}

interface PlayerAnswer {
  id: string;
  player_id: string;
  question_index: number;
  answer: string;
  is_correct: boolean;
  response_time: number;
  answered_at: string;
  players: {
    name: string;
  };
}

interface CustomQuestion {
  id: string;
  prompt: string;
  correct_answer: string;
  wrong_answers: string[];
  created_at: string;
}

interface QuestionStats {
  questionIndex: number;
  prompt: string;
  totalAnswers: number;
  correctAnswers: number;
  incorrectAnswers: number;
  correctPercentage: number;
  averageResponseTime: number;
  nonResponders: string[];
}

interface SessionAnalytics {
  session: GameSession;
  players: Player[];
  answers: PlayerAnswer[];
  questions: CustomQuestion[];
  questionStats: QuestionStats[];
  overallStats: {
    totalPlayers: number;
    totalQuestions: number;
    overallCorrectRate: number;
    averageScore: number;
    completionRate: number;
  };
}

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899'];

export const AdminAnalytics: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show auth form if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">
          Loading... 📊
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setSessions(data || []);
      console.log('✅ Loaded user sessions:', data?.length);
    } catch (err) {
      console.error('❌ Error loading sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const analyzeSession = async (sessionId: string) => {
    try {
      setAnalyzing(true);
      setError(null);
      console.log('📊 Analyzing session:', sessionId);

      // Fetch session data
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Fetch players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', sessionId)
        .order('score', { ascending: false });

      if (playersError) throw playersError;

      // Fetch answers with player names
      const { data: answersData, error: answersError } = await supabase
        .from('player_answers')
        .select(`
          *,
          players!inner (
            name
          )
        `)
        .eq('session_id', sessionId)
        .order('question_index', { ascending: true });

      if (answersError) throw answersError;

      // Fetch custom questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('custom_questions')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (questionsError) throw questionsError;

      // Process analytics
      const questionStats = processQuestionStats(
        questionsData || [],
        answersData || [],
        playersData || []
      );

      const overallStats = calculateOverallStats(
        playersData || [],
        answersData || [],
        questionsData || []
      );

      const analytics: SessionAnalytics = {
        session: sessionData,
        players: playersData || [],
        answers: answersData || [],
        questions: questionsData || [],
        questionStats,
        overallStats
      };

      setAnalytics(analytics);
      console.log('✅ Analytics processed:', analytics);

    } catch (err) {
      console.error('❌ Error analyzing session:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze session');
    } finally {
      setAnalyzing(false);
    }
  };

  const processQuestionStats = (
    questions: CustomQuestion[],
    answers: PlayerAnswer[],
    players: Player[]
  ): QuestionStats[] => {
    return questions.map((question, index) => {
      const questionAnswers = answers.filter(a => a.question_index === index);
      const correctAnswers = questionAnswers.filter(a => a.is_correct);
      const incorrectAnswers = questionAnswers.filter(a => !a.is_correct);
      
      const respondedPlayerIds = questionAnswers.map(a => a.player_id);
      const nonResponders = players
        .filter(p => !respondedPlayerIds.includes(p.id))
        .map(p => p.name);

      const averageResponseTime = correctAnswers.length > 0
        ? correctAnswers.reduce((sum, a) => sum + a.response_time, 0) / correctAnswers.length
        : 0;

      return {
        questionIndex: index,
        prompt: question.prompt,
        totalAnswers: questionAnswers.length,
        correctAnswers: correctAnswers.length,
        incorrectAnswers: incorrectAnswers.length,
        correctPercentage: questionAnswers.length > 0 
          ? Math.round((correctAnswers.length / questionAnswers.length) * 100)
          : 0,
        averageResponseTime: Math.round(averageResponseTime / 1000 * 10) / 10,
        nonResponders
      };
    });
  };

  const calculateOverallStats = (
    players: Player[],
    answers: PlayerAnswer[],
    questions: CustomQuestion[]
  ) => {
    const totalPlayers = players.length;
    const totalQuestions = questions.length;
    const totalCorrectAnswers = answers.filter(a => a.is_correct).length;
    const totalAnswers = answers.length;
    const overallCorrectRate = totalAnswers > 0 
      ? Math.round((totalCorrectAnswers / totalAnswers) * 100)
      : 0;
    
    const averageScore = totalPlayers > 0
      ? Math.round(players.reduce((sum, p) => sum + (p.score || 0), 0) / totalPlayers)
      : 0;

    const expectedTotalAnswers = totalPlayers * totalQuestions;
    const completionRate = expectedTotalAnswers > 0
      ? Math.round((totalAnswers / expectedTotalAnswers) * 100)
      : 0;

    return {
      totalPlayers,
      totalQuestions,
      overallCorrectRate,
      averageScore,
      completionRate
    };
  };

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSession(sessionId);
    analyzeSession(sessionId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSessionPhaseDisplay = (phase: string) => {
    const phaseMap: { [key: string]: string } = {
      'waiting': '⏳ Waiting',
      'question': '❓ In Progress',
      'results': '📊 Showing Results',
      'final': '🏆 Completed',
      'podium': '🥇 Final Results'
    };
    return phaseMap[phase] || phase;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse">
          Loading analytics... 📊
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center p-8">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold mb-4">Analytics Error</h1>
          <p className="text-xl mb-4">{error}</p>
          <GameButton onClick={() => window.location.reload()} variant="primary">
            Refresh Page
          </GameButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-sm border-b border-white/20 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-purple-400" />
                My Quiz Analytics
              </h1>
              <p className="text-gray-300 mt-1">Analyze your quiz performance and player insights</p>
              <p className="text-gray-400 text-sm mt-1">Logged in as: {user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {!selectedSession ? (
          /* Session Selection */
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-white/30">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-400" />
              Select Your Quiz Session to Analyze
            </h2>
            
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 opacity-50">📊</div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">No Quiz Sessions Yet</h3>
                <p className="text-gray-400 mb-6">Create and run some quizzes to see analytics here!</p>
                <button
                  onClick={() => window.open('/', '_blank')}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                >
                  Create Your First Quiz
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleSessionSelect(session.id)}
                    className="bg-white/10 hover:bg-white/20 rounded-lg p-6 border border-white/20 cursor-pointer transition-all duration-200 hover:scale-105"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-gray-300">Session ID</div>
                      <div className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                        {session.id.slice(-8).toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-lg font-bold text-white mb-1">
                        {formatDate(session.created_at)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {getSessionPhaseDisplay(session.current_phase)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 font-medium">View Analytics →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Analytics Display */
          <div className="space-y-8">
            {analyzing ? (
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-12 border border-white/30 text-center">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-purple-300/30 border-t-purple-300 rounded-full animate-spin"></div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Analyzing Quiz Data...</h3>
                <p className="text-gray-300">Processing player responses and calculating statistics</p>
              </div>
            ) : analytics ? (
              <>
                {/* Session Header */}
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        Quiz Session Analysis
                      </h2>
                      <div className="flex items-center gap-4 text-gray-300">
                        <span>📅 {formatDate(analytics.session.created_at)}</span>
                        <span>🆔 {analytics.session.id.slice(-8).toUpperCase()}</span>
                        <span>{getSessionPhaseDisplay(analytics.session.current_phase)}</span>
                      </div>
                    </div>
                    <GameButton
                      onClick={() => setSelectedSession('')}
                      variant="primary"
                      className="bg-gray-500 hover:bg-gray-600"
                    >
                      ← Back to Sessions
                    </GameButton>
                  </div>
                </div>

                {/* Overall Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-6 border border-blue-400/50">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-6 h-6 text-blue-400" />
                      <span className="text-blue-300 font-medium">Total Players</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{analytics.overallStats.totalPlayers}</div>
                  </div>

                  <div className="bg-green-500/20 backdrop-blur-sm rounded-xl p-6 border border-green-400/50">
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="w-6 h-6 text-green-400" />
                      <span className="text-green-300 font-medium">Correct Rate</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{analytics.overallStats.overallCorrectRate}%</div>
                  </div>

                  <div className="bg-purple-500/20 backdrop-blur-sm rounded-xl p-6 border border-purple-400/50">
                    <div className="flex items-center gap-3 mb-2">
                      <Award className="w-6 h-6 text-purple-400" />
                      <span className="text-purple-300 font-medium">Avg Score</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{analytics.overallStats.averageScore}</div>
                  </div>

                  <div className="bg-yellow-500/20 backdrop-blur-sm rounded-xl p-6 border border-yellow-400/50">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="w-6 h-6 text-yellow-400" />
                      <span className="text-yellow-300 font-medium">Completion</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{analytics.overallStats.completionRate}%</div>
                  </div>

                  <div className="bg-orange-500/20 backdrop-blur-sm rounded-xl p-6 border border-orange-400/50">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="w-6 h-6 text-orange-400" />
                      <span className="text-orange-300 font-medium">Questions</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{analytics.overallStats.totalQuestions}</div>
                  </div>
                </div>

                {/* Question Performance Chart */}
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                    Question Performance Analysis
                  </h3>
                  
                  <div className="h-96 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.questionStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="questionIndex" 
                          stroke="#9CA3AF"
                          tickFormatter={(value) => `Q${value + 1}`}
                        />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#F9FAFB'
                          }}
                          formatter={(value, name) => [
                            `${value}${name === 'correctPercentage' ? '%' : ''}`,
                            name === 'correctPercentage' ? 'Correct Rate' : 
                            name === 'averageResponseTime' ? 'Avg Response Time (s)' : name
                          ]}
                          labelFormatter={(label) => `Question ${label + 1}`}
                        />
                        <Legend />
                        <Bar dataKey="correctPercentage" fill="#10B981" name="Correct Rate (%)" />
                        <Bar dataKey="averageResponseTime" fill="#8B5CF6" name="Avg Response Time (s)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Question Details */}
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
                  <h3 className="text-2xl font-bold text-white mb-6">Question-by-Question Breakdown</h3>
                  
                  <div className="space-y-6">
                    {analytics.questionStats.map((stat, index) => (
                      <div key={index} className="bg-white/10 rounded-lg p-6 border border-white/20">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-white mb-2">
                              Question {stat.questionIndex + 1}
                            </h4>
                            <p className="text-gray-300 mb-4">{stat.prompt}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-400">{stat.correctPercentage}%</div>
                            <div className="text-sm text-gray-400">Correct Rate</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="bg-green-500/20 rounded-lg p-4 border border-green-400/50">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              <span className="text-green-300 text-sm">Correct</span>
                            </div>
                            <div className="text-xl font-bold text-white">{stat.correctAnswers}</div>
                          </div>
                          
                          <div className="bg-red-500/20 rounded-lg p-4 border border-red-400/50">
                            <div className="flex items-center gap-2 mb-1">
                              <XCircle className="w-4 h-4 text-red-400" />
                              <span className="text-red-300 text-sm">Incorrect</span>
                            </div>
                            <div className="text-xl font-bold text-white">{stat.incorrectAnswers}</div>
                          </div>
                          
                          <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-400/50">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-4 h-4 text-yellow-400" />
                              <span className="text-yellow-300 text-sm">Avg Time</span>
                            </div>
                            <div className="text-xl font-bold text-white">{stat.averageResponseTime}s</div>
                          </div>
                          
                          <div className="bg-gray-500/20 rounded-lg p-4 border border-gray-400/50">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-300 text-sm">No Answer</span>
                            </div>
                            <div className="text-xl font-bold text-white">{stat.nonResponders.length}</div>
                          </div>
                        </div>
                        
                        {stat.nonResponders.length > 0 && (
                          <div className="mt-4 bg-gray-500/20 rounded-lg p-4 border border-gray-400/50">
                            <h5 className="text-sm font-bold text-gray-300 mb-2">Players who didn't answer:</h5>
                            <div className="flex flex-wrap gap-2">
                              {stat.nonResponders.map((name, idx) => (
                                <span key={idx} className="bg-gray-600/50 text-gray-300 px-2 py-1 rounded text-sm">
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Player Performance */}
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Users className="w-6 h-6 text-blue-400" />
                    Player Performance
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analytics.players.map((player, index) => (
                      <div key={player.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-white">{player.name}</span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-400 text-black' :
                            index === 1 ? 'bg-gray-400 text-black' :
                            index === 2 ? 'bg-orange-400 text-black' :
                            'bg-white/20 text-white'
                          }`}>
                            {index + 1}
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-green-400 mb-1">{player.score}</div>
                        <div className="text-sm text-gray-400">
                          Joined: {formatDate(player.joined_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};