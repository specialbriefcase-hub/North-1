

import React, { useState, useEffect, useMemo, PropsWithChildren } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Onboarding from './components/Onboarding';
import Journal from './components/Journal';
import ChatAssistant from './components/ChatAssistant';
import Goals from './components/Goals';
import { Home, Book, MessageCircle, Settings as SettingsIcon, LogOut, Sun, Moon, Sparkles, Loader2, Lock, User, Mail, ArrowRight, Target, CheckCircle2, ChevronRight, X, RefreshCw, BarChart3, HelpCircle, Activity, Info, AlertTriangle } from 'lucide-react';
import { AppTheme, AppSettings } from './types';
import { translations } from './services/translations';
import LiveCoach from './components/LiveCoach';

const VorthWLogo = ({ width = 48, height = 35, ...props }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 1024 731"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M0 0L215 731H360L512 299.152L664 731H809L1024 0H851L738 444.823L585 0H439L286 444.823L173 0H0Z" />
  </svg>
);

const LoginScreen = () => {
  const { login, register, settings } = useAppContext();
  const t = translations[settings.language].auth;
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password || (isRegistering && !username)) {
        setError(t.errorFields);
        return;
    }
    setIsLoading(true);
    
    let success = false;
    if (isRegistering) {
        success = await register(username, email, password);
        if (!success) setError(t.errorExists);
    } else {
        success = await login(email, password);
        if (!success) setError(t.errorCreds);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 text-primary-600 mb-4">
             <VorthWLogo width={48} height={35} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isRegistering ? t.createAccount : t.welcome}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isRegistering ? t.subtitleRegister : t.subtitleLogin}
          </p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            {isRegistering && (
                <div className="animate-in slide-in-from-top-4 fade-in">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">{t.username}</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><User size={18} /></div>
                    <input 
                      type="text" 
                      className="w-full pl-10 p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      disabled={isLoading} 
                    />
                </div>
                </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">{t.email}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Mail size={18} /></div>
                <input 
                  type="email" 
                  required 
                  className="w-full pl-10 p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  disabled={isLoading} 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">{t.password}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Lock size={18} /></div>
                <input 
                  type="password" 
                  required 
                  className="w-full pl-10 p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  disabled={isLoading} 
                />
              </div>
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-bold flex justify-center items-center space-x-2 shadow-lg disabled:opacity-70 transition-all active:scale-[0.98]">
            {isLoading ? <><Loader2 className="animate-spin" size={20} /><span>{t.processing}</span></> : <>{isRegistering ? t.register : t.login}<ArrowRight size={18} /></>}
          </button>
        </form>
        <div className="mt-6 text-center">
            <button onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="text-sm text-primary-600 font-medium hover:underline" disabled={isLoading}>
                {isRegistering ? t.hasAccount : t.noAccount}
            </button>
        </div>
      </div>
    </div>
  );
};

