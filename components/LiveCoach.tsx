
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';
import { Mic, MicOff, Volume2, Save, Trash2, CheckCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { translations } from '../services/translations';

interface LiveCoachProps {
  onRecordingComplete?: (audioBase64: string) => void;
}

const LiveCoach = ({ onRecordingComplete }: LiveCoachProps) => {
  const { settings } = useAppContext();
  const t = translations[settings.language].live;
  const [connected, setConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Using globalThis.Blob to specify the browser's Blob type.
  const [audioBlob, setAudioBlob] = useState<globalThis.Blob | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // MediaRecorder para guardado local
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // Using globalThis.Blob to specify the browser's Blob type.
  const audioChunksRef = useRef<globalThis.Blob[]>([]);
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
    }
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setConnected(false);
  };

  const initAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Setup local recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        // Explicitly using globalThis.Blob constructor.
        const fullBlob = new globalThis.Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(fullBlob);
        
        // Convert to base64 and send to parent if needed
        const reader = new FileReader();
        reader.readAsDataURL(fullBlob);
        reader.onloadend = () => {
          if (typeof reader.result === 'string' && onRecordingComplete) {
            onRecordingComplete(reader.result);
          }
        };
      };
      
      return stream;
    } catch (err) {
      setError("Microphone access denied.");
      return null;
    }
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
     const dataInt16 = new Int16Array(data.buffer);
     const frameCount = dataInt16.length / numChannels;
     const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
     for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
     }
     return buffer;
  }

  // Returns a GenAIBlob compatible object.
  const createGenAIBlob = (data: Float32Array): GenAIBlob => {
      const l = data.length;
      const int16 = new Int16Array(l);
      for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
      return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  };

  const toggleConnection = async () => {
    if (connected) {
      cleanup();
      return;
    }
    setAudioBlob(null);
    const stream = await initAudio();
    if (!stream || !audioContextRef.current || !outputAudioContextRef.current || !mediaRecorderRef.current) return;
    
    setError(null);
    setConnected(true);
    mediaRecorderRef.current.start();

    const apiKey = process.env.API_KEY;
    if (!apiKey) return;
    const ai = new GoogleGenAI({ apiKey });
    sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
            onopen: () => {
                if (!audioContextRef.current) return;
                const source = audioContextRef.current.createMediaStreamSource(stream);
                const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Solely rely on sessionPromise resolves and then call `session.sendRealtimeInput`
                    const pcmBlob = createGenAIBlob(inputData);
                    sessionPromiseRef.current?.then(session => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                };
                source.connect(processor);
                processor.connect(audioContextRef.current.destination);
                inputSourceRef.current = source;
                processorRef.current = processor;
            },
            onmessage: async (msg: LiveServerMessage) => {
                if (!outputAudioContextRef.current) return;
                const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (base64Audio) {
                    setIsTalking(true);
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                    const source = outputAudioContextRef.current.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputAudioContextRef.current.destination);
                    source.addEventListener('ended', () => {
                        sourcesRef.current.delete(source);
                        if (sourcesRef.current.size === 0) setIsTalking(false);
                    });
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    sourcesRef.current.add(source);
                }
                if (msg.serverContent?.interrupted) {
                    sourcesRef.current.forEach(s => s.stop());
                    sourcesRef.current.clear();
                    nextStartTimeRef.current = 0;
                    setIsTalking(false);
                }
            },
            onerror: () => setConnected(false),
            onclose: () => setConnected(false)
        },
        config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: t.systemInstruction,
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
        }
    });
  };

  return (
    <div className="p-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] shadow-2xl text-white mb-6 flex flex-col items-center justify-center relative overflow-hidden">
        {connected && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className={`w-72 h-72 rounded-full bg-white opacity-10 animate-ping ${isTalking ? 'duration-700' : 'duration-[2000ms]'}`}></div>
             </div>
        )}
        <div className="relative z-10 text-center space-y-2 mb-8">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">{t.title}</h2>
            <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest opacity-70">{t.subtitle}</p>
        </div>

        {error && <p className="text-red-200 bg-red-900/40 px-4 py-2 rounded-2xl mb-6 z-10 text-xs font-bold border border-red-500/20">{error}</p>}
        
        <button 
          onClick={toggleConnection} 
          className={`z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-2xl relative group ${connected ? 'bg-white text-red-500' : 'bg-white text-indigo-600'}`}
        >
            {connected ? <MicOff size={36} /> : <Mic size={36} />}
            <div className={`absolute inset-0 rounded-full border-4 border-white/30 scale-125 opacity-0 group-hover:opacity-100 transition-all ${connected ? 'animate-pulse' : ''}`} />
        </button>

        <div className="mt-8 h-8 flex flex-col items-center space-y-2 z-10">
            {connected ? (
                <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full bg-white ${isTalking ? 'animate-bounce' : 'opacity-40'}`} style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{isTalking ? t.talking : t.listening}</span>
                </div>
            ) : audioBlob ? (
                <div className="flex items-center gap-2 text-emerald-300 animate-in fade-in zoom-in-95">
                  <CheckCircle size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Grabación lista para guardar</span>
                </div>
            ) : (
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">Pulsa para iniciar sesión vocal</span>
            )}
        </div>
    </div>
  );
};

export default LiveCoach;
