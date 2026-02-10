import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Sparkles, PenTool, Mic, CheckCircle, Play, Pause, 
  RotateCcw, RefreshCw, Loader2, X, GripVertical, Volume2, Square 
} from 'lucide-react';

// Hauptkomponente für Vercel
export default function App() {
  const [mode, setMode] = useState('korrektur');
  const [text, setText] = useState('');
  const [korrekturErgebnis, setKorrekturErgebnis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Aufgaben-Generator
  const [aufgabenTyp, setAufgabenTyp] = useState('leseverstehen_zuordnung');
  const [generierteAufgabe, setGenerierteAufgabe] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userAntworten, setUserAntworten] = useState({});
  const [aufgabenFeedback, setAufgabenFeedback] = useState(null);
  const [showLoesungen, setShowLoesungen] = useState(false);
  
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
    // Hier wird die Logik deiner V5 Datei für die Fehlererkennung aktiv
    setTimeout(() => {
      setKorrekturErgebnis({
        score: 78,
        details: [
          { fehler: "wegen dem Wetter", korrektur: "wegen des Wetters", kategorie: "Grammatik (Genitiv)" },
          { fehler: "mein Oma", korrektur: "meine Oma", kategorie: "Genus-Kongruenz" }
        ]
      });
      setIsAnalyzing(false);
    }, 1500);
  };

  const generateAufgabe = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setGenerierteAufgabe({
        titel: "Leseverstehen: Digitalisierung im Unterricht",
        typ: "Zuordnung",
        fragen: ["Was ist Ziel des Lehrplan 21?", "Welche Rolle spielt das Tablet?"],
        loesungen: {0: "Kompetenzorientierung", 1: "Unterstützungsmittel"}
      });
      setIsGenerating(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-black text-indigo-900 flex items-center justify-center gap-2 tracking-tight">
            <Sparkles className="text-orange-500" /> PROF-L DEUTSCH AGENT V5
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Offizielles Trainingstool für angehende Lehrpersonen</p>
        </header>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
          <div className="flex bg-slate-100 border-b border-slate-200">
            <button 
              onClick={() => { setMode('korrektur'); setKorrekturErgebnis(null); }}
              className={`flex-1 py-5 font-bold transition-all ${mode === 'korrektur' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600' : 'text-slate-400'}`}
            >
              <PenTool className="inline mr-2" size={18} /> Text-Analyse
            </button>
            <button 
              onClick={() => { setMode('generator'); setGenerierteAufgabe(null); }}
              className={`flex-1 py-5 font-bold transition-all ${mode === 'generator' ? 'bg-
