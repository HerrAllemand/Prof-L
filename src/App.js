import React, { useState, useEffect, useRef } from 'react'; // useRef HINZUGEFÜGT
import { 
  FileText, Sparkles, PenTool, CheckCircle, Play, 
  RefreshCw, Loader2, Volume2, Square, Search, GraduationCap, X, Pause
} from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState('korrektur');
  const [text, setText] = useState('');
  const [korrekturErgebnis, setKorrekturErgebnis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Aufgaben-Generator State
  const [aufgabenTyp, setAufgabenTyp] = useState('leseverstehen_zuordnung');
  const [aufgabenThema, setAufgabenThema] = useState('');
  const [aufgabenStufe, setAufgabenStufe] = useState('primar');
  const [aufgabenSchwierigkeit, setAufgabenSchwierigkeit] = useState('mittel');
  const [generierteAufgabe, setGenerierteAufgabe] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userAntworten, setUserAntworten] = useState({});
  const [aufgabenFeedback, setAufgabenFeedback] = useState(null);
  const [themenSuche, setThemenSuche] = useState('');
  
  // Audio State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const speechRef = useRef(null);
  const timerRef = useRef(null);

  // Stimmen laden
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const german = voices.filter(v => v.lang.startsWith('de'));
      setAvailableVoices(german.length > 0 ? german : voices.slice(0, 5));
    };
    if ('speechSynthesis' in window) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleKorrektur = () => {
    if (!text) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      const fehler = text.toLowerCase().includes("mein oma") 
        ? [{ original: "mein Oma", korrektur: "meine Oma", grund: "Genusfehler" }] 
        : [];
      setKorrekturErgebnis({ score: fehler.length > 0 ? 80 : 100, details: fehler });
      setIsAnalyzing(false);
    }, 1000);
  };

  const speak = (t) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'de-DE';
    u.rate = 0.85;
    if (availableVoices[0]) u.voice = availableVoices[0];
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-center">
          <h1 className="text-3xl font-black text-indigo-900 flex items-center justify-center gap-3">
            <GraduationCap className="text-orange-500 w-10 h-10" /> PROF-L AGENT
          </h1>
          <p className="text-slate-500 font-medium">Prüfungsmanagement für Lehrpersonen</p>
        </header>

        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
          <div className="flex bg-slate-50 p-2 gap-2">
            <button 
              onClick={() => setMode('korrektur')} 
              className={`flex-1 py-4 rounded-2xl font-bold transition-all ${mode === 'korrektur' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <PenTool className="inline-block mr-2 w-5 h-5" /> Korrektur
            </button>
            <button 
              onClick={() => setMode('generator')} 
              className={`flex-1 py-4 rounded-2xl font-bold transition-all ${mode === 'generator' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <RefreshCw className="inline-block mr-2 w-5 h-5" /> Generator
            </button>
          </div>

          <div className="p-6 md:p-10">
            {mode === 'korrektur' ? (
              <div className="space-y-6">
                <textarea 
                  className="w-full h-64 p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all text-lg" 
                  placeholder="Schülertext hier einfügen..."
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                />
                <div className="flex gap-4">
                  <button 
                    onClick={handleKorrektur} 
                    className="flex-[3] bg-indigo-600 text-white py-5 rounded-2xl font-bold text-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                  >
                    {isAnalyzing ? "KI analysiert..." : "Text prüfen"}
                  </button>
                  <button 
                    onClick={() => isSpeaking ? window.speechSynthesis.cancel() : speak(text)} 
                    className="flex-1 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all"
                  >
                    {isSpeaking ? <Square className="text-red-500 fill-red-500" /> : <Play className="text-indigo-600 fill-indigo-600" />}
                  </button>
                </div>

                {korrekturErgebnis && (
                  <div className="mt-8 p-6 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="font-bold text-indigo-900 text-xl mb-4">Ergebnis: {korrekturErgebnis.score}%</h3>
                    {korrekturErgebnis.details.map((f, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl border-l-4 border-red-500 shadow-sm mb-3">
                        <span className="text-red-500 line-through mr-2">{f.original}</span>
                        <span className="text-green-600 font-bold">→ {f.korrektur}</span>
                        <p className="text-sm text-slate-500 mt-1 italic">{f.grund}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <Sparkles size={48} className="mx-auto text-indigo-200 mb-4" />
                <h3 className="text-xl font-bold text-slate-400">Generator bereit</h3>
                <p className="text-slate-400 max-w-xs mx-auto mt-2">Wähle ein Thema aus deiner Liste, um Übungen zu erstellen.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
