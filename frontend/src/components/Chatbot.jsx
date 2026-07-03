import React, { useState, useRef, useEffect } from 'react';

const Chatbot = ({ botName = 'NoteBot' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const bodyRef = useRef(null);

  const botReplies = [
    "I can help you find notes! Try searching by subject name. 📚",
    "You can filter notes by teacher, subject, or date using the filter bar above.",
    "To bookmark a note, click the ⭐ icon on any note card.",
    "Latest notes are highlighted in the 'Today's Notes' section at the top!",
    "You can preview PDF notes without downloading by clicking the 👁 icon.",
    "Need help? Ask your teacher in the Doubts & Comments section.",
    "Scheduled notes will be unlocked automatically at the release time. ⏰",
    "Download any note by clicking the ⬇ button on the note card.",
    "You'll get a notification when your teacher uploads new notes! 🔔",
    "To search across all subjects, use the smart search bar at the top.",
  ];

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([
          { text: `Hello! 👋 I'm ${botName}. How can I help you today?`, type: 'bot' }
        ]);
      }, 300);
    }
  }, [isOpen, botName]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const sendMessage = () => {
    const text = inputValue.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { text, type: 'user' }]);
    setInputValue('');

    setTimeout(() => {
      const reply = botReplies[Math.floor(Math.random() * botReplies.length)];
      setMessages((prev) => [...prev, { text: reply, type: 'bot' }]);
    }, 600 + Math.random() * 400);
  };

  return (
    <>
      <div 
        className="chatbot-fab" 
        id="chatbot-fab" 
        onClick={toggleChat}
        style={{ zIndex: 300 }}
      >
        {isOpen ? '✕' : '🤖'}
      </div>
      <div 
        className={`chatbot-window ${isOpen ? 'open' : ''}`} 
        id="chatbot-window"
        style={{ zIndex: 300 }}
      >
        <div className="chatbot-header">
          <div className="chatbot-avatar">🤖</div>
          <div>
            <div className="chatbot-name">{botName}</div>
            <div className="chatbot-status">🟢 Online</div>
          </div>
          <button 
            id="chatbot-close" 
            onClick={toggleChat}
            style={{ 
              marginLeft: 'auto', 
              background: 'rgba(255,255,255,.2)', 
              border: 'none', 
              color: 'white', 
              borderRadius: '50%', 
              width: '28px', 
              height: '28px', 
              cursor: 'pointer', 
              fontSize: '1rem', 
              display: 'grid', 
              placeItems: 'center' 
            }}
          >
            ✕
          </button>
        </div>
        <div className="chatbot-body" id="chatbot-body" ref={bodyRef}>
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`chat-msg ${msg.type} animate-fadeInUp`}
            >
              {msg.text}
            </div>
          ))}
        </div>
        <div className="chatbot-input-wrap">
          <input 
            id="chatbot-input" 
            className="chatbot-input" 
            placeholder={`Ask ${botName}…`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
          />
          <button 
            className="btn btn-primary btn-icon" 
            id="chatbot-send"
            onClick={sendMessage}
          >
            ➤
          </button>
        </div>
      </div>
    </>
  );
};

export default Chatbot;
