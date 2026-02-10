import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Sparkles, PenTool, Mic, CheckCircle, Play, Pause, 
  RotateCcw, RefreshCw, Loader2, X, GripVertical, Volume2, Square 
} from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState('korrektur');
  const [text, setText] = useState('');
  const [korrekturErgebnis, setKorrekturErgebnis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Aufgaben-Generator State
  const [aufgabenTyp, setAufgabenTyp] = useState('leseverstehen_zuordnung');
  const [generierteAufgabe, setGenerierteAufgabe] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userAntworten, setUserAntworten] = useState({});
  const [aufgabenFeedback, setAufgabenFeedback] = useState(null);
  
  // Audio & Sprachausgabe State
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

  const speakText = (content) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    if (availableVoices[selectedVoiceIndex]) utterance.voice = availableVoices[selectedVoiceIndex];
    utterance.rate = 0.85;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleKorrektur = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setKorrekturErgebnis({
        text: text,
        fehler: [
          { typ: 'Grammatik', original: 'mein Oma', korrektur: 'meine Oma', grund: 'Possessivpronomen Genus (feminin)' },
          { typ: 'Rechtschreibung', original: 'Prasentation', korrektur: 'Präsentation', grund: 'Umlaut fehlt' }
        ],
        score: 75
      });
      setIsAnalyzing(false);
    }, 1500);
  };

  const generateAufgabe = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setGenerierteAufgabe({
        titel: "Elternbrief analysieren",
        kontext: "Ein Lehrer schreibt an die Eltern wegen eines Wandertags.",
        frage: "Welche Anrede ist in diesem formellen Kontext korrekt?",
        optionen: ["Hallo zusammen", "Sehr geehrte Eltern", "Liebe Leute"],
        loesung: 1
      });
      setIsGenerating(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex flex-col items-center">
          <div className="bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold mb-2 uppercase tracking-widest">
            PROF-L Agent V5
          </div>
          <h1 className="text-3xl font-bold text-indigo-900 text-center">Prüfungstraining Deutsch</h1>
        </header>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div className="flex bg-slate-100 border-b">
            <button 
              onClick={() => setMode('korrektur')}
              className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 ${mode === 'korrektur' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-slate-500'}`}
            >
              <PenTool size={18} /> Analyse
            </button>
            <button 
              onClick={() => setMode('generator')}
              className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 ${mode === 'generator' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-slate-500'}`}
            >
              <RefreshCw size={18} /> Aufgaben
            </button>
          </div>

          <div className="p-6 md:p-10">
            {mode === 'korrektur' ? (
              <div className="space-y-6">
                <textarea
                  className="w-full h-64 p-5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-all"
                  placeholder="Text zur Korrektur hier einfügen..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button 
                  onClick={handleKorrektur}
                  disabled={!text || isAnalyzing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                  Text prüfen
                </button>

                {korrekturErgebnis && (
                  <div className="mt-8 space-y-4">
                    <h3 className="font-bold text-lg text-indigo-900">Analyse-Ergebnisse:</h3>
                    {korrekturErgebnis.fehler.map((f, i) => (
                      <div key={i} className="p-4 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg">
                        <span className="text-xs font-bold text-orange-600 uppercase">{f.typ}</span>
                        <p className="mt-1">Statt <span className="line-through text-red-500">{f.original}</span> besser: <span className="font-bold text-green-600">{f.korrektur}</span></p>
                        <p className="text-sm text-slate-500 mt-1 italic">{f.grund}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {!generierteAufgabe ? (
                  <div className="text-center py-10">
                    <Sparkles className="mx-auto text-indigo-300 mb-4" size={48} />
                    <h2 className="text-xl font-bold">Neues Training starten</h2>
                    <p className="text-slate-500 mb-6">Wähle einen Bereich, um eine Übung zu generieren.</p>
                    <button 
                      onClick={generateAufgabe}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-3 rounded-full font-bold shadow-lg"
                    >
                      Aufgabe generieren
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-6 bg-indigo-50 rounded-xl border-2 border-indigo-100">
                      <h3 className="font-bold text-xl text-indigo-900 mb-2">{generierteAufgabe.titel}</h3>
                      <p className="text-slate-700">{generierteAufgabe.kontext}</p>
                    </div>
                    <p className="font-semibold text-lg">{generierteAufgabe.frage}</p>
                    <div className="grid gap-3">
                      {generierteAufgabe.optionen.map((opt, i) => (
                        <button key={i} className="p-4 text-left border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all font-medium">
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
