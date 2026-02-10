import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Sparkles, PenTool, Mic, CheckCircle, Play, Pause, 
  RotateCcw, RefreshCw, Loader2, X, GripVertical, Volume2, Square 
} from 'lucide-react';

// Das ist der "Anker" für Vercel
export default function App() {
  const [mode, setMode] = useState('korrektur');
  const [text, setText] = useState('');
  const [korrekturErgebnis, setKorrekturErgebnis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Aufgaben-Generator States
  const [aufgabenTyp, setAufgabenTyp] = useState('leseverstehen_zuordnung');
  const [generierteAufgabe, setGenerierteAufgabe] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userAntworten, setUserAntworten] = useState({});
  const [aufgabenFeedback, setAufgabenFeedback] = useState(null);
  const [showMusterantwort, setShowMusterantwort] = useState(false);
  
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

  const checkText = () => {
    setIsAnalyzing(true);
    // Simulation der Analyse
    setTimeout(() => {
      setKorrekturErgebnis({
        score: 85,
        hinweise: ["Achten Sie auf die Großschreibung von Nomen.", "Der Genus von 'Oma' ist weiblich."]
      });
      setIsAnalyzing(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <header className="max-w-4xl mx-auto mb-8 flex flex-col items-center">
        <h1 className="text-3xl font-bold text-indigo-900 flex items-center gap-2">
          <Sparkles className="text-orange-500" /> PROF-L Deutsch Agent V5
        </h1>
        <p className="text-slate-500">Offizieller Prüfungstrainer für Lehrpersonen</p>
      </header>

      <main className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <nav className="flex bg-slate-100 border-b border-slate-200">
          <button 
            onClick={() => setMode('korrektur')}
            className={`flex-1 py-4 font-bold ${mode === 'korrektur' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-slate-500'}`}
          >
            Korrektur & Analyse
          </button>
          <button 
            onClick={() => setMode('generator')}
            className={`flex-1 py-4 font-bold ${mode === 'generator' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-slate-500'}`}
          >
            Aufgaben-Generator
          </button>
        </nav>

        <div className="p-6 md:p-10">
          {mode === 'korrektur' ? (
            <div className="space-y-6">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Fügen Sie hier Ihren Text oder eine Schülerarbeit ein..."
                className="w-full h-80 p-5 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-all text-lg"
              />
              <button 
                onClick={checkText}
                disabled={!text || isAnalyzing}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isAnalyzing ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                Text nach PROF-L Kriterien prüfen
              </button>
              
              {korrekturErgebnis && (
                <div className="mt-6 p-6 bg-indigo-50 rounded-xl border-2 border-indigo-200">
                  <h3 className="font-bold text-indigo-900 mb-2">Analyse-Ergebnis:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {korrekturErgebnis.hinweise.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20">
              <RefreshCw size={48} className="mx-auto text-slate-300 animate-spin-slow mb-4" />
              <h3 className="text-xl font-bold">Bereit zur Aufgabengenerierung</h3>
              <p className="text-slate-500 mt-2">Wählen Sie oben einen Bereich aus.</p>
            </div>
          )}
        </div>
      </main>

      {text && (
        <div className="max-w-4xl mx-auto mt-6 bg-indigo-900 text-white p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => isSpeaking ? window.speechSynthesis.cancel() : speakText(text)}
              className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              {isSpeaking ? <Square size={24} /> : <Play size={24} />}
            </button>
            <span className="hidden md:inline font-medium text-sm">Hörbeispiel generieren</span>
          </div>
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="text-indigo-300" />
            <select 
              className="bg-indigo-800 text-white text-xs border-none rounded p-1 outline-none"
              value={selectedVoiceIndex}
              onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
            >
              {availableVoices.map((v, i) => (
                <option key={i} value={i}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
