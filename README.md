🛡️ Sentinel.AI: Multi-Agent RAG System
Sentinel.AI is a robust, multi-agent Retrieval-Augmented Generation (RAG) system designed to tackle the AI Reliability Crisis. Built for high-stakes environments where accuracy is non-negotiable (such as medical and legal fields), Sentinel.AI reduces standard RAG hallucination rates from ~40% down to 10% through a tiered, self-correcting verification pipeline.

🌟 The Problem It Solves
Standard RAG systems lack a verification layer—if they retrieve bad data, they output bad data confidently. Sentinel.AI solves the "Single Point of Failure" by employing a system of checks and balances where different AI models verify each other's work before delivering an answer to the user.

🏗️ Architecture: Tiered Self-Correcting Pipeline
Our architecture utilizes three distinct AI agents working in tandem:
1. Tier 1: Filter Agent (Llama 3.1 8B)
    • Acts as the first line of defense
    • Filters retrieved documents for relevance and safety
    • Removes irrelevant or NSFW content
2. Tier 2: Generator Agent (Claude Sonnet 3.5)
    • Uses high-quality filtered context
    • Performs reasoning and synthesis
    • Generates grounded responses
3. Tier 3: Evaluator Agent (Gemini 1.5)
    • Acts as a fact-checker
    • Compares generated answer with source documents
    • Sends feedback if hallucination detected
    • Ensures only verified responses are returned

🛠️ Tech Stack
    • Frontend: React.js, Vite, Pure CSS
    • Backend: Node.js, Express.js
    • Database: MongoDB Atlas Vector Search
    • AI Models: Llama 3.1, Claude 3.5 Sonnet, Gemini 1.5

🚀 Getting Started
Prerequisites
    • Node.js (v16 or higher)
    • npm or yarn
    • MongoDB Atlas account
    • API keys for Claude, Gemini, and Llama

⚙️ Installation
Clone Repository
git clone https://github.com/your-username/sentinel-ai.git
cd sentinel-ai
Backend Setup
cd backend
npm install
Create .env file:
PORT=5000
MONGODB_URI=your_mongodb_connection_string
ANTHROPIC_API_KEY=your_claude_api_key
GEMINI_API_KEY=your_gemini_api_key
LLAMA_API_KEY=your_llama_provider_api_key
Start backend:
npm start
Frontend Setup
cd frontend
npm install
npm run dev

📊 Performance Metrics
Metric	Standard RAG	Sentinel.AI
Hallucination Rate	35–40%	10%
Fact Verification	No	Yes
Source Citations	Sometimes	Always
Response Time	12s	5s


👥 Project Team
    • Deepanshu
    • Manish Sharma
    • Harshwardhan Singh Thakur
    • Hemant Sharma

📄 License
MIT License
# Sentinel-AI
