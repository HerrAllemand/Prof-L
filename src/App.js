import React, { useState, useEffect, useRef } from 'react';
import { 
  PenTool, Sparkles, Play, RefreshCw, Loader2, GraduationCap, Square 
} from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState('korrektur');
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [korrekturErgebnis, setKorrekturErgebnis] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Diese Zeile ist jetzt absolut sicher:
  const API_KEY = "sk-...6UcA"; 

  const handleAnalyze = async () => {
    // Falls dein Key mit "sk-ant" beginnt, ist alles okay
    if (!text || !API_KEY.startsWith("sk-ant")) {
      alert("Bitte Text eingeben und sicherstellen, dass ein gültiger sk-ant... Key im Code steht.");
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
          messages: [{ role: "user", content: `Korrigiere für PROF-L: ${text}` }]
        })
      });
      const data = await response.json();
      setKorrekturErgebnis(data.content[0].text);
    } catch (e) {
      alert("KI-Fehler!");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border">
        <div className="bg-indigo-700 p-6 text-white text-center">
          <h1 className="text-2xl font-bold flex justify-center gap-2">
            <GraduationCap /> PROF-L AGENT
          </h1>
        </div>
        <div className="p-6">
          <textarea 
            className="w-full h-48 p-4 border rounded-xl mb-4 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Hier Text einfügen..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button 
            onClick={handleAnalyze} 
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            {isAnalyzing ? "KI analysiert..." : "Analyse starten"}
          </button>
          {korrekturErgebnis && (
            <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900">
              {korrekturErgebnis}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
