import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, CheckCircle } from 'lucide-react';
import SourceBadge from './SourceBadge';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/v1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery: input }),
      });

      const data = await response.json();

      const botMessage = {
        role: 'bot',
        content: data.answer,
        score: data.confidenceScore,
        sources: data.sources || [],
        status: data.status
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: 'Connection error. Is the backend running?', status: 'error' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-history">
        {messages.length === 0 && !isLoading && (
          <div className="empty-state animate-fade-in-scale">
            <Bot size={48} className="empty-icon" />
            <h2>Ask Sentinel.AI</h2>
            <p>Try asking: "What are the side effects of Metformin?"</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div 
            key={idx}
            className={`message-wrapper animate-slide-up ${msg.role}`}
          >
            <div className="message-avatar">
              {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            
            <div className="message-content">
              <div className="text-content">{msg.content}</div>
              
              {msg.role === 'bot' && msg.status === 'success' && (
                <div className="message-metadata animate-fade-in" style={{ animationDelay: '0.3s' }}>
                  <div className="confidence-score">
                    <CheckCircle size={16} />
                    <span>Evaluator Score: <strong>{msg.score}/10</strong></span>
                  </div>
                  
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="sources-container">
                      <p className="sources-label">Verified Sources:</p>
                      <div className="sources-list">
                        {msg.sources.map((src, i) => (
                          <SourceBadge key={i} source={src} index={i} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message-wrapper bot loading animate-slide-up">
            <div className="message-avatar"><Bot size={20} /></div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
              <p className="loading-text">Multi-agent pipeline evaluating...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a verified question..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;