const Settings = ({ draftSettings, setDraftSettings }: { draftSettings: AppSettings, setDraftSettings: (s: AppSettings) => void }) => {
    const { settings, updateSettings, logout, user } = useAppContext();
    const t = translations[settings.language].settings;
    
    const updateDraft = (patch: Partial<AppSettings>) => {
        setDraftSettings({ ...draftSettings, ...patch });
    };

    return (
        <div className="p-6 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold dark:text-white">{t.title}</h2>
            </div>

            <div className="mb-8">
                <p className="text-sm text-gray-500 mb-2 uppercase font-black tracking-widest">{t.profile}</p>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
                     <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-black">
                        {user?.username.charAt(0)}
                     </div>
                     <div>
                        <p className="font-bold dark:text-white">{user?.username}</p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                     </div>
                </div>
            </div>

            <div className="mb-8">
                <p className="text-sm text-gray-500 mb-2 uppercase font-black tracking-widest">{t.appearance}</p>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="font-bold dark:text-white">{t.theme}</span>
                    <button 
                        onClick={() => updateDraft({ theme: draftSettings.theme === AppTheme.LIGHT ? AppTheme.DARK : AppTheme.LIGHT })} 
                        className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 hover:scale-110 transition-transform"
                    >
                        {draftSettings.theme === AppTheme.LIGHT ? <Sun size={20} className="text-orange-500" /> : <Moon size={20} className="text-blue-300" />}
                    </button>
                </div>
            </div>

            <div className="mb-8">
                <p className="text-sm text-gray-500 mb-2 uppercase font-black tracking-widest">{t.accessibility}</p>
                <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-2">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                        <button 
                            key={size} 
                            onClick={() => updateDraft({ fontSize: size })} 
                            className={`flex-1 py-3 rounded-xl border font-black transition-all ${draftSettings.fontSize === size ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20' : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            {size === 'small' ? 'A' : size === 'medium' ? 'AA' : 'AAA'}
                        </button>
                    ))}
                </div>
            </div>

            <button onClick={logout} className="w-full flex items-center justify-center space-x-2 p-5 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-2xl hover:bg-red-100 transition-colors font-black uppercase tracking-widest text-sm">
                <LogOut size={20} /><span>{t.logout}</span>
            </button>
            
            <div className="mt-8 text-center text-gray-400 text-xs flex items-center justify-center gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <Info size={16} className="flex-shrink-0" />
              <p className="leading-relaxed">{t.permaInfo}</p>
            </div>
        </div>
    )
}

const Dashboard = () => {
    const { user, entries, goals, toggleGoalCompletion, settings } = useAppContext();
    const t = translations[settings.language].dashboard;

    const recentGoals = goals.filter(g => g.status === 'active').slice(0, 2);

    return (
        <div className="p-4 pb-24 max-w-2xl mx-auto">
             <div className="mb-8 flex justify-between items-center">
                 <div className="flex-1">
                    <h1 className="text-3xl font-extrabold dark:text-white tracking-tight leading-tight">{t.welcome}, {user?.username}</h1>
                    <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">{t.subtitle}</p>
                 </div>
             </div>

             {user?.purposeStatement && (
                 <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 p-10 rounded-[2.5rem] shadow-2xl shadow-primary-500/30 text-white mb-10 relative overflow-hidden group">
                     <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles size={24} className="text-secondary-200" />
                            <p className="text-sm uppercase font-black tracking-[0.2em] text-primary-100">{t.purpose}</p>
                        </div>
                        <h2 className="text-3xl font-bold leading-tight mb-8">
                            {user.purposeStatement}
                        </h2>
                     </div>
                 </div>
             )}

             {recentGoals.length > 0 && (
                <div className="mb-10">
                   <div className="flex justify-between items-center mb-5 px-1">
                       <h2 className="text-2xl font-extrabold dark:text-white flex items-center gap-2">
                           <Target className="text-primary-500" size={28} />
                           {t.goalsFocus}
                        </h2>
                       <Link to="/goals" className="text-base text-primary-600 dark:text-primary-400 font-bold hover:underline">{t.viewAll}</Link>
                   </div>
                   <div className="grid grid-cols-1 gap-4">
                       {recentGoals.map(goal => (
                           <div key={goal.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-3xl flex justify-between items-center shadow-sm">
                               <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{goal.title}</h3>
                               </div>
                               <button 
                                onClick={() => toggleGoalCompletion(goal.id)} 
                                className="text-gray-200 hover:text-green-500 transition-all"
                               >
                                   <CheckCircle2 size={32} />
                                </button>
                           </div>
                       ))}
                   </div>
                </div>
             )}
             
             <LiveCoach />

             <div className="mb-4">
                 <h2 className="text-2xl font-extrabold mb-5 dark:text-white px-1">{t.recentEntries}</h2>
                 {entries.length === 0 ? (
                    <div className="text-center p-12 bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2.5rem] text-gray-400">
                        <Book size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">{t.noEntries}</p>
                    </div>
                 ) : (
                     <div className="grid grid-cols-1 gap-4">
                         {entries.slice(0, 3).map(entry => (
                             <div key={entry.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                                 <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{new Date(entry.date).toLocaleDateString()}</p>
                                 <h4 className="font-bold text-lg dark:text-white">{entry.title}</h4>
                             </div>
                         ))}
                     </div>
                 )}
             </div>
        </div>
    )
}

interface LayoutProps {
  draftSettings: AppSettings;
  setDraftSettings: (s: AppSettings) => void;
}

// Use PropsWithChildren to fix the "children" property missing error in TypeScript/React components.
const Layout = ({ children, draftSettings, setDraftSettings }: PropsWithChildren<LayoutProps>) => {
    const { settings, updateSettings } = useAppContext();
    const location = useLocation();
    const tNav = translations[settings.language].nav;
    const tSet = translations[settings.language].settings;
    
    const hasChanges = JSON.stringify(draftSettings) !== JSON.stringify(settings);
    const fontClass = { 'small': 'text-sm', 'medium': 'text-base', 'large': 'text-2xl' }[settings.fontSize];
    
    const navItems = [
        { path: '/', icon: Home, label: tNav.home },
        { path: '/journal', icon: Book, label: tNav.journal },
        { path: '/goals', icon: Target, label: tNav.goals },
        { path: '/chat', icon: MessageCircle, label: tNav.assistant },
        { path: '/settings', icon: SettingsIcon, label: tNav.settings },
    ];

    return (
        <div className={`min-h-screen ${fontClass} transition-all duration-200 bg-gray-50 dark:bg-gray-950`}>
            {location.pathname === '/settings' && hasChanges && (
                <div className="fixed top-0 left-0 right-0 z-[60] p-4 flex justify-start pointer-events-none">
                    <button 
                        onClick={() => updateSettings(draftSettings)}
                        className="pointer-events-auto bg-primary-600 text-white px-5 py-2.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center space-x-2 shadow-xl animate-in fade-in"
                    >
                        <RefreshCw size={14} />
                        <span>{tSet.updateBtn}</span>
                    </button>
                </div>
            )}

            <main className="pt-4 pb-24">{children}</main>
            
            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 shadow-2xl z-50">
                <div className="flex justify-around items-center p-5 max-w-2xl mx-auto">
                    {navItems.map(item => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link 
                                key={item.path} 
                                to={item.path} 
                                className={`flex flex-col items-center space-y-2 transition-all relative ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}
                            >
                                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[10px] font-black uppercase tracking-[0.1em]">{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}

const AppContent = () => {
  const { user, settings } = useAppContext();
  const [draftSettings, setDraftSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  if (!user) return <LoginScreen />;
  if (!user.onboardingComplete) return <Onboarding />;
  
  return (
    <HashRouter>
        {/* FIX: Explicitly wrap Routes within Layout to fulfill children prop requirement */}
        <Layout draftSettings={draftSettings} setDraftSettings={setDraftSettings}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/chat" element={<ChatAssistant />} />
            <Route path="/settings" element={<Settings draftSettings={draftSettings} setDraftSettings={setDraftSettings} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
    </HashRouter>
  );
};

const App = () => <AppProvider><AppContent /></AppProvider>;

// FIX: Add default export for App component
export default App;
