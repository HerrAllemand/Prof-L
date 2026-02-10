import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Sparkles, PenTool, CheckCircle, Play, 
  RefreshCw, Loader2, Volume2, Square, Search, GraduationCap 
} from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState('korrektur');
  const [text, setText] = useState('');
  const [korrekturErgebnis, setKorrekturErgebnis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Aufgaben-Generator
  const [aufgabenTyp, setAufgabenTyp] = useState('leseverstehen_zuordnung');
  const [aufgabenThema, setAufgabenThema] = useState('');
  const [aufgabenStufe, setAufgabenStufe] = useState('primar');
  const [aufgabenSchwierigkeit, setAufgabenSchwierigkeit] = useState('mittel');
  const [generierteAufgabe, setGenerierteAufgabe] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userAntworten, setUserAntworten] = useState({});
  const [aufgabenFeedback, setAufgabenFeedback] = useState(null);
  
  // Themen-Filter
  const [themenSuche, setThemenSuche] = useState('');
  
  // Lösungen anzeigen
  const [showMusterantwort, setShowMusterantwort] = useState(false);
  const [showLoesungen, setShowLoesungen] = useState(false);
  
  // Sprechen
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sprechStarted, setSprechStarted] = useState(false);
  const timerRef = useRef(null);
  
  // Text-to-Speech für Höraufgaben (Verbesserte Web Speech API)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.85);
  const [hasListened, setHasListened] = useState(false);
  const [listenCount, setListenCount] = useState(0);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const speechRef = useRef(null);

  // Qualitäts-Ranking für deutsche Stimmen (beste zuerst)
  const voiceQualityRanking = [
    // Premium-Stimmen (meist Google/Microsoft)
    'Google Deutsch',
    'Microsoft Katja',
    'Microsoft Stefan', 
    'Microsoft Conrad',
    'Anna', // macOS
    'Helena', // Windows
    'Markus', // macOS
    // Standard-Stimmen
    'German',
    'Deutsch',
    'de-DE',
    'de-CH',
    'de-AT'
  ];

  // Finde die beste verfügbare Stimme
  const findBestVoice = (voices) => {
    for (const preferred of voiceQualityRanking) {
      const match = voices.find(v => 
        v.name.includes(preferred) || 
        v.lang.includes(preferred)
      );
      if (match) return voices.indexOf(match);
    }
    return 0;
  };

  // Lade verfügbare deutsche Stimmen mit Qualitäts-Sortierung
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // Filtere deutsche Stimmen
      let germanVoices = voices.filter(v => 
        v.lang.startsWith('de') || 
        v.name.toLowerCase().includes('german') ||
        v.name.toLowerCase().includes('deutsch')
      );
      
      // Sortiere nach Qualität
      germanVoices.sort((a, b) => {
        const aScore = voiceQualityRanking.findIndex(q => a.name.includes(q) || a.lang.includes(q));
        const bScore = voiceQualityRanking.findIndex(q => b.name.includes(q) || b.lang.includes(q));
        const aRank = aScore === -1 ? 999 : aScore;
        const bRank = bScore === -1 ? 999 : bScore;
        return aRank - bRank;
      });
      
      // Fallback auf alle Stimmen wenn keine deutschen gefunden
      const finalVoices = germanVoices.length > 0 ? germanVoices : voices.slice(0, 8);
      setAvailableVoices(finalVoices);
      
      // Wähle automatisch die beste Stimme
      if (finalVoices.length > 0) {
        setSelectedVoiceIndex(0); // Erste ist die beste nach Sortierung
      }
    };
    
    if ('speechSynthesis' in window) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Prüfe ob Text ein Dialog ist
  const isDialogue = (text) => {
    const dialoguePatterns = [
      /^[A-Z][a-zäöü]+:/gm,
      /^(Lehrperson|Lehrer|Lehrerin|Schüler|Schülerin|Eltern|Mutter|Vater|Kind|Person [AB12]):/gmi,
      /^(LP|SuS|L|S|A|B):/gm,
    ];
    return dialoguePatterns.some(pattern => pattern.test(text));
  };

  // Parse Dialog in Sprechabschnitte
  const parseDialogue = (text) => {
    const lines = text.split('\n');
    const segments = [];
    let currentSpeaker = null;
    let currentText = '';
    const speakers = new Set();
    
    lines.forEach(line => {
      const speakerMatch = line.match(/^([A-Za-zäöüÄÖÜß\s]+):\s*(.*)$/);
      
      if (speakerMatch) {
        if (currentSpeaker && currentText.trim()) {
          segments.push({ speaker: currentSpeaker, text: currentText.trim() });
        }
        currentSpeaker = speakerMatch[1].trim();
        currentText = speakerMatch[2] || '';
        speakers.add(currentSpeaker);
      } else if (currentSpeaker) {
        currentText += ' ' + line;
      } else {
        if (line.trim()) {
          segments.push({ speaker: 'Erzähler', text: line.trim() });
        }
      }
    });
    
    if (currentSpeaker && currentText.trim()) {
      segments.push({ speaker: currentSpeaker, text: currentText.trim() });
    }
    
    return { segments, speakers: Array.from(speakers) };
  };

  // Text für natürlichere Aussprache vorbereiten (SSML-ähnliche Verbesserungen)
  const prepareTextForSpeech = (text) => {
    return text
      // === PAUSEN BEI SATZZEICHEN ===
      // Lange Pause am Satzende
      .replace(/\.\s+/g, '. ... ')
      .replace(/!\s+/g, '! ... ')
      .replace(/\?\s+/g, '? ... ')
      // Mittlere Pause bei Komma und Semikolon
      .replace(/,\s+/g, ', .. ')
      .replace(/;\s+/g, '; .. ')
      // Kurze Pause bei Doppelpunkt
      .replace(/:\s+/g, ': . ')
      // Pause bei Gedankenstrich
      .replace(/\s+[-–—]\s+/g, ' ... ')
      // Pause bei Klammern
      .replace(/\(/g, '.. (')
      .replace(/\)/g, ') .. ')
      
      // === ZAHLEN AUSSCHREIBEN ===
      .replace(/(\d+)%/g, '$1 Prozent')
      .replace(/(\d+)€/g, '$1 Euro')
      .replace(/(\d+)\s*CHF/g, '$1 Schweizer Franken')
      .replace(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g, '$1. $2. $3') // Datum
      .replace(/(\d{1,2}):(\d{2})\s*Uhr/g, '$1 Uhr $2')
      .replace(/(\d+)\s*Uhr/g, '$1 Uhr')
      .replace(/(\d+)\s*km/g, '$1 Kilometer')
      .replace(/(\d+)\s*m\b/g, '$1 Meter')
      .replace(/(\d+)\s*kg/g, '$1 Kilogramm')
      .replace(/(\d+)\s*g\b/g, '$1 Gramm')
      .replace(/(\d+)\s*l\b/g, '$1 Liter')
      .replace(/(\d+)\s*ml/g, '$1 Milliliter')
      .replace(/(\d+)\s*min/g, '$1 Minuten')
      .replace(/(\d+)\s*h\b/g, '$1 Stunden')
      
      // === ABKÜRZUNGEN AUSSCHREIBEN ===
      .replace(/z\.\s*B\./gi, 'zum Beispiel')
      .replace(/bzw\./gi, 'beziehungsweise')
      .replace(/usw\./gi, 'und so weiter')
      .replace(/etc\./gi, 'et cetera')
      .replace(/ca\./gi, 'circa')
      .replace(/d\.\s*h\./gi, 'das heisst')
      .replace(/u\.\s*a\./gi, 'unter anderem')
      .replace(/v\.\s*a\./gi, 'vor allem')
      .replace(/z\.\s*T\./gi, 'zum Teil')
      .replace(/s\.\s*o\./gi, 'siehe oben')
      .replace(/s\.\s*u\./gi, 'siehe unten')
      .replace(/ggf\./gi, 'gegebenenfalls')
      .replace(/bzgl\./gi, 'bezüglich')
      .replace(/inkl\./gi, 'inklusive')
      .replace(/exkl\./gi, 'exklusive')
      .replace(/evtl\./gi, 'eventuell')
      .replace(/max\./gi, 'maximal')
      .replace(/min\./gi, 'minimal')
      .replace(/Nr\./gi, 'Nummer')
      .replace(/Tel\./gi, 'Telefon')
      .replace(/Str\./gi, 'Strasse')
      .replace(/Prof\./gi, 'Professor')
      .replace(/Dr\./gi, 'Doktor')
      .replace(/Herr\s+/g, 'Herr .. ')
      .replace(/Frau\s+/g, 'Frau .. ')
      
      // === SCHWEIZER SCHULBEGRIFFE ===
      .replace(/Znüni/gi, 'Znüüni')
      .replace(/Zvieri/gi, 'Zvieeri')
      .replace(/SuS/g, 'Schülerinnen und Schüler')
      .replace(/LP/g, 'Lehrperson')
      .replace(/KLP/g, 'Klassenlehrperson')
      .replace(/SHP/g, 'Schulische Heilpädagogin')
      .replace(/DAZ/g, 'Deutsch als Zweitsprache')
      .replace(/DaZ/g, 'Deutsch als Zweitsprache')
      .replace(/IF/g, 'Integrative Förderung')
      .replace(/SSA/g, 'Schulsozialarbeit')
      .replace(/SPD/g, 'Schulpsychologischer Dienst')
      
      // === BETONUNGEN FÜR WICHTIGE WÖRTER ===
      // Wichtige Wörter durch kurze Pause davor betonen
      .replace(/\b(wichtig|achtung|bitte|unbedingt|dringend)\b/gi, '.. $1')
      .replace(/\b(erstens|zweitens|drittens|viertens|fünftens)\b/gi, '.. $1 ..')
      .replace(/\b(einerseits|andererseits)\b/gi, '.. $1')
      .replace(/\b(jedoch|allerdings|dennoch|trotzdem)\b/gi, '.. $1')
      .replace(/\b(zusammenfassend|abschliessend|schliesslich)\b/gi, '... $1')
      
      // === AUFZÄHLUNGEN ===
      .replace(/•\s*/g, '.. ')
      .replace(/^\s*-\s*/gm, '.. ')
      .replace(/^\s*\d+\.\s*/gm, '.. ')
      
      // Mehrfache Leerzeichen bereinigen
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Stimmen-Vorschau abspielen
  const playVoicePreview = (voiceIndex) => {
    if (isPreviewPlaying || isSpeaking) return;
    
    window.speechSynthesis.cancel();
    setIsPreviewPlaying(true);
    
    const previewText = "Guten Tag, ich bin eine Stimme für Ihre Hörübungen. So klinge ich bei der Wiedergabe.";
    const utterance = new SpeechSynthesisUtterance(previewText);
    
    utterance.lang = 'de-DE';
    utterance.rate = speechRate;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    if (availableVoices[voiceIndex]) {
      utterance.voice = availableVoices[voiceIndex];
    }
    
    utterance.onend = () => setIsPreviewPlaying(false);
    utterance.onerror = () => setIsPreviewPlaying(false);
    
    window.speechSynthesis.speak(utterance);
  };

  // Stimmen-Vorschau stoppen
  const stopPreview = () => {
    window.speechSynthesis.cancel();
    setIsPreviewPlaying(false);
  };

  // Sprache starten
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) {
      alert('Ihr Browser unterstützt keine Sprachausgabe.');
      return;
    }

    window.speechSynthesis.cancel();
    setIsPaused(false);

    const dialogue = isDialogue(text);
    
    if (dialogue && availableVoices.length >= 2) {
      // Dialog-Modus: Verschiedene Stimmen
      const { segments, speakers } = parseDialogue(text);
      
      const speakerVoices = {};
      speakers.forEach((speaker, index) => {
        speakerVoices[speaker] = availableVoices[index % availableVoices.length];
      });
      
      let segmentIndex = 0;
      
      const speakNextSegment = () => {
        if (segmentIndex >= segments.length) {
          setIsSpeaking(false);
          setHasListened(true);
          setListenCount(prev => prev + 1);
          return;
        }
        
        const segment = segments[segmentIndex];
        const preparedText = prepareTextForSpeech(segment.text);
        const utterance = new SpeechSynthesisUtterance(preparedText);
        
        utterance.lang = 'de-DE';
        utterance.rate = speechRate;
        utterance.pitch = segmentIndex % 2 === 0 ? 1.1 : 0.85;
        utterance.volume = 1;
        utterance.voice = speakerVoices[segment.speaker] || availableVoices[0];
        
        utterance.onend = () => {
          segmentIndex++;
          setTimeout(speakNextSegment, 600); // Längere Pause zwischen Sprechern
        };
        
        utterance.onerror = (e) => {
          console.error('Speech error:', e);
          setIsSpeaking(false);
        };
        
        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      };
      
      setIsSpeaking(true);
      speakNextSegment();
      
    } else {
      // Normaler Modus
      const preparedText = prepareTextForSpeech(text);
      const utterance = new SpeechSynthesisUtterance(preparedText);
      
      utterance.lang = 'de-DE';
      utterance.rate = speechRate;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      if (availableVoices[selectedVoiceIndex]) {
        utterance.voice = availableVoices[selectedVoiceIndex];
      }
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        setHasListened(true);
        setListenCount(prev => prev + 1);
      };
      utterance.onerror = (e) => {
        console.error('Speech error:', e);
        setIsSpeaking(false);
      };
      
      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const pauseSpeech = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  // Aufgabentypen für Generator - basierend auf offizieller PROF-L Prüfungsstruktur
  const aufgabenTypen = [
    // === TEIL 1A: LESEN (2 Lesetexte) ===
    { id: 'lesen_fachtext_mc', label: '📖 Lesen: Fachtext + Multiple Choice', kategorie: 'lesen', 
      beschreibung: 'Fachtext (500-700 Wörter) mit 6 MC-Fragen' },
    { id: 'lesen_artikel_zuordnung', label: '📖 Lesen: Artikel + Zuordnung', kategorie: 'lesen',
      beschreibung: 'Zeitungsartikel mit Aussagen → Abschnitte zuordnen' },
    
    // === TEIL 1B: HÖREN (2 Hörtexte) ===
    { id: 'hoeren_interview_mc', label: '🎧 Hören: Interview + Multiple Choice', kategorie: 'hoeren',
      beschreibung: 'Radiointerview (2-3 Min) mit 5 MC-Fragen' },
    { id: 'hoeren_gespraech_zuordnung', label: '🎧 Hören: Gespräch + Zuordnung', kategorie: 'hoeren',
      beschreibung: 'Dialog (2-4 Min) mit Aussagen → Person A/B zuordnen' },
    
    // === TEIL 1C: SPRECHEN - Monologisch (3 Aufgaben) ===
    { id: 'sprechen_unterricht_strukturieren', label: '🎤 Sprechen: Unterricht strukturieren', kategorie: 'sprechen',
      beschreibung: 'An Lernende: Ablauf erklären, Anweisungen geben (1-2 Min)' },
    { id: 'sprechen_feedback_geben', label: '🎤 Sprechen: Feedback geben', kategorie: 'sprechen',
      beschreibung: 'An Lernende: Positive Punkte + Verbesserungstipps' },
    { id: 'sprechen_praesentation', label: '🎤 Sprechen: Thema präsentieren', kategorie: 'sprechen',
      beschreibung: 'An Kolleg:innen: Argumentation mit Grafik (2-3 Min)' },
    
    // === TEIL 1D: SCHREIBEN (2 Texte + 2 Korrekturen) ===
    { id: 'schreiben_arbeitsblatt', label: '✍️ Schreiben: Arbeitsblatt erstellen', kategorie: 'schreiben',
      beschreibung: 'Für Lernende: Wortschatz, Lückentext, Partneraufgabe' },
    { id: 'schreiben_email', label: '✍️ Schreiben: E-Mail verfassen', kategorie: 'schreiben',
      beschreibung: 'Für Kolleg:innen/Schulleitung: berufsrelevante Anfrage' },
    { id: 'schreiben_korrektur_feedback', label: '✍️ Schreiben: Text korrigieren + Feedback', kategorie: 'schreiben',
      beschreibung: 'Lernendentext (80-120 Wörter) korrigieren, 3 Feedback-Sätze' },
    { id: 'schreiben_text_vereinfachen', label: '✍️ Schreiben: Text vereinfachen', kategorie: 'schreiben',
      beschreibung: 'Authentischen Text kürzen, vereinfachen, Fragen ergänzen' },
    
    // === TEIL 2: PRÜFUNGSGESPRÄCH (Interaktion) ===
    { id: 'gespraech_simulation', label: '🎭 Gespräch: Unterrichtssimulation', kategorie: 'gespraech',
      beschreibung: 'Rollenspiel: Material mit "Schüler:in" erarbeiten (7 Min)' },
    { id: 'gespraech_fachgespraech', label: '🎭 Gespräch: Fachgespräch', kategorie: 'gespraech',
      beschreibung: 'Problemdiskussion mit Kolleg:in/Schulleitung (7 Min)' },
  ];

  // Authentische PROF-L Schreibaufgaben-Vorlagen
  const authentischeSchreibaufgaben = {
    anfrage: [
      {
        titel: 'Anfrage Briefaustausch mit Deutschschweizer Schule',
        situation: 'Sie möchten als Lehrer:in einer 8. Klasse Kontakt zu einer Schule in der Deutschschweiz aufnehmen, um dort eine Klasse gleicher Stufe für einen Briefaustausch zu finden.',
        aufgabe: 'Schreiben Sie eine formelle E-Mail an Frau Baumgärtner, Fachgebietsleiterin Fremdsprachen der Primarschule «Maikäfer» in Basel. Berichten Sie über Ihre Idee, das Ziel solch eines Austausches, mögliche Modalitäten, Ihre eventuellen Erfahrungen mit dem Konzept und auch über Ihre Klasse.',
        hinweise: ['Beachten Sie die Formalitäten einer solchen E-Mail', 'Anrede und Grussformel nicht vergessen', 'Professionelles Register verwenden'],
        zeit: '15 Min',
        woerter: '150-200'
      },
      {
        titel: 'Anfrage Kindertheater Bern',
        situation: 'Sie möchten als Lehrer:in einer 7. Klasse am Ende des Schuljahres in das Kindertheater Bern zu einer Schülervorstellung fahren.',
        aufgabe: 'Schreiben Sie dem Theater eine E-Mail und bitten Sie um Informationen, welches Stück für die Deutschkenntnisse Ihrer Klasse geeignet ist, welche Daten möglich sind und wie eine Reservierung erfolgen soll.',
        hinweise: ['Beachten Sie die Formalitäten einer solchen E-Mail', 'Geben Sie konkrete Informationen über Ihre Klasse', 'Formulieren Sie Ihre Fragen klar'],
        zeit: '15 Min',
        woerter: '150-200'
      }
    ],
    kommentar: [
      {
        titel: 'Kommentar zu KI-basierten Schreibtools im Unterricht',
        situation: 'Als Sprachlehrer nehmen Sie an einem Online-Fachforum zum Thema Deutsch-Unterricht teil. Zwei Kollegen haben gegensätzliche Meinungen zum Einsatz von KI-basierten Schreibtools im Sprachunterricht gepostet.',
        aufgabe: 'Verfassen Sie einen eigenen Forumsbeitrag, in dem Sie: die Argumente in den Beiträgen Ihrer beiden Kollegen bewerten, Ihre eigene berufliche Position begründen, Ihre Argumente mit relevanten, konkreten Beispielen aus Ihrer Unterrichtserfahrung veranschaulichen.',
        hinweise: ['Strukturieren Sie Ihren Text klar', 'Verwenden Sie Verknüpfungen (ausserdem, dennoch, im Gegensatz dazu)', 'Beziehen Sie sich auf beide Positionen'],
        zeit: '35 Min',
        woerter: '200-250'
      },
      {
        titel: 'Stellungnahme zum Handyverbot an Schulen',
        situation: 'Als Lehrer:in der Sekundarstufe 1 sind Sie eingeladen, an einer Debatte über das Handyverbot an Schulen teilzunehmen. Die Organisatoren erwarten von Ihnen einen Erfahrungsbericht aus der Praxis.',
        aufgabe: 'Verfassen Sie Ihren Erfahrungsbericht, in dem Sie: die Argumente des Faktenblatts bewerten, Ihre eigene berufliche Position begründen (Erfahrung, Argumente, Vorschläge).',
        hinweise: ['Beziehen Sie sich auf konkrete Erfahrungen', 'Wägen Sie Pro und Contra ab', 'Formulieren Sie konstruktive Vorschläge'],
        zeit: '35 Min',
        woerter: '200-250'
      },
      {
        titel: 'Kommentar zu Hausaufgaben',
        situation: 'Sie sind als Referendar an einer Schule in Deutschland tätig. Man bittet Sie um eine Stellungnahme über Schulen ohne Hausaufgaben in der Schweiz.',
        aufgabe: 'Verfassen Sie einen schriftlichen Beitrag für eine Fachkonferenz, in dem Sie: die verschiedenen Positionen bewerten, Ihre Meinung darlegen (Erfahrungen, Argumente, Vorschläge).',
        hinweise: ['Berücksichtigen Sie verschiedene Perspektiven', 'Untermauern Sie Ihre Meinung mit Argumenten', 'Beachten Sie das professionelle Register'],
        zeit: '35 Min',
        woerter: '200-250'
      },
      {
        titel: 'Kommentar zur Inklusion',
        situation: 'Auf einer PH-Plattform finden Sie einen Eintrag einer Primarlehrerin zur aktuellen Debatte in der deutschen Schweiz über die Reform des integrativen Schulsystems.',
        aufgabe: 'Verfassen Sie Ihren eigenen Eintrag zu dem Thema, in dem Sie: die Argumente des Eintrags bewerten, Ihre Meinung darlegen (Erfahrungen, Argumente, Vorschläge).',
        hinweise: ['Nehmen Sie Bezug auf den Originaltext', 'Bringen Sie eigene Erfahrungen ein', 'Bleiben Sie sachlich und konstruktiv'],
        zeit: '35 Min',
        woerter: '200-250'
      }
    ],
    schuelerkorrektur: [
      {
        titel: 'Korrektur: Fotobeschreibung 8. Klasse',
        situation: 'Eine 8. Klasse bekommt folgende Aufgabe: Beschreibe dein Foto, das du deinem Korrespondenten der deutschen Partnerschule schickst.',
        schuelertext: `Hallo Paul, 
Ich heisse Kilian. Ich bin 13 jahre alt.  
Ich mag Videogames spilen und auch Basketball.
In die Foto ist meine Familie. Hinten rechts, mein Fater Max. 
Sein Beruf ist Verkäufer und sein hobby ist kuchen und Freunde treffen.
Vorne in der Mitte ist mein Oma. Sie ist 63 jahre alt. 
Ihr Beruf ist Ärtzin. Ihr hobby ist malen.
Sie ist sehr lustig und sympathich. 
Ich bin vorne mit meine Schwester Diane. 
Meine Mutter Ariane ist Informatikerin. Sie ist neben meine Vater.
Ihr Hobby ist Zumba dansen.
Und du, wie gehst du? Und was ist dein Hobby?
Bis bald
Kilian`,
        erwartungsFehler: [
          { original: 'jahre', korrektur: 'Jahre', kategorie: 'Rechtschreibung', erklaerung: 'Nomen werden gross geschrieben' },
          { original: 'spilen', korrektur: 'spielen', kategorie: 'Rechtschreibung', erklaerung: 'Falsche Schreibweise' },
          { original: 'In die Foto', korrektur: 'Auf dem Foto', kategorie: 'Präposition', erklaerung: 'Korrekte Präposition und Artikel: auf dem Foto' },
          { original: 'mein Fater', korrektur: 'mein Vater', kategorie: 'Rechtschreibung', erklaerung: 'V statt F' },
          { original: 'hobby ist kuchen', korrektur: 'Hobby ist Kochen', kategorie: 'Rechtschreibung', erklaerung: 'Grossschreibung bei Nomen' },
          { original: 'mein Oma', korrektur: 'meine Oma', kategorie: 'Genus', erklaerung: 'Oma ist feminin: meine Oma' },
          { original: 'Ärtzin', korrektur: 'Ärztin', kategorie: 'Rechtschreibung', erklaerung: 'Korrekte Schreibweise' },
          { original: 'sympathich', korrektur: 'sympathisch', kategorie: 'Rechtschreibung', erklaerung: 'sch-Laut am Ende' },
          { original: 'mit meine Schwester', korrektur: 'mit meiner Schwester', kategorie: 'Kasus', erklaerung: 'Nach mit folgt Dativ' },
          { original: 'neben meine Vater', korrektur: 'neben meinem Vater', kategorie: 'Kasus', erklaerung: 'Nach neben (wo?) folgt Dativ' },
          { original: 'dansen', korrektur: 'tanzen', kategorie: 'Rechtschreibung', erklaerung: 'Deutsches Wort: tanzen' },
          { original: 'wie gehst du', korrektur: 'wie geht es dir', kategorie: 'Ausdruck', erklaerung: 'Korrekte Redewendung: Wie geht es dir?' }
        ]
      },
      {
        titel: 'Korrektur: Präsentation Alessia (A1)',
        situation: 'Eine Schülerin präsentiert sich ihrer neuen Lehrerin.',
        schuelertext: `Liebe Lehrerin,
Ich heisse Alessia.
Ich bin 11 Jahre alt.
Ich wohne in Ecublens.
Ich habe keine Schwester und kein Bruder.
Ich habe eine Katze.
Die Katze heisst Patton.
Sie ist 6 Jahre alt.
Meine Hobbys sind lesen und klavier spielen.
Meine Schule ist in Ecublens.
Ich stehe um 7 Uhr auf.
Mein Klassenzimmer ist im ersten Stock.
Ich möge nicht Französisch und Biologie.
Ich möge Mathematik, Art und Musik.
Im Sommer möge ich schwimmen.
Im Winter ich möge nicht Ski.
Tschüss Alessia`,
        erwartungsFehler: [
          { original: 'kein Bruder', korrektur: 'keinen Bruder', kategorie: 'Kasus', erklaerung: 'Akkusativ nach haben: keinen Bruder' },
          { original: 'lesen und klavier spielen', korrektur: 'Lesen und Klavierspielen', kategorie: 'Rechtschreibung', erklaerung: 'Nomen/substantivierte Verben gross schreiben' },
          { original: 'Ich möge nicht', korrektur: 'Ich mag nicht', kategorie: 'Verb', erklaerung: 'Konjugation von mögen: ich mag' },
          { original: 'Art', korrektur: 'Kunst', kategorie: 'Wortschatz', erklaerung: 'Deutsches Wort: Kunst (nicht Art)' },
          { original: 'Im Winter ich möge nicht Ski', korrektur: 'Im Winter fahre ich nicht gern Ski', kategorie: 'Wortstellung', erklaerung: 'Verb an Position 2 + korrektes Verb für Ski' }
        ]
      },
      {
        titel: 'Korrektur: Präsentation Reisen (Félix)',
        situation: 'Ein Schüler hält eine Präsentation über das Thema Reisen.',
        schuelertext: `Hallo Leute, heute präsentiere ich meine Presentazion über Reisen.
Was ist Reisen?
Reisen ist überall in der Welt reisen, erkunden oder auch besuchen.
Die Leute reisen für die Arbeit oder für hobby.
In 2026, ist es sehr schwierig reisen, weil das Ausflug,
das Weg und das Auto sehr teuer sind.
Reisen hat Vorteile und Nachteile.
Ein Vorteile ist zum Beispiel : Man kann neue Länder und neue Kulturen entdecken.
Und ein Nachteil ist zum Beispiel: Reisen ist sehr teuer.
Persönlich liebe ich Reisen, weil ich neue Kulturen entdecken kann
und ich neue Freunden finden kann, obwol es sehr teuer ist.
Danke, dass mich zu gehört habt.`,
        erwartungsFehler: [
          { original: 'Presentazion', korrektur: 'Präsentation', kategorie: 'Rechtschreibung', erklaerung: 'Deutsche Schreibweise' },
          { original: 'für hobby', korrektur: 'als Hobby', kategorie: 'Präposition', erklaerung: 'Korrekte Präposition + Grossschreibung' },
          { original: 'In 2026', korrektur: 'Im Jahr 2026', kategorie: 'Präposition', erklaerung: 'Korrekte Zeitangabe: im Jahr' },
          { original: 'ist es sehr schwierig reisen', korrektur: 'ist es sehr schwierig zu reisen', kategorie: 'Infinitiv', erklaerung: 'Infinitivkonstruktion mit zu' },
          { original: 'das Ausflug', korrektur: 'der Ausflug', kategorie: 'Genus', erklaerung: 'Maskulin: der Ausflug' },
          { original: 'das Weg', korrektur: 'der Weg', kategorie: 'Genus', erklaerung: 'Maskulin: der Weg' },
          { original: 'Ein Vorteile', korrektur: 'Ein Vorteil', kategorie: 'Numerus', erklaerung: 'Singular: ein Vorteil' },
          { original: 'neue Freunden', korrektur: 'neue Freunde', kategorie: 'Kasus', erklaerung: 'Akkusativ Plural: Freunde' },
          { original: 'obwol', korrektur: 'obwohl', kategorie: 'Rechtschreibung', erklaerung: 'Mit h am Ende' },
          { original: 'dass mich zu gehört habt', korrektur: 'dass ihr mir zugehört habt', kategorie: 'Verb/Pronomen', erklaerung: 'Korrekt: ihr mir zugehört habt' }
        ]
      }
    ]
  };

  // Authentische Materialien für ALLE Prüfungsteile
  const authentischeMaterialien = {
    // === LESEN ===
    lesen_fachtext: [
      {
        titel: 'Sprachförderung durch Scaffolding',
        thema: 'Scaffolding im Sprachunterricht',
        artikel: `Scaffolding – Sprachliche Unterstützung im Unterricht

Scaffolding bezeichnet eine Methode der sprachlichen Unterstützung, bei der Lehrpersonen Lernenden gezielt Hilfestellungen geben, die schrittweise reduziert werden, sobald die Lernenden selbstständiger werden. Der Begriff stammt aus dem Englischen und bedeutet "Gerüst" – ähnlich wie ein Baugerüst wird die Unterstützung nach und nach abgebaut.

Die Methode basiert auf der Theorie der Zone der nächsten Entwicklung von Lew Wygotski. Diese besagt, dass Lernende mit Unterstützung mehr erreichen können als alleine. Scaffolding nutzt dieses Prinzip gezielt für den Sprachunterricht.

Konkret bedeutet Scaffolding im Deutschunterricht: Die Lehrperson bietet Satzanfänge, Wortlisten oder Formulierungshilfen an. Ein Beispiel: Bei einer Bildbeschreibung erhalten die Schülerinnen und Schüler Satzstarter wie "Im Vordergrund sehe ich..." oder "Die Person trägt...". Diese Hilfen werden reduziert, sobald die Lernenden die Strukturen verinnerlicht haben.

Studien zeigen, dass Scaffolding besonders wirksam ist, wenn es an den individuellen Sprachstand angepasst wird. Lehrpersonen müssen daher den aktuellen Entwicklungsstand ihrer Lernenden gut kennen. Eine Herausforderung besteht darin, die Balance zwischen zu viel und zu wenig Unterstützung zu finden.

Für den Schweizer Schulkontext ist Scaffolding besonders relevant, da viele Klassen sprachlich heterogen sind. DaZ-Lernende profitieren von den strukturierten Hilfen, während fortgeschrittene Lernende weniger Unterstützung benötigen. Die Methode lässt sich gut mit kooperativen Lernformen verbinden.

Zusammenfassend ist Scaffolding eine evidenzbasierte Methode, die bei richtigem Einsatz die sprachliche Entwicklung effektiv fördert. Der Erfolg hängt jedoch von der diagnostischen Kompetenz der Lehrperson ab.`,
        fragen: [
          { nr: 1, frage: 'Was ist die Hauptaussage des Textes?', optionen: [
            { buchstabe: 'a', text: 'Scaffolding ist eine Methode der schrittweisen sprachlichen Unterstützung' },
            { buchstabe: 'b', text: 'Scaffolding wurde von Lew Wygotski erfunden' },
            { buchstabe: 'c', text: 'Scaffolding funktioniert nur bei DaZ-Lernenden' }
          ]},
          { nr: 2, frage: 'Welcher Theoretiker wird im Text erwähnt?', optionen: [
            { buchstabe: 'a', text: 'Jean Piaget' },
            { buchstabe: 'b', text: 'Lew Wygotski' },
            { buchstabe: 'c', text: 'Maria Montessori' }
          ]},
          { nr: 3, frage: 'Was ist eine Herausforderung beim Scaffolding?', optionen: [
            { buchstabe: 'a', text: 'Die richtige Balance bei der Unterstützung zu finden' },
            { buchstabe: 'b', text: 'Genügend Material zu haben' },
            { buchstabe: 'c', text: 'Die Eltern zu informieren' }
          ]},
          { nr: 4, frage: 'Welches Beispiel wird für Scaffolding genannt?', optionen: [
            { buchstabe: 'a', text: 'Satzstarter bei Bildbeschreibungen' },
            { buchstabe: 'b', text: 'Gruppenarbeit in Teams' },
            { buchstabe: 'c', text: 'Hausaufgaben korrigieren' }
          ]},
          { nr: 5, frage: 'Welche Aussage ist NICHT im Text?', optionen: [
            { buchstabe: 'a', text: 'Scaffolding ist besonders für heterogene Klassen geeignet' },
            { buchstabe: 'b', text: 'Scaffolding erfordert spezielle Lehrmittel' },
            { buchstabe: 'c', text: 'Die Unterstützung wird schrittweise reduziert' }
          ]},
          { nr: 6, frage: 'Wovon hängt der Erfolg von Scaffolding ab?', optionen: [
            { buchstabe: 'a', text: 'Von der Klassengrösse' },
            { buchstabe: 'b', text: 'Von der diagnostischen Kompetenz der Lehrperson' },
            { buchstabe: 'c', text: 'Von der Anzahl der DaZ-Lernenden' }
          ]}
        ],
        loesungen: { '1': 'a', '2': 'b', '3': 'a', '4': 'a', '5': 'b', '6': 'b' }
      }
    ],
    lesen_artikel: [
      {
        titel: 'Handyverbot an Schulen – Pro und Contra',
        thema: 'Handyverbot an Schulen',
        artikel: `**Abschnitt A: Das Problem**
Immer mehr Schweizer Schulen diskutieren über ein generelles Handyverbot. Eine aktuelle Studie der ETH zeigt, dass 78% der Jugendlichen ihr Smartphone täglich in der Schule nutzen. Die Bildungsdirektion des Kantons Zürich hat bereits Empfehlungen für einen eingeschränkten Handygebrauch herausgegeben. "Wir beobachten eine zunehmende Ablenkung im Unterricht", erklärt Bildungsexperte Dr. Hans Müller.

**Abschnitt B: Argumente für ein Verbot**
Befürworter eines Verbots argumentieren mit der verbesserten Konzentration. Untersuchungen aus Frankreich, wo seit 2018 ein Handyverbot gilt, zeigen positive Effekte auf die Lernleistung. Die Schule Obersiggenthal berichtet von ruhigeren Pausen seit der Einführung ihres Verbots. "Die Kinder spielen wieder miteinander", sagt Schulleiterin Anna Baumgartner. Auch Cybermobbing habe abgenommen.

**Abschnitt C: Bedenken und Gegenargumente**
Kritiker warnen vor einem pauschalen Verbot. Smartphones könnten als Lernwerkzeuge eingesetzt werden, etwa für Recherchen oder Lern-Apps. Der Lehrerverband betont die Wichtigkeit von Medienkompetenz, die nur mit echten Geräten erlernt werden könne. Zudem sei die Erreichbarkeit der Eltern in Notfällen gewährleistet. "Ein Verbot geht an der Realität vorbei", kritisiert Elternratspräsident Marco Weber.

**Abschnitt D: Mögliche Lösungen**
Viele Schulen setzen auf Kompromisse: Handys werden morgens abgegeben und nach Schulschluss wieder ausgehändigt. Andere erlauben die Nutzung in bestimmten Zonen oder Fächern. Die Schule Wettingen plant Medienwochen, in denen der bewusste Umgang thematisiert wird. Experten empfehlen klare Schulhausregeln, die gemeinsam mit Schülerschaft und Eltern erarbeitet werden.`,
        abschnitte: ['A: Das Problem', 'B: Argumente Pro', 'C: Argumente Contra', 'D: Mögliche Lösungen'],
        aussagen: [
          { nr: 1, text: 'nennt eine Statistik zur Handynutzung' },
          { nr: 2, text: 'berichtet von positiven Erfahrungen einer Schule' },
          { nr: 3, text: 'warnt vor den Nachteilen eines Verbots' },
          { nr: 4, text: 'schlägt Kompromisslösungen vor' },
          { nr: 5, text: 'zitiert einen Bildungsexperten zum Problem' },
          { nr: 6, text: 'erwähnt Erfahrungen aus dem Ausland' },
          { nr: 7, text: 'betont die Wichtigkeit von Medienkompetenz' },
          { nr: 8, text: 'beschreibt konkrete Umsetzungsideen' }
        ],
        loesungen: { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'A', '6': 'B', '7': 'C', '8': 'D' }
      }
    ],
    
    // === HÖREN ===
    hoeren_interview: [
      {
        titel: 'Interview: Lernstandserhebungen in der Praxis',
        thema: 'Lernstandserhebungen',
        artikel: `Moderatorin: Guten Tag, Frau Schneider. Sie unterrichten seit 15 Jahren an einer Primarschule im Kanton Bern. Wie setzen Sie Lernstandserhebungen ein?

Lehrperson: Guten Tag. Ich nutze regelmässig kurze Tests, um zu sehen, wo meine Schülerinnen und Schüler stehen. Das hilft mir, den Unterricht anzupassen.

Moderatorin: Welche Vorteile sehen Sie dabei?

Lehrperson: Der grösste Vorteil ist, dass ich früh erkenne, wenn ein Kind Schwierigkeiten hat. Dann kann ich gezielt fördern, bevor die Lücken zu gross werden. Auch für die Kinder selbst ist es motivierend, ihre Fortschritte zu sehen.

Moderatorin: Gibt es auch Kritik an solchen Tests?

Lehrperson: Ja, natürlich. Manche befürchten, dass zu viel getestet wird und der Druck auf die Kinder steigt. Ich achte deshalb darauf, die Erhebungen spielerisch zu gestalten und nicht zu bewerten. Es geht mir um Diagnose, nicht um Selektion.

Moderatorin: Wie reagieren die Eltern?

Lehrperson: Die meisten Eltern schätzen die regelmässigen Rückmeldungen. An den Standortgesprächen kann ich konkret zeigen, wo ihr Kind steht und wie wir gemeinsam unterstützen können.

Moderatorin: Vielen Dank für das Gespräch!`,
        fragen: [
          { nr: 1, frage: 'Warum nutzt die Lehrperson Lernstandserhebungen?', optionen: [
            { buchstabe: 'a', text: 'Um den Unterricht anzupassen und Schwierigkeiten früh zu erkennen' },
            { buchstabe: 'b', text: 'Weil es vom Kanton vorgeschrieben ist' },
            { buchstabe: 'c', text: 'Um die Schüler zu benoten' }
          ]},
          { nr: 2, frage: 'Welche Kritik erwähnt sie?', optionen: [
            { buchstabe: 'a', text: 'Die Tests sind zu teuer' },
            { buchstabe: 'b', text: 'Es könnte zu viel Druck auf die Kinder entstehen' },
            { buchstabe: 'c', text: 'Die Eltern verstehen die Ergebnisse nicht' }
          ]},
          { nr: 3, frage: 'Was ist ihr Ziel bei den Erhebungen?', optionen: [
            { buchstabe: 'a', text: 'Selektion der besten Schüler' },
            { buchstabe: 'b', text: 'Benotung für das Zeugnis' },
            { buchstabe: 'c', text: 'Diagnose zur gezielten Förderung' }
          ]},
          { nr: 4, frage: 'Wie reagieren die Eltern laut der Lehrperson?', optionen: [
            { buchstabe: 'a', text: 'Sie sind meistens zufrieden mit den Rückmeldungen' },
            { buchstabe: 'b', text: 'Sie lehnen die Tests ab' },
            { buchstabe: 'c', text: 'Sie interessieren sich nicht dafür' }
          ]},
          { nr: 5, frage: 'Welche Aussage ist FALSCH?', optionen: [
            { buchstabe: 'a', text: 'Die Lehrperson gestaltet die Tests spielerisch' },
            { buchstabe: 'b', text: 'Die Tests werden benotet und zählen fürs Zeugnis' },
            { buchstabe: 'c', text: 'An Standortgesprächen werden die Ergebnisse besprochen' }
          ]}
        ],
        loesungen: { '1': 'a', '2': 'b', '3': 'c', '4': 'a', '5': 'b' }
      }
    ],
    hoeren_gespraech: [
      {
        titel: 'Kollegengespräch: Umgang mit Mehrsprachigkeit',
        thema: 'Mehrsprachigkeit im Unterricht',
        artikel: `Person A (erfahrene Lehrperson): Ich unterrichte seit 20 Jahren und habe noch nie so viele verschiedene Sprachen in einer Klasse gehabt wie jetzt.

Person B (Berufseinsteigerin): Bei mir sind es 12 verschiedene Erstsprachen in einer Klasse mit 22 Kindern. Das ist schon eine Herausforderung.

Person A: Früher haben wir versucht, nur Deutsch im Schulzimmer zu erlauben. Aber das funktioniert nicht wirklich.

Person B: Ich habe an der PH von Translanguaging gehört. Die Idee finde ich spannend – also dass Kinder auch ihre Erstsprache nutzen dürfen, um Inhalte zu verstehen.

Person A: Das klingt gut in der Theorie, aber ich befürchte, dass manche Kinder dann gar kein Deutsch mehr sprechen. Und wie soll ich kontrollieren, was sie in Sprachen sagen, die ich nicht verstehe?

Person B: Stimmt, das ist ein Punkt. Aber letzte Woche hat ein albanischsprechendes Kind einem anderen Kind einen Begriff auf Albanisch erklärt, und danach haben beide das deutsche Wort verstanden. Das war toll.

Person A: Ja, Peer-Learning ist sehr wertvoll. Vielleicht brauchen wir einfach klare Regeln – wann welche Sprache angemessen ist.

Person B: Ich würde gerne eine Weiterbildung zum Thema besuchen. Haben Sie einen Tipp?

Person A: Die PH St. Gallen bietet gute Kurse an. Das kann ich empfehlen.`,
        personen: { A: 'Erfahrene Lehrperson', B: 'Berufseinsteigerin' },
        aussagen: [
          { nr: 1, text: 'befürwortet den Ansatz Translanguaging' },
          { nr: 2, text: 'warnt vor möglichen Problemen' },
          { nr: 3, text: 'berichtet von einer positiven Erfahrung' },
          { nr: 4, text: 'hat Bedenken wegen fehlender Sprachkenntnisse' },
          { nr: 5, text: 'schlägt klare Regeln vor' },
          { nr: 6, text: 'nennt die grosse Sprachenvielfalt in der Klasse' },
          { nr: 7, text: 'empfiehlt eine Weiterbildung' },
          { nr: 8, text: 'berichtet von früheren Praktiken' },
          { nr: 9, text: 'möchte mehr lernen über das Thema' },
          { nr: 10, text: 'erwähnt die Klassengrösse' }
        ],
        loesungen: { '1': 'B', '2': 'A', '3': 'B', '4': 'A', '5': 'A', '6': 'A', '7': 'A', '8': 'A', '9': 'B', '10': 'B' }
      }
    ],
    
    // === SPRECHEN ===
    sprechen_unterricht: [
      {
        titel: 'Unterrichtssequenz: Einkaufen und Preise',
        thema: 'Stundenbeginn Einkaufen',
        punkte: [
          'Begrüssung und Anknüpfung an Vorwissen',
          'Lernziel der Stunde nennen',
          'Ablauf erklären (Einstieg, Übung, Partnerarbeit, Abschluss)',
          'Erste Aktivität anleiten',
          'Zeitrahmen nennen'
        ],
        musterantwort: `Guten Morgen, Klasse! Setzt euch bitte hin.

Letzte Woche haben wir über Lebensmittel gesprochen. Wer erinnert sich? Was kaufen wir im Supermarkt? [Schüler antworten lassen]

Sehr gut! Heute lernen wir, wie wir nach Preisen fragen und Preise verstehen können. Das Ziel ist: Ihr könnt am Ende sagen "Was kostet...?" und die Antwort verstehen.

So machen wir das heute: Zuerst schauen wir uns gemeinsam ein Video an – es dauert 3 Minuten. Dann übt ihr in Paaren einen Dialog. Zum Schluss spielen wir "Laden" – ihr seid Verkäufer und Kunden.

Jetzt zum Video. Achtet auf die Frage "Was kostet das?" und die Antworten mit Zahlen.

Habt ihr Fragen? Nein? Dann starten wir.`
      }
    ],
    sprechen_feedback: [
      {
        titel: 'Mündliches Feedback zu Schülertext',
        thema: 'Feedback zu Schülerarbeit',
        schuelerarbeit: 'Ich gehe in die Schule. Mein Lieblingsfach ist Sport. Ich spile gern Fussball mit meine Freunde.',
        musterantwort: `Also, Marco, ich habe deinen Text gelesen. Das hast du gut gemacht! 

Besonders gut gefällt mir, dass du klare, einfache Sätze geschrieben hast – das kann man gut verstehen. Und du hast das Thema "Lieblingsfach" sehr schön erklärt.

Zwei Dinge können wir noch verbessern: Erstens das Wort "spile" – das schreibt man mit -ie-, also "spiele". Und zweitens: nach "mit" brauchen wir den Dativ. Also nicht "meine Freunde", sondern "meinen Freunden".

Lass uns das zusammen sagen: "Ich spiele gern Fussball mit meinen Freunden." Super!

Als nächstes üben wir den Dativ nach Präpositionen. Das machen wir morgen zusammen.`
      }
    ],
    
    // === PRÜFUNGSGESPRÄCH ===
    gespraech_simulation: [
      {
        titel: 'Unterrichtssimulation: Bildergeschichte',
        thema: 'Bildergeschichte erschliessen',
        material_beschreibung: 'Bildergeschichte mit 4 Bildern: "Ein verpasster Bus" – Ein Kind rennt zur Bushaltestelle, der Bus fährt gerade weg, das Kind ist traurig, eine freundliche Person bietet eine Mitfahrt an.',
        ablauf: [
          { schritt: 1, aktion: 'Vorwissen aktivieren', fragen: ['Wie kommst du zur Schule?', 'Was machst du, wenn du zu spät bist?'] },
          { schritt: 2, aktion: 'Bild beschreiben lassen', anleitung: 'Schau dir Bild 1 an. Was siehst du?' },
          { schritt: 3, aktion: 'Sprachlich unterstützen', hilfen: ['Das Kind rennt...', 'Der Bus fährt...', 'Es ist...'] },
          { schritt: 4, aktion: 'Nacherzählen anleiten', anleitung: 'Erzähl mir die Geschichte von Anfang bis Ende.' },
          { schritt: 5, aktion: 'Abschluss', zusammenfassung: 'Sehr gut! Du hast die Geschichte toll erzählt.' }
        ],
        beispieldialog: `LP: Schau dir das erste Bild an. Was siehst du?
SuS: Ein Kind... rennt.
LP: Sehr gut! Das Kind rennt. Wohin rennt es?
SuS: Zu... Bus?
LP: Genau! Das Kind rennt zur Bushaltestelle. Und was passiert mit dem Bus?
SuS: Der Bus fährt.
LP: Richtig, der Bus fährt gerade weg. Wie fühlt sich das Kind wohl?`
      }
    ],
    gespraech_fach: [
      {
        titel: 'Fachgespräch: Schweigende Kinder im Deutschunterricht',
        thema: 'Mehrsprachige Kinder schweigen',
        problemstellung: 'In meiner Klasse sprechen viele Kinder zu Hause andere Sprachen. Im Deutschunterricht schweigen sie oft.',
        moegliche_ursachen: [
          'Mangelndes Selbstvertrauen beim Sprechen',
          'Angst vor Fehlern vor der Klasse',
          'Fehlender Wortschatz für das Thema',
          'Kulturelle Unterschiede (in manchen Kulturen spricht man nicht unaufgefordert)'
        ],
        moegliche_massnahmen: [
          { massnahme: 'Sprachgerüste anbieten (Satzstarter)', begruendung: 'Gibt Sicherheit beim Formulieren' },
          { massnahme: 'Erst in Partnerarbeit sprechen lassen', begruendung: 'Weniger Hemmung als vor der ganzen Klasse' },
          { massnahme: 'Think-Pair-Share einsetzen', begruendung: 'Zeit zum Nachdenken vor dem Sprechen' },
          { massnahme: 'Wortschatz vorentlasten', begruendung: 'Kinder kennen die nötigen Wörter' }
        ]
      }
    ]
  };

  // 100 PROF-L relevante Beispielthemen nach Kategorie
  const beispielThemen = [
    // LESEN (25 Themen) - Texte verstehen, die im Schulalltag relevant sind
    { thema: 'Elternbrief: Ankündigung Klassenlager', kategorie: 'lesen', icon: '📖' },
    { thema: 'Schulhausordnung verstehen', kategorie: 'lesen', icon: '📖' },
    { thema: 'Lehrplan 21: Kompetenzbereich Deutsch', kategorie: 'lesen', icon: '📖' },
    { thema: 'Zeitungsartikel über Digitalisierung in der Schule', kategorie: 'lesen', icon: '📖' },
    { thema: 'Informationsbroschüre: Übertritt Sekundarstufe', kategorie: 'lesen', icon: '📖' },
    { thema: 'Protokoll einer Schulkonferenz', kategorie: 'lesen', icon: '📖' },
    { thema: 'Elternratgeber: Hausaufgaben begleiten', kategorie: 'lesen', icon: '📖' },
    { thema: 'Fachtext: Lese-Rechtschreib-Schwäche', kategorie: 'lesen', icon: '📖' },
    { thema: 'Informationsblatt: Kopfläuse im Schulhaus', kategorie: 'lesen', icon: '📖' },
    { thema: 'Medienmitteilung des Bildungsdepartements', kategorie: 'lesen', icon: '📖' },
    { thema: 'Anleitung: Schulisches Standortgespräch', kategorie: 'lesen', icon: '📖' },
    { thema: 'Fachartikel: Integration im Klassenzimmer', kategorie: 'lesen', icon: '📖' },
    { thema: 'Elterninformation: Znüni und gesunde Ernährung', kategorie: 'lesen', icon: '📖' },
    { thema: 'Bericht: Gewaltprävention an Schulen', kategorie: 'lesen', icon: '📖' },
    { thema: 'Reglement: Absenzen und Dispensationen', kategorie: 'lesen', icon: '📖' },
    { thema: 'Newsletter der Schulgemeinde', kategorie: 'lesen', icon: '📖' },
    { thema: 'Konzept: Begabungsförderung', kategorie: 'lesen', icon: '📖' },
    { thema: 'Informationstext: Schulpsychologischer Dienst', kategorie: 'lesen', icon: '📖' },
    { thema: 'Flyer: Projektwoche Nachhaltigkeit', kategorie: 'lesen', icon: '📖' },
    { thema: 'Merkblatt: Vorgehen bei Unfällen', kategorie: 'lesen', icon: '📖' },
    { thema: 'Fachartikel: Mehrsprachigkeit im Unterricht', kategorie: 'lesen', icon: '📖' },
    { thema: 'Informationsbroschüre: Schulsozialarbeit', kategorie: 'lesen', icon: '📖' },
    { thema: 'Elternbrief: Schulreise organisieren', kategorie: 'lesen', icon: '📖' },
    { thema: 'Bericht: Evaluation Schulqualität', kategorie: 'lesen', icon: '📖' },
    { thema: 'Anleitung: Beurteilung ohne Noten', kategorie: 'lesen', icon: '📖' },
    
    // HÖREN (25 Themen) - Hörtexte aus dem Schulkontext
    { thema: 'Radiobeitrag: Neue Medien im Klassenzimmer', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Interview mit einer Schulleiterin', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Podcast: Tipps für Elterngespräche', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Hörbeitrag: Mobbing erkennen und handeln', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Referat: Bewegte Schule', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Radiointerview: Lehrmittel der Zukunft', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Vortrag: Heterogenität im Unterricht', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Podcast: Stressbewältigung für Lehrpersonen', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Hörbeitrag: Ausserschulische Lernorte', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Interview: Erfahrungen mit Teamteaching', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Radiobeitrag: Frühe Sprachförderung', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Vortrag: Klassenführung und Disziplin', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Podcast: Inklusion in der Praxis', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Interview mit Schulinspektor:in', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Hörbeitrag: Prävention von Schulabsentismus', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Radiobeitrag: Lehrermangel in der Schweiz', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Vortrag: Formative Beurteilung', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Podcast: Elternmitwirkung an Schulen', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Interview: Schulentwicklung gestalten', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Hörbeitrag: Gesundheitsförderung im Schulalltag', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Radiobeitrag: Sprachsensibler Fachunterricht', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Vortrag: Differenzierung im Unterricht', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Podcast: Umgang mit herausforderndem Verhalten', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Interview: Berufseinstieg als Lehrperson', kategorie: 'hoeren', icon: '🎧' },
    { thema: 'Hörbeitrag: Kooperation Schule-Elternhaus', kategorie: 'hoeren', icon: '🎧' },
    
    // SCHREIBEN - E-MAIL (Themen für formelle Kommunikation)
    { thema: 'E-Mail an Eltern: Entschuldigung für Vorfall', kategorie: 'schreiben', subkategorie: 'email', icon: '✍️' },
    { thema: 'Brief an Kolleg:in: Materialien ausleihen', kategorie: 'schreiben', subkategorie: 'email', icon: '✍️' },
    { thema: 'Elternbrief: Schwimmunterricht ankündigen', kategorie: 'schreiben', subkategorie: 'email', icon: '✍️' },
    { thema: 'E-Mail an Schulleitung: Weiterbildung beantragen', kategorie: 'schreiben', subkategorie: 'email', icon: '✍️' },
    { thema: 'Brief an Eltern: Zeugnisgespräch einladen', kategorie: 'schreiben', subkategorie: 'email', icon: '✍️' },
    { thema: 'E-Mail an Fachperson: Abklärung anfragen', kategorie: 'schreiben', subkategorie: 'email', icon: '✍️' },
    { thema: 'Elternbrief: Waldtag organisieren', kategorie: 'schreiben', subkategorie: 'email', icon: '✍️' },
    { thema: 'E-Mail an Team: Sitzung verschieben', kategorie: 'schreiben', subkategorie: 'email', icon: '✍️' },
    { thema: 'Brief an Eltern: Verhaltensauffälligkeiten', kategorie: 'schreiben', subkategorie: 'email', icon: '✍️' },
    { thema: 'E-Mail an Bibliothek: Klassenbesuch anfragen', kategorie: 'schreiben', subkategorie: 'email', icon: '✍️' },
    { thema: 'Brief an Eltern: Sporttag ankündigen', kategorie: 'schreiben', subkategorie: 'email', icon: '✍️' },
    { thema: 'E-Mail: Krankmeldung an Schulleitung', kategorie: 'schreiben', subkategorie: 'email', icon: '✍️' },
    
    // SCHREIBEN - ARBEITSBLATT (Themen für Unterrichtsmaterialien)
    { thema: 'Wortschatz: Schulsachen und Klassenzimmer', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Wortschatz: Familie und Zuhause', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Wortschatz: Essen und Trinken', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Wortschatz: Körperteile und Gesundheit', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Wortschatz: Kleidung und Wetter', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Wortschatz: Tiere auf dem Bauernhof', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Wortschatz: Berufe und Arbeit', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Wortschatz: Hobbys und Freizeit', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Wortschatz: Verkehrsmittel und Reisen', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Wortschatz: Einkaufen und Geld', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Grammatik: Präsens - regelmässige Verben', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Grammatik: Akkusativ mit bestimmtem Artikel', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Grammatik: Trennbare Verben im Alltag', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Grammatik: Possessivartikel (mein, dein, sein)', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Grammatik: Modalverben können und müssen', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Leseverstehen: Mein Tagesablauf', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Leseverstehen: Brief von einem Freund', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Hörverstehen: Im Restaurant bestellen', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Sprechübung: Sich vorstellen', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    { thema: 'Sprechübung: Nach dem Weg fragen', kategorie: 'schreiben', subkategorie: 'arbeitsblatt', icon: '📝' },
    
    // SCHREIBEN - KORREKTUR (Themen für Schülertexte)
    { thema: 'Korrektur: Selbstvorstellung A1', kategorie: 'schreiben', subkategorie: 'korrektur', icon: '🔍' },
    { thema: 'Korrektur: Bildbeschreibung', kategorie: 'schreiben', subkategorie: 'korrektur', icon: '🔍' },
    { thema: 'Korrektur: Bericht über Wochenende', kategorie: 'schreiben', subkategorie: 'korrektur', icon: '🔍' },
    { thema: 'Korrektur: Brief an Brieffreund', kategorie: 'schreiben', subkategorie: 'korrektur', icon: '🔍' },
    { thema: 'Korrektur: Mein Lieblingstier', kategorie: 'schreiben', subkategorie: 'korrektur', icon: '🔍' },
    
    // SPRECHEN - UNTERRICHT STRUKTURIEREN (Stundenbeginn, Aktivitäten erklären)
    { thema: 'Stundenbeginn: Wortschatz zum Thema Einkaufen', kategorie: 'sprechen', subkategorie: 'unterricht', icon: '🎤' },
    { thema: 'Stundenbeginn: Neues Grammatikthema einführen', kategorie: 'sprechen', subkategorie: 'unterricht', icon: '🎤' },
    { thema: 'Aktivität erklären: Partnerarbeit mit Dialogkarten', kategorie: 'sprechen', subkategorie: 'unterricht', icon: '🎤' },
    { thema: 'Aktivität erklären: Lernspiel mit Würfeln', kategorie: 'sprechen', subkategorie: 'unterricht', icon: '🎤' },
    { thema: 'Stundenbeginn: Leseverstehen-Übung', kategorie: 'sprechen', subkategorie: 'unterricht', icon: '🎤' },
    { thema: 'Aktivität erklären: Hörverstehen mit Arbeitsblatt', kategorie: 'sprechen', subkategorie: 'unterricht', icon: '🎤' },
    { thema: 'Stundenbeginn: Wiederholung vom letzten Mal', kategorie: 'sprechen', subkategorie: 'unterricht', icon: '🎤' },
    { thema: 'Aktivität erklären: Schreibaufgabe mit Satzstartern', kategorie: 'sprechen', subkategorie: 'unterricht', icon: '🎤' },
    { thema: 'Stundenbeginn: Bildimpuls besprechen', kategorie: 'sprechen', subkategorie: 'unterricht', icon: '🎤' },
    { thema: 'Aktivität erklären: Stationenarbeit organisieren', kategorie: 'sprechen', subkategorie: 'unterricht', icon: '🎤' },
    
    // SPRECHEN - FEEDBACK GEBEN (Schülerarbeiten kommentieren)
    { thema: 'Feedback: Schriftlicher Text einer Schülerin', kategorie: 'sprechen', subkategorie: 'feedback', icon: '🎤' },
    { thema: 'Feedback: Mündliche Präsentation eines Schülers', kategorie: 'sprechen', subkategorie: 'feedback', icon: '🎤' },
    { thema: 'Feedback: Bildbeschreibung korrigieren', kategorie: 'sprechen', subkategorie: 'feedback', icon: '🎤' },
    { thema: 'Feedback: Dialogübung bewerten', kategorie: 'sprechen', subkategorie: 'feedback', icon: '🎤' },
    { thema: 'Feedback: Hausaufgabe besprechen', kategorie: 'sprechen', subkategorie: 'feedback', icon: '🎤' },
    { thema: 'Feedback: Gruppenarbeit auswerten', kategorie: 'sprechen', subkategorie: 'feedback', icon: '🎤' },
    { thema: 'Feedback: Lesevortrag kommentieren', kategorie: 'sprechen', subkategorie: 'feedback', icon: '🎤' },
    { thema: 'Feedback: Kreative Schreibaufgabe würdigen', kategorie: 'sprechen', subkategorie: 'feedback', icon: '🎤' },
    
    // SPRECHEN - PRÄSENTATION (Themen für Kolleg:innen)
    { thema: 'Kollegium: Digitale Tools im DaZ-Unterricht', kategorie: 'sprechen', subkategorie: 'praesentation', icon: '🎤' },
    { thema: 'Team: Scaffolding-Methoden vorstellen', kategorie: 'sprechen', subkategorie: 'praesentation', icon: '🎤' },
    { thema: 'Kollegium: Erfahrungen mit Translanguaging', kategorie: 'sprechen', subkategorie: 'praesentation', icon: '🎤' },
    { thema: 'Team: Formative Beurteilung im Sprachunterricht', kategorie: 'sprechen', subkategorie: 'praesentation', icon: '🎤' },
    { thema: 'Kollegium: Kooperative Lernformen', kategorie: 'sprechen', subkategorie: 'praesentation', icon: '🎤' },
    { thema: 'Team: Wortschatzarbeit systematisieren', kategorie: 'sprechen', subkategorie: 'praesentation', icon: '🎤' },
    { thema: 'Kollegium: Binnendifferenzierung im Deutschunterricht', kategorie: 'sprechen', subkategorie: 'praesentation', icon: '🎤' },
    { thema: 'Team: Leseförderung mit authentischen Texten', kategorie: 'sprechen', subkategorie: 'praesentation', icon: '🎤' },
    
    // PRÜFUNGSGESPRÄCH - SIMULATION (Unterrichtssimulation mit Material)
    { thema: 'Simulation: Bildergeschichte "Der verlorene Hund"', kategorie: 'gespraech', subkategorie: 'simulation', icon: '🎭' },
    { thema: 'Simulation: Bildergeschichte "Im Supermarkt"', kategorie: 'gespraech', subkategorie: 'simulation', icon: '🎭' },
    { thema: 'Simulation: Grafik "Hobbys der Klasse" interpretieren', kategorie: 'gespraech', subkategorie: 'simulation', icon: '🎭' },
    { thema: 'Simulation: Grafik "Wetter in der Schweiz" erklären', kategorie: 'gespraech', subkategorie: 'simulation', icon: '🎭' },
    { thema: 'Simulation: Text-Bild "Mein Schulweg" erarbeiten', kategorie: 'gespraech', subkategorie: 'simulation', icon: '🎭' },
    { thema: 'Simulation: Text-Bild "Unser Klassenzimmer" beschreiben', kategorie: 'gespraech', subkategorie: 'simulation', icon: '🎭' },
    { thema: 'Simulation: Wortfeld "Familie" spielerisch einführen', kategorie: 'gespraech', subkategorie: 'simulation', icon: '🎭' },
    { thema: 'Simulation: Wortfeld "Essen und Trinken" üben', kategorie: 'gespraech', subkategorie: 'simulation', icon: '🎭' },
    
    // PRÜFUNGSGESPRÄCH - FACHGESPRÄCH (Probleme diskutieren)
    { thema: 'Problem: Mehrsprachige Kinder schweigen im Unterricht', kategorie: 'gespraech', subkategorie: 'fachgespraech', icon: '🎭' },
    { thema: 'Problem: Schüler:in verweigert Deutschsprechen', kategorie: 'gespraech', subkategorie: 'fachgespraech', icon: '🎭' },
    { thema: 'Problem: Grosse Leistungsunterschiede in der Klasse', kategorie: 'gespraech', subkategorie: 'fachgespraech', icon: '🎭' },
    { thema: 'Problem: Eltern unterstützen das Deutschlernen nicht', kategorie: 'gespraech', subkategorie: 'fachgespraech', icon: '🎭' },
    { thema: 'Problem: Mangelnde Motivation beim Schreiben', kategorie: 'gespraech', subkategorie: 'fachgespraech', icon: '🎭' },
    { thema: 'Problem: Schwierigkeiten mit der deutschen Aussprache', kategorie: 'gespraech', subkategorie: 'fachgespraech', icon: '🎭' },
    { thema: 'Problem: Leseverstehen schwächer als Hörverstehen', kategorie: 'gespraech', subkategorie: 'fachgespraech', icon: '🎭' },
    { thema: 'Problem: Schüler:in hat Angst vor Fehlern', kategorie: 'gespraech', subkategorie: 'fachgespraech', icon: '🎭' },
    { thema: 'Problem: Wortschatz wird schnell vergessen', kategorie: 'gespraech', subkategorie: 'fachgespraech', icon: '🎭' },
    { thema: 'Problem: Grammatikregeln werden nicht angewendet', kategorie: 'gespraech', subkategorie: 'fachgespraech', icon: '🎭' },
    { thema: 'Problem: Unruhe und Ablenkung während Deutschlektionen', kategorie: 'gespraech', subkategorie: 'fachgespraech', icon: '🎭' },
    { thema: 'Problem: Kulturelle Missverständnisse im Unterricht', kategorie: 'gespraech', subkategorie: 'fachgespraech', icon: '🎭' },
  ];

  // Gefilterte Themen basierend auf Aufgabentyp
  const getKategorieFromAufgabenTyp = () => {
    if (aufgabenTyp.startsWith('lesen_')) return 'lesen';
    if (aufgabenTyp.startsWith('hoeren_')) return 'hoeren';
    if (aufgabenTyp.startsWith('schreiben_')) return 'schreiben';
    if (aufgabenTyp.startsWith('sprechen_')) return 'sprechen';
    if (aufgabenTyp.startsWith('gespraech_')) return 'gespraech';
    return 'alle';
  };
  
  // Bestimme die Subkategorie für Schreiben-Aufgaben
  const getSubkategorieFromAufgabenTyp = () => {
    // Schreiben
    if (aufgabenTyp === 'schreiben_arbeitsblatt') return 'arbeitsblatt';
    if (aufgabenTyp === 'schreiben_email') return 'email';
    if (aufgabenTyp === 'schreiben_korrektur_feedback') return 'korrektur';
    if (aufgabenTyp === 'schreiben_text_vereinfachen') return 'arbeitsblatt';
    
    // Sprechen Teil 1
    if (aufgabenTyp === 'sprechen_unterricht_strukturieren') return 'unterricht';
    if (aufgabenTyp === 'sprechen_feedback_geben') return 'feedback';
    if (aufgabenTyp === 'sprechen_praesentation') return 'praesentation';
    
    // Prüfungsgespräch Teil 2
    if (aufgabenTyp === 'gespraech_simulation') return 'simulation';
    if (aufgabenTyp === 'gespraech_fachgespraech') return 'fachgespraech';
    
    return null;
  };

  const aktuelleKategorie = getKategorieFromAufgabenTyp();
  const aktuelleSubkategorie = getSubkategorieFromAufgabenTyp();
  
  const gefilterteThemen = beispielThemen.filter(t => {
    // Automatisch nach Aufgabentyp filtern
    const matchKategorie = aktuelleKategorie === 'alle' || t.kategorie === aktuelleKategorie;
    
    // Für Kategorien mit Subkategorien: Auch nach Subkategorie filtern
    let matchSubkategorie = true;
    if (aktuelleSubkategorie && t.subkategorie) {
      matchSubkategorie = t.subkategorie === aktuelleSubkategorie;
    } else if (aktuelleSubkategorie && !t.subkategorie) {
      // Wenn Subkategorie erwartet aber Thema keine hat, nicht anzeigen
      matchSubkategorie = false;
    }
    
    const matchSuche = t.thema.toLowerCase().includes(themenSuche.toLowerCase());
    return matchKategorie && matchSubkategorie && matchSuche;
  });

  // API-Aufruf für Textkorrektur - verbessert mit authentischen PROF-L Kriterien
  const analyzeText = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setKorrekturErgebnis(null);
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          messages: [{
            role: 'user',
            content: `Du bist ein PROF-L Prüfungsexperte für angehende Lehrpersonen in der Schweiz (französischsprachig), die Deutsch als Fremdsprache lernen. Analysiere den folgenden Text gemäss den offiziellen PROF-L Bewertungskriterien.

## PROF-L PRÜFUNGSKONTEXT
Die PROF-L Prüfung (Professionelle Sprachprüfung für Lehrpersonen) testet berufsspezifische Sprachkompetenzen auf Niveau B2-C1 nach BSSKP-Standard. Bestehensgrenze: 60%.

## TYPISCHE FEHLERKATEGORIEN (basierend auf echten Schülerarbeiten)

1. RECHTSCHREIBUNG:
- Grossschreibung von Nomen vergessen (z.B. "jahre" → "Jahre", "hobby" → "Hobby")
- Umlaute falsch (z.B. "Ärtzin" → "Ärztin")
- Doppelkonsonanten (z.B. "spilen" → "spielen")
- Interferenz aus Französisch (z.B. "Presentazion" → "Präsentation", "Art" → "Kunst")

2. GENUS (Artikel):
- Falsches grammatisches Geschlecht (z.B. "mein Oma" → "meine Oma", "das Ausflug" → "der Ausflug")

3. KASUS:
- Dativ nach Präpositionen wie mit, neben, in (z.B. "mit meine Schwester" → "mit meiner Schwester")
- Akkusativ bei Verben wie haben (z.B. "kein Bruder" → "keinen Bruder")

4. VERBKONJUGATION:
- Falsche Formen (z.B. "ich möge" → "ich mag")
- Falsche Hilfsverben (z.B. "ich habe in der Schweiz geboren" → "ich bin... geboren")

5. WORTSTELLUNG:
- Verb nicht an Position 2 (z.B. "Im Winter ich möge" → "Im Winter fahre ich")
- Nebensatzstellung (z.B. "weil sie haben" → "weil sie ... haben")

6. PRÄPOSITIONEN:
- Falsche Präposition (z.B. "in die Foto" → "auf dem Foto", "für hobby" → "als Hobby")

7. AUSDRUCK/IDIOMATIK:
- Falsche Redewendungen (z.B. "wie gehst du?" → "wie geht es dir?")
- Wortschatzfehler durch L1-Interferenz

8. REGISTER:
- Für berufliche Texte: formeller, professioneller Ton erforderlich
- Schweizer Schulbegriffe korrekt: Schulhaus, Znüni, Lehrperson, Lektion

## TEXTTYPEN IN DER PROF-L PRÜFUNG
- Formelle Anfragen/E-Mails (150-200 Wörter, 15 Min)
- Kommentare/Stellungnahmen (200-250 Wörter, 35 Min)
- Schülerarbeiten korrigieren

WICHTIG: Antworte NUR mit einem gültigen JSON-Objekt, ohne Markdown-Formatierung oder Erklärungen davor/danach.

JSON-Format:
{
  "fehler": [
    {"original": "fehlerhafter Text", "korrektur": "korrigierter Text", "erklaerung": "Pädagogisch wertvolle Erklärung des Fehlers", "kategorie": "Rechtschreibung|Genus|Kasus|Verb|Wortstellung|Präposition|Ausdruck|Register"}
  ],
  "gesamtbewertung": "Detaillierte Bewertung mit Bezug auf PROF-L Standards",
  "staerken": ["Konkrete Stärke 1", "Konkrete Stärke 2"],
  "tipps": ["Spezifischer Verbesserungstipp 1", "Spezifischer Verbesserungstipp 2"],
  "texttyp_empfehlung": "Welcher PROF-L Texttyp passt zu diesem Text",
  "profl_niveau": "A2|B1|B2|C1",
  "bestandenschaetzung": "hoch|mittel|gering",
  "punkte_schaetzung": "XX/100"
}

Text zur Analyse:
"""
${text}
"""`
          }]
        })
      });
      
      const data = await response.json();
      if (data.content && data.content[0]) {
        const content = data.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          setKorrekturErgebnis(JSON.parse(jsonMatch[0]));
        } else {
          setKorrekturErgebnis({ error: 'Ungültige Antwort vom Server.' });
        }
      } else if (data.error) {
        setKorrekturErgebnis({ error: `API-Fehler: ${data.error.message || 'Unbekannter Fehler'}` });
      }
    } catch (error) {
      console.error('Fehler:', error);
      setKorrekturErgebnis({ error: `Verbindungsfehler: ${error.message}` });
    }
    setIsAnalyzing(false);
  };

  // API-Aufruf für Aufgaben-Generator
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
    
    const typ = aufgabenTypen.find(t => t.id === aufgabenTyp);
    
    // Bestimme das JSON-Format basierend auf Aufgabentyp
    let jsonFormat = '';
    let extraInstructions = '';
    
    // === TEIL 1A: LESEN ===
    if (aufgabenTyp === 'lesen_fachtext_mc') {
      jsonFormat = `{
        "titel": "Leseverstehen: Fachtext",
        "situation": "Sie lesen einen kurzen fachdidaktischen Text",
        "aufgabe": "Lesen Sie den Text und beantworten Sie 6 Multiple-Choice-Fragen",
        "artikel": "Ein Fachtext (500-700 Wörter) über das gewählte Thema mit klarer Struktur (Einleitung, Hauptteil mit Argumenten/Beispielen, Schluss)",
        "fragen": [
          {"nr": 1, "frage": "Was ist die Hauptaussage des Textes?", "optionen": [{"buchstabe": "a", "text": "..."}, {"buchstabe": "b", "text": "..."}, {"buchstabe": "c", "text": "..."}]},
          {"nr": 2, "frage": "Welche zwei Vorteile werden genannt?", "optionen": [{"buchstabe": "a", "text": "..."}, {"buchstabe": "b", "text": "..."}, {"buchstabe": "c", "text": "..."}]},
          {"nr": 3, "frage": "Welche Bedingung ist entscheidend?", "optionen": [{"buchstabe": "a", "text": "..."}, {"buchstabe": "b", "text": "..."}, {"buchstabe": "c", "text": "..."}]},
          {"nr": 4, "frage": "Welche Beispiele stützen die These?", "optionen": [{"buchstabe": "a", "text": "..."}, {"buchstabe": "b", "text": "..."}, {"buchstabe": "c", "text": "..."}]},
          {"nr": 5, "frage": "Welche Aussage ist NICHT im Text?", "optionen": [{"buchstabe": "a", "text": "..."}, {"buchstabe": "b", "text": "..."}, {"buchstabe": "c", "text": "..."}]},
          {"nr": 6, "frage": "Welche Schlussfolgerung zieht die Autorin?", "optionen": [{"buchstabe": "a", "text": "..."}, {"buchstabe": "b", "text": "..."}, {"buchstabe": "c", "text": "..."}]}
        ],
        "loesungen": {"1": "a", "2": "b", "3": "c", "4": "a", "5": "b", "6": "c"},
        "zeit": "20 Min"
      }`;
      extraInstructions = `Erstelle einen authentischen Fachtext (500-700 Wörter) mit klarer Argumentationsstruktur. Die Fragen sollen typische Leseverstehen-Kompetenzen testen: Hauptaussage, Details, Argumentation, Textverständnis.`;
      
    } else if (aufgabenTyp === 'lesen_artikel_zuordnung') {
      jsonFormat = `{
        "titel": "Leseverstehen: Artikel + Zuordnung",
        "situation": "Sie lesen einen Zeitungsartikel",
        "aufgabe": "Ordnen Sie 8 Aussagen den Abschnitten A-D zu",
        "artikel": "Ein Zeitungsartikel (450-650 Wörter) mit 4 klar gegliederten Abschnitten A, B, C, D",
        "abschnitte": ["A: Einleitung/Problem", "B: Argumente Pro", "C: Argumente Contra", "D: Fazit/Ausblick"],
        "aussagen": [
          {"nr": 1, "text": "nennt ein Gegenargument"},
          {"nr": 2, "text": "liefert ein konkretes Beispiel"},
          {"nr": 3, "text": "stellt eine Statistik vor"},
          {"nr": 4, "text": "beschreibt eine Konsequenz"},
          {"nr": 5, "text": "formuliert eine These"},
          {"nr": 6, "text": "zitiert einen Experten"},
          {"nr": 7, "text": "gibt einen Lösungsvorschlag"},
          {"nr": 8, "text": "stellt den Kontext dar"}
        ],
        "loesungen": {"1": "C", "2": "B", "3": "A", "4": "D", "5": "A", "6": "B", "7": "D", "8": "A"},
        "zeit": "15 Min"
      }`;
      extraInstructions = `Erstelle einen Zeitungsartikel mit 4 klar gekennzeichneten Abschnitten (A, B, C, D). Jeder Abschnitt soll eine andere Funktion haben.`;

    // === TEIL 1B: HÖREN ===
    } else if (aufgabenTyp === 'hoeren_interview_mc') {
      jsonFormat = `{
        "titel": "Hörverstehen: Interview",
        "situation": "Sie hören ein Radiointerview (2-3 Minuten) mit einer Lehrperson",
        "aufgabe": "Hören Sie das Interview und beantworten Sie 5 Multiple-Choice-Fragen",
        "artikel": "Ein Interview-Transkript (Moderator:in und Lehrperson im Wechsel) über das gewählte Thema",
        "fragen": [
          {"nr": 1, "frage": "Warum hat die Lehrperson diese Methode gewählt?", "optionen": [{"buchstabe": "a", "text": "..."}, {"buchstabe": "b", "text": "..."}, {"buchstabe": "c", "text": "..."}]},
          {"nr": 2, "frage": "Welche Kritik nennt sie?", "optionen": [{"buchstabe": "a", "text": "..."}, {"buchstabe": "b", "text": "..."}, {"buchstabe": "c", "text": "..."}]},
          {"nr": 3, "frage": "Welche Konsequenz zieht sie für den Unterricht?", "optionen": [{"buchstabe": "a", "text": "..."}, {"buchstabe": "b", "text": "..."}, {"buchstabe": "c", "text": "..."}]},
          {"nr": 4, "frage": "Welche Zielgruppe erwähnt sie?", "optionen": [{"buchstabe": "a", "text": "..."}, {"buchstabe": "b", "text": "..."}, {"buchstabe": "c", "text": "..."}]},
          {"nr": 5, "frage": "Welche Aussage ist falsch?", "optionen": [{"buchstabe": "a", "text": "..."}, {"buchstabe": "b", "text": "..."}, {"buchstabe": "c", "text": "..."}]}
        ],
        "loesungen": {"1": "a", "2": "b", "3": "c", "4": "a", "5": "b"},
        "zeit": "15 Min"
      }`;
      extraInstructions = `Erstelle ein authentisches Interview-Transkript im Dialog-Format:
Moderator:in: Frage...
Lehrperson: Antwort...
Das Interview soll 2-3 Minuten Sprechzeit entsprechen (ca. 300-400 Wörter).`;

    } else if (aufgabenTyp === 'hoeren_gespraech_zuordnung') {
      jsonFormat = `{
        "titel": "Hörverstehen: Gespräch + Zuordnung",
        "situation": "Sie hören ein Gespräch zwischen zwei Kolleg:innen aus einer Weiterbildung (mit Hintergrundgeräuschen)",
        "aufgabe": "Ordnen Sie 10 Aussagen Person A oder Person B zu",
        "artikel": "Ein Dialog-Transkript zwischen Person A und Person B über das gewählte Thema",
        "personen": {"A": "Beschreibung Person A (z.B. erfahrene Lehrperson)", "B": "Beschreibung Person B (z.B. Berufseinsteiger:in)"},
        "aussagen": [
          {"nr": 1, "text": "befürwortet den neuen Ansatz"},
          {"nr": 2, "text": "warnt vor Überforderung"},
          {"nr": 3, "text": "nennt ein Beispiel aus dem Unterricht"},
          {"nr": 4, "text": "bezweifelt die Umsetzbarkeit"},
          {"nr": 5, "text": "schlägt eine Alternative vor"},
          {"nr": 6, "text": "berichtet von positiven Erfahrungen"},
          {"nr": 7, "text": "betont die Wichtigkeit von Weiterbildung"},
          {"nr": 8, "text": "sieht praktische Hindernisse"},
          {"nr": 9, "text": "verweist auf Forschungsergebnisse"},
          {"nr": 10, "text": "möchte es ausprobieren"}
        ],
        "loesungen": {"1": "B", "2": "A", "3": "B", "4": "A", "5": "A", "6": "B", "7": "A", "8": "A", "9": "B", "10": "B"},
        "zeit": "15 Min"
      }`;
      extraInstructions = `Erstelle einen authentischen Dialog zwischen zwei Personen (A und B) mit unterschiedlichen Standpunkten. Format:
Person A: ...
Person B: ...
Der Dialog soll 2-4 Minuten Sprechzeit entsprechen (ca. 400-500 Wörter).`;

    // === TEIL 1C: SPRECHEN (Monologisch) ===
    } else if (aufgabenTyp === 'sprechen_unterricht_strukturieren') {
      jsonFormat = `{
        "titel": "Monologisches Sprechen: Unterricht strukturieren",
        "situation": "Sie beginnen eine Unterrichtslektion mit Ihrer Klasse",
        "aufgabe": "Erklären Sie den Ablauf der Stunde (Einstieg – Übung – Partnerarbeit – Abschluss) und geben Sie klare Arbeitsanweisungen",
        "zielniveau": "A1-A2 (an Lernende gerichtet)",
        "punkte": [
          "Begrüssung und Einstieg ins Thema",
          "Erklärung des heutigen Lernziels",
          "Ablauf der Stunde vorstellen",
          "Klare Arbeitsanweisungen geben",
          "Zeitangaben machen"
        ],
        "hinweise": [
          "Einfache, klare Sprache verwenden",
          "Anweisungen in kurzen Sätzen",
          "Visualisierungen erwähnen (Tafel, Arbeitsblatt)"
        ],
        "sprechzeit": "1-2 Minuten",
        "bewertungskriterien": [
          {"name": "Réalisation de la tâche", "beschreibung": "Alle Punkte angesprochen"},
          {"name": "Clarté des consignes", "beschreibung": "Klare, verständliche Anweisungen"},
          {"name": "Adaptation au niveau", "beschreibung": "Angemessene Sprache für Lernende"}
        ],
        "musterantwort": "Eine Muster-Unterrichtseinleitung mit allen Elementen",
        "zeit": "5 Min"
      }`;
      extraInstructions = `Die Sprache muss einfach und klar sein (für Schüler:innen verständlich). Typische Unterrichtssprache verwenden.`;

    } else if (aufgabenTyp === 'sprechen_feedback_geben') {
      jsonFormat = `{
        "titel": "Monologisches Sprechen: Feedback geben",
        "situation": "Ein:e Schüler:in hat Ihnen eine schriftliche Arbeit (5-6 Sätze mit typischen Fehlern) abgegeben",
        "aufgabe": "Geben Sie mündliches Feedback: 2 positive Punkte, 2 Verbesserungstipps, eine kurze Modellformulierung",
        "zielniveau": "A1-A2 (an Lernende gerichtet)",
        "schuelerarbeit": "Ein kurzer Schülertext (5-6 Sätze) mit 3-4 typischen Fehlern",
        "punkte": [
          "2 positive Aspekte loben",
          "2 konkrete Verbesserungsvorschläge",
          "Eine Modellformulierung für einen Fehler zeigen"
        ],
        "hinweise": [
          "Positiv beginnen (Sandwich-Methode)",
          "Konstruktiv und ermutigend bleiben",
          "Konkrete Beispiele nennen"
        ],
        "sprechzeit": "1-2 Minuten",
        "bewertungskriterien": [
          {"name": "Positivität", "beschreibung": "Ermutigendes, wertschätzendes Feedback"},
          {"name": "Konkretheit", "beschreibung": "Spezifische, hilfreiche Tipps"},
          {"name": "Modellierung", "beschreibung": "Korrekte Alternative gezeigt"}
        ],
        "musterantwort": "Ein Muster-Feedback mit allen Elementen",
        "zeit": "5 Min"
      }`;
      extraInstructions = `Erstelle einen kurzen Schülertext (5-6 Sätze) mit typischen DaF-Fehlern als Basis für das Feedback.`;

    } else if (aufgabenTyp === 'sprechen_praesentation') {
      jsonFormat = `{
        "titel": "Monologisches Sprechen: Präsentation im Team",
        "situation": "Sie stellen im Kollegium eine Idee/Methode vor",
        "aufgabe": "Präsentieren Sie Ihre Argumente (Nutzen, Aufwand, Beispiele), beziehen Sie sich auf eine Grafik, schliessen Sie mit einem Vorschlag",
        "zielniveau": "B2-C1 (an Kolleg:innen gerichtet)",
        "grafik_beschreibung": "Beschreibung einer einfachen Grafik (z.B. Balkendiagramm, Kreisdiagramm) zum Thema",
        "punkte": [
          "Thema und Ziel der Präsentation nennen",
          "2-3 Hauptargumente mit Begründung",
          "Grafik erklären und interpretieren",
          "Konkreten Umsetzungsvorschlag machen",
          "Abschluss mit Zusammenfassung"
        ],
        "hinweise": [
          "Professionelles Register verwenden",
          "Argumentationsstruktur (These, Begründung, Beispiel)",
          "Auf Grafik Bezug nehmen"
        ],
        "sprechzeit": "2-3 Minuten",
        "bewertungskriterien": [
          {"name": "Argumentation", "beschreibung": "Überzeugende, strukturierte Argumente"},
          {"name": "Grafikbezug", "beschreibung": "Sinnvolle Einbindung der Grafik"},
          {"name": "Sprachliche Qualität", "beschreibung": "B2-C1 Niveau, professioneller Ton"}
        ],
        "musterantwort": "Eine Muster-Präsentation mit allen Elementen",
        "zeit": "7 Min"
      }`;
      extraInstructions = `Erstelle eine Beschreibung einer einfachen Grafik (Balken-/Kreisdiagramm), die zur Argumentation passt.`;

    // === TEIL 1D: SCHREIBEN ===
    } else if (aufgabenTyp === 'schreiben_arbeitsblatt') {
      jsonFormat = `{
        "titel": "Schreiben: Arbeitsblatt erstellen",
        "situation": "Sie erstellen ein Arbeitsblatt für Ihre Klasse",
        "aufgabe": "Gestalten Sie ein vollständiges Arbeitsblatt mit Wortschatz, Übungen und Partneraufgabe",
        "inhaltspunkte": [
          "Mini-Wortschatzbox (6 relevante Wörter/Ausdrücke)",
          "5 Lückensätze zur Anwendung des Wortschatzes",
          "Partneraufgabe (Rollenspiel/Dialog) mit klaren Anweisungen"
        ],
        "hinweise": [
          "Altersgerechte Sprache und Themen",
          "Klare visuelle Struktur",
          "Eindeutige Arbeitsanweisungen"
        ],
        "zeit": "20 Min",
        "bewertungskriterien": [
          {"name": "Didaktische Qualität", "beschreibung": "Sinnvolle Übungsabfolge"},
          {"name": "Sprachliche Korrektheit", "beschreibung": "Fehlerfreie Formulierungen"},
          {"name": "Klarheit", "beschreibung": "Verständliche Anweisungen"}
        ],
        "musterantwort": "Ein vollständiges Muster-Arbeitsblatt"
      }`;
      extraInstructions = `Das Arbeitsblatt soll vollständig und direkt einsetzbar sein. Schweizer Schulkontext beachten.`;

    } else if (aufgabenTyp === 'schreiben_email') {
      jsonFormat = `{
        "titel": "Schreiben: Berufsrelevante E-Mail",
        "situation": "Sie schreiben eine formelle E-Mail im beruflichen Kontext",
        "aufgabe": "Verfassen Sie eine E-Mail mit Anlass, organisatorischen Details, Kostenrahmen und Bitte um Rückmeldung",
        "empfaenger": {"name": "Name", "funktion": "Funktion", "institution": "Institution"},
        "inhaltspunkte": [
          "Anlass und Ziel des Schreibens",
          "Organisatorische Eckpunkte",
          "Kostenrahmen/Ressourcen (falls relevant)",
          "Bitte um Rückmeldung/Entscheid"
        ],
        "hinweise": [
          "Formelle Anrede und Grussformel",
          "Professionelles Register",
          "Klare Struktur"
        ],
        "zeit": "15 Min",
        "woerter": "150-200",
        "bewertungskriterien": [
          {"name": "Aufgabenerfüllung", "beschreibung": "Alle Inhaltspunkte angesprochen"},
          {"name": "Textstruktur", "beschreibung": "Klare Gliederung"},
          {"name": "Register", "beschreibung": "Angemessener formeller Ton"}
        ],
        "musterantwort": "Eine vollständige Muster-E-Mail"
      }`;
      extraInstructions = `Die E-Mail soll professionell und vollständig sein (Betreff, Anrede, Inhalt, Gruss).`;

    } else if (aufgabenTyp === 'schreiben_korrektur_feedback') {
      jsonFormat = `{
        "titel": "Schreiben: Text korrigieren + Feedback",
        "situation": "Sie erhalten eine Schülerarbeit zur Korrektur",
        "aufgabe": "Korrigieren Sie den Text (12 Fehler) und schreiben Sie 3 Feedback-Sätze (Stärke, 2 Entwicklungsziele, nächster Schritt)",
        "originalaufgabe": "Die Aufgabenstellung für die Schüler:innen",
        "schuelertext": "Ein Lernendentext (80-120 Wörter) mit 12 typischen DaF-Fehlern",
        "fehler": [
          {"nr": 1, "original": "fehlerhaft", "korrektur": "korrekt", "kategorie": "Fehlertyp", "erklaerung": "Erklärung"}
        ],
        "loesungen": {"1": "korrektur1", "2": "korrektur2"},
        "feedback_vorlage": {
          "staerke": "Was war gut?",
          "ziel1": "Erstes Entwicklungsziel",
          "ziel2": "Zweites Entwicklungsziel",
          "naechster_schritt": "Konkreter nächster Schritt"
        },
        "muster_feedback": "3 vollständige Feedback-Sätze als Muster",
        "zeit": "20 Min"
      }`;
      extraInstructions = `Erstelle einen authentischen Schülertext mit genau 12 Fehlern verschiedener Kategorien (Artikel, Verb, Rechtschreibung, Wortstellung).`;

    } else if (aufgabenTyp === 'schreiben_text_vereinfachen') {
      jsonFormat = `{
        "titel": "Schreiben: Text kürzen & vereinfachen",
        "situation": "Sie haben einen authentischen Infotext für Ihre Klasse",
        "aufgabe": "Vereinfachen Sie den Text für Lernende (kürzer, einfachere Syntax, erklärende Wörter) und fügen Sie 3 Verständnisfragen hinzu",
        "originaltext": "Ein authentischer Infotext (200-250 Wörter) über das Thema",
        "hinweise": [
          "Schwierige Wörter ersetzen oder erklären",
          "Lange Sätze aufteilen",
          "Kernaussagen behalten",
          "3 Verständnisfragen formulieren"
        ],
        "ziellaenge": "ca. 100-120 Wörter",
        "bewertungskriterien": [
          {"name": "Vereinfachung", "beschreibung": "Angemessene sprachliche Reduktion"},
          {"name": "Inhaltserhalt", "beschreibung": "Kernaussagen bewahrt"},
          {"name": "Fragen", "beschreibung": "Sinnvolle Verständnisfragen"}
        ],
        "muster_vereinfachung": "Der vereinfachte Text mit 3 Fragen",
        "zeit": "20 Min"
      }`;
      extraInstructions = `Erstelle einen authentischen komplexen Text (200-250 Wörter), der dann vereinfacht werden soll.`;

    // === TEIL 2: PRÜFUNGSGESPRÄCH ===
    } else if (aufgabenTyp === 'gespraech_simulation') {
      jsonFormat = `{
        "titel": "Prüfungsgespräch: Unterrichtssimulation",
        "situation": "Sie erarbeiten ein Material interaktiv mit einem/einer Lernenden (Prüfer:in spielt Schüler:in)",
        "aufgabe": "Führen Sie die Unterrichtssimulation durch: Vorwissen aktivieren, Material erarbeiten, sprachlich unterstützen, zum Output anleiten",
        "material_typ": "Art des Materials (z.B. Bildergeschichte, Grafik, Text-Bild-Kombination)",
        "material_beschreibung": "Detaillierte Beschreibung des Materials",
        "ablauf": [
          {"schritt": 1, "aktion": "Vorwissen aktivieren", "beschreibung": "2 Leitfragen stellen"},
          {"schritt": 2, "aktion": "Beschreiben lassen", "beschreibung": "Schüler:in beschreibt das Material"},
          {"schritt": 3, "aktion": "Sprachlich unterstützen", "beschreibung": "Satzstarter, Wortschatz anbieten"},
          {"schritt": 4, "aktion": "Output anleiten", "beschreibung": "Nacherzählen/Zusammenfassen"},
          {"schritt": 5, "aktion": "Abschluss", "beschreibung": "Zusammenfassung, Hausaufgabenidee"}
        ],
        "sprachliche_hilfen": ["Satzstarter", "Wortschatz", "Redemittel"],
        "sprechzeit": "ca. 7 Minuten",
        "bewertungskriterien": [
          {"name": "Interaktion", "beschreibung": "Angemessene Reaktion auf Schüler:in"},
          {"name": "Sprachförderung", "beschreibung": "Hilfreiche sprachliche Unterstützung"},
          {"name": "Strukturierung", "beschreibung": "Klarer Ablauf"}
        ],
        "beispieldialog": "Ein Beispiel-Dialogausschnitt",
        "zeit": "10 Min Vorbereitung + 7 Min Durchführung"
      }`;
      extraInstructions = `Erstelle eine realistische Unterrichtssimulation mit konkretem Material und Beispieldialog.`;

    } else if (aufgabenTyp === 'gespraech_fachgespraech') {
      jsonFormat = `{
        "titel": "Prüfungsgespräch: Fachgespräch",
        "situation": "Sie diskutieren eine unterrichtsbezogene Problemstellung mit einer schulischen Bezugsperson",
        "problemstellung": "Konkrete Problemstellung (z.B. 'Viele Kinder schweigen im Deutschunterricht')",
        "gespraechspartner": "Rolle des Gegenübers (Kolleg:in, Schulleitung, Mentor:in)",
        "aufgabe": "Klären Sie nach (Rückfragen), analysieren Sie Ursachen, schlagen Sie Massnahmen vor, begründen Sie",
        "ablauf": [
          {"schritt": 1, "aktion": "Nachfragen", "beschreibung": "2-3 klärende Rückfragen stellen"},
          {"schritt": 2, "aktion": "Analysieren", "beschreibung": "Mind. 2 mögliche Ursachen benennen"},
          {"schritt": 3, "aktion": "Vorschlagen", "beschreibung": "2-3 konkrete Unterrichtsmassnahmen"},
          {"schritt": 4, "aktion": "Begründen", "beschreibung": "Kurze Begründung warum das hilft"}
        ],
        "moegliche_ursachen": ["Ursache 1", "Ursache 2", "Ursache 3"],
        "moegliche_massnahmen": [
          {"massnahme": "Massnahme 1", "begruendung": "Warum hilfreich"},
          {"massnahme": "Massnahme 2", "begruendung": "Warum hilfreich"},
          {"massnahme": "Massnahme 3", "begruendung": "Warum hilfreich"}
        ],
        "sprechzeit": "ca. 7 Minuten",
        "bewertungskriterien": [
          {"name": "Analyse", "beschreibung": "Fundierte Problemanalyse"},
          {"name": "Lösungsorientierung", "beschreibung": "Praktikable Vorschläge"},
          {"name": "Argumentation", "beschreibung": "Nachvollziehbare Begründungen"}
        ],
        "beispieldialog": "Ein Beispiel-Dialogausschnitt",
        "zeit": "30 Min Vorbereitung + 7 Min Durchführung"
      }`;
      extraInstructions = `Erstelle ein realistisches Fachgespräch-Szenario mit konkreter Problemstellung und möglichen Lösungsansätzen.`;
    } else {
      // Fallback für nicht definierte Aufgabentypen
      jsonFormat = `{
        "titel": "Aufgabe zum Thema",
        "situation": "Situationsbeschreibung",
        "aufgabe": "Aufgabenstellung",
        "zeit": "15 Min"
      }`;
    }
    
    // === AUTHENTISCHE MATERIALIEN VERWENDEN ===
    
    // Für Schülerkorrektur: Wähle zufällig ein authentisches Material
    if (aufgabenTyp === 'schreiben_korrektur_feedback' && authentischeSchreibaufgaben.schuelerkorrektur.length > 0) {
      const randomIndex = Math.floor(Math.random() * authentischeSchreibaufgaben.schuelerkorrektur.length);
      const authMaterial = authentischeSchreibaufgaben.schuelerkorrektur[randomIndex];
      
      const aufgabe = {
        typ: aufgabenTyp,
        titel: authMaterial.titel,
        situation: authMaterial.situation,
        aufgabe: 'Korrigieren Sie den Schülertext und geben Sie konstruktives Feedback: 1 Stärke, 2 Entwicklungsziele, nächster Schritt.',
        originalaufgabe: authMaterial.situation,
        schuelertext: authMaterial.schuelertext,
        fehler: authMaterial.erwartungsFehler.map((f, i) => ({
          nr: i + 1,
          original: f.original,
          korrektur: f.korrektur,
          kategorie: f.kategorie,
          erklaerung: f.erklaerung
        })),
        loesungen: authMaterial.erwartungsFehler.reduce((acc, f, i) => {
          acc[i + 1] = f.korrektur;
          return acc;
        }, {}),
        zeit: '20 Min',
        authentisch: true
      };
      setGenerierteAufgabe(aufgabe);
      setIsGenerating(false);
      return;
    }
    
    // Für Lesen Fachtext MC: Nutze authentisches Material wenn Thema passt
    if (aufgabenTyp === 'lesen_fachtext_mc' && authentischeMaterialien.lesen_fachtext.length > 0) {
      const passend = authentischeMaterialien.lesen_fachtext.find(m => 
        aufgabenThema.toLowerCase().includes(m.thema.toLowerCase().split(' ')[0])
      );
      if (passend) {
        const aufgabe = {
          typ: aufgabenTyp,
          titel: passend.titel,
          situation: 'Sie lesen einen kurzen fachdidaktischen Text',
          aufgabe: 'Lesen Sie den Text und beantworten Sie 6 Multiple-Choice-Fragen',
          artikel: passend.artikel,
          fragen: passend.fragen,
          loesungen: passend.loesungen,
          zeit: '20 Min',
          authentisch: true
        };
        setGenerierteAufgabe(aufgabe);
        setIsGenerating(false);
        return;
      }
    }
    
    // Für Lesen Artikel Zuordnung: Nutze authentisches Material wenn Thema passt
    if (aufgabenTyp === 'lesen_artikel_zuordnung' && authentischeMaterialien.lesen_artikel.length > 0) {
      const passend = authentischeMaterialien.lesen_artikel.find(m => 
        aufgabenThema.toLowerCase().includes(m.thema.toLowerCase().split(' ')[0])
      );
      if (passend) {
        const aufgabe = {
          typ: aufgabenTyp,
          titel: passend.titel,
          situation: 'Sie lesen einen Zeitungsartikel',
          aufgabe: 'Ordnen Sie 8 Aussagen den Abschnitten A-D zu',
          artikel: passend.artikel,
          abschnitte: passend.abschnitte,
          aussagen: passend.aussagen,
          loesungen: passend.loesungen,
          zeit: '15 Min',
          authentisch: true
        };
        setGenerierteAufgabe(aufgabe);
        setIsGenerating(false);
        return;
      }
    }
    
    // Für Hören Interview MC: Nutze authentisches Material wenn Thema passt
    if (aufgabenTyp === 'hoeren_interview_mc' && authentischeMaterialien.hoeren_interview.length > 0) {
      const passend = authentischeMaterialien.hoeren_interview.find(m => 
        aufgabenThema.toLowerCase().includes(m.thema.toLowerCase().split(' ')[0])
      );
      if (passend) {
        const aufgabe = {
          typ: aufgabenTyp,
          titel: passend.titel,
          situation: 'Sie hören ein Radiointerview (2-3 Minuten) mit einer Lehrperson',
          aufgabe: 'Hören Sie das Interview und beantworten Sie 5 Multiple-Choice-Fragen',
          artikel: passend.artikel,
          fragen: passend.fragen,
          loesungen: passend.loesungen,
          zeit: '15 Min',
          authentisch: true
        };
        setGenerierteAufgabe(aufgabe);
        setIsGenerating(false);
        return;
      }
    }
    
    // Für Hören Gespräch Zuordnung: Nutze authentisches Material wenn Thema passt
    if (aufgabenTyp === 'hoeren_gespraech_zuordnung' && authentischeMaterialien.hoeren_gespraech.length > 0) {
      const passend = authentischeMaterialien.hoeren_gespraech.find(m => 
        aufgabenThema.toLowerCase().includes(m.thema.toLowerCase().split(' ')[0])
      );
      if (passend) {
        const aufgabe = {
          typ: aufgabenTyp,
          titel: passend.titel,
          situation: 'Sie hören ein Gespräch zwischen zwei Kolleg:innen',
          aufgabe: 'Ordnen Sie 10 Aussagen Person A oder Person B zu',
          artikel: passend.artikel,
          personen: passend.personen,
          aussagen: passend.aussagen,
          loesungen: passend.loesungen,
          zeit: '15 Min',
          authentisch: true
        };
        setGenerierteAufgabe(aufgabe);
        setIsGenerating(false);
        return;
      }
    }
    
    // Für Sprechen Unterricht: Nutze authentisches Material als Vorlage
    if (aufgabenTyp === 'sprechen_unterricht_strukturieren' && authentischeMaterialien.sprechen_unterricht.length > 0) {
      const vorlage = authentischeMaterialien.sprechen_unterricht[0];
      const aufgabe = {
        typ: aufgabenTyp,
        titel: `Unterrichtssequenz: ${aufgabenThema}`,
        situation: `Sie beginnen eine Unterrichtslektion zum Thema "${aufgabenThema}"`,
        aufgabe: 'Erklären Sie den Ablauf der Stunde und geben Sie klare Arbeitsanweisungen',
        zielniveau: 'A1-A2 (an Lernende gerichtet)',
        punkte: vorlage.punkte,
        hinweise: [
          'Einfache, klare Sprache verwenden',
          'Anweisungen in kurzen Sätzen',
          'Visualisierungen erwähnen'
        ],
        sprechzeit: '1-2 Minuten',
        bewertungskriterien: [
          { name: 'Réalisation de la tâche', beschreibung: 'Alle Punkte angesprochen' },
          { name: 'Clarté des consignes', beschreibung: 'Klare, verständliche Anweisungen' },
          { name: 'Adaptation au niveau', beschreibung: 'Angemessene Sprache für Lernende' }
        ],
        musterantwort: vorlage.musterantwort.replace(/Einkaufen und Preise|Lebensmittel|Preisen|Supermarkt|Was kostet/gi, (match) => {
          const replacements = {
            'einkaufen und preise': aufgabenThema,
            'lebensmittel': 'das Thema',
            'preisen': 'dem Thema',
            'supermarkt': 'Alltag',
            'was kostet': 'Fragen zum Thema'
          };
          return replacements[match.toLowerCase()] || match;
        }),
        zeit: '5 Min',
        authentisch: true
      };
      setGenerierteAufgabe(aufgabe);
      setIsGenerating(false);
      return;
    }
    
    // Für Prüfungsgespräch Simulation: Nutze authentisches Material als Vorlage
    if (aufgabenTyp === 'gespraech_simulation' && authentischeMaterialien.gespraech_simulation.length > 0) {
      const vorlage = authentischeMaterialien.gespraech_simulation[0];
      const aufgabe = {
        typ: aufgabenTyp,
        titel: `Unterrichtssimulation: ${aufgabenThema}`,
        situation: 'Sie erarbeiten ein Material interaktiv mit einem/einer Lernenden (Prüfer:in spielt Schüler:in)',
        aufgabe: 'Führen Sie die Unterrichtssimulation durch: Vorwissen aktivieren, Material erarbeiten, sprachlich unterstützen, zum Output anleiten',
        material_typ: 'Bildergeschichte oder Text-Bild-Kombination',
        material_beschreibung: `Material zum Thema "${aufgabenThema}"`,
        ablauf: vorlage.ablauf,
        sprachliche_hilfen: ['Satzstarter anbieten', 'Wortschatz bereitstellen', 'Redemittel geben'],
        sprechzeit: 'ca. 7 Minuten',
        bewertungskriterien: [
          { name: 'Interaktion', beschreibung: 'Angemessene Reaktion auf Schüler:in' },
          { name: 'Sprachförderung', beschreibung: 'Hilfreiche sprachliche Unterstützung' },
          { name: 'Strukturierung', beschreibung: 'Klarer Ablauf' }
        ],
        beispieldialog: vorlage.beispieldialog,
        zeit: '10 Min Vorbereitung + 7 Min Durchführung',
        authentisch: true
      };
      setGenerierteAufgabe(aufgabe);
      setIsGenerating(false);
      return;
    }
    
    // Für Prüfungsgespräch Fachgespräch: Nutze authentisches Material als Vorlage
    if (aufgabenTyp === 'gespraech_fachgespraech' && authentischeMaterialien.gespraech_fach.length > 0) {
      const vorlage = authentischeMaterialien.gespraech_fach[0];
      const aufgabe = {
        typ: aufgabenTyp,
        titel: `Fachgespräch: ${aufgabenThema}`,
        situation: 'Sie diskutieren eine unterrichtsbezogene Problemstellung mit einer schulischen Bezugsperson',
        problemstellung: `Eine Kollegin schildert ein Problem zum Thema "${aufgabenThema}"`,
        gespraechspartner: 'Kolleg:in oder Schulleitung',
        aufgabe: 'Klären Sie nach (Rückfragen), analysieren Sie Ursachen, schlagen Sie Massnahmen vor, begründen Sie',
        ablauf: [
          { schritt: 1, aktion: 'Nachfragen', beschreibung: '2-3 klärende Rückfragen stellen' },
          { schritt: 2, aktion: 'Analysieren', beschreibung: 'Mind. 2 mögliche Ursachen benennen' },
          { schritt: 3, aktion: 'Vorschlagen', beschreibung: '2-3 konkrete Unterrichtsmassnahmen' },
          { schritt: 4, aktion: 'Begründen', beschreibung: 'Kurze Begründung warum das hilft' }
        ],
        moegliche_ursachen: vorlage.moegliche_ursachen,
        moegliche_massnahmen: vorlage.moegliche_massnahmen,
        sprechzeit: 'ca. 7 Minuten',
        bewertungskriterien: [
          { name: 'Analyse', beschreibung: 'Fundierte Problemanalyse' },
          { name: 'Lösungsorientierung', beschreibung: 'Praktikable Vorschläge' },
          { name: 'Argumentation', beschreibung: 'Nachvollziehbare Begründungen' }
        ],
        zeit: '30 Min Vorbereitung + 7 Min Durchführung',
        authentisch: true
      };
      setGenerierteAufgabe(aufgabe);
      setIsGenerating(false);
      return;
    }
    
    // === BEISPIELE FÜR API-PROMPT ZUSAMMENSTELLEN ===
    let authentischesBeispiel = '';
    
    // Für E-Mail-Aufgaben: Authentisches Beispiel als Referenz im Prompt
    if (aufgabenTyp === 'schreiben_email' && authentischeSchreibaufgaben.anfrage.length > 0) {
      const beispiel = authentischeSchreibaufgaben.anfrage[0];
      authentischesBeispiel = `
ORIENTIERE DICH AN DIESEM AUTHENTISCHEN PROF-L BEISPIEL:
Titel: ${beispiel.titel}
Situation: ${beispiel.situation}
Aufgabe: ${beispiel.aufgabe}
Hinweise: ${beispiel.hinweise.join(', ')}
`;
    }
    
    // Für Kommentar-Aufgaben: Authentisches Beispiel als Referenz
    if (aufgabenTyp === 'schreiben_kommentar' && authentischeSchreibaufgaben.kommentar.length > 0) {
      const randomIndex = Math.floor(Math.random() * authentischeSchreibaufgaben.kommentar.length);
      const beispiel = authentischeSchreibaufgaben.kommentar[randomIndex];
      authentischesBeispiel = `
ORIENTIERE DICH AN DIESEM AUTHENTISCHEN PROF-L BEISPIEL:
Titel: ${beispiel.titel}
Situation: ${beispiel.situation}
Aufgabe: ${beispiel.aufgabe}
Hinweise: ${beispiel.hinweise.join(', ')}
Zeit: ${beispiel.zeit}, Wörter: ${beispiel.woerter}
`;
    }
    
    // Für Lesen: Beispielstruktur aus authentischen Materialien
    if (aufgabenTyp === 'lesen_fachtext_mc' && authentischeMaterialien.lesen_fachtext.length > 0) {
      const beispiel = authentischeMaterialien.lesen_fachtext[0];
      authentischesBeispiel = `
ORIENTIERE DICH AN DIESER STRUKTUR (authentisches PROF-L Material):
- Der Fachtext hat 500-700 Wörter
- Er ist klar gegliedert (Einleitung, Hauptteil, Schluss)
- Er enthält Fachbegriffe, die erklärt werden
- Die Fragen testen verschiedene Kompetenzen (Hauptaussage, Details, Argumentation)
- Beispielstruktur der Fragen:
  1. Hauptaussage des Textes
  2. Genannte Vorteile/Argumente  
  3. Wichtige Bedingung/Voraussetzung
  4. Konkrete Beispiele
  5. Was ist NICHT im Text (Distraktoren!)
  6. Schlussfolgerung
`;
    }
    
    // Für Hören: Beispielstruktur aus authentischen Materialien
    if (aufgabenTyp === 'hoeren_interview_mc' && authentischeMaterialien.hoeren_interview.length > 0) {
      authentischesBeispiel = `
ORIENTIERE DICH AN DIESER STRUKTUR (authentisches PROF-L Material):
- Das Interview ist 2-3 Minuten lang (ca. 300-400 Wörter)
- Format: Moderator:in stellt Fragen, Lehrperson antwortet
- Inhalt: Praxiserfahrungen, Methoden, Vor-/Nachteile
- Die Fragen testen Detailverständnis und Inferenzen
- Eine Frage ist immer "Welche Aussage ist FALSCH?"
`;
    }
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `Du bist ein PROF-L Prüfungsexperte. Erstelle eine authentische Prüfungsaufgabe.

AUFGABENTYP: ${typ.label}
THEMA: ${aufgabenThema}
ZIELSTUFE: ${aufgabenStufe === 'primar' ? 'Primarstufe (Zyklus 1 & 2, Kindergarten bis 6. Klasse)' : 'Sekundarstufe I (Zyklus 3, 7.-9. Klasse)'}
SCHWIERIGKEIT: ${aufgabenSchwierigkeit}
${authentischesBeispiel}
WICHTIG: 
1. Antworte NUR mit einem gültigen JSON-Objekt
2. Keine Markdown-Formatierung, keine Erklärungen
3. Verwende Schweizer Begriffe: Schulhaus, Schulzimmer, Pausenplatz, Znüni, Lehrperson, Lektion
4. Passe Inhalt und Komplexität an die Zielstufe an:
   - Primarstufe: Einfachere Themen, kürzere Texte, altersgerechte Situationen (Znüni, Pausenplatz, Basteln, Ausflüge)
   - Sekundarstufe I: Komplexere Themen, längere Texte, Berufswahl, Projektarbeiten, anspruchsvollere Kommunikation
${extraInstructions}

JSON-Format:
${jsonFormat}

Erstelle jetzt die vollständige Aufgabe zum Thema "${aufgabenThema}".`
          }]
        })
      });
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.content && data.content[0]) {
        const content = data.content[0].text;
        console.log('Content:', content);
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aufgabe = JSON.parse(jsonMatch[0]);
          aufgabe.typ = aufgabenTyp;
          setGenerierteAufgabe(aufgabe);
        } else {
          setGenerierteAufgabe({ error: 'Ungültige Antwort vom Server. Kein JSON gefunden.' });
        }
      } else if (data.error) {
        setGenerierteAufgabe({ error: `API-Fehler: ${data.error.message || JSON.stringify(data.error)}` });
      } else {
        setGenerierteAufgabe({ error: `Unerwartete Antwort: ${JSON.stringify(data)}` });
      }
    } catch (error) {
      console.error('Fehler:', error);
      setGenerierteAufgabe({ error: `Verbindungsfehler: ${error.message}` });
    }
    setIsGenerating(false);
  };

  const checkAufgabe = () => {
    if (!generierteAufgabe?.loesungen) return;
    let richtig = 0;
    const results = {};
    const total = Object.keys(generierteAufgabe.loesungen).length;
    
    Object.keys(generierteAufgabe.loesungen).forEach(nr => {
      const userAnswer = (userAntworten[nr] || '').trim().toLowerCase();
      const correctAnswer = generierteAufgabe.loesungen[nr].toLowerCase();
      const isCorrect = userAnswer === correctAnswer;
      results[nr] = { user: userAntworten[nr], correct: generierteAufgabe.loesungen[nr], isCorrect };
      if (isCorrect) richtig++;
    });
    
    setAufgabenFeedback({ results, score: Math.round((richtig / total) * 100), richtig, gesamt: total });
  };

  // Timer-Funktionen
  const startSprechaufgabe = () => { setSprechStarted(true); setRecordingTime(0); };
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      clearInterval(timerRef.current);
    } else {
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    }
  };
  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Thema per Drag & Drop oder Klick auswählen
  const handleThemaSelect = (thema) => {
    setAufgabenThema(thema);
  };

  const handleDragStart = (e, thema) => {
    e.dataTransfer.setData('text/plain', thema);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const thema = e.dataTransfer.getData('text/plain');
    setAufgabenThema(thema);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-500 p-2 rounded-lg"><Sparkles className="w-8 h-8 text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">PROF-L Deutsch Agent</h1>
              <p className="text-gray-500 text-sm">Prüfungsvorbereitung für angehende Lehrpersonen • Deutsch als Fremdsprache</p>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'korrektur', icon: FileText, label: 'Textkorrektur' },
              { id: 'generator', icon: RefreshCw, label: 'Aufgaben generieren' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setMode(item.id); setKorrekturErgebnis(null); setGenerierteAufgabe(null); }}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${mode === item.id ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 hover:bg-orange-100 text-gray-700'}`}
              >
                <item.icon className="w-4 h-4" />{item.label}
              </button>
            ))}
          </div>
        </div>

        {/* TEXTKORREKTUR */}
        {mode === 'korrektur' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />Textkorrektur für PROF-L
              </h2>
              <p className="text-gray-600 mb-4">Geben Sie Ihren deutschen Text ein. Der Agent analysiert Fehler und gibt Ihnen Feedback zur Verbesserung Ihrer Sprachkompetenz für die PROF-L Prüfung.</p>
              
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-orange-600"><strong>Tipp:</strong> Üben Sie mit prüfungsrelevanten Textsorten wie Elternbriefen, Klassenlager-Ankündigungen oder Kollegennachrichten.</p>
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
                {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" />Analysiere...</> : <><PenTool className="w-5 h-5" />Text analysieren</>}
              </button>
            </div>

            {korrekturErgebnis && !korrekturErgebnis.error && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-red-600">Gefundene Fehler ({korrekturErgebnis.fehler?.length || 0})</h3>
                  {korrekturErgebnis.fehler?.map((f, i) => (
                    <div key={i} className="border-2 border-red-100 rounded-lg p-4 mb-3 bg-red-50">
                      <div className="flex items-start gap-3">
                        <div className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</div>
                        <div className="flex-1">
                          <p><span className="line-through text-red-600">{f.original}</span> → <span className="text-green-600 font-semibold">{f.korrektur}</span></p>
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
                    <ul className="text-sm">{korrekturErgebnis.staerken?.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-6 border-2 border-amber-200">
                    <h3 className="font-semibold text-amber-800 mb-2">💡 Tipps für die PROF-L Prüfung</h3>
                    <ul className="text-sm">{korrekturErgebnis.tipps?.map((t, i) => <li key={i}>• {t}</li>)}</ul>
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
                      <p className={`text-xl font-bold ${korrekturErgebnis.bestandenschaetzung === 'hoch' ? 'text-green-600' : korrekturErgebnis.bestandenschaetzung === 'mittel' ? 'text-yellow-600' : 'text-red-600'}`}>{korrekturErgebnis.bestandenschaetzung || 'N/A'}</p>
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

        {/* AUFGABEN-GENERATOR */}
        {mode === 'generator' && !generierteAufgabe && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-orange-500" />Neue Aufgabe generieren
            </h2>
            <p className="text-gray-600 mb-6">Erstellen Sie authentische PROF-L Übungsaufgaben basierend auf der offiziellen Prüfungsstruktur.</p>
            
            <div className="space-y-4">
              {/* Aufgabentyp-Auswahl mit Gruppierung */}
              <div>
                <label className="block text-sm font-medium mb-2">Prüfungsteil & Aufgabentyp:</label>
                <select 
                  value={aufgabenTyp} 
                  onChange={(e) => setAufgabenTyp(e.target.value)} 
                  className="w-full p-3 border-2 rounded-lg text-sm"
                >
                  <optgroup label="📖 TEIL 1A: LESEN (2 Lesetexte)">
                    {aufgabenTypen.filter(t => t.id.startsWith('lesen_')).map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🎧 TEIL 1B: HÖREN (2 Hörtexte)">
                    {aufgabenTypen.filter(t => t.id.startsWith('hoeren_')).map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🎤 TEIL 1C: SPRECHEN (3 Monolog-Aufgaben)">
                    {aufgabenTypen.filter(t => t.id.startsWith('sprechen_')).map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="✍️ TEIL 1D: SCHREIBEN (2 Texte + 2 Korrekturen)">
                    {aufgabenTypen.filter(t => t.id.startsWith('schreiben_')).map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🎭 TEIL 2: PRÜFUNGSGESPRÄCH (Interaktion)">
                    {aufgabenTypen.filter(t => t.id.startsWith('gespraech_')).map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </optgroup>
                </select>
                
                {/* Beschreibung des gewählten Aufgabentyps */}
                {aufgabenTypen.find(t => t.id === aufgabenTyp)?.beschreibung && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>ℹ️ Format:</strong> {aufgabenTypen.find(t => t.id === aufgabenTyp)?.beschreibung}
                    </p>
                  </div>
                )}
              </div>

              {/* Stufen-Auswahl */}
              <div>
                <label className="block text-sm font-medium mb-2">Zielstufe:</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAufgabenStufe('primar')}
                    className={`flex-1 p-3 rounded-lg border-2 font-medium transition-all flex items-center justify-center gap-2 ${aufgabenStufe === 'primar' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 hover:border-orange-300'}`}
                  >
                    <span className="text-xl">🏫</span>
                    <div className="text-left">
                      <div>Primarstufe</div>
                      <div className="text-xs font-normal text-gray-500">Zyklus 1 & 2</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setAufgabenStufe('sek1')}
                    className={`flex-1 p-3 rounded-lg border-2 font-medium transition-all flex items-center justify-center gap-2 ${aufgabenStufe === 'sek1' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 hover:border-orange-300'}`}
                  >
                    <span className="text-xl">🎓</span>
                    <div className="text-left">
                      <div>Sekundarstufe I</div>
                      <div className="text-xs font-normal text-gray-500">Zyklus 3</div>
                    </div>
                  </button>
                </div>
              </div>
              
              {/* Thema Eingabe/Drop-Zone */}
              <div>
                <label className="block text-sm font-medium mb-2">Gewähltes Thema:</label>
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`relative p-4 border-2 border-dashed rounded-lg min-h-16 flex items-center ${aufgabenThema ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-gray-50'}`}
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
                <select value={aufgabenSchwierigkeit} onChange={(e) => setAufgabenSchwierigkeit(e.target.value)} className="w-full p-3 border-2 rounded-lg">
                  <option value="leicht">Leicht</option>
                  <option value="mittel">Mittel</option>
                  <option value="schwer">Schwer</option>
                </select>
              </div>
              
              {/* Themen-Auswahl */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-sm font-medium">Passende Themen für {
                      aktuelleKategorie === 'lesen' ? '📖 Lesen' :
                      aktuelleKategorie === 'hoeren' ? '🎧 Hören' :
                      aktuelleKategorie === 'schreiben' ? '✍️ Schreiben' :
                      aktuelleKategorie === 'sprechen' ? '🎤 Sprechen' :
                      aktuelleKategorie === 'gespraech' ? '🎭 Prüfungsgespräch' : 'alle Prüfungsteile'
                    }:</label>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{gefilterteThemen.length} Themen</span>
                </div>
                
                {/* Suche */}
                <input
                  type="text"
                  value={themenSuche}
                  onChange={(e) => setThemenSuche(e.target.value)}
                  placeholder="Themen durchsuchen..."
                  className="w-full p-2 border rounded-lg mb-3 text-sm"
                />
                
                {/* Themen-Liste */}
                <div className="max-h-64 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                  <div className="grid grid-cols-1 gap-1">
                    {gefilterteThemen.map((t, i) => (
                      <div
                        key={i}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.thema)}
                        onClick={() => handleThemaSelect(t.thema)}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all hover:bg-orange-100 ${aufgabenThema === t.thema ? 'bg-orange-200 border-orange-500' : 'bg-white'}`}
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
                {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" />Generiere Aufgabe...</> : <><Sparkles className="w-5 h-5" />Aufgabe generieren</>}
              </button>
            </div>
          </div>
        )}

        {/* GENERIERTE AUFGABE ANZEIGEN */}
        {mode === 'generator' && generierteAufgabe && !generierteAufgabe.error && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <button onClick={() => { setGenerierteAufgabe(null); setAufgabenFeedback(null); stopSpeech(); }} className="text-orange-500 mb-4 hover:underline">← Neue Aufgabe erstellen</button>
              
              {/* Authentisches Material Badge */}
              {generierteAufgabe.authentisch && (
                <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Authentisches PROF-L Prüfungsmaterial
                </div>
              )}
              
              <h2 className="text-2xl font-bold mb-2">{generierteAufgabe.titel}</h2>
              <p className="text-sm text-gray-500 mb-4">{generierteAufgabe.zeit}</p>
              <div className="bg-amber-50 p-4 rounded-lg mb-4"><h3 className="font-semibold">Situation:</h3><p>{generierteAufgabe.situation}</p></div>
              <div className="bg-purple-50 p-4 rounded-lg"><h3 className="font-semibold">Aufgabe:</h3><p>{generierteAufgabe.aufgabe}</p></div>
            </div>

            {/* HÖRAUFGABE - Audio Player */}
            {(generierteAufgabe.typ?.includes('hoerverstehen') || generierteAufgabe.typ?.includes('hoeren_')) && generierteAufgabe.artikel && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-orange-500" />
                  🎧 Hörtext abspielen
                  {isDialogue(generierteAufgabe.artikel) && (
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      👥 Dialog (2 Stimmen)
                    </span>
                  )}
                </h3>
                
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-700">
                    <strong>📢 Hinweis:</strong> In der echten PROF-L Prüfung hören Sie einen Radiobeitrag oder Podcast. 
                    Hier wird der Text mit Ihrem Browser vorgelesen.
                  </p>
                </div>

                {/* Stimmen-Auswahl mit Vorschau (wenn verfügbar) */}
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
                            selectedVoiceIndex === i 
                              ? 'border-orange-500 bg-orange-50' 
                              : 'border-gray-200 bg-white hover:border-orange-300'
                          }`}
                        >
                          <button
                            onClick={() => setSelectedVoiceIndex(i)}
                            className="w-full p-3 text-left"
                            disabled={isSpeaking}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{i === 0 ? '⭐' : '🔊'}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{v.name.split(' ').slice(0, 2).join(' ')}</p>
                                <p className="text-xs text-gray-500">{v.lang}</p>
                              </div>
                              {selectedVoiceIndex === i && (
                                <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                          {/* Vorschau-Button */}
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
                            {isPreviewPlaying ? (
                              <Square className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Klicken Sie auf ▶️ um eine Stimme zu testen. Die ⭐-Stimme wurde als beste erkannt.
                    </p>
                  </div>
                )}

                {/* Audio Controls */}
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
                          className={`${isPaused ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-white p-4 rounded-full transition-all shadow-lg`}
                          title={isPaused ? "Fortsetzen" : "Pause"}
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
                          <div className="w-2 h-4 bg-orange-500 rounded animate-pulse"></div>
                          <div className="w-2 h-6 bg-orange-500 rounded animate-pulse" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-3 bg-orange-500 rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-2 h-5 bg-orange-500 rounded animate-pulse" style={{animationDelay: '0.3s'}}></div>
                          <div className="w-2 h-4 bg-orange-500 rounded animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        </div>
                        <span className="font-medium ml-2">Wird vorgelesen...</span>
                      </div>
                    ) : isPaused ? (
                      <span className="text-yellow-600 font-medium">⏸ Pausiert - Klicken Sie auf Play zum Fortsetzen</span>
                    ) : hasListened ? (
                      <span className="text-green-600 font-medium">✓ {listenCount}x angehört</span>
                    ) : (
                      <span className="text-gray-600 font-medium">▶ Klicken Sie auf Play, um den Hörtext zu starten</span>
                    )}
                  </div>

                  {/* Geschwindigkeit mit Labels */}
                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">🎚️ Sprechgeschwindigkeit:</span>
                      <span className={`text-sm font-bold px-2 py-1 rounded ${
                        speechRate < 0.75 ? 'bg-blue-100 text-blue-700' :
                        speechRate > 1.0 ? 'bg-red-100 text-red-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {speechRate < 0.75 ? '🐢 Langsam' :
                         speechRate > 1.0 ? '🐇 Schnell' :
                         '✓ Normal'}
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
                      <button 
                        onClick={() => setSpeechRate(0.85)}
                        className="text-orange-500 hover:underline"
                        disabled={isSpeaking}
                      >
                        Standard (0.85x)
                      </button>
                      <span>Fortgeschritten</span>
                    </div>
                  </div>
                </div>

                {/* Transkript (versteckt bis nach dem Hören) */}
                {hasListened && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                      📝 Transkript anzeigen (zum Überprüfen nach der Übung)
                    </summary>
                    <div className="mt-2 bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-line text-gray-600">
                      {generierteAufgabe.artikel}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* SPRECHEN */}
            {generierteAufgabe.typ?.includes('sprechen') && (
              <>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-semibold mb-4">Aufgabenpunkte</h3>
                  <ul className="space-y-2">{generierteAufgabe.punkte?.map((p, i) => <li key={i} className="flex gap-2 bg-gray-50 p-3 rounded-lg"><div className="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">{i + 1}</div><span>{p}</span></li>)}</ul>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <p className="font-semibold">Zielniveau: {generierteAufgabe.zielniveau} | Sprechzeit: {generierteAufgabe.sprechzeit}</p>
                </div>
                {!sprechStarted ? (
                  <button onClick={startSprechaufgabe} className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"><Play className="w-6 h-6" />Aufgabe starten</button>
                ) : (
                  <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                    <div className="text-5xl font-mono font-bold mb-4">{formatTime(recordingTime)}</div>
                    <div className="flex justify-center gap-4">
                      <button onClick={toggleRecording} className={`p-4 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-orange-500'} text-white`}>{isRecording ? <Pause className="w-8 h-8" /> : <Mic className="w-8 h-8" />}</button>
                      <button onClick={() => { setRecordingTime(0); setIsRecording(false); clearInterval(timerRef.current); }} className="p-4 rounded-full bg-gray-200"><RotateCcw className="w-8 h-8" /></button>
                    </div>
                  </div>
                )}
                {generierteAufgabe.bewertungskriterien && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">Bewertungskriterien</h3>
                    {generierteAufgabe.bewertungskriterien.map((k, i) => <div key={i} className="bg-gray-50 p-3 rounded-lg mb-2"><span className="font-semibold text-orange-500">{k.name}:</span> {k.beschreibung}</div>)}
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

            {/* SCHREIBEN - FORMELLE ANFRAGE/E-MAIL */}
            {generierteAufgabe.typ === 'schreiben_anfrage' && (
              <>
                {generierteAufgabe.empfaenger && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">📧 Empfänger</h3>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p><strong>{generierteAufgabe.empfaenger.name}</strong></p>
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
                          <div className="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">{i + 1}</div>
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
                      {generierteAufgabe.hinweise.map((h, i) => <li key={i}>• {h}</li>)}
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
                    placeholder="Sehr geehrte Frau/Herr...

[Ihre E-Mail hier schreiben]

Mit freundlichen Grüssen
[Ihr Name]"
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
                        Muster-E-Mail {showMusterantwort ? 'verbergen' : 'anzeigen'}
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

            {/* SCHREIBEN - KOMMENTAR/STELLUNGNAHME */}
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
                {generierteAufgabe.inhaltspunkte && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">📝 Ihr Kommentar soll:</h3>
                    <ul className="space-y-2">
                      {generierteAufgabe.inhaltspunkte.map((p, i) => (
                        <li key={i} className="flex gap-2 bg-purple-50 p-3 rounded-lg">
                          <div className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">{i + 1}</div>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {generierteAufgabe.hinweise && (
                  <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                    <h3 className="font-semibold mb-2">💡 Sprachliche Hinweise:</h3>
                    <ul className="text-sm space-y-1">
                      {generierteAufgabe.hinweise.map((h, i) => <li key={i}>• {h}</li>)}
                    </ul>
                  </div>
                )}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">✍️ Ihren Kommentar schreiben:</h3>
                    <span className="text-sm text-gray-500">{generierteAufgabe.woerter} Wörter</span>
                  </div>
                  <textarea
                    className="w-full h-80 p-4 border-2 rounded-lg resize-none focus:border-orange-500 focus:outline-none"
                    placeholder="[Einleitung: Thema einführen, Bezug zum Quellentext]

[Hauptteil: Argumente bewerten, eigene Position darlegen, Praxisbeispiele]

[Schluss: Fazit oder Ausblick]"
                  />
                </div>
                {generierteAufgabe.bewertungskriterien && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">📊 Bewertungskriterien</h3>
                    {generierteAufgabe.bewertungskriterien.map((k, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded-lg mb-2">
                        <span className="font-semibold text-purple-500">{k.name}:</span> {k.beschreibung}
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
                        Musterkommentar {showMusterantwort ? 'verbergen' : 'anzeigen'}
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

            {/* SCHREIBEN - SCHÜLERARBEIT KORRIGIEREN */}
            {generierteAufgabe.typ === 'schreiben_schuelerkorrektur' && (
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
                    {generierteAufgabe.fehler.map(f => (
                      <div key={f.nr} className="border-2 rounded-lg p-4 mb-3">
                        <div className="flex items-start gap-3">
                          <div className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">{f.nr}</div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-600 mb-2">
                              {f.zeile && <span className="bg-gray-200 px-2 py-1 rounded text-xs mr-2">Zeile</span>}
                              <span className="font-mono bg-yellow-100 px-2 py-1 rounded">"{f.original}"</span>
                            </p>
                            <input
                              type="text"
                              value={userAntworten[f.nr] || ''}
                              onChange={(e) => setUserAntworten({ ...userAntworten, [f.nr]: e.target.value })}
                              placeholder="Korrektur eingeben..."
                              className="w-full p-2 border-2 rounded-lg"
                              disabled={aufgabenFeedback}
                            />
                            {aufgabenFeedback?.results[f.nr] && (
                              <div className={`mt-2 p-2 rounded text-sm ${aufgabenFeedback.results[f.nr].isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                                {aufgabenFeedback.results[f.nr].isCorrect ? '✓ Richtig!' : `✗ Korrekt: ${aufgabenFeedback.results[f.nr].correct}`}
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
                {generierteAufgabe.didaktischer_kommentar && aufgabenFeedback && (
                  <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
                    <h3 className="font-semibold mb-2">👩‍🏫 Didaktischer Kommentar:</h3>
                    <p className="text-sm">{generierteAufgabe.didaktischer_kommentar}</p>
                  </div>
                )}
                {generierteAufgabe.korrigierter_text && aufgabenFeedback && (
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <button
                      onClick={() => setShowMusterantwort(!showMusterantwort)}
                      className="w-full flex items-center justify-between font-semibold text-gray-700 hover:text-orange-600"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Vollständig korrigierter Text {showMusterantwort ? 'verbergen' : 'anzeigen'}
                      </span>
                      <span className="text-xl">{showMusterantwort ? '−' : '+'}</span>
                    </button>
                    {showMusterantwort && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <pre className="whitespace-pre-wrap text-sm">{generierteAufgabe.korrigierter_text}</pre>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* MC-FRAGEN */}
            {generierteAufgabe.fragen && (
              <>
                {generierteAufgabe.artikel && !generierteAufgabe.typ?.includes('hoeren') && !generierteAufgabe.typ?.includes('hoerverstehen') && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">📖 Text</h3>
                    <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-line text-sm">{generierteAufgabe.artikel}</div>
                  </div>
                )}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-semibold mb-4">Fragen</h3>
                  {generierteAufgabe.fragen.map(f => (
                    <div key={f.nr} className="border-2 rounded-lg p-4 mb-4">
                      <p className="font-semibold mb-3">{f.nr}. {f.frage}</p>
                      {f.optionen?.map(o => (
                        <label key={o.buchstabe} className={`flex gap-2 p-2 rounded cursor-pointer ${aufgabenFeedback?.results[f.nr]?.correct === o.buchstabe ? 'bg-green-100' : userAntworten[f.nr] === o.buchstabe && aufgabenFeedback && !aufgabenFeedback.results[f.nr]?.isCorrect ? 'bg-red-100' : 'hover:bg-gray-50'}`}>
                          <input type="radio" name={`q${f.nr}`} value={o.buchstabe} checked={userAntworten[f.nr] === o.buchstabe} onChange={(e) => setUserAntworten({ ...userAntworten, [f.nr]: e.target.value })} disabled={aufgabenFeedback} />
                          <span>{o.buchstabe}) {o.text}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ARTIKEL + ZUORDNUNG (lesen_artikel_zuordnung) */}
            {generierteAufgabe.typ === 'lesen_artikel_zuordnung' && generierteAufgabe.artikel && (
              <>
                {/* Artikel mit Abschnitten anzeigen */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-semibold mb-4">📰 Zeitungsartikel</h3>
                  <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-line text-sm leading-relaxed">
                    {generierteAufgabe.artikel}
                  </div>
                </div>
                
                {/* Abschnitte-Legende */}
                {generierteAufgabe.abschnitte && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">📋 Abschnitte im Text</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {generierteAufgabe.abschnitte.map((abschnitt, i) => (
                        <div key={i} className="bg-blue-50 p-3 rounded-lg text-center">
                          <span className="font-bold text-blue-700">{abschnitt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Aussagen zuordnen */}
                {generierteAufgabe.aussagen && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">🔍 Welcher Abschnitt... (A, B, C oder D)</h3>
                    <div className="space-y-3">
                      {generierteAufgabe.aussagen.map(aussage => (
                        <div key={aussage.nr} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                          <div className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                            {aussage.nr}
                          </div>
                          <span className="flex-1">{aussage.text}</span>
                          <select 
                            value={userAntworten[aussage.nr] || ''} 
                            onChange={(e) => setUserAntworten({ ...userAntworten, [aussage.nr]: e.target.value })} 
                            className="p-2 border-2 rounded-lg w-20 text-center font-bold"
                            disabled={aufgabenFeedback}
                          >
                            <option value="">—</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                          </select>
                          {aufgabenFeedback?.results[aussage.nr] && (
                            <span className={`font-bold ${aufgabenFeedback.results[aussage.nr].isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                              {aufgabenFeedback.results[aussage.nr].isCorrect ? '✓' : `✗ ${aufgabenFeedback.results[aussage.nr].correct}`}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* HÖREN - GESPRÄCH ZUORDNUNG (Person A/B) */}
            {generierteAufgabe.typ === 'hoeren_gespraech_zuordnung' && generierteAufgabe.aussagen && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-semibold mb-4">🔍 Wer sagt das? (Person A oder B)</h3>
                {generierteAufgabe.personen && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <span className="font-bold text-blue-700">A: {generierteAufgabe.personen.A}</span>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                      <span className="font-bold text-purple-700">B: {generierteAufgabe.personen.B}</span>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {generierteAufgabe.aussagen.map(aussage => (
                    <div key={aussage.nr} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                      <div className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {aussage.nr}
                      </div>
                      <span className="flex-1">{aussage.text}</span>
                      <select 
                        value={userAntworten[aussage.nr] || ''} 
                        onChange={(e) => setUserAntworten({ ...userAntworten, [aussage.nr]: e.target.value })} 
                        className="p-2 border-2 rounded-lg w-20 text-center font-bold"
                        disabled={aufgabenFeedback}
                      >
                        <option value="">—</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                      </select>
                      {aufgabenFeedback?.results[aussage.nr] && (
                        <span className={`font-bold ${aufgabenFeedback.results[aussage.nr].isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          {aufgabenFeedback.results[aussage.nr].isCorrect ? '✓' : `✗ ${aufgabenFeedback.results[aussage.nr].correct}`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ZUORDNUNG (altes Format mit texte) */}
            {generierteAufgabe.texte && generierteAufgabe.aussagen && (
              <>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-semibold mb-4">Texte</h3>
                  {generierteAufgabe.texte.map(t => (
                    <div key={t.nr} className="border-2 rounded-lg p-4 mb-3">
                      <div className="flex gap-3">
                        <div className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">{t.nr}</div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{t.titel}</h4>
                          <p className="text-sm my-2">{t.text}</p>
                          <select value={userAntworten[t.nr] || ''} onChange={(e) => setUserAntworten({ ...userAntworten, [t.nr]: e.target.value })} className="p-2 border-2 rounded-lg" disabled={aufgabenFeedback}>
                            <option value="">...</option>
                            {generierteAufgabe.aussagen.map(a => <option key={a.buchstabe} value={a.buchstabe}>{a.buchstabe}</option>)}
                          </select>
                          {aufgabenFeedback?.results[t.nr] && <span className={`ml-2 ${aufgabenFeedback.results[t.nr].isCorrect ? 'text-green-600' : 'text-red-600'} font-semibold`}>{aufgabenFeedback.results[t.nr].isCorrect ? '✓' : `✗ (${aufgabenFeedback.results[t.nr].correct})`}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-semibold mb-4">Aussagen</h3>
                  <div className="grid grid-cols-2 gap-2">{generierteAufgabe.aussagen.map(a => <div key={a.buchstabe} className="border-2 rounded-lg p-2 text-sm"><span className="font-bold text-orange-500">{a.buchstabe}:</span> {a.text}</div>)}</div>
                </div>
              </>
            )}

            {/* FEHLERKORREKTUR */}
            {generierteAufgabe.fehler && generierteAufgabe.text && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="bg-gray-50 p-4 rounded-lg mb-6 whitespace-pre-line text-sm">{generierteAufgabe.text}</div>
                <h3 className="font-semibold mb-4">Fehler korrigieren</h3>
                {generierteAufgabe.fehler.map(f => (
                  <div key={f.nr} className="border-2 rounded-lg p-4 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">{f.nr}</div>
                      <div className="flex-1">
                        <span className="font-mono bg-yellow-100 px-2 py-1 rounded">"{f.original}"</span>
                        <p className="text-sm text-gray-600 my-2">{f.erklaerung}</p>
                        <input type="text" value={userAntworten[f.nr] || ''} onChange={(e) => setUserAntworten({ ...userAntworten, [f.nr]: e.target.value })} placeholder="Korrektur..." className="w-full p-2 border-2 rounded-lg" disabled={aufgabenFeedback} />
                        {aufgabenFeedback?.results[f.nr] && <div className={`mt-2 p-2 rounded text-sm ${aufgabenFeedback.results[f.nr].isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>{aufgabenFeedback.results[f.nr].isCorrect ? '✓' : `✗ ${aufgabenFeedback.results[f.nr].correct}`}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* WORDSPOT */}
            {generierteAufgabe.zeilen && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6"><h3 className="font-semibold text-yellow-900">🔍 Markieren Sie das falsche Wort oder schreiben Sie "OK"</h3></div>
                {generierteAufgabe.zeilen.map(z => (
                  <div key={z.nr} className="border-2 rounded-lg p-3 mb-2 grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-1 bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">{z.nr}</div>
                    <div className="col-span-6 font-mono text-sm">{z.text}</div>
                    <div className="col-span-5">
                      <input type="text" value={userAntworten[z.nr] || ''} onChange={(e) => setUserAntworten({ ...userAntworten, [z.nr]: e.target.value })} placeholder="Fehler/OK" className="w-full p-2 border-2 rounded-lg text-sm" disabled={aufgabenFeedback} />
                      {aufgabenFeedback?.results[z.nr] && <div className={`mt-1 p-2 rounded text-xs ${aufgabenFeedback.results[z.nr].isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>{aufgabenFeedback.results[z.nr].isCorrect ? '✓' : `✗ ${aufgabenFeedback.results[z.nr].correct}`}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PRÜFUNGSGESPRÄCH - Simulation */}
            {generierteAufgabe.typ?.includes('gespraech') && (
              <>
                {/* Material-Beschreibung */}
                {generierteAufgabe.material_beschreibung && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">📋 Material</h3>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm"><strong>Typ:</strong> {generierteAufgabe.material_typ}</p>
                      <p className="text-sm mt-2">{generierteAufgabe.material_beschreibung}</p>
                    </div>
                  </div>
                )}
                
                {/* Problemstellung (für Fachgespräch) */}
                {generierteAufgabe.problemstellung && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">💬 Problemstellung</h3>
                    <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
                      <p className="italic">"{generierteAufgabe.problemstellung}"</p>
                      {generierteAufgabe.gespraechspartner && (
                        <p className="text-sm text-gray-600 mt-2">— {generierteAufgabe.gespraechspartner}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Ablauf */}
                {generierteAufgabe.ablauf && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">📝 Ablauf der Simulation</h3>
                    <div className="space-y-3">
                      {generierteAufgabe.ablauf.map((schritt, i) => (
                        <div key={i} className="flex gap-3 bg-gray-50 p-3 rounded-lg">
                          <div className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                            {schritt.schritt}
                          </div>
                          <div>
                            <p className="font-semibold text-orange-700">{schritt.aktion}</p>
                            <p className="text-sm text-gray-600">{schritt.beschreibung}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Mögliche Ursachen (für Fachgespräch) */}
                {generierteAufgabe.moegliche_ursachen && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">🔍 Mögliche Ursachen (zur Vorbereitung)</h3>
                    <ul className="space-y-2">
                      {generierteAufgabe.moegliche_ursachen.map((u, i) => (
                        <li key={i} className="flex gap-2 bg-purple-50 p-3 rounded-lg">
                          <span className="text-purple-500">•</span>
                          <span>{u}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Mögliche Massnahmen (für Fachgespräch) */}
                {generierteAufgabe.moegliche_massnahmen && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">💡 Mögliche Massnahmen</h3>
                    <div className="space-y-3">
                      {generierteAufgabe.moegliche_massnahmen.map((m, i) => (
                        <div key={i} className="bg-green-50 p-4 rounded-lg">
                          <p className="font-semibold text-green-700">{m.massnahme}</p>
                          <p className="text-sm text-gray-600 mt-1">↳ {m.begruendung}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Sprachliche Hilfen */}
                {generierteAufgabe.sprachliche_hilfen && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">🗣️ Sprachliche Hilfen</h3>
                    <div className="flex flex-wrap gap-2">
                      {generierteAufgabe.sprachliche_hilfen.map((h, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{h}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Beispieldialog */}
                {generierteAufgabe.beispieldialog && (
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <button
                      onClick={() => setShowMusterantwort(!showMusterantwort)}
                      className="w-full flex items-center justify-between font-semibold text-gray-700 hover:text-orange-600"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Beispieldialog {showMusterantwort ? 'verbergen' : 'anzeigen'}
                      </span>
                      <span className="text-xl">{showMusterantwort ? '−' : '+'}</span>
                    </button>
                    {showMusterantwort && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <pre className="whitespace-pre-wrap text-sm">{generierteAufgabe.beispieldialog}</pre>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Timer starten */}
                {!sprechStarted ? (
                  <button onClick={startSprechaufgabe} className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-orange-600">
                    <Play className="w-6 h-6" />Simulation starten ({generierteAufgabe.sprechzeit || '7 Min'})
                  </button>
                ) : (
                  <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                    <p className="text-sm text-gray-500 mb-2">Simulationszeit</p>
                    <div className="text-5xl font-mono font-bold mb-4">{formatTime(recordingTime)}</div>
                    <div className="flex justify-center gap-4">
                      <button onClick={toggleRecording} className={`p-4 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-orange-500'} text-white`}>
                        {isRecording ? <Pause className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                      </button>
                      <button onClick={() => { setRecordingTime(0); setIsRecording(false); clearInterval(timerRef.current); }} className="p-4 rounded-full bg-gray-200">
                        <RotateCcw className="w-8 h-8" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Bewertungskriterien */}
                {generierteAufgabe.bewertungskriterien && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-4">⭐ Bewertungskriterien</h3>
                    {generierteAufgabe.bewertungskriterien.map((k, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded-lg mb-2">
                        <span className="font-semibold text-orange-500">{k.name}:</span> {k.beschreibung}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* LÜCKENTEXT */}
            {generierteAufgabe.luecken && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="bg-gray-50 p-4 rounded-lg mb-6 whitespace-pre-line">{generierteAufgabe.text}</div>
                <h3 className="font-semibold mb-4">Lücken ausfüllen</h3>
                {generierteAufgabe.luecken.map(l => (
                  <div key={l.nr} className="border-2 rounded-lg p-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">{l.nr}</div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-2">Hinweis: {l.hinweis}</p>
                        <input type="text" value={userAntworten[l.nr] || ''} onChange={(e) => setUserAntworten({ ...userAntworten, [l.nr]: e.target.value })} placeholder="..." className="w-full p-2 border-2 rounded-lg" disabled={aufgabenFeedback} />
                        {aufgabenFeedback?.results[l.nr] && <div className={`mt-2 p-2 rounded text-sm ${aufgabenFeedback.results[l.nr].isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>{aufgabenFeedback.results[l.nr].isCorrect ? '✓' : `✗ ${aufgabenFeedback.results[l.nr].correct}`}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ÜBERPRÜFEN-BUTTON */}
            {generierteAufgabe.loesungen && !aufgabenFeedback && (
              <button onClick={checkAufgabe} disabled={Object.keys(userAntworten).length !== Object.keys(generierteAufgabe.loesungen).length} className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold disabled:bg-gray-400">
                Überprüfen ({Object.keys(userAntworten).length}/{Object.keys(generierteAufgabe.loesungen).length})
              </button>
            )}

            {/* ERGEBNIS */}
            {aufgabenFeedback && (
              <div className={`rounded-xl p-6 ${aufgabenFeedback.score >= 60 ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>
                <div className="text-5xl font-bold mb-2">{aufgabenFeedback.score}%</div>
                <p>{aufgabenFeedback.richtig}/{aufgabenFeedback.gesamt} richtig • {aufgabenFeedback.score >= 60 ? '✓ Bestanden (≥60%)' : '✗ Nicht bestanden (<60%)'}</p>
              </div>
            )}
          </div>
        )}

        {generierteAufgabe?.error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
            <p className="text-red-700 font-medium">Fehler:</p>
            <p className="text-red-600 mt-2">{generierteAufgabe.error}</p>
            <button onClick={() => setGenerierteAufgabe(null)} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Erneut versuchen</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
