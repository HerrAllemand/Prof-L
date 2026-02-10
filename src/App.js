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
  const [aufgabenThema, setAufgabenThema] = useState('');
  const [generierteAufgabe, setGenerierteAufgabe] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userAntworten, setUserAntworten] = useState({});
  const [aufgabenFeedback, setAufgabenFeedback] = useState(null);
  
  // Audio & Sprachausgabe State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [availableVoices, setAvailableVoices] = useState([]);

  // --- DATENBANK (Deine originalen Themen) ---
  const beispielThemen = [
    { thema: 'Elternbrief: Ankündigung Klassenlager', kategorie: 'lesen' },
    { thema: 'Schulhausordnung verstehen', kategorie: 'lesen' },
    { thema: 'Lehrplan 21: Kompetenzbereich Deutsch', kategorie: 'lesen' },
    { thema: 'Elterngespräch: Lernstand besprechen', kategorie: 'sprechen' },
    { thema: 'Kollegiumssitzung: Projekt vorstellen', kategorie: 'sprechen' },
    { thema: 'E-Mail an Schulleitung: Weiterbildung', kategorie: 'schreiben' },
    { thema: 'Radiobeitrag: Neue Medien', kategorie: 'hoeren' }
  ];

  const aufgabenTypen = [
    { id: 'lesen_fachtext_mc', label: '📖 Lesen: Fachtext + MC' },
    { id: 'hoeren_interview_mc', label: '🎧 Hören: Interview' },
    { id: 'schreiben_email', label: '✍️ Schreiben: E-Mail' },
    { id: 'sprechen_feedback_geben', label: '🎤 Sprechen: Feedback' }
  ];

  // --- AUDIO LOGIK ---
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Filter für deutsche Stimmen, bevorzugt Google oder Microsoft
      const germanVoices = voices.filter(v => v.lang.startsWith('de'));
      germanVoices.sort((a, b) => (a.name.includes('Google') || a.name.includes('Microsoft') ? -1 : 1));
      setAvailableVoices(germanVoices.length > 0 ? germanVoices : voices.slice(0, 5));
    };
    if ('speechSynthesis' in window) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const prepareTextForSpeech = (text) => {
    return text
      .replace(/\.\s+/g, '. ... ')      // Längere Pausen bei Punkten
      .replace(/SuS/g, 'Schülerinnen und Schüler')
      .replace(/LP/g, 'Lehrperson')
      .replace(/z\.B\./g, 'zum Beispiel');
  };

  const speakText = (content) => {
    window.speechSynthesis.cancel();
    const prepared = prepareTextForSpeech(content);
    const utterance = new SpeechSynthesisUtterance(prepared);
    if (availableVoices[selectedVoiceIndex]) utterance.voice = availableVoices[selectedVoiceIndex];
    utterance.rate = 0.85; // Langsames Prüfungstempo
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // --- LOGIK: ANALYSE & GENERATOR ---
  const handleKorrektur = () => {
    setIsAnalyzing(true);
    // Simulation einer echten Analyse (da keine API-Keys im Frontend sicher sind)
    setTimeout(() => {
      setKorrekturErgebnis({
        score: 75,
        niveau: "B2",
        fehler: [
          { original: "wegen dem Wetter", korrektur: "wegen des Wetters", grund: "Genitiv nach 'wegen'", typ: "Grammatik" },
          { original: "mein Oma", korrektur: "meine Oma", grund: "Possessivpronomen (Genusfehler)", typ: "Grammatik" }
        ],
        tipps: ["Achten Sie besonders auf den Kasus nach Präpositionen.", "Wiederholen Sie die Artikel bei Nomen."]
      });
      setIsAnalyzing(false);
    }, 1500);
  };

  const generateAufgabe = () => {
    if (!aufgabenThema) return;
    setIsGenerating(true);
    setGenerierteAufgabe(null);
    
    // Simuliert das Generieren einer Aufgabe basierend auf dem Typ
    setTimeout(() => {
      let neueAufgabe = {
        titel: `Aufgabe zu: ${aufgabenThema}`,
        typ: aufgabenTyp,
        zeit: "15 Min"
      };

      if (aufgabenTyp === 'lesen_fachtext_mc') {
        neueAufgabe.text = "Die Digitalisierung der Schule schreitet voran. Lehrplan 21 fordert Kompetenzen im Bereich Medien und Informatik. Doch die Ausstattung ist oft mangelhaft...";
        neueAufgabe.fragen = [
          { q: "Was fordert der Lehrplan 21?", options: ["Mehr Sport", "Medienkompetenz", "Weniger Hausaufgaben"], correct: 1 },
          { q: "Was ist ein Problem?", options: ["Zu viele Lehrer", "Mangelhafte Ausstattung", "Zu viel Geld"], correct: 1 }
        ];
      } else if (aufgabenTyp === 'schreiben_email') {
        neueAufgabe.aufgabe = "Sie möchten einen Experten für Medienpädagogik in Ihre Klasse einladen. Schreiben Sie eine formelle E-Mail (150 Wörter).";
        neueAufgabe.punkte = ["Anlass erklären", "Terminvorschläge machen", "Nach Kosten fragen"];
      } else {
        neueAufgabe.text = "Hier steht der Text für die gewählte Aufgabe...";
        neueAufgabe.aufgabe = "Bearbeiten Sie die Aufgabe gemäß der PROF-L Standards.";
      }

      setGenerierteAufgabe(neueAufgabe);
      setIsGenerating(false);
    }, 1000);
  };

  // --- UI RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-indigo-900 flex items-center justify-center gap-2">
            <Sparkles className="text-orange-500" /> PROF-L DEUTSCH AGENT
          </h1>
          <p className="text-slate-500 mt-2">Trainingstool für die professionelle Sprachprüfung</p>
        </header>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          {/* Navigation */}
          <div className="flex bg-slate-100 border-b border-slate-200">
            <button 
              onClick={() => setMode('korrektur')}
              className={`flex-1 py-5 font-bold transition-all flex justify-center items-center gap-2 ${mode === 'korrektur' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <PenTool size={18} /> Text-Korrektur
            </button>
            <button 
              onClick={() => setMode('generator')}
              className={`flex-1 py-5 font-bold transition-all flex justify-center items-center gap-2 ${mode === 'generator' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <RefreshCw size={18} /> Aufgaben-Generator
            </button>
          </div>

          <div className="p-6 md:p-10">
            {/* MODUS: KORREKTUR */}
            {mode === 'korrektur' && (
              <div className="space-y-6">
                <textarea
                  className="w-full h-64 p-5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-all text-lg font-mono shadow-inner"
                  placeholder="Fügen Sie hier Ihren Text ein..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button 
                  onClick={handleKorrektur}
                  disabled={!text || isAnalyzing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                  Text Analysieren
                </button>

                {korrekturErgebnis && (
                  <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-t-xl border-b border-indigo-100">
                      <h3 className="font-bold text-indigo-900">Ergebnis</h3>
                      <span className="bg-white px-3 py-1 rounded-full text-indigo-600 font-bold shadow-sm">Niveau {korrekturErgebnis.niveau}</span>
                    </div>
                    <div className="bg-white border-2 border-indigo-50 rounded-b-xl p-6 shadow-sm space-y-4">
                      {korrekturErgebnis.fehler.map((f, i) => (
                        <div key={i} className="p-3 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                          <span className="text-xs font-bold text-red-500 uppercase">{f.typ}</span>
                          <p className="mt-1"><s>{f.original}</s> ➝ <span className="font-bold text-green-600">{f.korrektur}</span></p>
                          <p className="text-sm text-slate-500 italic mt-1">{f.grund}</p>
                        </div>
                      ))}
                      <div className="mt-4 pt-4 border-t">
                        <p className="font-bold text-slate-700">Tipps:</p>
                        <ul className="list-disc pl-5 text-slate-600 mt-2">
                          {korrekturErgebnis.tipps.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODUS: GENERATOR */}
            {mode === 'generator' && (
              <div className="space-y-6">
                {!generierteAufgabe ? (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Aufgabentyp</label>
                        <select 
                          className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white"
                          value={aufgabenTyp}
                          onChange={(e) => setAufgabenTyp(e.target.value)}
                        >
                          {aufgabenTypen.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Thema wählen</label>
                        <select 
                          className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white"
                          value={aufgabenThema}
                          onChange={(e) => setAufgabenThema(e.target.value)}
                        >
                          <option value="">-- Thema wählen --</option>
                          {beispielThemen.map((t, i) => (
                            <option key={i} value={t.thema}>{t.thema}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button 
                      onClick={generateAufgabe}
                      disabled={!aufgabenThema || isGenerating}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                      Aufgabe Generieren
                    </button>
                  </div>
                ) : (
                  <div className="animate-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-indigo-900">{generierteAufgabe.titel}</h3>
                      <button onClick={() => setGenerierteAufgabe(null)} className="text-slate-400 hover:text-indigo-600 font-medium text-sm">Neues Thema</button>
                    </div>
                    
                    <div className="bg-slate-50 p-6 rounded-xl border-2 border-slate-100 mb-6">
                      {generierteAufgabe.text && <p className="mb-4 leading-relaxed text-slate-700">{generierteAufgabe.text}</p>}
                      <p className="font-bold text-slate-800">{generierteAufgabe.aufgabe}</p>
                    </div>

                    {generierteAufgabe.fragen && (
                      <div className="space-y-4">
                        {generierteAufgabe.fragen.map((f, i) => (
                          <div key={i} className="border-2 border-slate-100 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                            <p className="font-bold mb-3">{f.q}</p>
                            <div className="grid gap-2">
                              {f.options.map((opt, oi) => (
                                <button key={oi} className="text-left p-3 rounded-lg bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all">
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {generierteAufgabe.punkte && (
                      <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                        <p className="font-bold text-yellow-800 mb-2">Inhaltspunkte:</p>
                        <ul className="list-disc pl-5 space-y-1 text-yellow-900">
                          {generierteAufgabe.punkte.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* AUDIO PLAYER (Erscheint immer wenn Text vorhanden) */}
        {(text || generierteAufgabe?.text) && (
          <div className="mt-6 bg-slate-900 text-white p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <button 
                onClick={() => isSpeaking ? window.speechSynthesis.cancel() : speakText(text || generierteAufgabe.text)}
                className={`p-4 rounded-full transition-all ${isSpeaking ? 'bg-red-500 animate-pulse' : 'bg-indigo-500 hover:bg-indigo-400'}`}
              >
                {isSpeaking ? <Square size={20} fill="white" /> : <Play size={20} fill="white" />}
              </button>
              <div>
                <p className="font-bold">Vorlese-Funktion</p>
                <p className="text-xs text-slate-400">Optimiert für Prüfungstempo</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg w-full md:w-auto">
              <Volume2 size={16} className="text-slate-400 ml-2" />
              <select 
                className="bg-transparent text-sm font-bold outline-none cursor-pointer w-full"
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
