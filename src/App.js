import React, { useState, useEffect, useRef } from 'react'; // useRef hinzugefügt!
import { 
  FileText, Sparkles, PenTool, CheckCircle, Play, 
  RefreshCw, Loader2, Volume2, Square, Search, GraduationCap, X 
} from 'lucide-react';

export default function App() {
  // --- STATE MANAGEMENT ---
  const [mode, setMode] = useState('korrektur');
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [korrekturErgebnis, setKorrekturErgebnis] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generierteAufgabe, setGenerierteAufgabe] = useState(null);
  
  // Audio-Logik
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const speechRef = useRef(null);

  // --- STIMMEN-LOGIK (DEINE SPEZIAL-FUNKTION) ---
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const germanVoices = voices.filter(v => v.lang.startsWith('de'));
      setAvailableVoices(germanVoices.length > 0 ? germanVoices : voices.slice(0, 5));
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const prepareTextForSpeech = (t) => {
    return t.replace(/Znüni/gi, 'Znüüni')
            .replace(/LP/g, 'Lehrperson')
            .replace(/SuS/g, 'Schülerinnen und Schüler');
  };

  const speakText = (content) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(prepareTextForSpeech(content));
    if (availableVoices[0]) utterance.voice = availableVoices[0];
    utterance.rate = 0.85; 
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // --- FUNKTIONEN ---
  const handleKorrektur = () => {
    if (!text) return;
    setIsAnalyzing(true);
    // Simulation der PROF-L KI Analyse
    setTimeout(() => {
      setKorrekturErgebnis({
        score: text.toLowerCase().includes("mein oma") ? 80 : 100,
        details: text.toLowerCase().includes("mein oma") 
          ? [{ original: "mein Oma", korrektur: "meine Oma", grund: "Genusfehler (feminin)" }] 
          : []
      });
      setIsAnalyzing(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h1 className="text-3xl font-extrabold text-indigo-900 flex items-center justify-center gap-3">
            <Sparkles className="text-orange-500" /> PROF-L AGENT V5
          </h1>
          <p className="text-slate-500 mt-2">Prüfungsvorbereitung für Lehrpersonen</p>
        </header>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          {/* NAVIGATION */}
          <div className="flex bg-slate-100 border-b">
            <button onClick={() => setMode('korrektur')} className={`flex-1 py-4 font-bold flex justify-center items-center gap-2 ${mode === 'korrektur' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-slate-500'}`}>
              <PenTool size={18}/> Korrektur
            </button>
            <button onClick={() => setMode('generator')} className={`flex-1 py-4 font-bold flex justify-center items-center gap-2 ${mode === 'generator' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-slate-500'}`}>
              <RefreshCw size={18}/> Generator
            </button>
          </div>

          <div className="p-6 md:p-8">
            {mode === 'korrektur' ? (
              <div className="space-y-6">
                <textarea 
                  className="w-full h-64 p-4 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-lg transition-all" 
                  placeholder="Text oder Schülerarbeit hier einfügen..."
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                />
                <button 
                  onClick={handleKorrektur} 
                  disabled={!text || isAnalyzing} 
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-indigo-700 disabled:bg-slate-300 transition-all"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" /> : "Analyse Starten"}
                </button>

                {korrekturErgebnis && (
                  <div className="mt-6 p-6 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-xl text-indigo-900">Analyseergebnis</h3>
                      <span className="bg-indigo-600 text-white px-4 py-1 rounded-full font-bold">{korrekturErgebnis.score}%</span>
                    </div>
                    {korrekturErgebnis.details.length > 0 ? (
                      korrekturErgebnis.details.map((f, i) => (
                        <div key={i} className="bg-white p-4 rounded-xl border-l-4 border-red-500 shadow-sm">
                          <p className="text-sm text-slate-500">Gefundener Fehler:</p>
                          <p className="font-medium text-lg"><s>{f.original}</s> → <span className="text-green-600 font-bold">{f.korrektur}</span></p>
                          <p className="text-sm italic mt-1 text-indigo-500">{f.grund}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-green-600 font-medium">Keine Fehler gefunden. Sehr gute Arbeit!</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center">
                <RefreshCw size={48} className="mx-auto text-slate-200 mb-4 animate-spin-slow" />
                <h3 className="text-xl font-bold text-slate-400">Generator bereit</h3>
                <p className="text-slate-400">Wähle ein Thema aus der Liste, um eine Aufgabe zu erstellen.</p>
              </div>
            )}
          </div>
        </div>

        {/* AUDIO PLAYER */}
        {text && (
          <div className="mt-6 bg-slate-800 text-white p-4 rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => isSpeaking ? window.speechSynthesis.cancel() : speakText(text)} 
                className="w-12 h-12 flex items-center justify-center bg-indigo-500 rounded-full hover:bg-indigo-400 transition-colors"
              >
                {isSpeaking ? <Square fill="white" size={20} /> : <Play fill="white" size={20} className="ml-1" />}
              </button>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Audio-Vorschau</p>
                <p className="text-sm">PROF-L Sprecher (0.85x Speed)</p>
              </div>
            </div>
            <Volume2 className="text-slate-500" />
          </div>
        )}
      </div>
    </div>
  );
}
