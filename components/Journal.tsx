// @google/genai defines a Blob type that can shadow the browser's global Blob.
// We specify globalThis.Blob to ensure the correct constructor is used for sharing.

import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Camera, Save, X, Loader2, Sparkles, Sun, Heart, Zap, Image as ImageIcon, Calendar as CalendarIcon, History, Camera as CameraIcon, ChevronRight, Download, Palette, Search as SearchIcon, Award, Coffee, Telescope, Flame, Share2, ChevronLeft, Quote, Mic, BookOpen, PenTool, Play, Pause, Search, Filter } from 'lucide-react';
import { JournalEntry } from '../types';
import { generateJournalPrompt } from '../services/gemini';
import LiveCoach from './LiveCoach';

const SimpleUUID = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const EMOTION_MAP = [
  { id: 'Pride', icon: <Award className="w-5 h-5" />, label: 'Orgullo', color: '#8b5cf6' },
  { id: 'Amusement', icon: <Palette className="w-5 h-5" />, label: 'Diversión', color: '#ec4899' },
  { id: 'Inspiration', icon: <Zap className="w-5 h-5" />, label: 'Inspiración', color: '#f43f5e' },
  { id: 'Awe', icon: <Telescope className="w-5 h-5" />, label: 'Asombro', color: '#6366f1' },
  { id: 'Love', icon: <Heart className="w-5 h-5" />, label: 'Amor', color: '#ff2e63' },
  { id: 'Sadness', icon: <Flame className="w-5 h-5 rotate-180" />, label: 'Tristeza', color: '#64748b' },
  { id: 'Anger', icon: <Flame className="w-5 h-5" />, label: 'Enojo', color: '#ff4d4d' },
  { id: 'Neutral', icon: <Coffee className="w-5 h-5" />, label: 'Neutral', color: '#94a3b8' },
  { id: 'Joy', icon: <Sun className="w-5 h-5" />, label: 'Alegría', color: '#fbbf24' },
  { id: 'Gratitude', icon: <Heart className="w-5 h-5" />, label: 'Gratitud', color: '#f472b6' },
  { id: 'Serenity', icon: <Coffee size={18} />, label: 'Serenidad', color: '#38bdf8' },
  { id: 'Interest', icon: <SearchIcon className="w-5 h-5" />, label: 'Interés', color: '#f59e0b' },
  { id: 'Hope', icon: <Zap className="w-5 h-5" />, label: 'Esperanza', color: '#10b981' }
];

const getEmotionConfig = (id: string) => EMOTION_MAP.find(e => e.id === id) || EMOTION_MAP[7];

const VoicePlayer = ({ src }: { src: string }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (audioRef.current) {
      if (playing) audioRef.current.pause();
      else audioRef.current.play();
      setPlaying(!playing);
    }
  };

  return (
    <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-2xl flex items-center gap-4 border border-primary-100 dark:border-primary-800">
      <button onClick={toggle} className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all">
        {playing ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
      </button>
      <div className="flex-1">
        <p className="text-[10px] font-black uppercase text-primary-600 dark:text-primary-400 tracking-widest mb-1">Grabación de Voz IA</p>
        <div className="h-1.5 w-full bg-primary-200 dark:bg-primary-800 rounded-full overflow-hidden">
          <div className={`h-full bg-primary-600 ${playing ? 'animate-pulse' : ''}`} style={{ width: playing ? '100%' : '0%', transition: 'width 30s linear' }} />
        </div>
      </div>
      <audio ref={audioRef} src={src} onEnded={() => setPlaying(false)} className="hidden" />
    </div>
  );
};

