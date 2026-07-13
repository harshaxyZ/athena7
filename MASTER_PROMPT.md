# ATHENA — AI Visual Learning Platform
## Master Prompt & Technical Documentation

---

## PROJECT OVERVIEW

**Athena** is a full-stack AI-powered visual learning platform that transforms educational concepts into **cinematic animations with real-time narration**. Users upload documents, ask questions, and receive stunning visual explanations synchronized with multi-language audio.

**Target Audience:** Indian students learning complex concepts  
**Version:** 1.4.0  
**Status:** Production-ready (Awwwards-level UI/UX)

---

## TECH STACK

### FRONTEND
- **Framework:** Next.js 16.2.6 (App Router)
- **Language:** TypeScript 5.7.3
- **UI Library:** React 19 with Tailwind CSS 4.2.0
- **Styling:** Tailwind CSS 4.2.0 + Tailwind Merge 3.3.1
- **Animation:** Framer Motion 12.42.2 + GSAP 3.15.0
- **Canvas Rendering:** GSAP (for 2D animations)
- **Icons:** Lucide React 1.16.0
- **Components:** shadcn/ui (component registry)
- **Analytics:** Vercel Analytics 1.6.1
- **Package Manager:** pnpm

**Frontend Structure:**
```
frontend/
├── app/
│   ├── layout.tsx (ThemeProvider wrapper)
│   ├── page.tsx (Landing + Workspace)
│   └── globals.css (Theme tokens, dark/light modes)
├── components/
│   ├── athena-workspace.tsx (Main app logic)
│   ├── athena-logo.tsx (Premium "A" mark)
│   ├── animation-player-sync.tsx (Canvas player + sync)
│   ├── animation-skeleton.tsx (Loader)
│   ├── theme-provider-wrapper.tsx (Context wrapper)
│   └── ...
├── lib/
│   ├── theme-provider.tsx (Dark/Light mode toggle)
│   ├── athena-api.ts (API calls to backend)
│   └── utils.ts
└── public/ (Assets)
```

---

### BACKEND
- **Framework:** FastAPI 0.115.0 (Async Python)
- **Server:** Uvicorn 0.30.6 with 8 workers
- **Language:** Python 3.10+
- **API Calls:** httpx 0.27.2 (async HTTP)
- **Document Processing:** 
  - PyMuPDF 1.26.0+ (PDF extraction)
  - pdfplumber 0.11.4 (PDF parsing)
  - python-docx 1.2.0+ (DOCX)
  - python-pptx 1.0.2+ (PPTX)
- **Validation:** Pydantic 2.9.2
- **Config:** python-dotenv 1.0.1
- **File Handling:** aiofiles 24.1.0
- **Caching:** Redis 5.1.1 (optional, for session/cache)
- **Graph Processing:** NetworkX 3.3 (for concept extraction)
- **Multipart:** python-multipart 0.0.12 (file uploads)

**Backend Structure:**
```
backend/
├── main.py (FastAPI app entry)
├── config.py (Settings + env loading)
├── routers/
│   ├── upload.py (Document ingestion)
│   ├── chat.py (Chat streaming endpoint)
│   ├── history.py (Conversation history)
│   ├── session.py (Session management)
│   └── narration.py (Audio delivery)
├── a2a/ (Agent-to-Agent orchestration)
│   ├── orchestrator.py (Main pipeline)
│   ├── agents.py (Skill agents: ANALYZE, EXTRACT, PLAN, VISUAL, AUDIO, SPEECH)
│   ├── bus.py (Message bus for agent communication)
│   └── messages.py (Message/Part schemas)
├── dag/ (Lesson structure)
│   ├── context.py (AgentContext, SessionStatus, LessonStep)
│   └── models.py (Pydantic schemas)
├── services/
│   ├── file_processor.py (PDF/DOCX/PPTX parsing)
│   ├── llm_client.py (OpenRouter API wrapper)
│   ├── document_analyzer.py (Extract concepts)
│   └── video_engine/ (Canvas rendering instructions)
└── uploads/ (User uploaded files)
```

---

## AI MODELS & SERVICES

### Content Analysis & Planning (GLM)
**Model:** `z-ai/glm-5.2` (via OpenRouter)  
**Fallback:** `google/gemini-2.5-flash` (via OpenRouter)  
**Purpose:** Initial document parsing, concept extraction, lesson outline generation  
**API Endpoint:** `https://openrouter.ai/api/v1`

