
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Target, CheckCircle2, XCircle, BrainCircuit, Sparkles, Calendar, Briefcase, User, Home as HomeIcon, Loader2, ArrowRight, BarChart2, ChevronDown, ChevronUp, Lightbulb, X, Quote, Clock, Zap } from 'lucide-react';
import { generateGoalSuggestions, generatePermaTips } from '../services/gemini';
import { Goal, GoalDomain } from '../types';
import { translations } from '../services/translations';

const Goals = () => {
  const { user, entries, goals, addGoalSuggestions, approveGoal, discardGoal, toggleGoalCompletion, settings } = useAppContext();
  const t = translations[settings.language].goals;
  const [activeTab, setActiveTab] = useState<'planner' | 'archive'>('planner');
  const [isLoading, setIsLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  // Celebration state for completed goals
  const [celebratingGoalId, setCelebratingGoalId] = useState<string | null>(null);

  // AI Tips State
  const [isGettingTips, setIsGettingTips] = useState(false);
  const [aiTips, setAiTips] = useState<{ tips: string[], motivation: string } | null>(null);
  const [showTipsPanel, setShowTipsPanel] = useState(false);

  const suggestedGoals = goals.filter(g => g.status === 'suggested');
  const activeGoals = goals.filter(g => g.status === 'active' || g.status === 'completed');

  const handleToggleGoal = (goal: Goal) => {
    const becomingCompleted = goal.status !== 'completed';
    toggleGoalCompletion(goal.id);
    
    if (becomingCompleted) {
      setCelebratingGoalId(goal.id);
      setTimeout(() => setCelebratingGoalId(null), 1000);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const suggestions = await generateGoalSuggestions(user, entries, settings.language);
        addGoalSuggestions(suggestions);
    } catch (e) {
        console.error("Error generating goals", e);
        alert("Error al generar metas.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleGetTips = async () => {
    if (!user) return;
    setIsGettingTips(true);
    setShowTipsPanel(true);
    try {
        const result = await generatePermaTips(user.purposeAnalysis || '', activeGoals.filter(g => g.status === 'active'), settings.language);
        setAiTips(result);
    } catch (e) {
        console.error("Error getting tips", e);
        setShowTipsPanel(false);
        alert("Error de conexión.");
    } finally {
        setIsGettingTips(false);
    }
  };

  const DomainIcon = ({ domain }: { domain: GoalDomain }) => {
    switch (domain) {
        case 'personal': return <User size={16} />;
        case 'family': return <HomeIcon size={16} />;
        case 'professional': return <Briefcase size={16} />;
        default: return <Target size={16} />;
    }
  };

  const DomainBadge = ({ domain }: { domain: GoalDomain }) => {
    const styles = {
        personal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        family: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        professional: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
    };
    const label = domain === 'family' ? t.family : domain === 'professional' ? t.professional : t.personal;
    return (
        <span className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${styles[domain]}`}>
            <DomainIcon domain={domain} />
            <span>{label}</span>
        </span>
    );
  };

  const TermBadge = ({ term }: { term: string }) => {
      const isShort = term === 'short-term';
      return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isShort ? 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-900/20' : 'border-indigo-200 text-indigo-700 bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:bg-indigo-900/20'}`}>
              {isShort ? t.shortTerm : t.longTerm}
          </span>
      );
  };

  // --- Statistics Logic ---
  const totalGoals = activeGoals.length;
  const completedGoals = activeGoals.filter(g => g.status === 'completed').length;
  const overallProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const getStatsByTerm = (term: 'short-term' | 'long-term') => {
    const termGoals = activeGoals.filter(g => g.term === term);
    const completed = termGoals.filter(g => g.status === 'completed');
    const percent = termGoals.length > 0 ? Math.round((completed.length / termGoals.length) * 100) : 0;
    
    // Frecuencia: Promedio de días para completar metas de este plazo
    let frequencyDays = 0;
    if (completed.length > 0) {
      const totalDays = completed.reduce((acc, g) => {
        const completionDate = Date.now(); // Simulamos fecha de completado si no existe en el tipo
        return acc + Math.max(1, Math.round((completionDate - g.createdAt) / (1000 * 60 * 60 * 24)));
      }, 0);
      frequencyDays = Math.round(totalDays / completed.length);
    }

    return { total: termGoals.length, completed: completed.length, percent, frequencyDays };
  };

  const shortTermStats = getStatsByTerm('short-term');
  const longTermStats = getStatsByTerm('long-term');

  const getDomainStats = (domain: GoalDomain) => {
      const domainGoals = activeGoals.filter(g => g.domain === domain);
      const completed = domainGoals.filter(g => g.status === 'completed').length;
      return {
          total: domainGoals.length,
          completed,
          percent: domainGoals.length > 0 ? Math.round((completed / domainGoals.length) * 100) : 0
      };
  };

  const CircularProgress = ({ percent, color, label }: { percent: number, color: string, label: string }) => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    return (
        <div className="flex flex-col items-center">
            <div className="relative w-12 h-12 mb-1">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
                    <circle cx="20" cy="20" r={radius} fill="none" stroke="currentColor" strokeWidth="4" 
                        strokeDasharray={circumference} 
                        strokeDashoffset={offset} 
                        strokeLinecap="round"
                        className={`${color} transition-all duration-1000 ease-out`}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold dark:text-white">
                    {percent}%
                </div>
            </div>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-tighter">{label}</span>
        </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 relative">
      <style>{`
        @keyframes confetti-pop {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti-pop 0.8s cubic-bezier(0.1, 0.5, 0.1, 1) forwards;
        }
        .celebrate-bounce {
          animation: celebrate-bounce 0.4s ease-in-out;
        }
        @keyframes celebrate-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
        {activeTab === 'planner' && (
             <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-70"
            >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                <span>{t.iaButton}</span>
             </button>
        )}
      </div>

      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6">
          <button 
            onClick={() => setActiveTab('planner')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'planner' ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {t.discover}
          </button>
          <button 
            onClick={() => setActiveTab('archive')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'archive' ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {t.myProgress} ({activeGoals.length})
          </button>
      </div>

      {showTipsPanel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-yellow-100 dark:border-yellow-900/20">
                  <div className="bg-yellow-400 p-4 flex justify-between items-center text-white">
                      <div className="flex items-center space-x-2">
                          <Lightbulb size={24} className="fill-white" />
                          <h3 className="font-bold">{t.tipsTitle}</h3>
                      </div>
                      <button onClick={() => setShowTipsPanel(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6">
                      {isGettingTips ? (
                          <div className="flex flex-col items-center py-8">
                              <Loader2 size={32} className="text-yellow-500 animate-spin mb-3" />
                              <p className="text-sm text-gray-500 dark:text-gray-400 italic">{t.consulting}</p>
                          </div>
                      ) : aiTips ? (
                          <div className="space-y-6">
                              <div className="space-y-3">
                                  {aiTips.tips.map((tip, i) => (
                                      <div key={i} className="flex items-start space-x-3 group">
                                          <div className="mt-1 w-2 h-2 rounded-full bg-yellow-400 group-hover:scale-125 transition-transform" />
                                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{tip}</p>
                                      </div>
                                  ))}
                              </div>
                              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                  <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400 mb-2">
                                      <Quote size={16} className="fill-current" />
                                      <span className="text-xs font-bold uppercase tracking-wider">{t.mantra}</span>
                                  </div>
                                  <p className="text-lg font-medium text-gray-900 dark:text-white italic leading-tight">
                                      "{aiTips.motivation}"
                                  </p>
                              </div>
                              <button 
                                onClick={() => setShowTipsPanel(false)}
                                className="w-full py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
                              >
                                {t.gotIt}
                              </button>
                          </div>
                      ) : null}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'planner' && (
        <div className="space-y-4">
            {suggestedGoals.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <Sparkles className="mx-auto h-12 w-12 text-yellow-400 mb-3" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t.emptyPlanner}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto mb-6">
                        {t.emptyPlannerSub}
                    </p>
                    <button onClick={handleGenerate} className="text-primary-600 font-bold hover:underline">
                        {t.startNow}
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 ml-1">Sugerencias de IA para ti:</p>
                    {suggestedGoals.map(goal => (
                        <div key={goal.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 animate-in slide-in-from-bottom-2">
                            <div className="flex justify-between items-start mb-2">
                                <DomainBadge domain={goal.domain} />
                                <TermBadge term={goal.term} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{goal.title}</h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{goal.description}</p>
                            <div className="flex space-x-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <button 
                                    onClick={() => approveGoal(goal.id)}
                                    className="flex-1 flex items-center justify-center space-x-2 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-lg font-bold text-sm hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                                >
                                    <CheckCircle2 size={16} />
                                    <span>Aceptar</span>
                                </button>
                                <button 
                                    onClick={() => discardGoal(goal.id)}
                                    className="px-4 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <XCircle size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}

      {activeTab === 'archive' && (
        <div className="pb-20">
            {activeGoals.length > 0 && (
                <div className="mb-6">
                    <button 
                        onClick={() => setShowStats(!showStats)}
                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400">
                                <BarChart2 size={20} />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-gray-900 dark:text-white text-sm">{t.statsTitle}</h3>
                                <p className="text-xs text-gray-500">
                                    {completedGoals} {t.of} {totalGoals} {t.completed} ({overallProgress}%)
                                </p>
                            </div>
                        </div>
                        {showStats ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </button>

                    {showStats && (
                        <div className="mt-2 p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2 fade-in space-y-8">
                            {/* Progreso General */}
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs mb-1 font-black uppercase tracking-widest text-primary-600">
                                    <span>Progreso General</span>
                                    <span>{overallProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                                    <div className="bg-primary-600 h-full rounded-full transition-all duration-1000 ease-out shadow-sm" style={{ width: `${overallProgress}%` }}></div>
                                </div>
                            </div>

                            {/* Metas a Corto Plazo */}
                            <div className="space-y-4 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap size={16} className="text-emerald-500" />
                                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-800 dark:text-gray-100">Metas a Corto Plazo</h4>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                                        <span>Cumplimiento</span>
                                        <span>{shortTermStats.percent}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${shortTermStats.percent}%` }}></div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                        <Clock size={14} />
                                        <span className="text-xs font-bold">Frecuencia de cumplimiento</span>
                                    </div>
                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{shortTermStats.frequencyDays} días</span>
                                </div>
                            </div>

                            {/* Metas a Largo Plazo */}
                            <div className="space-y-4 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target size={16} className="text-indigo-500" />
                                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-800 dark:text-gray-100">Metas a Largo Plazo</h4>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                                        <span>Cumplimiento</span>
                                        <span>{longTermStats.percent}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                        <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${longTermStats.percent}%` }}></div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                        <Clock size={14} />
                                        <span className="text-xs font-bold">Frecuencia de cumplimiento</span>
                                    </div>
                                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{longTermStats.frequencyDays} días</span>
                                </div>
                            </div>

                            {/* Desglose por dominios (Circular) */}
                            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-50 dark:border-gray-700/50">
                                <CircularProgress 
                                    label={t.personal} 
                                    percent={getDomainStats('personal').percent} 
                                    color="text-purple-500"
                                />
                                <CircularProgress 
                                    label={t.family} 
                                    percent={getDomainStats('family').percent} 
                                    color="text-blue-500"
                                />
                                <CircularProgress 
                                    label={t.professional} 
                                    percent={getDomainStats('professional').percent} 
                                    color="text-orange-500"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeGoals.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <p>{t.noActiveGoals}</p>
                    <button onClick={() => setActiveTab('planner')} className="text-primary-600 font-bold hover:underline text-sm mt-2">
                        {t.discover}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {activeGoals.map(goal => (
                        <div 
                            key={goal.id} 
                            className={`group relative p-4 rounded-xl border transition-all duration-200 ${goal.status === 'completed' ? 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800 opacity-75' : 'bg-white border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700'} ${celebratingGoalId === goal.id ? 'celebrate-bounce ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-950' : ''}`}
                        >
                            {/* Confetti effect when completing */}
                            {celebratingGoalId === goal.id && (
                              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                                {[...Array(12)].map((_, i) => (
                                  <div 
                                    key={i} 
                                    className="absolute w-2 h-2 rounded-full animate-confetti"
                                    style={{
                                      backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'][i % 5],
                                      left: '24px',
                                      top: '24px',
                                      '--tx': `${(Math.random() - 0.5) * 200}px`,
                                      '--ty': `${(Math.random() - 0.5) * 200}px`
                                    } as any}
                                  />
                                ))}
                              </div>
                            )}

                            <div className="flex items-start gap-3">
                                <button 
                                    onClick={() => handleToggleGoal(goal)}
                                    className={`mt-1 flex-shrink-0 transition-all duration-300 transform ${celebratingGoalId === goal.id ? 'scale-125' : 'scale-100'} ${goal.status === 'completed' ? 'text-green-500' : 'text-gray-300 hover:text-green-500'}`}
                                >
                                    <CheckCircle2 size={24} className={goal.status === 'completed' ? 'fill-current' : ''} />
                                </button>
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <DomainBadge domain={goal.domain} />
                                        <span className="text-[10px] text-gray-400">•</span>
                                        <TermBadge term={goal.term} />
                                    </div>
                                    <h4 className={`font-bold text-gray-900 dark:text-white transition-all duration-300 ${goal.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-500' : ''}`}>
                                        {goal.title}
                                    </h4>
                                    <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 transition-all ${goal.status === 'completed' ? 'hidden' : ''}`}>
                                        {goal.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}

      <button 
        onClick={handleGetTips}
        className="fixed bottom-28 right-6 w-14 h-14 bg-yellow-400 text-white rounded-full shadow-lg shadow-yellow-400/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group border-4 border-white dark:border-gray-900"
        title="Tips"
      >
          <Lightbulb size={28} className="group-hover:fill-current" />
          <div className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-20 pointer-events-none group-hover:opacity-40" />
      </button>
    </div>
  );
};

export default Goals;
