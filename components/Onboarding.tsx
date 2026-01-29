
import React, { useState, useEffect } from 'react';
import { analyzePurpose } from '../services/gemini';
import { useAppContext } from '../context/AppContext';
import { 
  Loader2, Check, ArrowRight, ArrowLeft, Sparkles, Heart, Zap, Globe, 
  Briefcase, Key, ShieldCheck, Bell, Camera, Mic, Settings, 
  Languages, Type as TypeIcon, Moon, Sun, Info, Target, Users, Anchor
} from 'lucide-react';
import { translations } from '../services/translations';
import { OnboardingAnswers, AppTheme } from '../types';

const PASSIONS_LIST = [
  'Música', 'Cine y Series', 'Lectura', 'Escritura Creativa', 'Pintura y Dibujo', 
  'Fotografía', 'Viajes y Aventura', 'Cocina y Gastronomía', 'Deportes y Fitness', 
  'Naturaleza y Trekking', 'Tecnología y Gadgets', 'Videojuegos', 'Baile y Danza', 
  'Voluntariado', 'Jardinería', 'Cuidado Animal', 'Meditación y Yoga', 
  'Astronomía', 'Historia', 'Moda y Diseño'
];

const Onboarding = () => {
  const { completeOnboarding, settings, updateSettings } = useAppContext();
  const t = translations[settings.language].onboarding;
  const [currentStep, setCurrentStep] = useState(0); // 0: Misión, 1: PERMA, 2-6: Formulario, 7: Ajustes, 8: Permisos
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    interests: [],
    otherInterests: '',
    skills: [],
    otherSkills: '',
    worldNeeds: [],
    otherWorldNeeds: '',
    professionalVision: '',
    personalValues: '',
  });

  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
  });

  const totalFormSteps = 5;
  const onboardingStep = currentStep - 2; // Offset para el formulario

  const toggleSelection = (field: 'skills' | 'worldNeeds' | 'interests', value: string) => {
    setAnswers(prev => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(i => i !== value) };
      }
      return { ...prev, [field]: [...current, value] };
    });
  };

  const handleRequestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissions({ camera: true, microphone: true });
      // Ir al siguiente paso automáticamente tras éxito
      setCurrentStep(9);
    } catch (err) {
      alert("Necesitamos los permisos para que la IA pueda escucharte en el Coach de Voz.");
    }
  };

  const isFormValid = () => {
    switch(onboardingStep) {
      case 0: return answers.interests.length > 0 || answers.otherInterests.trim().length > 3;
      case 1: return answers.skills.length > 0 || answers.otherSkills.trim().length > 3;
      case 2: return answers.worldNeeds.length > 0 || answers.otherWorldNeeds.trim().length > 3;
      case 3: return answers.professionalVision.length > 5;
      case 4: return answers.personalValues.length > 3;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await analyzePurpose(answers, settings.language);
      completeOnboarding(result.detailedAnalysis, result.shortStatement);
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Error en el análisis de IA.");
    } finally {
      setLoading(false);
    }
  };

  // Renderizado de pasos
  const renderStep = () => {
    switch(currentStep) {
      case 0: // BIENVENIDA Y MISIÓN
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 text-center">
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-primary-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-primary-500/40 rotate-3">
                <Anchor size={48} />
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-black text-gray-900 dark:text-white leading-tight italic uppercase tracking-tighter">Bienvenido a VORTH</h1>
              <p className="text-xl text-gray-500 dark:text-gray-400 font-medium">Nuestra misión es ayudarte a encontrar <span className="text-primary-600 font-bold">sentido</span> en cada día mediante la reflexión consciente y el modelo PERMA.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 pt-4">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-2xl text-emerald-600"><Target /></div>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 text-left">Descubre qué te motiva realmente.</p>
              </div>
              <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-600"><Sparkles /></div>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 text-left">IA diseñada para potenciar tu bienestar integral.</p>
              </div>
            </div>
          </div>
        );

      case 1: // MODELO PERMA
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">El Modelo PERMA</h2>
              <p className="text-gray-500 text-sm font-medium">La ciencia detrás de tu florecimiento personal</p>
            </div>
            <div className="space-y-3">
              {[
                { l: 'P', n: 'Positive Emotions', d: 'Sentirse bien y cultivar optimismo.', c: 'text-pink-500', b: 'bg-pink-50 dark:bg-pink-900/10' },
                { l: 'E', n: 'Engagement', d: 'Fluir con tus actividades diarias.', c: 'text-orange-500', b: 'bg-orange-50 dark:bg-orange-900/10' },
                { l: 'R', n: 'Relationships', d: 'Conexiones auténticas y nutritivas.', c: 'text-blue-500', b: 'bg-blue-50 dark:bg-blue-900/10' },
                { l: 'M', n: 'Meaning', d: 'Servir a algo más grande que uno mismo.', c: 'text-purple-500', b: 'bg-purple-50 dark:bg-purple-900/10' },
                { l: 'A', n: 'Accomplishment', d: 'Sentido de logro y competencia.', c: 'text-emerald-500', b: 'bg-emerald-50 dark:bg-emerald-900/10' },
              ].map(item => (
                <div key={item.l} className={`${item.b} p-4 rounded-2xl flex items-center gap-4 border border-transparent hover:border-white/20 transition-all`}>
                  <span className={`text-3xl font-black ${item.c}`}>{item.l}</span>
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-widest text-gray-700 dark:text-gray-200">{item.n}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 2: case 3: case 4: case 5: case 6: // FORMULARIO IKIGAI
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-h-[70vh] overflow-y-auto no-scrollbar pb-4 px-1">
             <div className="flex items-center gap-3 sticky top-0 bg-gray-50 dark:bg-gray-950 py-2 z-10">
               <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  {onboardingStep === 0 && <Heart size={20} />}
                  {onboardingStep === 1 && <Zap size={20} />}
                  {onboardingStep === 2 && <Globe size={20} />}
                  {onboardingStep === 3 && <Briefcase size={20} />}
                  {onboardingStep === 4 && <Key size={20} />}
               </div>
               <h3 className="text-xl font-black uppercase italic tracking-tighter dark:text-white">
                 {onboardingStep === 0 && "Tus Pasiones"}
                 {onboardingStep === 1 && "Tus Talentos"}
                 {onboardingStep === 2 && "¿QUE CAUSAS ME MUEVEN?"}
                 {onboardingStep === 3 && "Tu Visión"}
                 {onboardingStep === 4 && "Tus Valores"}
               </h3>
             </div>

             {onboardingStep === 0 && (
               <div className="space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {PASSIONS_LIST.map(opt => (
                     <button
                       key={opt}
                       onClick={() => toggleSelection('interests', opt)}
                       className={`p-4 rounded-2xl border text-left font-bold transition-all ${answers.interests.includes(opt) ? 'bg-primary-600 text-white border-primary-600 shadow-lg scale-[1.02]' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500'}`}
                     >
                       {opt}
                     </button>
                   ))}
                 </div>
                 <div className="space-y-2">
                   <p className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Otra pasión no mencionada:</p>
                   <textarea
                     className="w-full p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-white h-32 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all shadow-sm font-medium"
                     placeholder="Escribe alguna otra pasión aquí..."
                     value={answers.otherInterests}
                     onChange={e => setAnswers({...answers, otherInterests: e.target.value})}
                   />
                 </div>
               </div>
             )}

             {onboardingStep === 1 && (
               <div className="space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {['Creatividad', 'Liderazgo', 'Empatía', 'Análisis', 'Comunicación', 'Organización'].map(opt => (
                     <button
                       key={opt}
                       onClick={() => toggleSelection('skills', opt)}
                       className={`p-4 rounded-2xl border text-left font-bold transition-all ${answers.skills.includes(opt) ? 'bg-primary-600 text-white border-primary-600 shadow-lg scale-[1.02]' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500'}`}
                     >
                       {opt}
                     </button>
                   ))}
                 </div>
                 <div className="space-y-2">
                   <p className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Otro talento no mencionado:</p>
                   <textarea
                     className="w-full p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-white h-32 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all shadow-sm font-medium"
                     placeholder="Escribe algún otro talento aquí..."
                     value={answers.otherSkills}
                     onChange={e => setAnswers({...answers, otherSkills: e.target.value})}
                   />
                 </div>
               </div>
             )}

             {onboardingStep === 2 && (
               <div className="space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {['Educación', 'Salud Mental', 'Medio Ambiente', 'Justicia Social', 'Tecnología'].map(opt => (
                     <button
                       key={opt}
                       onClick={() => toggleSelection('worldNeeds', opt)}
                       className={`p-4 rounded-2xl border text-left font-bold transition-all ${answers.worldNeeds.includes(opt) ? 'bg-secondary-500 text-white border-secondary-500 shadow-lg scale-[1.02]' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500'}`}
                     >
                       {opt}
                     </button>
                   ))}
                 </div>
                 <div className="space-y-2">
                   <p className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Otra causa no mencionada:</p>
                   <textarea
                     className="w-full p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-white h-32 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all shadow-sm font-medium"
                     placeholder="Escribe alguna otra causa aquí..."
                     value={answers.otherWorldNeeds}
                     onChange={e => setAnswers({...answers, otherWorldNeeds: e.target.value})}
                   />
                 </div>
               </div>
             )}

             {onboardingStep === 3 && (
               <textarea
                 className="w-full p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-white h-48 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all shadow-sm font-medium"
                 placeholder="¿Cómo definirías tu vida ideal?"
                 value={answers.professionalVision}
                 onChange={e => setAnswers({...answers, professionalVision: e.target.value})}
               />
             )}

             {onboardingStep === 4 && (
               <textarea
                 className="w-full p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-white h-48 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all shadow-sm font-medium"
                 placeholder="Tres palabras que definan tu brújula moral..."
                 value={answers.personalValues}
                 onChange={e => setAnswers({...answers, personalValues: e.target.value})}
               />
             )}
          </div>
        );

      case 7: // AJUSTES Y PREFERENCIAS
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-8 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter dark:text-white">Personalización</h2>
              <p className="text-gray-500 text-sm font-medium">VORTH se adapta a tu estilo</p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl"><Moon size={18} /></div>
                  <span className="font-bold dark:text-white">Modo Oscuro</span>
                </div>
                <button 
                  onClick={() => updateSettings({ theme: settings.theme === AppTheme.DARK ? AppTheme.LIGHT : AppTheme.DARK })}
                  className={`w-14 h-8 rounded-full p-1 transition-colors ${settings.theme === AppTheme.DARK ? 'bg-primary-600' : 'bg-gray-200'}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${settings.theme === AppTheme.DARK ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl"><TypeIcon size={18} /></div>
                  <span className="font-bold dark:text-white">Tamaño de Texto</span>
                </div>
                <div className="flex gap-2">
                  {['small', 'medium', 'large'].map(sz => (
                    <button 
                      key={sz}
                      onClick={() => updateSettings({ fontSize: sz as any })}
                      className={`flex-1 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest border transition-all ${settings.fontSize === sz ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-transparent'}`}
                    >
                      {sz === 'small' ? 'A' : sz === 'medium' ? 'AA' : 'AAA'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 8: // PERMISOS
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 text-center">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-3xl flex items-center justify-center text-amber-600 mx-auto">
              <ShieldCheck size={40} />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter dark:text-white">Seguridad y Acceso</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium px-4">Para una experiencia completa, necesitamos acceso a algunas funciones de tu dispositivo. Solo usamos estos datos localmente para tus reflexiones.</p>
            </div>
            
            <div className="space-y-4">
               <div className="flex items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600"><Camera /></div>
                  <div className="text-left flex-1">
                    <h4 className="font-bold dark:text-white">Cámara</h4>
                    <p className="text-xs text-gray-500">Para capturar momentos que te den sentido.</p>
                  </div>
               </div>
               <div className="flex items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600"><Mic /></div>
                  <div className="text-left flex-1">
                    <h4 className="font-bold dark:text-white">Micrófono</h4>
                    <p className="text-xs text-gray-500">Para hablar con tu coach de IA en vivo.</p>
                  </div>
               </div>
            </div>

            <button 
              onClick={handleRequestPermissions}
              className="w-full py-5 bg-primary-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-primary-500/30 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Conceder Accesos
            </button>
          </div>
        );

      case 9: // FINALIZANDO
        return (
          <div className="flex flex-col items-center justify-center space-y-8 py-10 animate-in zoom-in duration-500 text-center">
            <div className="relative">
              <Loader2 className="w-24 h-24 text-primary-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="text-secondary-500 w-8 h-8" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter dark:text-white">Generando tu Propósito</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Nuestra IA está analizando tu esencia...</p>
            </div>
            {/* El botón se activa automáticamente tras el submit exitoso */}
            {!loading && (
              <button 
                onClick={handleSubmit}
                className="px-10 py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-500/30"
              >
                Comenzar Mi Vida Consciente
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col p-6 max-w-xl mx-auto overflow-hidden">
      {/* Header con barra de progreso discreta */}
      {currentStep < 9 && (
        <div className="pt-8 mb-8 space-y-4">
          <div className="flex justify-between items-center px-1">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Onboarding Activo</span>
             </div>
             <span className="text-[10px] font-black text-primary-600">{Math.round((currentStep / 8) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1 overflow-hidden">
            <div className="bg-primary-600 h-full transition-all duration-500" style={{ width: `${(currentStep / 8) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Contenedor principal del paso */}
      <div className="flex-1 flex flex-col justify-center">
        {renderStep()}
      </div>

      {/* Navegación inferior */}
      {currentStep < 8 && (
        <div className="mt-8 flex items-center justify-between pb-10">
          <button 
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className={`p-4 rounded-2xl flex items-center gap-2 font-bold transition-all ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <ArrowLeft size={20} />
            <span>Atrás</span>
          </button>
          
          <button 
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={currentStep >= 2 && currentStep <= 6 && !isFormValid()}
            className="flex items-center gap-3 px-8 py-5 bg-primary-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-primary-500/20 hover:scale-[1.05] active:scale-95 disabled:opacity-30 disabled:grayscale transition-all"
          >
            <span>{currentStep === 7 ? "Ver Permisos" : currentStep === 1 ? "Empezar Test" : "Continuar"}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* Footer minimalista */}
      <div className="text-center pb-6">
        <p className="text-[9px] font-black uppercase tracking-widest text-gray-300 dark:text-gray-700">VORTH AI Core v2.5 • WaldenDos</p>
      </div>
    </div>
  );
};

export default Onboarding;
