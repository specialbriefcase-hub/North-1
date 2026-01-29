import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Plus, MessageSquare, History, ChevronLeft, Layout, Clock, Activity, Sparkles, MoreVertical, Trash2, Edit3, Pin, PinOff, X, AlertTriangle, RotateCcw, ChevronRight, Search, Filter } from 'lucide-react';
import { sendChatMessage } from '../services/gemini';
import { Message } from '../types';
import { useAppContext } from '../context/AppContext';
import { translations } from '../services/translations';

interface MessageVersion {
  userContent: string;
  modelResponse: string;
}

interface ChatMessage extends Message {
  versions?: MessageVersion[];
  currentVersionIndex?: number;
  isEditing?: boolean;
}

interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdate: number;
  isPinned?: boolean;
}

const ChatAssistant = () => {
  const { settings } = useAppContext();
  const t = translations[settings.language].chat;
  
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    const saved = localStorage.getItem('vorth_chat_threads');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [editInput, setEditInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isCanvasActive, setIsCanvasActive] = useState(false);
  
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  // History Search and Filter states
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [filterPinnedOnly, setFilterPinnedOnly] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const activeThread = useMemo(() => 
    threads.find(t => t.id === activeThreadId) || null
  , [threads, activeThreadId]);

  const displayedThreads = useMemo(() => {
    let filtered = [...threads];
    
    // Search filter
    if (historySearchQuery.trim()) {
      const query = historySearchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.messages.some(m => m.content.toLowerCase().includes(query))
      );
    }

    // Pinned filter
    if (filterPinnedOnly) {
      filtered = filtered.filter(t => t.isPinned);
    }

    // Default sorting: Pinned first, then by lastUpdate
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.lastUpdate - a.lastUpdate;
    });
  }, [threads, historySearchQuery, filterPinnedOnly]);

  useEffect(() => {
    localStorage.setItem('vorth_chat_threads', JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages, loading]);

  const startNewChat = () => {
    const newId = Date.now().toString();
    const newThread: ChatThread = {
      id: newId,
      title: 'Nuevo Chat',
      messages: [{ role: 'model', content: t.welcome }],
      lastUpdate: Date.now(),
      isPinned: false
    };
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newId);
    setShowHistory(false);
    setIsCanvasActive(false);
  };

  const handleSend = async (customInput?: string, isEditingLast?: boolean) => {
    const textToSend = customInput || input;
    if (!textToSend.trim()) return;
    
    let currentId = activeThreadId;
    let currentThreads = [...threads];

    if (!currentId) {
      const newId = Date.now().toString();
      const newThread: ChatThread = {
        id: newId,
        title: textToSend.slice(0, 30) + '...',
        messages: [],
        lastUpdate: Date.now(),
        isPinned: false
      };
      currentThreads = [newThread, ...currentThreads];
      currentId = newId;
      setActiveThreadId(newId);
    }

    if (!isEditingLast) {
      const userMsg: ChatMessage = { role: 'user', content: textToSend };
      const updatedThreads = currentThreads.map(th => {
        if (th.id === currentId) {
          return {
            ...th,
            messages: [...th.messages, userMsg],
            lastUpdate: Date.now()
          };
        }
        return th;
      });
      setThreads(updatedThreads);
    }

    setInput('');
    setLoading(true);

    try {
      const threadToUpdate = currentThreads.find(th => th.id === currentId);
      const history = threadToUpdate?.messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      })) || [];

      const enhancedPrompt = isCanvasActive 
        ? `${textToSend} (Responde con estructura de lista para Canvas)` 
        : textToSend;

      // FIX: Handle object response with text and chunks
      const response = await sendChatMessage(history, enhancedPrompt);
      const cleanResponse = response.text || 'Error';
      const chunks = response.chunks;

      setThreads(prev => prev.map(th => {
        if (th.id === currentId) {
          let newMessages = [...th.messages];
          
          if (isEditingLast) {
            const lastIdx = newMessages.length - 2;
            const userMsg = newMessages[lastIdx];
            const modelMsg = newMessages[lastIdx + 1];

            if (!userMsg.versions) {
              userMsg.versions = [{ userContent: userMsg.content, modelResponse: modelMsg.content }];
            }
            
            userMsg.versions.push({ userContent: textToSend, modelResponse: cleanResponse });
            userMsg.currentVersionIndex = userMsg.versions.length - 1;
            userMsg.content = textToSend;
            userMsg.isEditing = false;
            modelMsg.content = cleanResponse;
            // FIX: Add chunks to metadata
            modelMsg.metadata = { chunks };
          } else {
            // FIX: Add chunks to metadata
            const botMsg: ChatMessage = { role: 'model', content: cleanResponse, metadata: { chunks } };
            newMessages.push(botMsg);
          }

          const firstUserMsg = newMessages.find(m => m.role === 'user');
          const newTitle = th.title === 'Nuevo Chat' ? (firstUserMsg?.content.slice(0, 25) || 'Conversación') : th.title;
          
          return { ...th, title: newTitle, messages: newMessages, lastUpdate: Date.now() };
        }
        return th;
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const switchVersion = (msgIdx: number, newVerIdx: number) => {
    setThreads(prev => prev.map(th => {
      if (th.id === activeThreadId) {
        const newMessages = [...th.messages];
        const userMsg = newMessages[msgIdx];
        const modelMsg = newMessages[msgIdx + 1];
        
        if (userMsg.versions && userMsg.versions[newVerIdx]) {
          userMsg.currentVersionIndex = newVerIdx;
          userMsg.content = userMsg.versions[newVerIdx].userContent;
          modelMsg.content = userMsg.versions[newVerIdx].modelResponse;
        }
        return { ...th, messages: newMessages };
      }
      return th;
    }));
  };

  const saveRename = () => {
    if (!renameId || !newName.trim()) return;
    setThreads(prev => prev.map(t => t.id === renameId ? { ...t, title: newName } : t));
    setRenameId(null);
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    setThreads(prev => prev.filter(t => t.id !== deleteConfirmId));
    if (activeThreadId === deleteConfirmId) setActiveThreadId(null);
    setDeleteConfirmId(null);
  };

  const renderInteractiveCanvas = (content: string) => {
    if (!isCanvasActive) return null;
    const lines = content.split('\n').filter(line => line.trim().length > 5);
    const planRows = lines.filter(line => line.includes(':') || line.match(/^\d+\./) || line.match(/^-/));
    if (planRows.length === 0) return null;

    return (
      <div className="mt-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl overflow-hidden shadow-inner animate-in zoom-in-95 w-full max-w-[90%] self-start">
        <div className="bg-primary-600 p-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Plan Interactivo</span>
          </div>
          <Sparkles size={16} className="animate-pulse" />
        </div>
        <div className="p-4 overflow-x-auto">
           <table className="w-full text-sm text-left">
              <tbody className="text-gray-600 dark:text-gray-400 font-medium">
                {planRows.map((row, idx) => {
                  const [label, ...desc] = row.split(':');
                  return (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="py-3 font-bold align-top whitespace-nowrap pr-4">{label.replace(/^[- \d.]+/, '').trim()}</td>
                      <td className="py-3 leading-relaxed">{desc.join(':').trim() || label.trim()}</td>
                    </tr>
                  );
                })}
              </tbody>
           </table>
        </div>
      </div>
    );
  };

  if (showHistory) {
    return (
      <div className="flex flex-col h-full max-w-2xl mx-auto p-4 animate-in fade-in duration-300 relative">
        <div className="flex items-center justify-between mb-4">
           <button onClick={() => { setShowHistory(false); setHistorySearchQuery(''); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><ChevronLeft size={24} /></button>
           <h2 className="text-xl font-black uppercase tracking-tighter">Historial de Chats</h2>
           <div className="w-10" />
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-500 transition-colors">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Buscar conversaciones..." 
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-primary-500/20 transition-all font-medium text-sm dark:text-white"
            />
            {historySearchQuery && (
              <button 
                onClick={() => setHistorySearchQuery('')}
                className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setFilterPinnedOnly(!filterPinnedOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${filterPinnedOnly ? 'bg-primary-600 border-primary-600 text-white shadow-md' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500 hover:border-primary-200'}`}
            >
              <Pin size={12} fill={filterPinnedOnly ? "currentColor" : "none"} />
              <span>Sólo Fijados</span>
            </button>
          </div>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pb-32">
           {displayedThreads.length === 0 ? (
             <div className="text-center py-20 opacity-30">
               <MessageSquare size={64} className="mx-auto mb-4" />
               <p className="font-bold">{threads.length === 0 ? 'No hay chats' : 'Sin resultados para la búsqueda'}</p>
             </div>
           ) : (
             displayedThreads.map(th => (
               <div key={th.id} className="relative group">
                 <button 
                  onClick={() => { setActiveThreadId(th.id); setShowHistory(false); setHistorySearchQuery(''); }} 
                  className={`w-full text-left p-5 rounded-3xl border transition-all flex items-center justify-between ${
                    activeThreadId === th.id 
                    ? 'bg-primary-50 border-primary-200 dark:bg-gray-800 dark:border-primary-800 shadow-[0_0_15px_rgba(14,165,233,0.1)]' 
                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-primary-200'
                  }`}
                 >
                   <div className="flex-1 pr-12">
                     <div className="flex items-center gap-2">
                        {th.isPinned && <Pin size={14} className="text-primary-500 fill-current flex-shrink-0" />}
                        <h3 className="font-bold dark:text-white line-clamp-1">{th.title}</h3>
                     </div>
                     <p className="text-xs text-gray-400 mt-1">{new Date(th.lastUpdate).toLocaleDateString()} • {th.messages.length} msgs</p>
                   </div>
                 </button>
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[100]">
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === th.id ? null : th.id); }} className="p-2 text-gray-400 hover:text-primary-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><MoreVertical size={20} /></button>
                    {menuOpenId === th.id && (
                      <div className="absolute right-0 top-10 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-[9999] py-2 animate-in zoom-in-95">
                        <button onClick={() => { setRenameId(th.id); setNewName(th.title); setMenuOpenId(null); }} className="w-full px-4 py-2.5 text-left text-sm font-bold flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700"><Edit3 size={16} /> Renombrar</button>
                        <button onClick={() => setThreads(prev => prev.map(t => t.id === th.id ? {...t, isPinned: !t.isPinned} : t))} className="w-full px-4 py-2.5 text-left text-sm font-bold flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700">{th.isPinned ? <><PinOff size={16} /> Desfijar</> : <><Pin size={16} /> Fijar</>}</button>
                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                        <button onClick={() => { setDeleteConfirmId(th.id); setMenuOpenId(null); }} className="w-full px-4 py-2.5 text-left text-sm font-bold flex items-center gap-3 text-red-500 hover:bg-red-50"><Trash2 size={16} /> Eliminar</button>
                      </div>
                    )}
                 </div>
               </div>
             ))
           )}
        </div>

        {/* Rename Modal */}
        {renameId && (
          <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95">
              <h3 className="text-lg font-black uppercase italic mb-4 dark:text-white">Renombrar Chat</h3>
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl mb-6 outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
              <div className="flex gap-3">
                <button onClick={() => setRenameId(null)} className="flex-1 py-3 font-bold text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">Cancelar</button>
                <button onClick={saveRename} className="flex-1 py-3 font-bold bg-primary-600 text-white rounded-xl shadow-lg hover:bg-primary-700 transition-colors">Guardar</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-black uppercase italic text-center mb-2 dark:text-white">¿Eliminar Chat?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 font-bold text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">Cancelar</button>
                <button onClick={confirmDelete} className="flex-1 py-3 font-bold bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 transition-colors">Eliminar</button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info at the same level as the "+" button */}
        <div className="fixed bottom-28 left-6 right-6 flex items-center justify-between pointer-events-none z-50">
          <div className="max-w-[70%] bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm pointer-events-auto">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-tight">
              <AlertTriangle size={10} className="inline mr-1 text-amber-500" />
              El agente puede cometer errores. Recomendamos revisar los resultados dos veces.
            </p>
          </div>
          <button 
            onClick={startNewChat} 
            className="w-16 h-16 bg-primary-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all pointer-events-auto border-4 border-white dark:border-gray-950"
          >
            <Plus size={32} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden relative">
      <div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
        <button onClick={() => setShowHistory(true)} className="p-2 text-gray-500 hover:text-primary-600 transition-colors"><History size={24} /></button>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary-500">Asistente PERMA</p>
          <div className="flex items-center justify-center gap-1">
            {activeThread?.isPinned && <Pin size={10} className="text-primary-500 fill-current" />}
            <h2 className="font-bold dark:text-white line-clamp-1 max-w-[150px]">{activeThread?.title || 'Nuevo Chat'}</h2>
          </div>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-95">
        {(activeThread?.messages || [{ role: 'model', content: t.welcome }]).map((m, idx) => (
          <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 group`}>
            
            <div className={`flex items-start max-w-[90%] ${m.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
              
              {m.role === 'user' && !m.isEditing && idx === (activeThread?.messages.length || 0) - 1 && (
                <button 
                  onClick={() => { m.isEditing = true; setEditInput(m.content); setThreads([...threads]); }}
                  className="mt-2 mr-2 p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  title="Editar prompt"
                >
                  <Edit3 size={18} />
                </button>
              )}

              <div className={`relative rounded-[1.8rem] px-5 py-4 shadow-sm w-fit ${m.role === 'user' ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-none'}`}>
                {m.role === 'user' && m.isEditing ? (
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <textarea 
                      autoFocus
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      className="w-full bg-primary-700 text-white border-none rounded-xl p-2 text-sm focus:ring-1 focus:ring-white/50"
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { m.isEditing = false; setThreads([...threads]); }} className="text-[10px] font-bold uppercase py-1 px-2 hover:bg-white/10 rounded">Cancelar</button>
                      <button onClick={() => handleSend(editInput, true)} className="text-[10px] font-bold uppercase py-1 px-3 bg-white text-primary-600 rounded">Enviar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="markdown prose dark:prose-invert text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, '<br/>') }} />
                    
                    {/* Selector de Versiones */}
                    {m.role === 'user' && m.versions && m.versions.length > 1 && (
                      <div className="mt-2 flex items-center bg-black/20 rounded-full px-2 py-0.5 text-[10px] font-bold gap-2 w-fit">
                        <button disabled={m.currentVersionIndex === 0} onClick={() => switchVersion(idx, (m.currentVersionIndex || 0) - 1)} className="hover:text-primary-200 disabled:opacity-30"><ChevronLeft size={12} /></button>
                        <span>{(m.currentVersionIndex || 0) + 1} / {m.versions.length}</span>
                        <button disabled={m.currentVersionIndex === m.versions.length - 1} onClick={() => switchVersion(idx, (m.currentVersionIndex || 0) + 1)} className="hover:text-primary-200 disabled:opacity-30"><ChevronRight size={12} /></button>
                      </div>
                    )}

                    {/* FIX: Render grounding chunks */}
                    {m.role === 'model' && m.metadata?.chunks && m.metadata.chunks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/20 dark:border-gray-700/50">
                        <h4 className="text-xs font-bold uppercase text-gray-300 dark:text-gray-400 mb-1">{t.sources}</h4>
                        {m.metadata.chunks.map((chunk: any, i: number) => (
                          chunk.web && (
                            <a
                              key={i}
                              href={chunk.web.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs truncate text-primary-200 dark:text-primary-300 hover:underline"
                            >
                              {chunk.web.title || chunk.web.uri}
                            </a>
                          )
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {m.role === 'model' && renderInteractiveCanvas(m.content)}
          </div>
        ))}
        {loading && (
             <div className="flex justify-start animate-in fade-in"><div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-none px-5 py-4 border dark:border-gray-700 shadow-sm flex items-center space-x-3"><div className="flex space-x-1 h-3 items-center"><div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div><div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div></div><span className="text-xs font-black uppercase text-gray-400 tracking-widest">{t.writing}</span></div></div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
             <button onClick={() => setIsCanvasActive(!isCanvasActive)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isCanvasActive ? 'bg-secondary-500 text-white shadow-lg shadow-secondary-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}><Layout size={14} /><span>Modo Canvas</span></button>
          </div>
          <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-[2rem] border border-gray-200 dark:border-gray-700">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={t.placeholderChat} className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-4 dark:text-white" />
            <button onClick={() => handleSend()} disabled={!input.trim() || loading} className="p-4 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 disabled:opacity-50 transition-all active:scale-90"><Send size={20} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;