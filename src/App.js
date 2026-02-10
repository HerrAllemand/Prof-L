import React, { useState } from 'react';

const App = () => {
  const [inputText, setInputText] = useState('');
  const [isKorrektur, setIsKorrektur] = useState(false);
  const [audioSupported, setAudioSupported] = useState(typeof SpeechSynthesis !== 'undefined');

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  const toggleMode = () => {
    setIsKorrektur(!isKorrektur);
  };

  const handleSpeak = () => {
    if (audioSupported) {
      const utterance = new SpeechSynthesisUtterance(inputText);
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div>
      <h1>Prof-L Agent</h1>
      <button onClick={toggleMode}>
        Switch to {isKorrektur ? "Generator" : "Korrektur"} Mode
      </button>
      <textarea 
        value={inputText} 
        onChange={handleInputChange} 
        placeholder="Type your text here..."
        rows={10}
        cols={50}
      />
      <div>
        <button onClick={handleSpeak}>Speak</button>
      </div>
      <h2>Current Mode: {isKorrektur ? "Korrektur" : "Generator"}</h2>
    </div>
  );
};

export default App;