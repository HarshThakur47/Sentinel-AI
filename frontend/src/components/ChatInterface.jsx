import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, CheckCircle, Search, Filter, Sparkles, ShieldCheck } from 'lucide-react';
import SourceBadge from './SourceBadge';

const API_BASE = 'http://localhost:5000/api/v1';

const PIPELINE_STEPS = [
  { key: 'searching',  label: 'Searching Documents',  icon: Search },
  { key: 'filtering',  label: 'Filtering Sources',    icon: Filter },
  { key: 'generating', label: 'Generating Answer',    icon: Sparkles },
  { key: 'evaluating', label: 'Evaluating Response',  icon: ShieldCheck },
];

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(null);
  const [stepMessage, setStepMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, pipelineStep]);

  // ── SSE-based streaming query ────────────────────────────
  const queryWithSSE = (userQuery) => {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();

      fetch(`${API_BASE}/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery }),
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          function processChunk() {
            reader.read().then(({ done, value }) => {
              if (done) {
                reject(new Error('Stream ended without result'));
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              let eventName = '';
              for (const line of lines) {
                if (line.startsWith('event: ')) {
                  eventName = line.slice(7).trim();
                } else if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6);
                  try {
                    const payload = JSON.parse(dataStr);

                    if (eventName === 'step') {
                      setPipelineStep(payload.step);
                      setStepMessage(payload.message);
                    } else if (eventName === 'result') {
                      resolve(payload);
                      return;
                    } else if (eventName === 'error') {
                      reject(new Error(payload.message || 'Pipeline error'));
                      return;
                    } else if (eventName === 'done') {
                      return;
                    }
                  } catch {
                    // skip malformed JSON lines
                  }
                }
              }
              processChunk();
            }).catch(reject);
          }
          processChunk();
        })
        .catch(reject);
    });
  };

  // ── Standard fetch fallback ──────────────────────────────
  const queryWithFetch = async (userQuery) => {
    const response = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userQuery }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userQuery = input.trim();
    const userMessage = { role: 'user', content: userQuery };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setPipelineStep(null);
    setStepMessage('');

    try {
      // Try SSE first, fall back to standard fetch
      let data;
      try {
        data = await queryWithSSE(userQuery);
      } catch {
        setPipelineStep(null);
        data = await queryWithFetch(userQuery);
      }

      const botMessage = {
        role: 'bot',
        content: data.answer,
        score: data.confidenceScore,
        sources: data.sources || [],
        status: data.status,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: 'Connection error. Is the backend running on port 5000?', status: 'error' },
      ]);
    } finally {
      setIsLoading(false);
      setPipelineStep(null);
      setStepMessage('');
    }
  };

  // ── Determine which step index is active ─────────────────
  const activeStepIndex = PIPELINE_STEPS.findIndex((s) => s.key === pipelineStep);

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

              {/* ── Pipeline Step Tracker ─────────────────── */}
              <div className="pipeline-tracker">
                {PIPELINE_STEPS.map((step, i) => {
                  const StepIcon = step.icon;
                  const isActive   = i === activeStepIndex;
                  const isComplete = i < activeStepIndex;
                  const isPending  = i > activeStepIndex;
                  let statusClass = 'pending';
                  if (isActive)   statusClass = 'active';
                  if (isComplete) statusClass = 'complete';

                  return (
                    <div key={step.key} className={`pipeline-step ${statusClass}`}>
                      <div className="step-icon-wrapper">
                        {isComplete ? <CheckCircle size={16} /> : <StepIcon size={16} />}
                      </div>
                      <span className="step-label">{step.label}</span>
                    </div>
                  );
                })}
              </div>

              {stepMessage && (
                <p className="loading-text">{stepMessage}</p>
              )}
              {!stepMessage && (
                <>
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                  <p className="loading-text">Multi-agent pipeline evaluating...</p>
                </>
              )}
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