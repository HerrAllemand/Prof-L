import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Sparkles, PenTool, Mic, CheckCircle, Play, Pause, 
  RotateCcw, RefreshCw, Loader2, X, GripVertical, Volume2, Square 
} from 'lucide-react';

// WICHTIG: "export default" muss hier stehen, damit Vercel die App findet!
export default function App() {
  const [mode, setMode] = useState('korrektur');
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Audio & Sprachausgabe
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const germanVoices = voices.filter(v => v.lang.startsWith('de'));
      setAvailableVoices(germanVoices.length > 0 ? germanVoices : voices.slice(0, 5));
    };
    if ('speechSynthesis' in window) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speakText = (textToSpeak) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (availableVoices[selectedVoiceIndex]) utterance.voice = availableVoices[selectedVoiceIndex];
    utterance.rate = 0.85;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900">
      <header className="max-w-4xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-bold text-indigo-900 flex items-center justify-center gap-2">
          <Sparkles className="text-orange-500" /> PROF-L Deutsch Agent
        </h1>
        <p className="text-slate-500">Ihr KI-Coach für die Sprachprüfung</p>
      </header>

      <main className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="flex bg-slate-100 border-b">
          <button 
            onClick={() => setMode('korrektur')}
            className={`flex-1 py-4 font-semibold ${mode === 'korrektur' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-slate-600'}`}
          >
            Korrektur & Analyse
          </button>
          <button 
            onClick={() => setMode('generator')}
            className={`flex-1 py-4 font-semibold ${mode === 'generator' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-slate-600'}`}
          >
            Aufgaben-Generator
          </button>
        </div>

        <div className="p-8">
          {mode === 'korrektur' ? (
            <div className="space-y-6">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Text hier einfügen..."
                className="w-full h-64 p-4 border-2 border-slate-200 rounded-xl focus:border-indigo-500 transition-all resize-none"
              />
              <button 
                onClick={() => { setIsAnalyzing(true); setTimeout(() => setIsAnalyzing(false), 2000); }}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700"
              >
                {isAnalyzing ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                Prüfung starten
              </button>
            </div>
          ) : (
            <div className="text-center py-10">
              <RefreshCw size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg">Wähle einen Aufgabentyp aus dem Menü.</p>
            </div>
          )}
        </div>
      </main>

      {text && (
        <div className="max-w-4xl mx-auto mt-6 bg-indigo-900 text-white p-4 rounded-xl flex items-center justify-between">
          <button 
            onClick={() => isSpeaking ? window.speechSynthesis.cancel() : speakText(text)}
            className="p-3 bg-white/20 rounded-full hover:bg-white/30"
          >
            {isSpeaking ? <Square size={24} /> : <Play size={24} />}
          </button>
          <div className="flex items-center gap-2">
            <Volume2 size={16} />
            <select 
              className="bg-transparent text-white border-none"
              onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
            >
              {availableVoices.map((v, i) => (
                <option key={i} value={i} className="text-slate-900">{v.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
