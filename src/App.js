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
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generierteAufgabe, setGenerierteAufgabe] = useState(null);
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const germanVoices = voices.filter(v => v.lang.startsWith('de') || v.name.includes('Deutsch'));
      setAvailableVoices(germanVoices.length > 0 ? germanVoices : voices.slice(0, 5));
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const speakText = (content) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    if (availableVoices[selectedVoiceIndex]) utterance.voice = availableVoices[selectedVoiceIndex];
    utterance.rate = 0.8; // Authentisches Prüfungstempo
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleKorrektur = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setKorrekturErgebnis({
        fehler: [
          { original: "mein Oma", korrekt: "meine Oma", grund: "Possessivpronomen (Genusfehler feminin)", typ: "Grammatik" },
          { original: "wegen dem Wetter", korrekt: "wegen des Wetters", grund: "Genitiv nach 'wegen'", typ: "Stil" }
        ],
        empfehlung: "Konzentrieren Sie sich auf die Kongruenz von Artikeln und Nomen."
      });
      setIsAnalyzing(false);
    }, 1500);
  };

  const generateAufgabe = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setGenerierteAufgabe({
        titel: "Szenario: Elternbrief",
        aufgabe: "Ein Kind hat wiederholt die Hausaufgaben vergessen. Verfassen Sie eine respektvolle E-Mail an die Eltern.",
        kriterien: ["Höflichkeitsform", "Klare Handlungsaufforderung", "Korrekter Kasus"]
      });
      setIsGenerating(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-indigo-900 flex items-center justify-center gap-2">
            <Sparkles className="text-orange-500" /> PROF-L Deutsch Agent V5
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Der professionelle Begleiter für angehende Lehrpersonen</p>
        </header>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
          <nav className="flex bg-slate-100 border-b border-slate-200">
            <button 
              onClick={() => setMode('korrektur')}
              className={`flex-1 py-5 font-bold transition-all ${mode === 'korrektur' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <PenTool className="inline mr-2" size={18} /> Text-Check
            </button>
            <button 
              onClick={() => setMode('generator')}
              className={`flex-1 py-5 font-bold transition-all ${mode === 'generator' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <RefreshCw className="inline mr-2" size={18} /> Aufgaben
            </button>
          </nav>

          <div className="p-6 md:p-10">
            {mode === 'korrektur' ? (
              <div className="space-y-6">
                <textarea
                  className="w-full h-64 p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all text-lg shadow-inner"
                  placeholder="Schülertext oder eigenen Entwurf hier einfügen..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button 
                  onClick={handleKorrektur}
                  disabled={!text || isAnalyzing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" /> : <CheckCircle size={24} />}
                  JETZT ANALYSIEREN
                </button>

                {korrekturErgebnis && (
                  <div className="mt-8 space-y-4 animate-in fade-in duration-500">
                    <h3 className="text-xl font-bold text-slate-800">Analyse-Feedback:</h3>
                    {korrekturErgebnis.fehler.map((f, i) => (
                      <div key={i} className="p-4 bg-orange-50 border-l-8 border-orange-400 rounded-r-xl shadow-sm">
                        <span className="text-xs font-bold uppercase text-orange-600 tracking-wider">{f.typ}</span>
                        <p className="mt-1 text-lg">Statt "<span className="text-red-500 line-through">{f.original}</span>" → <span className="font-bold text-green-600">{f.korrekt}</span></p>
                        <p className="text-sm text-slate-500 mt-1 italic">{f.grund}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10">
                {!generierteAufgabe ? (
                  <div className="space-y-6">
                    <div className="w-20 h-20 bg-indigo-100 text-indigo-600
