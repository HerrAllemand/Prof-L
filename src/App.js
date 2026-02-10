import React, { useState, useEffect, useRef } from 'react'; // useRef korrekt importiert
import { 
  FileText, Sparkles, PenTool, CheckCircle, Play, 
  RefreshCw, Loader2, Volume2, Square, Search, GraduationCap, X, Pause
} from 'lucide-react';

export default function App() {
  // --- STATES ---
  const [mode, setMode] = useState('korrektur');
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [korrekturErgebnis, setKorrekturErgebnis] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);

  // Refs für Audio und Timer (verhindert Absturz)
  const speechRef = useRef(null);
  const timerRef = useRef(null);

  // --- API KEY KONFIGURATION ---
  // Hier deinen Key eintragen (sk-ant-...)
  const API_KEY = sk-...6UcA ; 

  // --- AUDIO LOGIK ---
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const german = voices.filter(v => v.lang.startsWith('de'));
      setAvailableVoices(german.length > 0 ? german : voices.slice(0, 5));
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const speakText = (content) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = 'de-DE';
    utterance.rate = 0.85;
    if (availableVoices[0]) utterance.voice = availableVoices[0];
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // --- KI ANALYSE FUNKTION ---
  const handleAnalyze = async () => {
    if (!text || API_KEY === "DEIN_ANTHROPIC_KEY_HIER") {
      alert("Bitte Text eingeben und API-Key im Code hinterlegen.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1024,
          messages: [{ role: "user", content: `Korrigiere diesen Text für die PROF-L Prüfung (Schweizer Kontext): ${text}` }]
        })
      });
      const data = await response.json();
      setKorrekturErgebnis(data.content[0].text);
    } catch (error) {
      console.error(error);
      alert("Fehler bei der Verbindung zur KI.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-center">
          <h1 className="text-3xl font-black text-indigo-900 flex items-center justify-center gap-3">
            <GraduationCap className="text-orange-500 w-10 h-10" /> PROF-L AGENT
          </h1>
          <p className="text-slate-500 font-medium">Schweizer Sprachprüfung für Lehrpersonen</p>
        </header>

        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
          <div className="flex bg-slate-50 p-2 gap-2">
            <button 
              onClick={() => setMode('korrektur')} 
              className={`flex-1 py-4 rounded-2xl font-bold transition-all ${mode === 'korrektur' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              <PenTool className="inline-block mr-2" /> Korrektur
            </button>
            <button 
              onClick={() => setMode('generator')} 
              className={`flex-1 py-4 rounded-2xl font-bold transition-all ${mode === 'generator' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              <RefreshCw className="inline-block mr-2" /> Generator
            </button>
          </div>

          <div className="p-6 md:p-10">
            {mode === 'korrektur' ? (
              <div className="space-y-6">
                <textarea 
                  className="w-full h-64 p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all text-lg" 
                  placeholder="Schülertext oder Entwurf hier einfügen..."
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                />
                <div className="flex gap-4">
                  <button 
                    onClick={handleAnalyze} 
                    disabled={isAnalyzing}
                    className="flex-[3] bg-indigo-600 text-white py-5 rounded-2xl font-bold text-xl hover:bg-indigo-700 shadow-lg disabled:bg-slate-300"
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin mx-auto" /> : "KI-Analyse starten"}
                  </button>
                  <button 
                    onClick={() => isSpeaking ? window.speechSynthesis.cancel() : speakText(text)}
                    className="flex-1 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center hover:bg-slate-50"
                  >
                    {isSpeaking ? <Square className="text-red-500 fill-red-500" /> : <Play className="text-indigo-600 fill-indigo-600" />}
                  </button>
                </div>

                {korrekturErgebnis && (
                  <div className="mt-8 p-6 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in fade-in">
                    <h3 className="font-bold text-indigo-900 text-xl mb-4">KI-Rückmeldung:</h3>
                    <div className="prose max-w-none whitespace-pre-wrap text-slate-700">
                      {korrekturErgebnis}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <Sparkles size={48} className="mx-auto text-indigo-200 mb-4" />
                <h3 className="text-xl font-bold text-slate-400">Aufgaben-Generator</h3>
                <p className="text-slate-400 max-w-xs mx-auto mt-2">Dieses Modul wird aktiviert, sobald ein gültiger API-Key hinterlegt ist.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
