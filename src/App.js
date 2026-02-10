import React, { useState, useEffect, useRef } from 'react'; // useRef hinzugefügt!
import { 
  FileText, Sparkles, PenTool, CheckCircle, Play, 
  RefreshCw, Loader2, Volume2, Square, Search, GraduationCap, X
} from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState('korrektur');
  const [text, setText] = useState('');
  const [korrekturErgebnis, setKorrekturErgebnis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Generator & Audio State
  const [aufgabenThema, setAufgabenThema] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generierteAufgabe, setGenerierteAufgabe] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const timerRef = useRef(null);
  const speechRef = useRef(null);

  // --- API FUNKTIONEN ---
  const analyzeText = async () => {
    if (!text) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-...6UcA', // <--- DEIN KEY
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true' 
        },
        body: JSON.stringify({
          model: "claude-3-sonnet-20240229",
          max_tokens: 1000,
          messages: [{ role: "user", content: `Korrigiere diesen Text für PROF-L: ${text}` }]
        })
      });
      const data = await response.json();
      setKorrekturErgebnis({ text: data.content[0].text });
    } catch (e) {
      alert("Fehler bei der KI-Anfrage. Hast du den API-Key eingetragen?");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- AUDIO LOGIK ---
  const speak = (t) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'de-DE';
    u.rate = 0.85;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  // --- UI ---
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-8 bg-white p-6 rounded-2xl shadow-sm border text-center">
        <h1 className="text-3xl font-bold text-indigo-900 flex justify-center items-center gap-2">
          <GraduationCap className="text-orange-500" /> PROF-L TRAINER
        </h1>
      </header>

      <main className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border">
        <div className="flex bg-slate-100 border-b">
          <button onClick={() => setMode('korrektur')} className={`flex-1 py-4 font-bold ${mode === 'korrektur' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-slate-500'}`}>
            <PenTool className="inline mr-2" size={18}/> Korrektur
          </button>
          <button onClick={() => setMode('generator')} className={`flex-1 py-4 font-bold ${mode === 'generator' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-slate-500'}`}>
            <Sparkles className="inline mr-2" size={18}/> Generator
          </button>
        </div>

        <div className="p-6 md:p-10">
          {mode === 'korrektur' ? (
            <div className="space-y-6">
              <textarea 
                className="w-full h-64 p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                placeholder="Text hier einfügen..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="flex gap-4">
                <button onClick={analyzeText} className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700">
                  {isAnalyzing ? "Analysiere..." : "KI-Korrektur starten"}
                </button>
                <button onClick={() => speak(text)} className="px-6 bg-slate-100 rounded-xl hover:bg-slate-200">
                  {isSpeaking ? <Square fill="black" /> : <Play fill="black" />}
                </button>
              </div>
              {korrekturErgebnis && (
                <div className="p-6 bg-green-50 rounded-2xl border border-green-200 animate-in fade-in">
                  <h3 className="font-bold text-green-800 mb-2">Ergebnis:</h3>
                  <p className="whitespace-pre-wrap">{korrekturErgebnis.text}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400">
              <RefreshCw className="mx-auto mb-4 animate-spin-slow" size={48} />
              <p>Generator-Modul bereit. API-Key erforderlich.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