### Animation & Visual Generation (Claude)
**Visual Planner:** `anthropic/claude-opus-4.8`  
  - Temperature: 0.35 | Max Tokens: 900
  - Creates detailed frame-by-frame animation storyboards and scene composition strategies
  
**Visual Code Generator:** `anthropic/claude-sonnet-4-6`  
  - Temperature: 0.45 | Max Tokens: 3200
  - Transforms visual plans into production-ready GSAP/Canvas animation code

**Alternative (Optional):** `qwen/qwen-3.6-flash-02-12` (cost-optimized option, pricing tracked)

### Text-to-Speech (Sarvam AI)
**Provider:** [Sarvam AI](https://sarvam.ai)  
**Model:** `bulbul:v3`  
**Languages Supported:** 10 Indian languages (EN-IN, HI-IN, TA-IN, TE-IN, KN-IN, BN-IN, MR-IN, GU-IN, ML-IN, PA-IN)  
**Default Voice:** "shubh" (male voice)  
**Default Language:** hi-IN (Hindi)  
**Sample Rate:** 22050 Hz | **Format:** WAV

---

## WORKFLOW & PIPELINE

### User Journey
```
1. LANDING PAGE (Dark/Light mode)
   ↓
2. UPLOAD or TYPE PROMPT
   ├─ Upload: PDF, DOCX, PPTX (max 20MB)
   └─ Type: Natural language question
   ↓
3. BACKEND PROCESSES (A2A Orchestration)
   ├─ SKILL_ANALYZE: Extract key concepts
   ├─ SKILL_EXTRACT: Parse content structure
   ├─ SKILL_PLAN: Create lesson outline (steps/timeline)
   ├─ [FAN OUT] Per-step concurrent processing:
   │  ├─ SKILL_VISUAL: Generate Canvas animation code
   │  └─ SKILL_AUDIO: Generate narration → Sarvam TTS
   └─ Signal ready when both artifacts complete
   ↓
4. SSE STREAMING (Server-Sent Events)
   - Real-time scene delivery as VISUAL ready
   - Audio fetched on-demand per scene
   ↓
5. FRONTEND RENDERING
   - Canvas animation synced to audio playback
   - Scene transitions with GSAP animations
   - Timeline-based narration sync
   ↓
6. SETTINGS PANEL
   - Toggle dark/light theme (persisted in localStorage)
   - Reset conversation (clears all data)
```

### A2A (Agent-to-Agent) Orchestration Pipeline

**Stage 1: PREP (Sequential)**
```
User Input → SKILL_ANALYZE 
           → SKILL_EXTRACT 
           → SKILL_PLAN 
           = lesson_steps + outline ready
```

**Stage 2: PRODUCTION (Concurrent per-step)**
```
For each step in lesson_steps:
  ├─ SKILL_VISUAL (Canvas HTML + Template JSON)
  │  └─ Sets ctx.step_ready[step_id] when complete
  │     (triggers SSE stream to client)
  │
  └─ SKILL_AUDIO (Narration → TTS)
     ├─ SKILL_DOUBT (Concept clarification)
     ├─ SKILL_SPEECH (Narration localization)
     └─ Sets ctx.audio_ready[step_id] when complete
        (client fetches audio via HTTP)
```

**Stage 3: DELIVERY**
```
SSE Stream → Client receives scenes as ctx.step_ready signals
           → Client renders canvas animations
           → Client fetches audio on-demand
           → Sync via step.sync_timestamp + duration_estimate
```

**Concurrency:**
- **Visual max concurrent:** 5 (configurable via VISUAL_MAX_CONCURRENT)
- **LLM max concurrent:** 5 (configurable via LLM_MAX_CONCURRENT)
- **LLM timeout:** 120s (configurable via LLM_TIMEOUT_SECONDS)

---

## ENVIRONMENT VARIABLES

### Backend `.env`
```
# OpenRouter / LLM
OPENROUTER_ENDPOINT=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=sk-or-v1-YOUR-KEY-HERE
OPENROUTER_MODEL=z-ai/glm-5.2
OPENROUTER_FALLBACK_MODEL=google/gemini-2.5-flash

# Sarvam AI / TTS
SARVAM_API_KEY=sk_YOUR-KEY-HERE
SARVAM_BASE_URL=https://api.sarvam.ai
SARVAM_TTS_MODEL=bulbul:v3
SARVAM_DEFAULT_VOICE=shubh
SARVAM_DEFAULT_LANGUAGE=hi-IN
SARVAM_SAMPLE_RATE=22050
SARVAM_AUDIO_FORMAT=wav

# App Config
FRONTEND_ORIGIN=http://localhost:3000
LLM_TIMEOUT_SECONDS=120
VISUAL_MAX_CONCURRENT=5
USD_TO_INR=83.5
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## KEY FEATURES

### UI/UX (Awwwards-Level)
- ✅ Dark/Light theme toggle (persisted in localStorage)
- ✅ Premium minimalist "A" logo (geometric mark)
- ✅ Responsive design (mobile-first: 375px → 4K+)
- ✅ Smooth Framer Motion animations on landing
- ✅ Interactive feature cards with hover effects
- ✅ Settings panel with theme + reset options
- ✅ "Learn through motion" headline with animated backdrop
- ✅ Empty default chat history (fresh start for all users)

### Functionality
- ✅ Real-time streaming SSE for scene delivery
- ✅ Canvas-based animation rendering (GSAP)
- ✅ Multi-language narration (10 Indian languages)
- ✅ Audio-visual sync with timeline calibration
- ✅ Document upload (PDF, DOCX, PPTX)
- ✅ Cost tracking (tokens used, INR calculation)
- ✅ Session persistence (conversation history)
- ✅ File processor with concept extraction

---

## PERFORMANCE & SCALABILITY

**Optimized for 1000+ concurrent users:**
- ✅ Async/await throughout (no blocking I/O)
- ✅ Per-step concurrent visual + audio generation
- ✅ Redis caching ready (for sessions/cache)
- ✅ Stateless API design (horizontal scaling)
- ✅ SSE streaming (reduces polling overhead)
- ✅ Efficient Canvas rendering (GPU-accelerated via GSAP)
- ✅ No hardcoded data (dynamic content only)

---

## RUNNING LOCALLY

### Prerequisites
- Python 3.10+
- Node.js 18+
- pnpm package manager

### Setup

**1. Backend**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

**2. Frontend**
```bash
cd frontend
pnpm install
pnpm dev
# Runs on http://localhost:3000
```

**Verify:**
- Backend health: `http://localhost:8000/health`
- Frontend: `http://localhost:3000`

---

## DEPLOYMENT

**Vercel (Recommended for frontend):**
```bash
pnpm i -g vercel
vercel
```

**Docker (Backend):**
```dockerfile
FROM python:3.10
WORKDIR /app
COPY backend/ .
RUN pip install -r requirements.txt
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## CODE PATTERNS & CONVENTIONS

### Frontend
- **Components:** Functional with React 19 hooks
- **State:** Use SWR for API state + localStorage for theme
- **Styling:** Tailwind CSS utility classes + design tokens
- **Animations:** Framer Motion for entrance/hover, GSAP for canvas
- **Responsive:** Mobile-first breakpoints (sm, md, lg, xl)

### Backend
- **APIs:** FastAPI route handlers with async/await
- **Validation:** Pydantic models for request/response
- **Error Handling:** Try-catch with logging
- **Concurrency:** asyncio.gather() for parallel tasks
- **Config:** Environment-driven via Settings class

---

## SECURITY CONSIDERATIONS

- ✅ `.env` files excluded from git (`.gitignore`)
- ✅ CORS configured to frontend origin only
- ✅ API keys never exposed in frontend (backend-only)
- ✅ File uploads validated (type + size)
- ✅ No hardcoded secrets
- ⚠️ Auth system to be added (email/password with Better Auth)

---

## FUTURE ROADMAP

- [ ] User authentication (email/password + JWT)
- [ ] Database integration (Neon PostgreSQL + Drizzle ORM)
- [ ] Chat history persistence
- [ ] Payment system (Stripe)
- [ ] Admin dashboard
- [ ] Analytics/telemetry
- [ ] Video export (MP4)
- [ ] Collaboration features

---

## CONTACT & SUPPORT

**Repository:** [github.com/harshaxyZ/athena7](https://github.com/harshaxyZ/athena7)  
**Issues:** GitHub Issues  
**Deployment:** Vercel + Custom Backend

---

**Last Updated:** July 2026  
**Version:** 1.4.0  
**Maintained by:** v0 & harshaxyZ
