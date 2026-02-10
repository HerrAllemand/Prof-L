import React, { useState, useEffect, useRef } from 'react'; // useRef hinzugefügt
import { 
  FileText, Sparkles, PenTool, CheckCircle, Play, 
  RefreshCw, Loader2, Volume2, Square, Search, GraduationCap,
  Pause, SkipForward, BookOpen, MessageSquare, AlertTriangle
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
  
  // UI & Audio State
  const [themenSuche, setThemenSuche] = useState('');
  const [showMusterantwort, setShowMusterantwort] = useState(false);
  const [showLoesungen, setShowLoesungen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.85);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);

  // Refs für Timer und Audio
  const timerRef = useRef(null);
  const speechRef = useRef(null);

  // --- HIER FOLGEN DEINE DEFINITIONEN (voiceQualityRanking, prepareTextForSpeech, etc.) ---
  // (Ich überspringe den Teil der Helfer-Funktionen zur Kürze, sie bleiben wie in deinem Entwurf)

  // Vervollständigte generateAufgabe Funktion
  const generateAufgabe = async () => {
    if (!aufgabenThema.trim()) {
      alert("Bitte wählen Sie zuerst ein Thema aus.");
      return;
    }
    
    setIsGenerating(true);
    setGenerierteAufgabe(null);
    setUserAntworten({});
    setAufgabenFeedback(null);

    try {
      /* HINWEIS ZUR SICHERHEIT: 
         In einer echten App sollte dieser Request an dein EIGENES Backend gehen (z.B. Vercel Serverless Function),
         um den API-Key zu schützen.
      */
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'DEIN_API_KEY', // Nur im Backend verwenden!
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2500,
          messages: [{
            role: 'user', 
            content: `Erstelle eine PROF-L Übungsaufgabe zum Thema "${aufgabenThema}" für die Stufe ${aufgabenStufe}. 
            Typ: ${aufgabenTyp}. Schwierigkeit: ${aufgabenSchwierigkeit}.
            Antworte im JSON-Format mit den Feldern: titel, situation, aufgabe, artikel, fragen[], loesungen{}.`
          }]
        })
      });

      const data = await response.json();
      if (data.content && data.content[0]) {
        const parsed = JSON.parse(data.content[0].text);
        setGenerierteAufgabe(parsed);
      }
    } catch (error) {
      console.error("Generator Fehler:", error);
      setGenerierteAufgabe({ error: "Fehler beim Erstellen der Aufgabe. Bitte versuchen Sie es erneut." });
    } finally {
      setIsGenerating(false);
    }
  };

  const checkAufgabe = () => {
    let richtig = 0;
    const gesamt = Object.keys(generierteAufgabe.loesungen).length;
    
    Object.keys(userAntworten).forEach(nr => {
      if (userAntworten[nr]?.toLowerCase() === generierteAufgabe.loesungen[nr]?.toLowerCase()) {
        richtig++;
      }
    });

    const score = Math.round((richtig / gesamt) * 100);
    setAufgabenFeedback({ score, richtig, gesamt });
  };

  // Main Render Logic
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-900 flex items-center gap-2">
            <GraduationCap className="w-8 h-8" /> PROF-L Trainer
          </h1>
          <p className="text-gray-600">Professionelle Sprachprüfung für Lehrpersonen</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar / Auswahl */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" /> Modus wählen
            </h2>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setMode('korrektur')}
                className={`p-3 rounded-xl flex items-center gap-3 transition ${mode === 'korrektur' ? 'bg-blue-100 text-blue-700 border-2 border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <PenTool className="w-5 h-5" /> Text-Korrektur (KI)
              </button>
              <button 
                onClick={() => setMode('generator')}
                className={`p-3 rounded-xl flex items-center gap-3 transition ${mode === 'generator' ? 'bg-blue-100 text-blue-700 border-2 border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <Sparkles className="w-5 h-5" /> Aufgaben-Generator
              </button>
            </div>
          </section>

          {mode === 'generator' && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-left-4">
              <h3 className="font-semibold mb-3">Aufgaben-Konfiguration</h3>
              <select 
                value={aufgabenTyp} 
                onChange={(e) => setAufgabenTyp(e.target.value)}
                className="w-full p-2 mb-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="lesen_fachtext_mc">📖 Lesen: Fachtext + MC</option>
                <option value="hoeren_interview_mc">🎧 Hören: Interview + MC</option>
                <option value="schreiben_email">✍️ Schreiben: E-Mail</option>
              </select>
              
              <input 
                type="text" 
                placeholder="Thema (z.B. Elternabend)..."
                value={aufgabenThema}
                onChange={(e) => setAufgabenThema(e.target.value)}
                className="w-full p-2 mb-4 border rounded-lg"
              />

              <button 
                onClick={generateAufgabe}
                disabled={isGenerating || !aufgabenThema}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 flex justify-center items-center gap-2"
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : "Aufgabe generieren"}
              </button>
            </section>
          )}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          {mode === 'korrektur' ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
              <textarea 
                className="w-full h-64 p-4 border rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Füge hier deinen Text oder eine Schülerarbeit ein..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button 
                onClick={analyzeText}
                disabled={isAnalyzing || !text}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              >
                {isAnalyzing ? <Loader2 className="animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Analyse starten
              </button>

              {korrekturErgebnis && (
                <div className="mt-8 space-y-4 animate-in zoom-in-95 duration-300">
                   {/* Hier die Anzeige der Korrektur-Ergebnisse einbauen */}
                   <h3 className="text-xl font-bold">Analyseergebnis</h3>
                   <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                     <p>{korrekturErgebnis.gesamtbewertung}</p>
                   </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[500px]">
              {!generierteAufgabe && !isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                  <Sparkles className="w-16 h-16 mb-4 opacity-20" />
                  <p>Wähle ein Thema und klicke auf "Aufgabe generieren"</p>
                </div>
              ) : generierteAufgabe && (
                <div className="animate-in fade-in duration-500">
                  <h2 className="text-2xl font-bold text-blue-900 mb-2">{generierteAufgabe.titel}</h2>
                  <div className="bg-blue-50 p-4 rounded-xl mb-6">
                    <p className="font-medium text-blue-800">Situation:</p>
                    <p className="text-blue-700">{generierteAufgabe.situation}</p>
                  </div>
                  
                  <div className="prose max-w-none mb-8 p-6 bg-gray-50 rounded-xl border italic text-gray-800">
                    {generierteAufgabe.artikel}
                  </div>

                  {/* Interaktive Fragen */}
                  <div className="space-y-6">
                    {generierteAufgabe.fragen?.map((q, idx) => (
                      <div key={idx} className="p-4 border rounded-xl">
                        <p className="font-semibold mb-3">{q.nr}. {q.frage}</p>
                        <div className="grid gap-2">
                          {q.optionen.map((opt, oIdx) => (
                            <button 
                              key={oIdx}
                              onClick={() => setUserAntworten({...userAntworten, [q.nr]: opt.buchstabe})}
                              className={`text-left p-3 rounded-lg border transition ${userAntworten[q.nr] === opt.buchstabe ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
                            >
                              <span className="font-bold mr-2">{opt.buchstabe})</span> {opt.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {/* Feedback Bereich */}
                    {Object.keys(userAntworten).length > 0 && (
                      <button 
                        onClick={checkAufgabe}
                        className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold mt-4"
                      >
                        Ergebnis prüfen
                      </button>
                    )}

                    {aufgabenFeedback && (
                       <div className="p-6 bg-green-100 rounded-xl text-center border-2 border-green-400">
                          <p className="text-4xl font-black">{aufgabenFeedback.score}%</p>
                          <p>{aufgabenFeedback.richtig} von {aufgabenFeedback.gesamt} richtig beantwortet.</p>
                       </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
