import React, { useState, useEffect } from 'react';
import { Moon, Sun, ShieldCheck, Info, X } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import LandingPage from './components/LandingPage';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState('landing');
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <button 
            className="icon-button" 
            onClick={() => setShowInfoModal(true)}
            title="Information & Privacy"
          >
            <Info size={20} />
          </button>
          
          {currentView === 'chat' && (
            <button 
              className="back-button"
              onClick={() => setCurrentView('landing')}
            >
              ← About Sentinel
            </button>
          )}
        </div>
        
        <div className="header-center">
          <div 
            className="logo-container" 
            onClick={() => setCurrentView('landing')}
            style={{ cursor: 'pointer' }}
          >
            <ShieldCheck size={28} className="shield-icon" />
            <h1>Sentinel.AI</h1>
          </div>
        </div>
        
        <div className="header-right">
          <button 
            className="theme-toggle" 
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>
      
      <main className="main-content">
        {currentView === 'landing' ? (
          <LandingPage onEnter={() => setCurrentView('chat')} />
        ) : (
          <ChatInterface />
        )}
      </main>

      {showInfoModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowInfoModal(false)}>
          <div className="modal-content animate-fade-in-scale" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowInfoModal(false)}>
              <X size={20} />
            </button>
            
            <h2>About & Privacy Policy</h2>
            
            <div className="modal-body">
              <p>
                <strong>Sentinel.AI</strong> is a research project developed at Chitkara University. 
                It utilizes a Multi-Agent RAG architecture to reduce AI hallucinations in high-stakes environments.
              </p>
              
              <h3>Privacy Policy</h3>
              <p>
                We value data security. All queries processed by the Filter, Generator, and Evaluator agents 
                are temporarily stored in memory for the duration of the evaluation loop. We do not permanently 
                log user queries, nor do we use submitted data to train external foundation models.
              </p>
            </div>
            
            <div className="modal-footer">
              <p>Need more technical details or want to report an issue?</p>
              <a 
                href="https://mail.google.com/mail/?view=cm&fs=1&to=samplemail@gmail.com&su=Inquiry%20about%20Sentinel.AI" 
                target="_blank" 
                rel="noopener noreferrer"
                className="contact-button"
              >
                Contact Support (Gmail)
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;