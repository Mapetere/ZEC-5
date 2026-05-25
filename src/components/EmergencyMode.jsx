import { useState, useRef, useEffect } from 'react';
import { processEnergyQuery } from '../services/nlpEngine.js';

export default function EmergencyMode({ kwhRemaining, sensors, profiles, relays, onToggleRelay, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "I am your ZET-5 Emergency Assistant. You are at critical token levels. Tell me what appliances you want to use and how long you need your tokens to last, and I will calculate if it is safe.\n\nExample: *'I want to cook for 30 minutes, can I still last 5 days?'*"
    }
  ]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const [pendingOffer, setPendingOffer] = useState(null);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = { id: Date.now(), sender: 'user', text: inputText };
    setMessages(prev => [...prev, userMessage]);
    
    const lowerInput = inputText.toLowerCase().trim();
    if (pendingOffer && (lowerInput === 'activate' || lowerInput === 'yes' || lowerInput === 'do it')) {
      setInputText('');
      setPendingOffer(null);
      
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender: 'bot',
          text: `**Active Monitoring Started.** I have switched on the ${pendingOffer.intent}. I will continuously track the current drawn by this appliance and automatically disconnect it when the ${pendingOffer.limitKwh.toFixed(1)} kWh budget is reached.`
        }]);
        if (onStartEnergyBudget) {
          onStartEnergyBudget(pendingOffer.relayIndex, pendingOffer.limitKwh, pendingOffer.intent);
        }
      }, 600);
      return;
    }

    // Process via NLP Engine
    const kwh = parseFloat(kwhRemaining) || 5;
    const result = processEnergyQuery(inputText, kwh, profiles);
    
    if (result.offerActivation) {
      setPendingOffer(result.offerActivation);
    } else {
      setPendingOffer(null);
    }

    setInputText('');

    // Simulate slight typing delay for realism
    setTimeout(() => {
      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: result.response,
        isFeasible: result.isFeasible
      };
      setMessages(prev => [...prev, botMessage]);
    }, 600);
  };

  return (
    <div className="hw-modal-overlay" onClick={onClose}>
      <div className="emergency-panel fade-in" onClick={e => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '80vh', maxHeight: '700px' }}>
        
        {/* HEADER */}
        <div className="emergency-header" style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 className="emergency-title">Emergency AI Assistant</h3>
          <button className="advice-close" onClick={onClose} id="emergency-close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="emergency-alert-bar" style={{ borderRadius: 0, margin: 0, flexShrink: 0 }}>
          Remaining Energy: {parseFloat(kwhRemaining).toFixed(1)} kWh | Critical Level
        </div>

        {/* CHAT HISTORY */}
        <div className="chat-history" style={{ flexGrow: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: msg.sender === 'user' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
              border: msg.sender === 'bot' ? '1px solid rgba(255,255,255,0.1)' : 'none',
              padding: '12px 16px',
              borderRadius: msg.sender === 'user' ? '16px 16px 0px 16px' : '16px 16px 16px 0px',
              color: '#fff',
              fontSize: '13px',
              lineHeight: '1.6',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {msg.sender === 'bot' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 16v-4M12 8h.01" />
                  </svg>
                  ZET-5 AI
                </div>
              )}
              
              {/* Parse basic markdown for bold text */}
              <div dangerouslySetInnerHTML={{ 
                __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>') 
              }} />

              {msg.isFeasible === false && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,107,107,0.1)', border: '1px solid var(--alert-red)', borderRadius: '6px', fontSize: '11px', color: 'var(--alert-red)' }}>
                  <strong>Warning:</strong> Doing this risks immediate grid collapse.
                </div>
              )}
              {msg.isFeasible === true && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(37,211,102,0.1)', border: '1px solid var(--accent-green)', borderRadius: '6px', fontSize: '11px', color: 'var(--accent-green)' }}>
                  <strong>Safe to proceed:</strong> Budget constraint met.
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* INPUT AREA */}
        <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="E.g. Can I run the borehole for 1 hr and last 3 days?"
              style={{
                flexGrow: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '24px',
                padding: '12px 20px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button 
              type="submit" 
              className="advice-accept-btn" 
              style={{ padding: '0 20px', borderRadius: '24px', border: 'none', cursor: inputText.trim() ? 'pointer' : 'not-allowed', opacity: inputText.trim() ? 1 : 0.5 }}
              disabled={!inputText.trim()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
