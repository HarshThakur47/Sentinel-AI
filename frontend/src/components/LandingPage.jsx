import React from 'react';
import { ShieldCheck, AlertOctagon, Layers, Activity, ArrowRight, CheckCircle, XCircle } from 'lucide-react';

const LandingPage = ({ onEnter }) => {
  return (
    <div className="landing-page animate-fade-in">
      <section className="hero-section text-center">
        <div className="hero-badge">Solving the AI Reliability Crisis</div>
        <h1 className="hero-title">
          Sentinel.AI
        </h1>
        <p className="hero-subtitle">
          A Multi-Agent RAG System for Reducing Hallucination. Built for high-stakes environments where accuracy is non-negotiable.
        </p>
        <button className="cta-button primary" onClick={onEnter}>
          Go to Sentinel <ArrowRight size={20} />
        </button>
      </section>

      <section className="problem-section">
        <div className="section-header text-center">
          <h2>The Single Point of Failure</h2>
          <p>Standard AI doesn't know when it's wrong—it just sounds confident.</p>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <AlertOctagon size={32} className="text-danger" />
            <div className="stat-value text-danger">78%</div>
            <div className="stat-label">Legal AI Errors</div>
            <p>Cite non-existent cases in standard legal tools.</p>
          </div>
          <div className="stat-card">
            <Activity size={32} className="text-warning" />
            <div className="stat-value text-warning">40%</div>
            <div className="stat-label">Medical AI Mistakes</div>
            <p>Standard systems generate incorrect medical responses.</p>
          </div>
          <div className="stat-card">
            <XCircle size={32} className="text-danger" />
            <div className="stat-value text-danger">35-40%</div>
            <div className="stat-label">RAG Hallucination</div>
            <p>Garbage in = Garbage out without a verification layer.</p>
          </div>
        </div>
      </section>

      <section className="architecture-section">
        <div className="section-header text-center">
          <h2>Tiered Self-Correcting Pipeline</h2>
          <p>Different models have different failure modes. We use a system of checks and balances.</p>
        </div>
        <div className="agents-grid">
          <div className="agent-card">
            <div className="agent-step">Tier 1</div>
            <h3>Filter Agent</h3>
            <div className="agent-model">Llama 3.1 8B</div>
            <p>Acts as the first line of defense, providing cheap and fast filtering of relevant and safe documents.</p>
          </div>
          <div className="agent-card">
            <div className="agent-step">Tier 2</div>
            <h3>Generator Agent</h3>
            <div className="agent-step-icon"><Layers size={24} /></div>
            <div className="agent-model">Claude Sonnet 3.5</div>
            <p>Utilizes superior reasoning capabilities to synthesize information and create a grounded draft answer.</p>
          </div>
          <div className="agent-card">
            <div className="agent-step">Tier 3</div>
            <h3>Evaluator Agent</h3>
            <div className="agent-step-icon"><CheckCircle size={24} /></div>
            <div className="agent-model">Gemini 1.5</div>
            <p>Performs strong evaluation and fact-checks claims. Sends incorrect drafts back for refinement.</p>
          </div>
        </div>
      </section>

      <section className="results-section text-center">
        <h2>Measured Improvements Over Baseline</h2>
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Standard RAG</th>
                <th>Sentinel.AI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Hallucination Rate</td>
                <td>35%</td>
                <td className="text-success font-bold">10%</td>
              </tr>
              <tr>
                <td>Fact Verification</td>
                <td>No</td>
                <td className="text-success font-bold">Yes</td>
              </tr>
              <tr>
                <td>Source Citations</td>
                <td>Sometimes</td>
                <td className="text-success font-bold">Always</td>
              </tr>
              <tr>
                <td>Response Time</td>
                <td>12s</td>
                <td className="text-success font-bold">5s</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;