# Athena — Learn Beyond Words

Athena is an AI-powered interactive learning platform that transforms plain text and documents into stunning, cinematic visual explanations in seconds.

## Tech Stack
- **Frontend**: Next.js 16 + React 19, TailwindCSS, Framer Motion
- **Backend**: FastAPI + Python
- **AI Orchestration**:
  - `anthropic/claude-opus-4.8` (Visual Planner - Scene Strategy)
  - `anthropic/claude-sonnet-4-6` (Visual Code Generator - GSAP animation code)
  - `GLM-5.2` (Initial content analysis and concept extraction)
  - `Sarvam Bulbul:v3` (10-language TTS for narration)

## Features
- **A2A Pipeline**: Sophisticated multi-agent architecture handling prep stage (sequential), production stage (concurrent), and delivery (SSE streaming).
- **Real-time Sync**: Audio-visual synchronization playing GSAP animations perfectly timed with TTS narration.
- **Performance**: Optimized for 1000+ concurrent users with async/await and stateless design.
- **Modern UI**: Dark/Light theme toggle, premium aesthetics, and responsive layout.

## Getting Started

### 1. Backend Setup
1. Navigate to the `backend/` directory.
2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and fill in your API keys.
4. Run the server:
   ```bash
   .\start_backend.ps1
   # or
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

### 2. Frontend Setup
1. Navigate to the `frontend/` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) (or 3001) in your browser.
