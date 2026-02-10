import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Sparkles, PenTool, Mic, CheckCircle, Play, Pause, 
  RotateCcw, RefreshCw, Loader2, X, Volume2, Square 
} from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState('korrektur');
  const [text, setText] = useState('');
  const [korrekturErgebnis, setKorrekturErgebnis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Aufgaben-Generator
  const [aufgabenTyp, setAufgabenTyp] = useState('leseverstehen_mc');
  const [generierteAufgabe, setGenerierteAufgabe] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userAntworten, setUserAntworten] = useState({});
  const [aufgabenFeedback, setAufgabenFeedback] = useState(null);
  
  // Audio
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const germanVoices = voices.filter(v => v.lang.startsWith('de'));
      setAvailableVoices(germanVoices.length > 0 ? germanVoices : voices.slice(0, 5));
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
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
        score: 72,
        hinweise: [
          { typ: 'Grammatik', fehler: 'mit der Kind', korrekt: 'mit dem Kind', regel: 'Dativ nach Präposition "mit"' },
          { typ: 'Orthografie', fehler: 'das selbe', korrekt: 'dasselbe', regel: 'Zusammenschreibung bei Demonstrativpronomen' }
        ]
      });
      setIsAnalyzing(false);
    }, 1500);
  };

  const generateAufgabe = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setGenerierteAufgabe({
        titel: "Leseverstehen: Inklusion an Schweizer Schulen",
        text: "Inklusion ist ein zentrales Thema im Lehrplan 21...",
        fragen: [
          { id: 1, q: "Was ist das Hauptziel des Textes?", options: ["Integration", "Ausschluss", "Finanzierung"], correct: 0 }
        ]
      });
      setIsGenerating(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-bold mb-4">
            <Sparkles size={16} /> PROF-L DEUTSCH AGENT V5
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Vorbereitungstool für Lehrpersonen</h1>
        </header>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
          <div className="flex bg-slate-50 border-b border-slate-200">
            <button 
              onClick={() => setMode('korrektur')}
              className={`flex-1 py-5 font-bold transition-all ${mode === 'korrektur' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <PenTool className="inline mr-2" size={20} /> Text-Analyse
            </button>
            <button 
              onClick={() => setMode('generator')}
              className={`flex-1 py-5 font-bold transition-all ${mode === 'generator' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <RefreshCw className="inline mr-2" size={20} /> Aufgaben-Trainer
            </button>
          </div>

          <div className="p-6 md:p-10">
            {mode === 'korrektur' ? (
              <div className="space-y-6">
                <div className="relative">
                  <textarea
                    className="w-full h-80 p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all text-lg leading-relaxed shadow-inner"
                    placeholder="Text hier zur Analyse einfügen..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  {text && (
                    <button 
                      onClick={() => setText('')}
                      className="absolute top-4 right-4 p-2 bg-slate-200 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <button 
                  onClick={handleKorrektur}
                  disabled={!text || isAnalyzing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" /> : <CheckCircle size={24} />}
                  ANALYSE STARTEN
                </button>

                {korrekturErgebnis && (
                  <div className="mt-10 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-xl font-bold flex items-center gap-2"><CheckCircle className="text-green-500" /> Analyse-Feedback:</h3>
                    <div className="grid gap-4">
                      {korrekturErgebnis.hinweise.map((h, i) => (
                        <div key={i} className="p-5 bg-indigo-50 border-l-8 border-indigo-500 rounded-xl">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-black uppercase text-indigo-400 tracking-widest">{h.typ}</span>
                          </div>
                          <p className="mt-2 text-lg">
                            Statt "<span className="text-red-500 line-through">{h.fehler}</span>" → <span className="font-bold text-green-600">{h.korrekt}</span>
                          </p>
                          <p className="text-sm text-slate-500 mt-2 italic">{h.regel}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                {!generierteAufgabe ? (
                  <div className="max-w-sm mx-auto">
                    <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
                      <Sparkles size={40} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Prüfungssimulation</h2>
                    <p className="text-slate-500 mb-8">Bereit für eine Übung zu Fachtexten, Hörverstehen oder Sprachhandeln?</p>
                    <button 
                      onClick={generateAufgabe}
                      className="bg-orange-500 hover:bg-orange-600 text-white w-full py-4 rounded-2xl font-black shadow-lg shadow-orange-100 transition-all active:scale-95"
                    >
                      AUFGABE GENERIEREN
                    </button>
                  </div>
                ) : (
                  <div className="text-left space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100">
                      <h3 className="font-black text-indigo-900 text-xl mb-3">{generierteAufgabe.titel}</h3>
                      <p className="text-slate-600 leading-relaxed">{generierteAufgabe.text}</p>
                    </div>
                    {generierteAufgabe.fragen.map((f, i) => (
                      <div key={i} className="space-y-4">
                        <p className="font-bold text-lg">{f.q}</p>
                        <div className="grid gap-3">
                          {f.options.map((opt, oi) => (
                            <button key={oi} className="p-4 text-left border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {text && (
          <div className="mt-8 bg-slate-900 text-white p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => isSpeaking ? window.speechSynthesis.cancel() : speakText(text)}
                className={`p-4 rounded-2xl transition-all ${isSpeaking ? 'bg-red-500' : 'bg-indigo-500 hover:bg-indigo-400'}`}
              >
                {isSpeaking ? <Square size={24} fill="white" /> : <Play size={24} fill="white" />}
              </button>
              <div>
                <p className="font-bold">Audio-Trainer</p>
                <p className="text-xs text-slate-400">Simulation des Hörverstehens</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-xl">
              <Volume2 size={18} className="text-slate-400" />
              <select 
                className="bg-transparent text-sm font-bold outline-none cursor-pointer"
                value={selectedVoiceIndex}
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
    </div>
  );
}
