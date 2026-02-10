import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Sparkles, PenTool, Mic, CheckCircle, Play, Pause, 
  RotateCcw, RefreshCw, Loader2, X, GripVertical, Volume2, Square 
} from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState('korrektur');
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Audio State
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
    if (availableVoices[selectedVoiceIndex]) {
      utterance.voice = availableVoices[selectedVoiceIndex];
    }
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-indigo-900 flex items-center justify-center gap-3">
            <Sparkles className="text-yellow-500" /> PROF-L Agent V5
          </h1>
          <p className="text-gray-600 mt-2">Das Trainingstool für die professionelle Sprachprüfung</p>
        </header>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          <nav className="flex border-b">
            <button 
              onClick={() => setMode('korrektur')}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider ${mode === 'korrektur' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Korrektur-Modus
            </button>
            <button 
              onClick={() => setMode('generator')}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider ${mode === 'generator' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Aufgaben-Generator
            </button>
          </nav>

          <div className="p-6 md:p-10">
            {mode === 'korrektur' ? (
              <div className="space-y-6">
                <div className="relative">
                  <textarea
                    className="w-full h-80 p-6 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-lg"
                    placeholder="Füge hier den Text ein, den du analysieren möchtest..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => { setIsAnalyzing(true); setTimeout(() => setIsAnalyzing(false), 2000); }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                    PROF-L Check starten
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <RefreshCw size={48} className="mx-auto text-indigo-300 animate-spin-slow mb-4" />
                <h3 className="text-xl font-bold text-gray-800">Aufgaben-Generator bereit</h3>
                <p className="text-gray-500">Wähle ein Thema und erstelle eine neue Prüfungsaufgabe.</p>
                <button 
                  onClick={() => { setIsGenerating(true); setTimeout(() => setIsGenerating(false), 1500); }}
                  className="mt-6 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full font-bold transition-all"
                >
                  Neue Aufgabe generieren
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Audio Widget */}
        {text && (
          <div className="mt-6 bg-white p-4 rounded-2xl shadow-md border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => isSpeaking ? window.speechSynthesis.cancel() : speakText(text)}
                className={`p-4 rounded-full ${isSpeaking ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} hover:scale-105 transition-transform`}
              >
                {isSpeaking ? <Square fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} />}
              </button>
              <div>
                <p className="font-bold text-gray-800">Vorlese-Funktion</p>
                <p className="text-xs text-gray-500">Simuliere eine Hörübung</p>
              </div>
            </div>
            <select 
              className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none"
              onChange={(e) => setSelectedVoiceIndex(e.target.value)}
            >
              {availableVoices.map((voice, idx) => (
                <option key={idx} value={idx}>{voice.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
