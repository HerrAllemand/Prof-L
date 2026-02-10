import React, { useState, useEffect, useRef } from 'react'; 
import {
  FileText,
  Sparkles,
  PenTool,
  CheckCircle,
  Play,
  RefreshCw,
  Loader2,
  Volume2,
  Square,
  Search,
  GraduationCap,
  X,
  GripVertical,
  Pause,
  Mic,
  RotateCcw,
} from 'lucide-react';

function App() {
  // --- Ansicht
  const [mode, setMode] = useState('korrektur');

  // --- Textkorrektur
  const [text, setText] = useState('');
  const [korrekturErgebnis, setKorrekturErgebnis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- Aufgaben-Generator
  const [aufgabenTyp, setAufgabenTyp] = useState('lesen_artikel_zuordnung');
  const [aufgabenThema, setAufgabenThema] = useState('');
  const [aufgabenStufe, setAufgabenStufe] = useState('primar');
  const [aufgabenSchwierigkeit, setAufgabenSchwierigkeit] = useState('mittel');
  const [generierteAufgabe, setGenerierteAufgabe] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userAntworten, setUserAntworten] = useState({});
  const [aufgabenFeedback, setAufgabenFeedback] = useState(null);

  // --- Themen-Filter
  const [themenSuche, setThemenSuche] = useState('');

  // --- Lösungen / Muster
  const [showMusterantwort, setShowMusterantwort] = useState(false);
  const [showLoesungen, setShowLoesungen] = useState(false);

  // --- Sprechen (Timer)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sprechStarted, setSprechStarted] = useState(false);
  const timerRef = useRef(null);

  // --- TTS (Web Speech)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.85);
  const [hasListened, setHasListened] = useState(false);
  const [listenCount, setListenCount] = useState(0);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const speechRef = useRef(null);

  // -----------------------------
  // Stimmen laden & sortieren
  // -----------------------------
  const voiceQualityRanking = [
    // Premium
    'Google Deutsch',
    'Microsoft Katja',
    'Microsoft Stefan',
    'Microsoft Conrad',
    'Anna',
    'Helena',
    'Markus',
    // Fallbacks
    'German',
    'Deutsch',
    'de-DE',
    'de-CH',
    'de-AT',
  ];

  const scoreVoice = (v) => {
    const idx = voiceQualityRanking.findIndex(
      (q) => v.name.includes(q) || v.lang.includes(q)
    );
    return idx === -1 ? 999 : idx;
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      let german = voices.filter(
        (v) =>
          v.lang?.toLowerCase().startsWith('de') ||
          v.name?.toLowerCase().includes('german') ||
          v.name?.toLowerCase().includes('deutsch')
      );
      german.sort((a, b) => scoreVoice(a) - scoreVoice(b));
      const finalVoices = german.length > 0 ? german : voices.slice(0, 8);
      setAvailableVoices(finalVoices);
      if (finalVoices.length > 0) setSelectedVoiceIndex(0);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // -----------------------------
  // Dialog-Erkennung & Parsing
  // -----------------------------
  const isDialogue = (t) => {
    // Erkenne Zeilen im Format "Name: ..."
    const re = /^([A-ZÄÖÜ][\wÄÖÜäöüß\s]{0,40}):\s.+/m;
    return re.test(t);
  };

  const parseDialogue = (t) => {
    const lines = String(t).split('\n');
    const segments = [];
    let currentSpeaker = null;
    let currentText = '';
    const speakers = new Set();

    const speakerRe = /^([A-Za-zÄÖÜäöüß\s]+):\s*(.*)$/;

    const pushSegment = () => {
      if (currentSpeaker && currentText.trim()) {
        segments.push({ speaker: currentSpeaker, text: currentText.trim() });
        currentText = '';
      }
    };

    for (const line of lines) {
      const m = line.match(speakerRe);
      if (m) {
        // vorherigen Block abschließen
        pushSegment();
        currentSpeaker = m[1].trim();
        currentText = m[2] || '';
        speakers.add(currentSpeaker);
      } else if (currentSpeaker) {
        currentText += (currentText ? ' ' : '') + line.trim();
      } else if (line.trim()) {
        // Erzähler-Fall (kein Sprecher vorangestellt)
        segments.push({ speaker: 'Erzähler', text: line.trim() });
      }
    }
    pushSegment();
    return { segments, speakers: Array.from(speakers) };
  };

  // -----------------------------
  // TTS-Text vorbereiten
  // -----------------------------
  const prepareTextForSpeech = (t) => {
    return String(t)
      // Pausen an Satzzeichen
      .replace(/\.\s+/g, '. ... ')
      .replace(/!\s+/g, '! ... ')
      .replace(/\?\s+/g, '? ... ')
      .replace(/,\s+/g, ', .. ')
      .replace(/;\s+/g, '; .. ')
      .replace(/:\s+/g, ': . ')
      .replace(/\s+[-–—]\s+/g, ' ... ')
      .replace(/\(/g, '.. (')
      .replace(/\)/g, ') .. ')
      // Einheiten/Zahlen
      .replace(/(\d+)%/g, '$1 Prozent')
      .replace(/(\d+)€/g, '$1 Euro')
      .replace(/(\d+)\s*CHF/g, '$1 Schweizer Franken')
      .replace(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g, '$1. $2. $3')
      .replace(/(\d{1,2}):(\d{2})\s*Uhr/g, '$1 Uhr $2')
      .replace(/(\d+)\s*Uhr/g, '$1 Uhr')
      .replace(/(\d+)\s*km\b/g, '$1 Kilometer')
      .replace(/(\d+)\s*m\b/g, '$1 Meter')
      .replace(/(\d+)\s*kg\b/g, '$1 Kilogramm')
      .replace(/(\d+)\s*g\b/g, '$1 Gramm')
      .replace(/(\d+)\s*l\b/g, '$1 Liter')
      .replace(/(\d+)\s*ml\b/g, '$1 Milliliter')
      .replace(/(\d+)\s*min\b/g, '$1 Minuten')
      .replace(/(\d+)\s*h\b/g, '$1 Stunden')
      // Abkürzungen
      .replace(/\bz\.\s*B\./gi, 'zum Beispiel')
      .replace(/\bbzw\./gi, 'beziehungsweise')
      .replace(/\busw\./gi, 'und so weiter')
      .replace(/\betc\./gi, 'et cetera')
      .replace(/\bca\./gi, 'circa')
      .replace(/\bd\.\s*h\./gi, 'das heisst')
      .replace(/\bu\.\s*a\./gi, 'unter anderem')
      .replace(/\bv\.\s*a\./gi, 'vor allem')
      .replace(/\bz\.\s*T\./gi, 'zum Teil')
      .replace(/\bs\.\s*o\./gi, 'siehe oben')
      .replace(/\bs\.\s*u\./gi, 'siehe unten')
      .replace(/\bggf\./gi, 'gegebenenfalls')
      .replace(/\bbzgl\./gi, 'bezüglich')
      .replace(/\binkl\./gi, 'inklusive')
      .replace(/\bexkl\./gi, 'exklusive')
      .replace(/\bevtl\./gi, 'eventuell')
      .replace(/\bmax\./gi, 'maximal')
      .replace(/\bmin\./gi, 'minimal')
      .replace(/\bNr\./g, 'Nummer')
      .replace(/\bTel\./g, 'Telefon')
      .replace(/\bStr\./g, 'Strasse')
      .replace(/\bProf\./g, 'Professor')
      .replace(/\bDr\./g, 'Doktor')
      .replace(/\bHerr\s+/g, 'Herr .. ')
      .replace(/\bFrau\s+/g, 'Frau .. ')
      // Schweizer Schulbegriffe (Aussprache-Helferlein)
      .replace(/SuS/g, 'Schülerinnen und Schüler')
      .replace(/\bLP\b/g, 'Lehrperson')
      .replace(/\bKLP\b/g, 'Klassenlehrperson')
      .replace(/\bSHP\b/g, 'Schulische Heilpädagogin')
      .replace(/\bDAZ\b/gi, 'Deutsch als Zweitsprache')
      .replace(/\bIF\b/g, 'Integrative Förderung')
      .replace(/\bSSA\b/g, 'Schulsozialarbeit')
      .replace(/\bSPD\b/g, 'Schulpsychologischer Dienst')
      // Betonungen
      .replace(
        /\b(wichtig|achtung|bitte|unbedingt|dringend)\b/gi,
        '.. $1'
      )
      .replace(/\b(erstens|zweitens|drittens|viertens|fünftens)\b/gi, '.. $1 ..')
      .replace(/\b(einerseits|andererseits)\b/gi, '.. $1')
      .replace(/\b(jedoch|allerdings|dennoch|trotzdem)\b/gi, '.. $1')
      .replace(/\b(zusammenfassend|abschliessend|schliesslich)\b/gi, '... $1')
      // Aufzählungen
      .replace(/•\s*/g, '.. ')
      .replace(/^\s*-\s*/gm, '.. ')
      .replace(/^\s*\d+\.\s*/gm, '.. ')
      // Whitespace säubern
      .replace(/\s+/g, ' ')
      .trim();
  };

  // -----------------------------
  // Voice-Preview
  // -----------------------------
  const playVoicePreview = (voiceIndex) => {
    if (isPreviewPlaying || isSpeaking) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    setIsPreviewPlaying(true);
    const previewText =
      'Guten Tag, ich bin eine Stimme für Ihre Hörübungen. So klinge ich bei der Wiedergabe.';
    const u = new SpeechSynthesisUtterance(previewText);
    u.lang = 'de-DE';
    u.rate = speechRate;
    u.pitch = 1;
    u.volume = 1;
    if (availableVoices[voiceIndex]) u.voice = availableVoices[voiceIndex];
    u.onend = () => setIsPreviewPlaying(false);
    u.onerror = () => setIsPreviewPlaying(false);
    window.speechSynthesis.speak(u);
  };

  const stopPreview = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsPreviewPlaying(false);
  };

  // -----------------------------
  // TTS Play/Pause/Stop
  // -----------------------------
  const speakText = (raw) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Ihr Browser unterstützt keine Sprachausgabe.');
      return;
    }
    window.speechSynthesis.cancel();
    setIsPaused(false);

    const dialogueDetected = isDialogue(raw);

    if (dialogueDetected && availableVoices.length >= 2) {
      const { segments, speakers } = parseDialogue(raw);
      const speakerVoices = {};
      speakers.forEach((speaker, i) => {
        speakerVoices[speaker] = availableVoices[i % availableVoices.length];
      });

      let idx = 0;
      const speakNext = () => {
        if (idx >= segments.length) {
          setIsSpeaking(false);
          setHasListened(true);
          setListenCount((p) => p + 1);
          return;
        }
        const seg = segments[idx];
        const prepared = prepareTextForSpeech(seg.text);
        const u = new SpeechSynthesisUtterance(prepared);
        u.lang = 'de-DE';
        u.rate = speechRate;
        u.pitch = idx % 2 === 0 ? 1.1 : 0.9;
        u.volume = 1;
        u.voice = speakerVoices[seg.speaker] || availableVoices[0];
        u.onend = () => {
          idx += 1;
          setTimeout(speakNext, 600); // längere Pause zwischen Sprechern
        };
        u.onerror = (e) => {
          console.error('Speech error:', e);
          setIsSpeaking(false);
        };
        speechRef.current = u;
        window.speechSynthesis.speak(u);
      };
      setIsSpeaking(true);
      speakNext();
    } else {
      const prepared = prepareTextForSpeech(raw);
      const u = new SpeechSynthesisUtterance(prepared);
      u.lang = 'de-DE';
      u.rate = speechRate;
      u.pitch = 1;
      u.volume = 1;
      if (availableVoices[selectedVoiceIndex]) {
        u.voice = availableVoices[selectedVoiceIndex];
      }
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => {
        setIsSpeaking(false);
        setHasListened(true);
        setListenCount((p) => p + 1);
      };
      u.onerror = (e) => {
        console.error('Speech error:', e);
        setIsSpeaking(false);
      };
      speechRef.current = u;
      window.speechSynthesis.speak(u);
    }
  };

  const pauseSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const stopSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  // -----------------------------
  // Prüfungs-Typen (gekürzt – deine Inhalte bleiben)
  // -----------------------------
  const aufgabenTypen = [
    // Lesen
    { id: 'lesen_fachtext_mc', label: '📖 Lesen: Fachtext + Multiple Choice', kategorie: 'lesen', beschreibung: 'Fachtext (500–700 Wörter) mit 6 MC-Fragen' },
    { id: 'lesen_artikel_zuordnung', label: '📖 Lesen: Artikel + Zuordnung', kategorie: 'lesen', beschreibung: 'Zeitungsartikel, Aussagen → Abschnitte zuordnen' },
    // Hören
    { id: 'hoeren_interview_mc', label: '🎧 Hören: Interview + Multiple Choice', kategorie: 'hoeren', beschreibung: 'Radiointerview (2–3 Min) mit 5 MC-Fragen' },
    { id: 'hoeren_gespraech_zuordnung', label: '🎧 Hören: Gespräch + Zuordnung', kategorie: 'hoeren', beschreibung: 'Dialog (2–4 Min), Aussagen → Person A/B' },
    // Sprechen
    { id: 'sprechen_unterricht_strukturieren', label: '🎤 Sprechen: Unterricht strukturieren', kategorie: 'sprechen', beschreibung: 'Ablauf erklären (1–2 Min)' },
    { id: 'sprechen_feedback_geben', label: '🎤 Sprechen: Feedback geben', kategorie: 'sprechen', beschreibung: 'Positives + Tipps' },
    { id: 'sprechen_praesentation', label: '🎤 Sprechen: Thema präsentieren', kategorie: 'sprechen', beschreibung: 'Mit Grafik (2–3 Min)' },
    // Schreiben
    { id: 'schreiben_arbeitsblatt', label: '✍️ Schreiben: Arbeitsblatt erstellen', kategorie: 'schreiben', beschreibung: 'Wortschatz, Lückentext, Partneraufgabe' },
    { id: 'schreiben_email', label: '✍️ Schreiben: E-Mail verfassen', kategorie: 'schreiben', beschreibung: 'Formell/professionell' },
    { id: 'schreiben_korrektur_feedback', label: '✍️ Schreiben: Text korrigieren + Feedback', kategorie: 'schreiben', beschreibung: 'Lernendentext korrigieren' },
    { id: 'schreiben_text_vereinfachen', label: '✍️ Schreiben: Text vereinfachen', kategorie: 'schreiben', beschreibung: 'Kürzen, vereinfachen, Fragen' },
    // Gespräch
    { id: 'gespraech_simulation', label: '🎭 Gespräch: Unterrichtssimulation', kategorie: 'gespraech', beschreibung: 'Material interaktiv erarbeiten' },
    { id: 'gespraech_fachgespraech', label: '🎭 Gespräch: Fachgespräch', kategorie: 'gespraech', beschreibung: 'Problem analysieren & Massnahmen' },
  ];

  // (Deine großen Material/Beispiel-Objekte lasse ich der Länge wegen aus – füge sie hier 1:1 wieder ein.)

  // -----------------------------
  // Hilfsfunktionen für Filter/Anzeige
  // -----------------------------
  const getKategorieFromAufgabenTyp = () => {
    if (aufgabenTyp.startsWith('lesen_')) return 'lesen';
    if (aufgabenTyp.startsWith('hoeren_')) return 'hoeren';
    if (aufgabenTyp.startsWith('schreiben_')) return 'schreiben';
    if (aufgabenTyp.startsWith('sprechen_')) return 'sprechen';
    if (aufgabenTyp.startsWith('gespraech_')) return 'gespraech';
    return 'alle';
  };

  const getSubkategorieFromAufgabenTyp = () => {
    // Schreiben
    if (aufgabenTyp === 'schreiben_arbeitsblatt') return 'arbeitsblatt';
    if (aufgabenTyp === 'schreiben_email') return 'email';
    if (aufgabenTyp === 'schreiben_korrektur_feedback') return 'korrektur';
    if (aufgabenTyp === 'schreiben_text_vereinfachen') return 'arbeitsblatt';
    // Sprechen
    if (aufgabenTyp === 'sprechen_unterricht_strukturieren') return 'unterricht';
    if (aufgabenTyp === 'sprechen_feedback_geben') return 'feedback';
    if (aufgabenTyp === 'sprechen_praesentation') return 'praesentation';
    // Gespräch
    if (aufgabenTyp === 'gespraech_simulation') return 'simulation';
    if (aufgabenTyp === 'gespraech_fachgespraech') return 'fachgespraech';
    return null;
  };

  const aktuelleKategorie = getKategorieFromAufgabenTyp();
  const aktuelleSubkategorie = getSubkategorieFromAufgabenTyp();

  // (Themenliste und Filter übernehmen – gekürzt)
  const beispielThemen = [
    { thema: 'Elternbrief: Ankündigung Klassenlager', kategorie: 'lesen', icon: '📖' },
    // ...
  ];

  const gefilterteThemen = beispielThemen.filter((t) => {
    const matchKategorie = aktuelleKategorie === 'alle' || t.kategorie === aktuelleKategorie;
    let matchSubkategorie = true;
    if (aktuelleSubkategorie && t.subkategorie) {
      matchSubkategorie = t.subkategorie === aktuelleSubkategorie;
    } else if (aktuelleSubkategorie && !t.subkategorie) {
      matchSubkategorie = false;
    }
    const matchSuche = t.thema.toLowerCase().includes(themenSuche.toLowerCase());
    return matchKategorie && matchSubkategorie && matchSuche;
  });

  // -----------------------------
  // API: Textkorrektur (Anthropic)
  // -----------------------------
  const analyzeText = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setKorrekturErgebnis(null);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ⚠️ In Produktion niemals den Key im Browser ausliefern!
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022', // stabiler Modellname
          max_tokens: 3000,
          messages: [
            {
              role: 'user',
              content: `Du bist ein PROF-L Prüfungsexperte ... (dein ursprünglicher Prompt hier 1:1) ... 
WICHTIG: Antworte NUR mit einem gültigen JSON-Objekt.
Text zur Analyse:
"""
${text}
"""`,
            },
          ],
        }),
      });

      const data = await res.json();

      // Erwartet reine JSON-Antwort – robust parsen:
      let payload = null;
      if (data?.content?.[0]?.type === 'text') {
        const raw = data.content[0].text.trim();
        try {
          payload = JSON.parse(raw);
        } catch {
          // Fallback: JSON-Gehäuse herausfiltern
          const m = raw.match(/\{[\s\S]*\}$/);
          if (m) payload = JSON.parse(m[0]);
        }
      }

      if (payload) {
        setKorrekturErgebnis(payload);
      } else if (data?.error) {
        setKorrekturErgebnis({ error: `API-Fehler: ${data.error?.message || 'Unbekannter Fehler'}` });
      } else {
        setKorrekturErgebnis({ error: 'Ungültige Antwort vom Server.' });
      }
    } catch (e) {
      console.error(e);
      setKorrekturErgebnis({ error: `Verbindungsfehler: ${e.message}` });
    }
    setIsAnalyzing(false);
  };

  // -----------------------------
  // API: Aufgaben-Generator (dein langer Prompt – strukturell unverändert)
  // -----------------------------
  const generateAufgabe = async () => {
    if (!aufgabenThema.trim()) return;
    setIsGenerating(true);
    setGenerierteAufgabe(null);
    setUserAntworten({});
    setAufgabenFeedback(null);
    setSprechStarted(false);
    setRecordingTime(0);
    setHasListened(false);
    setListenCount(0);
    setShowMusterantwort(false);
    setShowLoesungen(false);
    stopSpeech();

    // ... (Deine bisherige Logik für authentische Vorlagen etc. hier einfügen – unverändert)
    // WICHTIG: Stelle sicher, dass du abschließend `aufgabe.typ = aufgabenTyp;` setzt.

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: `Du bist ein PROF-L Prüfungsexperte. Erstelle eine authentische Prüfungsaufgabe.
AUFGABENTYP: ${aufgabenTypen.find((t) => t.id === aufgabenTyp)?.label}
THEMA: ${aufgabenThema}
ZIELSTUFE: ${aufgabenStufe === 'primar' ? 'Primarstufe (Zyklus 1 & 2)' : 'Sekundarstufe I (Zyklus 3)'}
SCHWIERIGKEIT: ${aufgabenSchwierigkeit}
... (deine restlichen Instruktionen & JSON-Formate 1:1 hier einsetzen) ...`,
            },
          ],
        }),
      });

      const data = await res.json();
      let payload = null;
      if (data?.content?.[0]?.type === 'text') {
        const raw = data.content[0].text.trim();
        try {
          payload = JSON.parse(raw);
        } catch {
          const m = raw.match(/\{[\s\S]*\}$/);
          if (m) payload = JSON.parse(m[0]);
        }
      }
      if (payload) {
        payload.typ = aufgabenTyp; // Konsistent für die Anzeige-Logik
        setGenerierteAufgabe(payload);
      } else if (data?.error) {
        setGenerierteAufgabe({ error: `API-Fehler: ${data.error?.message || JSON.stringify(data.error)}` });
      } else {
        setGenerierteAufgabe({ error: `Unerwartete Antwort: ${JSON.stringify(data)}` });
      }
    } catch (e) {
      console.error(e);
      setGenerierteAufgabe({ error: `Verbindungsfehler: ${e.message}` });
    }
    setIsGenerating(false);
  };

  // -----------------------------
  // Auswertung
  // -----------------------------
  const checkAufgabe = () => {
    if (!generierteAufgabe?.loesungen) return;
    let richtig = 0;
    const results = {};
    const total = Object.keys(generierteAufgabe.loesungen).length;

    Object.keys(generierteAufgabe.loesungen).forEach((nr) => {
      const userAnswer = (userAntworten[nr] || '').toString().trim().toLowerCase();
      const correctAnswer = generierteAufgabe.loesungen[nr].toString().toLowerCase();
      const isCorrect = userAnswer === correctAnswer;
      results[nr] = { user: userAntworten[nr], correct: generierteAufgabe.loesungen[nr], isCorrect };
      if (isCorrect) richtig += 1;
    });

    setAufgabenFeedback({ results, score: Math.round((richtig / total) * 100), richtig, gesamt: total });
  };

  // -----------------------------
  // Timer/Recording (nur Anzeige)
  // -----------------------------
  const startSprechaufgabe = () => {
    setSprechStarted(true);
    setRecordingTime(0);
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      clearInterval(timerRef.current);
    } else {
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // -----------------------------
  // Drag & Drop Themen
  // -----------------------------
  const handleThemaSelect = (thema) => setAufgabenThema(thema);
  const handleDragStart = (e, thema) => e.dataTransfer.setData('text/plain', thema);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const thema = e.dataTransfer.getData('text/plain');
    setAufgabenThema(thema);
  };

  // -----------------------------
  // Hilfsflags für Anzeige
  // -----------------------------
  const isHoeren = (generierteAufgabe?.typ || '').startsWith('hoeren_');
  const isSprechen = (generierteAufgabe?.typ || '').startsWith('sprechen_');
  const isGespraech = (generierteAufgabe?.typ || '').startsWith('gespraech_');

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-500 p-2 rounded-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">PROF-L Deutsch Agent</h1>
              <p className="text-gray-500 text-sm">
                Prüfungsvorbereitung für angehende Lehrpersonen • Deutsch als Fremdsprache
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'korrektur', icon: FileText, label: 'Textkorrektur' },
              { id: 'generator', icon: RefreshCw, label: 'Aufgaben generieren' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setMode(item.id);
                  setKorrekturErgebnis(null);
                  setGenerierteAufgabe(null);
                }}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                  mode === item.id ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 hover:bg-orange-100 text-gray-700'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* --- TEXTKORREKTUR --- */}
        {mode === 'korrektur' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                Textkorrektur für PROF-L
              </h2>
              <p className="text-gray-600 mb-4">
                Geben Sie Ihren deutschen Text ein. Der Agent analysiert Fehler und gibt Ihnen Feedback zur Verbesserung Ihrer
                Sprachkompetenz für die PROF-L Prüfung.
              </p>

              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-orange-600">
                  <strong>Tipp:</strong> Üben Sie mit prüfungsrelevanten Textsorten wie Elternbriefen, Klassenlager-Ankündigungen
                  oder Kollegennachrichten.
                </p>
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Ihren Text hier eingeben...
Beispiel:
Liebe Eltern, ich möchte Ihnen mitteilen, dass wir nächste Woche einen Ausflug ins Museum machen werden. Die Kinder sollen bitte ein Znüni und eine Jacke mitbringen...`}
                className="w-full h-48 p-4 border-2 rounded-lg resize-none focus:border-orange-500 focus:outline-none"
              />

              <button
                onClick={analyzeText}
                disabled={!text.trim() || isAnalyzing}
                className="w-full mt-4 bg-orange-500 text-white py-3 rounded-lg font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2 hover:bg-orange-600"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analysiere...
                  </>
                ) : (
                  <>
                    <PenTool className="w-5 h-5" />
                    Text analysieren
                  </>
                )}
              </button>
            </div>

            {korrekturErgebnis && !korrekturErgebnis.error && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-red-600">
                    Gefundene Fehler ({korrekturErgebnis.fehler?.length || 0})
                  </h3>
                  {korrekturErgebnis.fehler?.map((f, i) => (
                    <div key={i} className="border-2 border-red-100 rounded-lg p-4 mb-3 bg-red-50">
                      <div className="flex items-start gap-3">
                        <div className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p>
                            <span className="line-through text-red-600">{f.original}</span> →{' '}
                            <span className="text-green-600 font-semibold">{f.korrektur}</span>
                          </p>
                          <p className="text-sm text-gray-600 mt-1">{f.erklaerung}</p>
                          <span className="inline-block mt-2 px-2 py-1 bg-gray-200 rounded text-xs">{f.kategorie}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                    <h3 className="font-semibold text-green-800 mb-2">✓ Stärken</h3>
                    <ul className="text-sm">
                      {korrekturErgebnis.staerken?.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-amber-50 rounded-xl p-6 border-2 border-amber-200">
                    <h3 className="font-semibold text-amber-800 mb-2">💡 Tipps für die PROF-L Prüfung</h3>
                    <ul className="text-sm">
                      {korrekturErgebnis.tipps?.map((t, i) => (
                        <li key={i}>• {t}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-xl p-6 border-2 border-orange-200">
                  <h3 className="font-semibold text-orange-600">Gesamtbewertung</h3>
                  <p className="mt-2">{korrekturErgebnis.gesamtbewertung}</p>
                  {korrekturErgebnis.texttyp_empfehlung && (
                    <p className="mt-2 text-sm text-gray-600">
                      <strong>Passender PROF-L Texttyp:</strong> {korrekturErgebnis.texttyp_empfehlung}
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Sprachniveau</p>
                      <p className="text-xl font-bold text-orange-500">{korrekturErgebnis.profl_niveau || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Bestehenschance</p>
                      <p
                        className={`text-xl font-bold ${
                          korrekturErgebnis.bestandenschaetzung === 'hoch'
                            ? 'text-green-600'
                            : korrekturErgebnis.bestandenschaetzung === 'mittel'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {korrekturErgebnis.bestandenschaetzung || 'N/A'}
                      </p>
                    </div>
                    {korrekturErgebnis.punkte_schaetzung && (
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Punkte (ca.)</p>
                        <p className="text-xl font-bold text-blue-600">{korrekturErgebnis.punkte_schaetzung}</p>
                      </div>
                    )}
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Fehleranzahl</p>
                      <p className="text-xl font-bold text-red-500">{korrekturErgebnis.fehler?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {korrekturErgebnis?.error && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
                <p className="text-red-700">{korrekturErgebnis.error}</p>
              </div>
            )}
          </div>
        )}

        {/* --- AUFGABEN-GENERATOR (Einstieg) --- */}
        {mode === 'generator' && !generierteAufgabe && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-orange-500" />
              Neue Aufgabe generieren
            </h2>
            <p className="text-gray-600 mb-6">Erstellen Sie authentische PROF-L Übungsaufgaben basierend auf der offiziellen Prüfungsstruktur.</p>

            {/* Auswahl-Typ */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Prüfungsteil & Aufgabentyp:</label>
                <select
                  value={aufgabenTyp}
                  onChange={(e) => setAufgabenTyp(e.target.value)}
                  className="w-full p-3 border-2 rounded-lg text-sm"
                >
                  <optgroup label="📖 TEIL 1A: LESEN">
                    {aufgabenTypen
                      .filter((t) => t.id.startsWith('lesen_'))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="🎧 TEIL 1B: HÖREN">
                    {aufgabenTypen
                      .filter((t) => t.id.startsWith('hoeren_'))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="🎤 TEIL 1C: SPRECHEN">
                    {aufgabenTypen
                      .filter((t) => t.id.startsWith('sprechen_'))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="✍️ TEIL 1D: SCHREIBEN">
                    {aufgabenTypen
                      .filter((t) => t.id.startsWith('schreiben_'))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="🎭 TEIL 2: PRÜFUNGSGESPRÄCH">
                    {aufgabenTypen
                      .filter((t) => t.id.startsWith('gespraech_'))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                  </optgroup>
                </select>

                {aufgabenTypen.find((t) => t.id === aufgabenTyp)?.beschreibung && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>ℹ️ Format:</strong> {aufgabenTypen.find((t) => t.id === aufgabenTyp)?.beschreibung}
                    </p>
                  </div>
                )}
              </div>

              {/* Stufe */}
              <div>
                <label className="block text-sm font-medium mb-2">Zielstufe:</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAufgabenStufe('primar')}
                    className={`flex-1 p-3 rounded-lg border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                      aufgabenStufe === 'primar' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <span className="text-xl">🏫</span>
                    <div className="text-left">
                      <div>Primarstufe</div>
                      <div className="text-xs font-normal text-gray-500">Zyklus 1 & 2</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setAufgabenStufe('sek1')}
                    className={`flex-1 p-3 rounded-lg border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                      aufgabenStufe === 'sek1' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <span className="text-xl">🎓</span>
                    <div className="text-left">
                      <div>Sekundarstufe I</div>
                      <div className="text-xs font-normal text-gray-500">Zyklus 3</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Thema */}
              <div>
                <label className="block text-sm font-medium mb-2">Gewähltes Thema:</label>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`relative p-4 border-2 border-dashed rounded-lg min-h-16 flex items-center ${
                    aufgabenThema ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  {aufgabenThema ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-orange-700">{aufgabenThema}</span>
                      <button onClick={() => setAufgabenThema('')} className="p-1 hover:bg-orange-200 rounded">
                        <X className="w-4 h-4 text-orange-600" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400">Thema hierher ziehen oder unten auswählen...</span>
                  )}
                </div>
              </div>

              {/* Schwierigkeit */}
              <div>
                <label className="block text-sm font-medium mb-2">Schwierigkeit:</label>
                <select
                  value={aufgabenSchwierigkeit}
                  onChange={(e) => setAufgabenSchwierigkeit(e.target.value)}
                  className="w-full p-3 border-2 rounded-lg"
                >
                  <option value="leicht">Leicht</option>
                  <option value="mittel">Mittel</option>
                  <option value="schwer">Schwer</option>
                </select>
              </div>

              {/* Themenliste (gekürzt) */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-sm font-medium">
                      Passende Themen für{' '}
                      {aktuelleKategorie === 'lesen'
                        ? '📖 Lesen'
                        : aktuelleKategorie === 'hoeren'
                        ? '🎧 Hören'
                        : aktuelleKategorie === 'schreiben'
                        ? '✍️ Schreiben'
                        : aktuelleKategorie === 'sprechen'
                        ? '🎤 Sprechen'
                        : aktuelleKategorie === 'gespraech'
                        ? '🎭 Prüfungsgespräch'
                        : 'alle Prüfungsteile'}
                      :
                    </label>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {gefilterteThemen.length} Themen
                  </span>
                </div>

                <input
                  type="text"
                  value={themenSuche}
                  onChange={(e) => setThemenSuche(e.target.value)}
                  placeholder="Themen durchsuchen..."
                  className="w-full p-2 border rounded-lg mb-3 text-sm"
                />

                <div className="max-h-64 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                  <div className="grid grid-cols-1 gap-1">
                    {gefilterteThemen.map((t, i) => (
                      <div
                        key={i}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.thema)}
                        onClick={() => handleThemaSelect(t.thema)}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all hover:bg-orange-100 ${
                          aufgabenThema === t.thema ? 'bg-orange-200 border-orange-500' : 'bg-white'
                        }`}
                      >
                        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="flex-shrink-0">{t.icon}</span>
                        <span className="text-sm truncate">{t.thema}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={generateAufgabe}
                disabled={!aufgabenThema.trim() || isGenerating}
                className="w-full bg-orange-500 text-white py-4 rounded-lg font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2 hover:bg-orange-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generiere Aufgabe...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Aufgabe generieren
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* --- GENERIERTE AUFGABE: Kopfbereich --- */}
        {mode === 'generator' && generierteAufgabe && !generierteAufgabe.error && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <button
                onClick={() => {
                  setGenerierteAufgabe(null);
                  setAufgabenFeedback(null);
                  stopSpeech();
                }}
                className="text-orange-500 mb-4 hover:underline"
              >
                ← Neue Aufgabe erstellen
              </button>

              {generierteAufgabe.authentisch && (
                <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Authentisches PROF-L Prüfungsmaterial
                </div>
              )}

              <h2 className="text-2xl font-bold mb-2">{generierteAufgabe.titel}</h2>
              <p className="text-sm text-gray-500 mb-4">{generierteAufgabe.zeit}</p>
              <div className="bg-amber-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold">Situation:</h3>
                <p>{generierteAufgabe.situation}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold">Aufgabe:</h3>
                <p>{generierteAufgabe.aufgabe}</p>
              </div>
            </div>

            {/* --- HÖREN: Player --- */}
            {isHoeren && generierteAufgabe.artikel && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-orange-500" />
                  🎧 Hörtext abspielen
                  {isDialogue(generierteAufgabe.artikel) && (
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">👥 Dialog (2 Stimmen)</span>
                  )}
                </h3>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-700">
                    <strong>📢 Hinweis:</strong> In der echten PROF-L Prüfung hören Sie einen Radiobeitrag/Podcast. Hier liest Ihr
                    Browser den Text vor.
                  </p>
                </div>

                {/* Stimmenauswahl (nur Monolog) */}
                {availableVoices.length > 1 && !isDialogue(generierteAufgabe.artikel) && (
                  <div className="mb-4 bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">🎙️ Stimme wählen:</label>
                      {availableVoices[selectedVoiceIndex] && (
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                          Aktiv: {availableVoices[selectedVoiceIndex].name}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {availableVoices.slice(0, 6).map((v, i) => (
                        <div
                          key={i}
                          className={`relative rounded-lg border-2 transition-all ${
                            selectedVoiceIndex === i ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-orange-300'
                          }`}
                        >
                          <button onClick={() => setSelectedVoiceIndex(i)} className="w-full p-3 text-left" disabled={isSpeaking}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{i === 0 ? '⭐' : '🔊'}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{v.name.split(' ').slice(0, 2).join(' ')}</p>
                                <p className="text-xs text-gray-500">{v.lang}</p>
                              </div>
                              {selectedVoiceIndex === i && <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                            </div>
                          </button>
                          {/* Preview */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPreviewPlaying) {
                                stopPreview();
                              } else {
                                playVoicePreview(i);
                              }
                            }}
                            disabled={isSpeaking}
                            className="absolute top-1 right-1 p-1 rounded-full bg-gray-100 hover:bg-orange-100 text-gray-600 hover:text-orange-600 transition-all"
                            title="Stimme testen"
                          >
                            {isPreviewPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">💡 Die ⭐‑Stimme wurde als beste erkannt.</p>
                  </div>
                )}

                {/* Controls */}
                <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl p-6 mb-4">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    {!isSpeaking ? (
                      <button
                        onClick={() => speakText(generierteAufgabe.artikel)}
                        className="bg-orange-500 hover:bg-orange-600 text-white p-5 rounded-full transition-all shadow-lg hover:scale-105"
                        title="Abspielen"
                      >
                        <Play className="w-10 h-10" />
                      </button>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          onClick={pauseSpeech}
                          className={`${
                            isPaused ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'
                          } text-white p-4 rounded-full transition-all shadow-lg`}
                          title={isPaused ? 'Fortsetzen' : 'Pause'}
                        >
                          {isPaused ? <Play className="w-8 h-8" /> : <Pause className="w-8 h-8" />}
                        </button>
                        <button
                          onClick={stopSpeech}
                          className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-all shadow-lg"
                          title="Stopp"
                        >
                          <Square className="w-8 h-8" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="text-center mb-4">
                    {isSpeaking && !isPaused ? (
                      <div className="flex items-center justify-center gap-2 text-orange-600">
                        <div className="flex gap-1">
                          <div className="w-2 h-4 bg-orange-500 rounded animate-pulse" />
                          <div className="w-2 h-6 bg-orange-500 rounded animate-pulse" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-3 bg-orange-500 rounded animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <div className="w-2 h-5 bg-orange-500 rounded animate-pulse" style={{ animationDelay: '0.3s' }} />
                          <div className="w-2 h-4 bg-orange-500 rounded animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                        <span className="font-medium ml-2">Wird vorgelesen...</span>
                      </div>
                    ) : isPaused ? (
                      <span className="text-yellow-600 font-medium">⏸ Pausiert – Klicken Sie auf Play zum Fortsetzen</span>
                    ) : hasListened ? (
                      <span className="text-green-600 font-medium">✓ {listenCount}x angehört</span>
                    ) : (
                      <span className="text-gray-600 font-medium">▶ Klicken Sie auf Play, um den Hörtext zu starten</span>
                    )}
                  </div>

                  {/* Rate */}
                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">🎚️ Sprechgeschwindigkeit:</span>
                      <span
                        className={`text-sm font-bold px-2 py-1 rounded ${
                          speechRate < 0.75 ? 'bg-blue-100 text-blue-700' : speechRate > 1.0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {speechRate < 0.75 ? '🐢 Langsam' : speechRate > 1.0 ? '🐇 Schnell' : '✓ Normal'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">0.5x</span>
                      <input
                        type="range"
                        min="0.5"
                        max="1.3"
                        step="0.05"
                        value={speechRate}
                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        disabled={isSpeaking}
                      />
                      <span className="text-xs text-gray-500">1.3x</span>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-400">
                      <span>Anfänger</span>
                      <button onClick={() => setSpeechRate(0.85)} className="text-orange-500 hover:underline" disabled={isSpeaking}>
                        Standard (0.85x)
                      </button>
                      <span>Fortgeschritten</span>
                    </div>
                  </div>
                </div>

                {/* Transkript nach dem Hören */}
                {hasListened && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">📝 Transkript anzeigen (zum Überprüfen)</summary>
                    <div className="mt-2 bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-line text-gray-600">
                      {generierteAufgabe.artikel}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* --- SPRECHEN --- */}
            {isSprechen && (
              <>
                {generierteAufgabe.punkte && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">Aufgabenpunkte</h3>
                    <ul className="space-y-2">
                      {generierteAufgabe.punkte.map((p, i) => (
                        <li key={i} className="flex gap-2 bg-gray-50 p-3 rounded-lg">
                          <div className="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">{i + 1}</div>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <p className="font-semibold">
                    Zielniveau: {generierteAufgabe.zielniveau} • Sprechzeit: {generierteAufgabe.sprechzeit}
                  </p>
                </div>

                {!sprechStarted ? (
                  <button
                    onClick={startSprechaufgabe}
                    className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
                  >
                    <Play className="w-6 h-6" />
                    Aufgabe starten
                  </button>
                ) : (
                  <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                    <div className="text-5xl font-mono font-bold mb-4">{formatTime(recordingTime)}</div>
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={toggleRecording}
                        className={`p-4 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-orange-500'} text-white`}
                      >
                        {isRecording ? <Pause className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                      </button>
                      <button
                        onClick={() => {
                          setRecordingTime(0);
                          setIsRecording(false);
                          clearInterval(timerRef.current);
                        }}
                        className="p-4 rounded-full bg-gray-200"
                      >
                        <RotateCcw className="w-8 h-8" />
                      </button>
                    </div>
                  </div>
                )}

                {generierteAufgabe.bewertungskriterien && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">Bewertungskriterien</h3>
                    {generierteAufgabe.bewertungskriterien.map((k, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded-lg mb-2">
                        <span className="font-semibold text-orange-500">{k.name}:</span> {k.beschreibung}
                      </div>
                    ))}
                  </div>
                )}

                {generierteAufgabe.musterantwort && (
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <button
                      onClick={() => setShowMusterantwort(!showMusterantwort)}
                      className="w-full flex items-center justify-between font-semibold text-gray-700 hover:text-orange-600"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Musterantwort {showMusterantwort ? 'verbergen' : 'anzeigen'}
                      </span>
                      <span className="text-xl">{showMusterantwort ? '−' : '+'}</span>
                    </button>
                    {showMusterantwort && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <pre className="whitespace-pre-wrap text-sm">{generierteAufgabe.musterantwort}</pre>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* --- SCHREIBEN: E-MAIL --- */}
            {generierteAufgabe.typ === 'schreiben_email' && (
              <>
                {generierteAufgabe.empfaenger && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">📧 Empfänger</h3>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p>
                        <strong>{generierteAufgabe.empfaenger.name}</strong>
                      </p>
                      <p className="text-sm text-gray-600">{generierteAufgabe.empfaenger.funktion}</p>
                      <p className="text-sm text-gray-600">{generierteAufgabe.empfaenger.institution}</p>
                    </div>
                  </div>
                )}

                {generierteAufgabe.inhaltspunkte && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">📝 Diese Punkte ansprechen:</h3>
                    <ul className="space-y-2">
                      {generierteAufgabe.inhaltspunkte.map((p, i) => (
                        <li key={i} className="flex gap-2 bg-orange-50 p-3 rounded-lg">
                          <div className="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                            {i + 1}
                          </div>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {generierteAufgabe.hinweise && (
                  <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
                    <h3 className="font-semibold mb-2">💡 Hinweise:</h3>
                    <ul className="text-sm space-y-1">
                      {generierteAufgabe.hinweise.map((h, i) => (
                        <li key={i}>• {h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">✍️ Ihre E-Mail schreiben:</h3>
                    <span className="text-sm text-gray-500">{generierteAufgabe.woerter} Wörter</span>
                  </div>
                  <textarea
                    className="w-full h-64 p-4 border-2 rounded-lg resize-none focus:border-orange-500 focus:outline-none font-mono text-sm"
                    placeholder={`Sehr geehrte Frau/Herr ...
[Ihre E-Mail hier schreiben]
Mit freundlichen Grüssen
[Ihr Name]`}
                  />
                </div>

                {generierteAufgabe.bewertungskriterien && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">📊 Bewertungskriterien</h3>
                    {generierteAufgabe.bewertungskriterien.map((k, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded-lg mb-2">
                        <span className="font-semibold text-orange-500">{k.name}:</span> {k.beschreibung}
                      </div>
                    ))}
                  </div>
                )}

                {generierteAufgabe.musterantwort && (
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <button
                      onClick={() => setShowMusterantwort(!showMusterantwort)}
                      className="w-full flex items-center justify-between font-semibold text-gray-700 hover:text-orange-600"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Muster‑E‑Mail {showMusterantwort ? 'verbergen' : 'anzeigen'}
                      </span>
                      <span className="text-xl">{showMusterantwort ? '−' : '+'}</span>
                    </button>
                    {showMusterantwort && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <pre className="whitespace-pre-wrap text-sm font-mono">{generierteAufgabe.musterantwort}</pre>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* --- SCHREIBEN: Kommentar/Stellungnahme --- */}
            {generierteAufgabe.typ === 'schreiben_kommentar' && (
              <>
                {generierteAufgabe.quellentext && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">📄 Quellentext</h3>
                    <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-orange-500">
                      <p className="whitespace-pre-line text-sm italic">{generierteAufgabe.quellentext}</p>
                    </div>
                  </div>
                )}

                {/* ... (Rest wie bei dir) */}
              </>
            )}

            {/* --- SCHREIBEN: Korrektur + Feedback --- */}
            {generierteAufgabe.typ === 'schreiben_korrektur_feedback' && (
              <>
                {generierteAufgabe.originalaufgabe && (
                  <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                    <h3 className="font-semibold mb-2">📋 Originalaufgabe für die Schüler:innen:</h3>
                    <p className="text-sm">{generierteAufgabe.originalaufgabe}</p>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-semibold mb-4">📝 Schülertext zum Korrigieren:</h3>
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Aufgabe:</strong> Markieren Sie die Fehler und geben Sie die korrekten Formen an.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm whitespace-pre-line border-2">
                    {generierteAufgabe.schuelertext}
                  </div>
                </div>

                {generierteAufgabe.fehler && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">🔍 Fehler finden und korrigieren ({generierteAufgabe.fehler.length} Fehler):</h3>
                    {generierteAufgabe.fehler.map((f) => (
                      <div key={f.nr} className="border-2 rounded-lg p-4 mb-3">
                        <div className="flex items-start gap-3">
                          <div className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                            {f.nr}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-600 mb-2">
                              {f.zeile && <span className="bg-gray-200 px-2 py-1 rounded text-xs mr-2">Zeile</span>}
                              <span className="font-mono bg-yellow-100 px-2 py-1 rounded">"{f.original}"</span>
                            </p>
                            <input
                              type="text"
                              value={userAntworten[f.nr] || ''}
                              onChange={(e) =>
                                setUserAntworten({
                                  ...userAntworten,
                                  [f.nr]: e.target.value,
                                })
                              }
                              placeholder="Korrektur eingeben..."
                              className="w-full p-2 border-2 rounded-lg"
                              disabled={!!aufgabenFeedback}
                            />
                            {aufgabenFeedback?.results[f.nr] && (
                              <div
                                className={`mt-2 p-2 rounded text-sm ${
                                  aufgabenFeedback.results[f.nr].isCorrect ? 'bg-green-100' : 'bg-red-100'
                                }`}
                              >
                                {aufgabenFeedback.results[f.nr].isCorrect
                                  ? '✓ Richtig!'
                                  : `✗ Korrekt: ${aufgabenFeedback.results[f.nr].correct}`}
                                {!aufgabenFeedback.results[f.nr].isCorrect && f.erklaerung && (
                                  <p className="text-xs mt-1 text-gray-600">{f.erklaerung}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* --- MC/Zuordnung/Lückentext/… (deine weiteren Blöcke unverändert einsetzen) --- */}

            {/* Überprüfen */}
            {generierteAufgabe.loesungen && !aufgabenFeedback && (
              <button
                onClick={checkAufgabe}
                disabled={Object.keys(userAntworten).length !== Object.keys(generierteAufgabe.loesungen).length}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold disabled:bg-gray-400"
              >
                Überprüfen ({Object.keys(userAntworten).length}/{Object.keys(generierteAufgabe.loesungen).length})
              </button>
            )}

            {/* Ergebnis */}
            {aufgabenFeedback && (
              <div
                className={`rounded-xl p-6 ${
                  aufgabenFeedback.score >= 60 ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'
                }`}
              >
                <div className="text-5xl font-bold mb-2">{aufgabenFeedback.score}%</div>
                <p>
                  {aufgabenFeedback.richtig}/{aufgabenFeedback.gesamt} richtig •{' '}
                  {aufgabenFeedback.score >= 60 ? '✓ Bestanden (≥60%)' : '✗ Nicht bestanden (<60%)'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* --- Generator-Fehler --- */}
        {generierteAufgabe?.error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
            <p className="text-red-700 font-medium">Fehler:</p>
            <p className="text-red-600 mt-2">{generierteAufgabe.error}</p>
            <button
              onClick={() => setGenerierteAufgabe(null)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Erneut versuchen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