const Journal = () => {
  const { addEntry, user, entries, settings } = useAppContext();
  const [activeView, setActiveView] = useState<'selection' | 'write' | 'ai' | 'archive'>('selection');
  const [activeTab, setActiveTab] = useState<'personal' | 'family' | 'professional'>('personal');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryTitle, setEntryTitle] = useState('');
  const [form, setForm] = useState({ personal: '', family: '', professional: '' });
  const [images, setImages] = useState<string[]>([]);
  const [voiceBase64, setVoiceBase64] = useState<string | null>(null);
  
  const [mainEmotion, setMainEmotion] = useState<string>('Inspiration');
  const [secondaryEmotions, setSecondaryEmotions] = useState<Record<string, number>>({
    'Gratitude': 5,
    'Serenity': 3
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [selectedEntryDetail, setSelectedEntryDetail] = useState<JournalEntry | null>(null);
  
  // Archivo filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmotion, setFilterEmotion] = useState<string | null>(null);

  // States para el catálogo de inspiración
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [promptOptions, setPromptOptions] = useState<string[]>([]);
  const [showPromptCatalog, setShowPromptCatalog] = useState(false);

  const [fullscreenPhotoIndex, setFullscreenPhotoIndex] = useState<number | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraOpen) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(s => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => {
          console.error("Camera error:", err);
          setIsCameraOpen(false);
        });
    }
    return () => stream?.getTracks().forEach(t => t.stop());
  }, [isCameraOpen]);

  const capturePhoto = () => {
    if (videoRef.current) {
      setIsFlashing(true);
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setImages(prev => [...prev, canvas.toDataURL('image/jpeg')]);
        setTimeout(() => {
          setIsFlashing(false);
          setIsCameraOpen(false);
        }, 150);
      }
    }
  };

  const toggleSecondaryEmotion = (id: string) => {
    setSecondaryEmotions(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = 5;
      return next;
    });
  };

  const handleSave = async (isAI: boolean = false) => {
    const titleToUse = entryTitle.trim() || (isAI ? `Sesión Vocal ${new Date().toLocaleTimeString()}` : "Entrada sin título");
    setIsSaving(true);
    try {
      const emotionalProfile: Record<string, number> = { [mainEmotion]: 10 };
      Object.entries(secondaryEmotions).forEach(([id, val]) => {
        emotionalProfile[id] = val as number;
      });

      const entry: JournalEntry = {
        id: SimpleUUID(),
        title: titleToUse,
        date: new Date(selectedDate).toISOString(),
        timestamp: new Date(selectedDate).getTime(),
        personal: form.personal,
        family: form.family,
        professional: form.professional,
        images: images,
        voiceRecording: voiceBase64 || undefined,
        sentiment: mainEmotion,
        emotionalProfile
      };

      addEntry(entry);
      setIsSaved(true);
      setTimeout(() => {
        setForm({ personal: '', family: '', professional: '' });
        setEntryTitle('');
        setImages([]);
        setVoiceBase64(null);
        setIsSaved(false);
        setActiveView('archive');
      }, 2000);
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartRef.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null || fullscreenPhotoIndex === null || !selectedEntryDetail) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStartRef.current - touchEnd;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && fullscreenPhotoIndex < selectedEntryDetail.images.length - 1) {
        setFullscreenPhotoIndex(fullscreenPhotoIndex + 1);
      } else if (diff < 0 && fullscreenPhotoIndex > 0) {
        setFullscreenPhotoIndex(fullscreenPhotoIndex - 1);
      }
    }
    touchStartRef.current = null;
  };

  const handleDownload = (imgUrl: string) => {
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `vorth-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fixed handleShare to use globalThis.Blob and globalThis.File to ensure browser types are used instead of shadowed ones from @google/genai.
  const handleShare = async (imgUrl: string) => {
    if (navigator.share) {
      try {
        const response = await fetch(imgUrl);
        const blobData = await response.blob();
        // Use 'any' to avoid type conflicts with shadowed Blob types and unknown cast issues.
        // This ensures the browser's native Blob is correctly passed to the File constructor.
        const file = new (globalThis as any).File([blobData as any], 'emotion.jpg', { type: 'image/jpeg' });
        await (navigator as any).share({
          files: [file],
          title: 'VORTH: Mi momento emocional',
          text: 'Te comparto un momento de mi diario emocional.'
        });
      } catch (err) { console.error("Error al compartir:", err); }
    } else {
      alert("Compartir no disponible en este navegador.");
    }
  };

  // Filter logic for archive
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.personal.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.professional.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEmotion = filterEmotion ? entry.sentiment === filterEmotion : true;
    return matchesSearch && matchesEmotion;
  });

  if (activeView === 'selection') {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-10 animate-in fade-in duration-500">
        <div className="text-center space-y-2 mt-8">
          <h1 className="text-4xl font-black dark:text-white tracking-tighter italic uppercase">Los Diarios</h1>
          <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-xs tracking-widest">Elige cómo quieres capturar tu sentido hoy</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <button 
            onClick={() => setActiveView('ai')}
            className="group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 p-10 rounded-[3rem] text-left shadow-2xl transition-all hover:scale-[1.02] active:scale-95"
          >
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
              <Mic size={120} />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="bg-white/20 backdrop-blur-md w-14 h-14 rounded-2xl flex items-center justify-center text-white">
                <Sparkles size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white leading-none uppercase italic">Diario con IA</h2>
                <p className="text-indigo-100 mt-2 font-medium">Tu Coach de Voz en Vivo te guía a través del modelo PERMA.</p>
              </div>
              <div className="flex items-center gap-2 text-white/80 font-black uppercase text-[10px] tracking-widest pt-2">
                <span>Comenzar sesión</span>
                <ChevronRight size={14} />
              </div>
            </div>
          </button>

          <button 
            onClick={() => setActiveView('write')}
            className="group relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-10 rounded-[3rem] text-left shadow-xl transition-all hover:scale-[1.02] active:scale-95"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500 text-primary-600">
              <BookOpen size={120} />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="bg-primary-50 dark:bg-gray-800 w-14 h-14 rounded-2xl flex items-center justify-center text-primary-600">
                <PenTool size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white leading-none uppercase italic">Escribe tu diario</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Captura tus momentos, pensamientos y fotos manualmente.</p>
              </div>
              <div className="flex items-center gap-2 text-primary-600 font-black uppercase text-[10px] tracking-widest pt-2">
                <span>Abrir editor</span>
                <ChevronRight size={14} />
              </div>
            </div>
          </button>
        </div>

        <button 
          onClick={() => setActiveView('archive')}
          className="w-full py-6 flex items-center justify-center gap-3 text-gray-400 font-black uppercase text-sm tracking-widest hover:text-primary-600 transition-colors"
        >
          <History size={20} />
          <span>Ver mi historial emocional</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 font-sans">
      <button 
        onClick={() => setActiveView('selection')} 
        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-primary-600 font-black uppercase text-[10px] tracking-widest transition-colors"
      >
        <ChevronLeft size={16} />
        <span>Volver a Los Diarios</span>
      </button>

      {activeView === 'ai' && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
          <LiveCoach onRecordingComplete={(base64) => setVoiceBase64(base64)} />
          
          {voiceBase64 && (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 space-y-6 animate-in zoom-in-95">
              <div className="text-center">
                 <h3 className="text-xl font-black italic uppercase tracking-tight dark:text-white">Sesión Vocal Terminada</h3>
                 <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">¿Deseas guardarla en tu historial?</p>
              </div>
              
              <VoicePlayer src={voiceBase64} />

              <div className="space-y-4">
                <input 
                  type="text" 
                  value={entryTitle} 
                  onChange={e => setEntryTitle(e.target.value)} 
                  placeholder="Título de la sesión (Opcional)" 
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
                <button 
                  onClick={() => handleSave(true)}
                  disabled={isSaving || isSaved}
                  className={`w-full py-5 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-3 transition-all ${isSaved ? 'bg-emerald-500 text-white' : 'bg-primary-600 text-white shadow-lg hover:scale-[1.02] active:scale-95'}`}
                >
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : isSaved ? '¡Guardado con éxito!' : <><Save size={18} /><span>Guardar Grabación</span></>}
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 text-center">
            <h3 className="text-lg font-black dark:text-white uppercase italic mb-4">¿Por qué usar el Coach?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              Hablar en voz alta sobre tus experiencias permite un procesamiento cognitivo diferente a la escritura. Nuestra IA está entrenada para detectar patrones de bienestar y ayudarte a encontrar sentido en el caos diario.
            </p>
          </div>
        </div>
      )}

      {activeView === 'write' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <CalendarIcon size={20} className="text-primary-500" />
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold dark:text-white focus:ring-0" />
            </div>
            <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <Palette size={20} className="text-primary-500" />
                <input type="text" value={entryTitle} onChange={e => setEntryTitle(e.target.value)} placeholder="Título del viaje..." className="flex-1 bg-transparent border-none p-0 text-sm font-bold dark:text-white focus:ring-0" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 border border-gray-100 dark:border-gray-800 shadow-2xl relative overflow-hidden group">
             {/* Animación de fondo */}
             <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-primary-400 blur-[80px] animate-pulse" />
                <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full bg-secondary-400 blur-[80px] animate-pulse delay-1000" />
             </div>

             <div className="flex flex-col items-center mb-12 relative z-10">
                <div className="flex items-center gap-2 mb-10">
                   <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary-400" />
                   <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary-600 bg-primary-50 dark:bg-primary-900/30 px-4 py-1.5 rounded-full">Alquimia Emocional</h2>
                   <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary-400" />
                </div>
                
                <div className="relative w-64 h-64 flex items-center justify-center">
                    <div 
                      className="absolute inset-0 rounded-full blur-[70px] opacity-50 animate-pulse transition-all duration-1000 scale-125"
                      style={{ backgroundColor: getEmotionConfig(mainEmotion).color }}
                    />
                    
                    {Object.entries(secondaryEmotions).map(([id, val], i) => (
                        <div 
                          key={id}
                          className="absolute rounded-full border border-white/30 transition-all duration-1000"
                          style={{
                            width: `${140 + (i + 1) * 40}px`,
                            height: `${140 + (i + 1) * 40}px`,
                            background: `radial-gradient(circle at center, ${getEmotionConfig(id).color}22 0%, transparent 80%)`,
                            backdropFilter: 'blur(4px)',
                            boxShadow: `inset 0 0 20px ${getEmotionConfig(id).color}44, 0 0 30px ${getEmotionConfig(id).color}22`,
                            animation: `spin ${15 + i * 5}s linear infinite ${i % 2 === 0 ? '' : 'reverse'}`,
                            zIndex: 10 - i,
                            transform: `scale(${0.9 + (val as number) / 50})`
                          }}
                        />
                    ))}
                    
                    <div 
                      className="w-32 h-32 rounded-full flex items-center justify-center z-20 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.4)] transition-all duration-500 group overflow-hidden relative"
                      style={{ 
                        background: `linear-gradient(135deg, ${getEmotionConfig(mainEmotion).color}ff 0%, ${getEmotionConfig(mainEmotion).color}bb 100%)`,
                        boxShadow: `0 0 50px ${getEmotionConfig(mainEmotion).color}aa, inset -10px -10px 30px rgba(0,0,0,0.3), inset 15px 15px 30px rgba(255,255,255,0.5)`
                      }}
                    >
                        <div className="absolute top-[15%] left-[20%] w-[35%] h-[20%] bg-gradient-to-b from-white/60 to-transparent rounded-full blur-[3px] -rotate-45" />
                        <div className="text-white scale-[1.6] drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)] transform group-hover:scale-[1.8] transition-transform duration-700 animate-bounce-subtle">
                           {getEmotionConfig(mainEmotion).icon}
                        </div>
                    </div>
                </div>
                <p className="mt-12 text-[10px] font-black uppercase tracking-widest text-gray-400/80 italic">Capturando tu esencia vibrante</p>
             </div>

             <div className="space-y-12 relative z-10">
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Núcleo Dominante</h3>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {EMOTION_MAP.map(e => (
                      <button 
                        key={e.id} 
                        onClick={() => setMainEmotion(e.id)} 
                        className={`group relative py-4 px-2 rounded-3xl text-[10px] font-black uppercase tracking-tighter flex flex-col items-center justify-center gap-3 transition-all duration-300 border-2 ${mainEmotion === e.id ? 'border-transparent shadow-2xl scale-110 -translate-y-1 z-20' : 'bg-gray-50/50 dark:bg-gray-800/40 border-transparent text-gray-400 hover:border-primary-200'}`}
                        style={mainEmotion === e.id ? { background: `linear-gradient(135deg, ${e.color} 0%, ${e.color}dd 100%)`, color: 'white' } : {}}
                      >
                        <span className={`${mainEmotion === e.id ? 'scale-125' : 'group-hover:scale-110'} transition-transform duration-300`}>{e.icon}</span>
                        <span className="opacity-90">{e.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Matices Secundarios</h3>
                   <div className="flex flex-wrap gap-2.5 bg-gray-50/30 dark:bg-gray-800/20 p-4 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                    {EMOTION_MAP.filter(e => e.id !== mainEmotion).map(e => (
                      <button 
                        key={e.id} 
                        onClick={() => toggleSecondaryEmotion(e.id)} 
                        className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase border-2 transition-all duration-300 flex items-center gap-2.5 ${secondaryEmotions[e.id] ? 'text-white border-transparent shadow-lg scale-105' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'}`}
                        style={secondaryEmotions[e.id] ? { backgroundColor: e.color } : {}}
                      >
                        {e.icon}
                        <span>{e.label}</span>
                      </button>
                    ))}
                  </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {Object.entries(secondaryEmotions).map(([id, val]) => {
                        const conf = getEmotionConfig(id);
                        return (
                          <div key={id} className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl group">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 rounded-2xl" style={{ backgroundColor: `${conf.color}20`, color: conf.color }}>{conf.icon}</div>
                                  <span className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-300">{conf.label}</span>
                                </div>
                                <span className="text-[10px] font-black" style={{ color: conf.color }}>{val}/10</span>
                            </div>
                            <input 
                              type="range" min="1" max="10" value={val as number} 
                              onChange={e => setSecondaryEmotions(prev => ({ ...prev, [id]: parseInt(e.target.value) }))} 
                              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                              style={{ accentColor: conf.color }} 
                            />
                          </div>
                        )
                      })}
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Relato Diario</h3>
              <button 
                onClick={async () => {
                   if (!user) return;
                   setIsGeneratingPrompt(true);
                   try {
                     // Llama al nuevo servicio que devuelve un catálogo
                     const res = await generateJournalPrompt(user.purposeAnalysis || "", activeTab, settings.language);
                     setPromptOptions(res.options);
                     setShowPromptCatalog(true);
                   } catch (e) {
                     console.error(e);
                   } finally {
                     setIsGeneratingPrompt(false);
                   }
                }} 
                disabled={isGeneratingPrompt} 
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-2xl text-[10px] font-black uppercase transition-all shadow-sm"
              >
                  {isGeneratingPrompt ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  <span>Inspírame</span>
              </button>
            </div>

            {/* Modal/Panel de catálogo de inspiración */}
            {showPromptCatalog && (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-[2rem] border border-purple-100 dark:border-purple-800 space-y-4 animate-in slide-in-from-top-4">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-purple-600">Elige tu enfoque {activeTab}</span>
                  <button onClick={() => setShowPromptCatalog(false)} className="text-purple-400 hover:text-purple-600"><X size={16} /></button>
                </div>
                <div className="space-y-2">
                  {promptOptions.map((opt, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        setForm(prev => ({ ...prev, [activeTab]: opt + "\n\n" + prev[activeTab] }));
                        setShowPromptCatalog(false);
                      }}
                      className="w-full p-4 bg-white dark:bg-gray-800 rounded-2xl text-left text-sm font-medium text-gray-700 dark:text-gray-200 border border-transparent hover:border-purple-300 hover:shadow-md transition-all flex items-center gap-3 group"
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 flex-shrink-0 group-hover:scale-110 transition-transform">
                        {i + 1}
                      </div>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-100/50 dark:bg-gray-800/30 p-2.5 rounded-[2.5rem] border-2 border-dashed border-primary-400/40">
               <div className="flex bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm p-1.5 gap-1">
                  {(['personal', 'family', 'professional'] as const).map(tab => (
                    <button 
                      key={tab} 
                      onClick={() => setActiveTab(tab)} 
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === tab ? 'bg-primary-600 text-white shadow-lg' : 'bg-transparent text-gray-400'}`}
                    >
                      {tab === 'family' ? 'FAMILIA' : tab === 'professional' ? 'PROFESIONAL' : 'PERSONAL'}
                    </button>
                  ))}
               </div>
               <textarea 
                  value={form[activeTab]} 
                  onChange={e => setForm(prev => ({ ...prev, [activeTab]: e.target.value }))} 
                  className="w-full h-40 p-8 bg-transparent border-none text-gray-800 dark:text-gray-100 focus:ring-0 text-base leading-relaxed" 
                  placeholder="Describe tu experiencia..." 
               />
            </div>
          </div>

          <div className="bg-gray-50/30 dark:bg-gray-800/10 p-10 rounded-[3rem] border border-gray-100/50 dark:border-gray-800/50 text-center space-y-5">
             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Capturar momento</h3>
             <div className="flex justify-center gap-5">
                <button onClick={() => setIsCameraOpen(true)} className="w-16 h-16 rounded-[1.8rem] bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center text-primary-500 hover:scale-110 active:scale-95 transition-all"><CameraIcon size={28} /></button>
                <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-[1.8rem] bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center text-primary-500 hover:scale-110 active:scale-95 transition-all"><ImageIcon size={28} /></button>
                <input type="file" ref={fileInputRef} multiple accept="image/*" className="hidden" onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    Array.from(files).forEach(f => {
                      if (f instanceof globalThis.Blob) {
                        const r = new FileReader();
                        r.onloadend = () => typeof r.result === 'string' && setImages(prev => [...prev, r.result as string]);
                        r.readAsDataURL(f);
                      }
                    });
                  }
                }} />
             </div>
             {images.length > 0 && <p className="text-[10px] text-gray-400 font-bold uppercase">{images.length} fotos adjuntadas</p>}
          </div>

          <button 
            onClick={() => handleSave()} 
            disabled={isSaving || isSaved || !entryTitle} 
            className={`w-full py-6 rounded-[2.5rem] font-black text-xl flex justify-center items-center space-x-4 transition-all duration-500 ${isSaved ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 scale-[0.98]' : 'bg-primary-600 text-white shadow-[0_20px_40px_rgba(2,132,199,0.3)] hover:scale-[1.02] active:scale-95'}`}
          >
            {isSaving ? <Loader2 size={24} className="animate-spin" /> : isSaved ? <span>¡Viaje Registrado!</span> : <><Save size={24} /> <span>Grabar Viaje</span></>}
          </button>
        </div>
      ) : activeView === 'archive' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="space-y-4">
            <h2 className="text-3xl font-black dark:text-white uppercase italic">Historial de Viajes</h2>
            
            {/* SEARCH AND FILTERS */}
            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
              <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-500 transition-colors">
                  <Search size={20} />
                </div>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Busca por título o contenido..."
                  className="w-full pl-14 pr-6 py-4 bg-white dark:bg-gray-900 rounded-[1.8rem] border border-gray-100 dark:border-gray-800 shadow-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all dark:text-white font-medium"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <Filter size={12} />
                    Filtrar por emoción
                  </span>
                  {filterEmotion && (
                    <button 
                      onClick={() => setFilterEmotion(null)}
                      className="text-[9px] font-black uppercase text-primary-500 hover:text-primary-600 transition-colors"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
                <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar px-1">
                  {EMOTION_MAP.map(e => (
                    <button 
                      key={e.id}
                      onClick={() => setFilterEmotion(filterEmotion === e.id ? null : e.id)}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl border-2 transition-all font-bold text-xs uppercase ${filterEmotion === e.id ? 'text-white border-transparent shadow-lg scale-105' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500'}`}
                      style={filterEmotion === e.id ? { backgroundColor: e.color } : {}}
                    >
                      <span className={filterEmotion === e.id ? 'scale-110' : ''}>{e.icon}</span>
                      <span className="tracking-tighter">{e.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-20 animate-in fade-in">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-4">
                  <History size={40} />
                </div>
                <p className="text-gray-400 font-bold italic">
                  {entries.length === 0 ? "Aún no hay viajes registrados." : "No hay resultados para tu búsqueda."}
                </p>
                {(searchQuery || filterEmotion) && (
                  <button onClick={() => { setSearchQuery(''); setFilterEmotion(null); }} className="mt-4 text-primary-600 font-black uppercase text-[10px] tracking-widest hover:underline">Ver todo el historial</button>
                )}
              </div>
            ) : (
              filteredEntries.map(entry => (
                <div 
                  key={entry.id} 
                  onClick={() => setSelectedEntryDetail(entry)} 
                  className="bg-white dark:bg-gray-800 p-8 rounded-[2.8rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer group animate-in slide-in-from-bottom-2"
                >
                  <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-5">
                          <div className="p-5 rounded-[1.8rem] bg-gray-50 dark:bg-gray-700 text-2xl flex items-center justify-center" style={{ color: getEmotionConfig(entry.sentiment || 'Neutral').color }}>
                            {getEmotionConfig(entry.sentiment || 'Neutral').icon}
                          </div>
                          <div>
                              <p className="text-[11px] font-black uppercase text-gray-400 tracking-[0.2em] mb-1">{new Date(entry.date).toLocaleDateString()}</p>
                              <h4 className="font-black dark:text-white text-xl group-hover:text-primary-600 transition-colors leading-tight">{entry.title}</h4>
                          </div>
                      </div>
                      <ChevronRight className="text-gray-300 group-hover:text-primary-500 transition-all" size={28} />
                  </div>
                  
                  {entry.voiceRecording && (
                    <div className="mb-4" onClick={e => e.stopPropagation()}>
                       <VoicePlayer src={entry.voiceRecording} />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2.5">
                      {Object.entries(entry.emotionalProfile || {}).map(([id, val]) => (
                          <div key={id} className="flex-shrink-0 bg-gray-50 dark:bg-gray-700/50 px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center gap-2.5">
                              <span className="text-sm" style={{ color: getEmotionConfig(id).color }}>{getEmotionConfig(id).icon}</span>
                              <span className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 tracking-tighter">{getEmotionConfig(id).label}</span>
                              <span className="text-[10px] font-black text-primary-600" style={{ color: getEmotionConfig(id).color }}>{val}</span>
                          </div>
                      ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Visores y Diálogos */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-in fade-in">
          <div className="flex justify-between items-center p-6 text-white z-10">
            <h3 className="text-sm font-bold uppercase tracking-widest italic">Visor de Realidad</h3>
            <button onClick={() => setIsCameraOpen(false)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={28} /></button>
          </div>
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {isFlashing && <div className="absolute inset-0 bg-white animate-pulse" />}
          </div>
          <div className="p-16 flex justify-center items-center bg-black/50 backdrop-blur-xl">
            <button onClick={capturePhoto} className="w-28 h-28 rounded-full border-8 border-white/30 flex items-center justify-center group active:scale-90 transition-transform shadow-2xl">
              <div className="w-20 h-20 bg-white rounded-full group-hover:bg-gray-100 transition-colors" />
            </button>
          </div>
        </div>
      )}

      {selectedEntryDetail && (
        <div className="fixed inset-0 z-[700] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b dark:border-gray-800 flex justify-between items-center">
              <span className="text-[11px] font-black uppercase text-primary-500 tracking-[0.3em]">{new Date(selectedEntryDetail.date).toLocaleDateString()}</span>
              <button onClick={() => setSelectedEntryDetail(null)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all text-gray-400 hover:rotate-90"><X size={28} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
              <div className="flex items-center gap-6">
                <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-[2rem] shadow-inner text-4xl" style={{ color: getEmotionConfig(selectedEntryDetail.sentiment || 'Neutral').color }}>
                  {getEmotionConfig(selectedEntryDetail.sentiment || 'Neutral').icon}
                </div>
                <h2 className="text-4xl font-black dark:text-white leading-tight tracking-tight uppercase italic">{selectedEntryDetail.title}</h2>
              </div>

              {selectedEntryDetail.voiceRecording && (
                <VoicePlayer src={selectedEntryDetail.voiceRecording} />
              )}

              <div className="space-y-6">
                 {(['personal', 'family', 'professional'] as const).map(scope => selectedEntryDetail[scope] && (
                   <div key={scope} className="p-8 bg-gray-50/80 dark:bg-gray-800/60 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 relative group transition-all hover:shadow-lg">
                     <div className="absolute top-6 right-8 opacity-5 group-hover:opacity-15 transition-opacity"><Quote size={48} /></div>
                     <span className="text-[10px] font-black uppercase text-primary-500 mb-4 block tracking-[0.4em]">{scope === 'family' ? 'FAMILIA' : scope === 'professional' ? 'PROFESIONAL' : 'PERSONAL'}</span>
                     <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed font-bold italic tracking-tight opacity-90">"{selectedEntryDetail[scope]}"</p>
                   </div>
                 ))}
              </div>

              {selectedEntryDetail.images.length > 0 && (
                <div className="space-y-6 mt-10">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">Momentos Capturados</h3>
                  <div className="grid grid-cols-2 gap-5">
                    {selectedEntryDetail.images.map((img, i) => (
                      <div key={i} onClick={() => setFullscreenPhotoIndex(i)} className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 cursor-zoom-in group shadow-xl">
                        <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-500">
                             <ImageIcon size={32} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {fullscreenPhotoIndex !== null && selectedEntryDetail && (
        <div className="fixed inset-0 z-[800] bg-black flex flex-col animate-in fade-in" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div className="absolute top-0 left-0 right-0 p-10 flex justify-between items-center bg-gradient-to-b from-black/95 to-transparent z-[810]">
            <div className="flex flex-col">
              <span className="text-white font-black text-sm uppercase tracking-[0.3em] italic">{selectedEntryDetail.title}</span>
              <span className="text-white/90 text-[11px] font-black mt-1">{fullscreenPhotoIndex + 1} / {selectedEntryDetail.images.length}</span>
            </div>
            <button onClick={() => setFullscreenPhotoIndex(null)} className="p-5 bg-white/10 backdrop-blur-2xl rounded-full text-white hover:bg-white/20 border border-white/10 transition-all"><X size={32} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6 relative">
             <img key={fullscreenPhotoIndex} src={selectedEntryDetail.images[fullscreenPhotoIndex]} className="max-w-full max-h-[85vh] object-contain shadow-2xl animate-in zoom-in-95 duration-700" />
          </div>
          <div className="p-12 flex justify-center gap-8 bg-gradient-to-t from-black/95 to-transparent z-[810]">
            <button onClick={() => handleDownload(selectedEntryDetail.images[fullscreenPhotoIndex])} className="flex items-center gap-4 px-10 py-6 bg-white text-black rounded-[2rem] font-black uppercase text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all">
              <Download size={24} />
              <span>Guardar</span>
            </button>
            <button onClick={() => handleShare(selectedEntryDetail.images[fullscreenPhotoIndex])} className="flex items-center gap-4 px-10 py-6 bg-primary-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all">
              <Share2 size={24} />
              <span>Compartir</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .animate-bounce-subtle { animation: bounce-subtle 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default Journal;
