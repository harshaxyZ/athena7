# Athena - Visual Learning Platform

Transform educational concepts into stunning cinematic animations. Athena is an AI-powered visual learning assistant that helps students understand complex topics through animated explanations with synchronized voice-over and subtitles.

## What is Athena?

Athena is **ChatGPT for visual learning**. It works like a normal conversational AI until you ask for something to be animated. When you request visualization ("animate," "show visually," "as a video"), the platform generates:

- **Interactive animations** using GSAP and Canvas (1600x900 resolution)
- **Synchronized narration** using multi-language text-to-speech
- **Subtitle synchronization** with timing markers
- **Educational context** for deep understanding

## Installation & Setup Guide

### Prerequisites

- **Python 3.10+** - Check with `python3 --version`
- **Node.js 18+** - Check with `node --version`
- **pnpm** - Install with `npm install -g pnpm` (or use npm/yarn)
- **OpenRouter API key** - Get from [openrouter.ai](https://openrouter.ai)
- **Sarvam AI API key** - Get from [sarvam.ai](https://sarvam.ai)

### Step 1: Clone Repository

```bash
git clone https://github.com/harshaxyZ/athena7.git
cd athena7
```

### Step 2: Backend Setup

```bash
# Navigate to backend
cd backend

# Create Python virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env  # or use your favorite editor
```

**Required in `.backend/.env`:**
```
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=qwen/qwen-3-32b-instruct
OPENROUTER_VISUAL_PLANNER_MODEL=anthropic/claude-opus-4.8
OPENROUTER_VISUAL_GENERATOR_MODEL=anthropic/claude-sonnet-4.6

SARVAM_API_KEY=your-sarvam-key-here
SARVAM_TTS_MODEL=bulbul:v3
SARVAM_DEFAULT_VOICE=shubh
```

### Step 3: Start Backend Server

```bash
# From backend directory (with venv activated)
python -m uvicorn main:app --reload --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

### Step 4: Frontend Setup (New Terminal)

```bash
# From project root
cd frontend

# Install dependencies
pnpm install
# (or use: npm install / yarn install)

# Start development server
pnpm dev
```

Expected output:
```
▲ Next.js 16.0.0
- Local:        http://localhost:3000
```

### Step 5: Access Application

Open [http://localhost:3000](http://localhost:3000) in your browser and start learning!

## Troubleshooting

### Backend Issues

**ModuleNotFoundError: No module named 'fastapi'**
```bash
# Make sure venv is activated
source backend/venv/bin/activate  # or: venv\Scripts\activate on Windows
pip install -r requirements.txt
```

**Port 8000 already in use**
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :8000    # Windows

# Or use a different port
python -m uvicorn main:app --port 8001
```

**API Key errors (401 Unauthorized)**
- Verify OpenRouter API key is valid and active
- Go to [openrouter.ai/account](https://openrouter.ai/account) to check
- Generate a new key if needed
- Update `.env` and restart backend

**ImportError from backend.main**
- Make sure you're running from project root: `cd /path/to/athena7`
- Run: `python -m uvicorn backend.main:app --reload --port 8000`

### Frontend Issues

**Port 3000 already in use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9    # macOS/Linux
netstat -ano | findstr :3000      # Windows

# Or specify different port
pnpm dev -- -p 3001
```

**pnpm: command not found**
```bash
# Install pnpm globally
npm install -g pnpm

# Or use npm instead
npm install
npm run dev
```

**Cannot GET http://localhost:3000**
- Wait 30 seconds for frontend to build
- Check terminal for build errors
- Clear `.next` folder and restart: `rm -rf .next && pnpm dev`

### Animation Generation Issues

**"Animation failed - Failed to fetch"**
1. Check backend is running: `curl http://localhost:8000/docs`
2. Check backend logs for error messages
3. Verify OpenRouter API key is valid
4. Check Claude Opus 4.8 and Sonnet 4-6 models are available on OpenRouter

**"User not found" (401 error)**
- Your OpenRouter API key is invalid or revoked
- Generate a new key from [openrouter.ai](https://openrouter.ai)
- Update `backend/.env` with new key
- Restart backend server

**TTS Audio not playing**
- Verify Sarvam API key in `.env`
- Check browser console for audio errors
- Try refreshing page
- Test with different browser (Chrome recommended)

## Workflow

### Normal Chat Mode (No Animation)
1. User types a question: "What is photosynthesis?"
2. **Model (Qwen3 32B)** generates textual explanation
3. Response streams in real-time with citations
4. Chat history saved for reference

### Animation Mode (Visual Learning)
Trigger animation with keywords: "animate," "show visually," "visualize," "as a video"

**Pipeline:**
```
User Input (with animation keywords)
    ↓
[1] Content Analysis (Qwen3 32B)
    - Parse topic and requirements
    - Extract key concepts
    ↓
[2] Visual Planning (Claude Opus 4.8)
    - Create detailed frame-by-frame storyboard
    - Define animation sequences
    - Plan timing and transitions
    ↓
[3] Animation Code Generation (Claude Sonnet 4-6)
    - Transform plan into GSAP + Canvas code
    - Add particle effects, morphing, transitions
    ↓
[4] TTS Narration Generation (Sarvam Bulbul:v3)
    - Generate voice narration for captions
    - Support 10+ Indian languages
    - Male voice: "shubh" | Female voice: "shruti"
    ↓
[5] Subtitle Synchronization
    - Merge animation, voice, and timing beats
    - Create SRT subtitles with timestamps
    ↓
[6] Real-time Streaming
    - Send animation code to browser
    - Stream audio as base64
    - Sync playback frame-by-frame
    ↓
Canvas Rendering (1600x900 @ 60fps)
Audio Playback (WAV format, 22050 Hz)
Subtitle Display (aligned with audio beats)
```

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion, GSAP
- **Rendering:** Canvas 2D, Anime.js
- **State:** React hooks + SWR
- **UI:** shadcn/ui components

### Backend
- **Runtime:** FastAPI + Python 3.10+
- **Async:** asyncio, async/await throughout
- **Document Processing:** PyMuPDF (fitz), python-docx
- **AI/ML Integration:** OpenRouter API client
- **TTS:** Sarvam AI API client
- **Database:** In-memory session management (Redis-ready)

### AI Models (via OpenRouter)
| Model | Purpose | Cost | Speed | Knowledge Cutoff |
|-------|---------|------|-------|------------------|
| **Qwen3 32B** | General chat, explanations | $0.32/1K tokens | Fast | March 2025 |
| **Claude Opus 4.8** | Animation planning, reasoning | $15/1M in, $45/1M out | Moderate | April 2024 |
| **Claude Sonnet 4-6** | Animation code generation | $3/1M in, $15/1M out | Fast | April 2024 |
| **Gemini 2.5 Flash** | Fallback LLM | $0.075/1M in | Very Fast | December 2024 |

### Text-to-Speech
- **Provider:** Sarvam AI Bulbul:v3
- **Languages:** English, Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati, Malayalam, Punjabi
- **Voices:** 
  - Male: "shubh" (default)
  - Female: "shruti"
- **Sample Rate:** 22050 Hz
- **Format:** WAV (lossless)

## Key Features

### 1. Normal Chat
- Context-aware responses from Qwen3
- Document upload support (PDF, DOCX)
- Real-time streaming
- Multi-turn conversations

### 2. Animation Generation
- Trigger with keywords: "animate," "show," "visualize"
- Custom animation length (default: 2 minutes)
- High-quality GSAP animations
- Realistic motion curves and easing

### 3. Voice & Subtitles
- Automatic narration generation
- Male/female voice toggle
- Real-time subtitle sync
- Multi-language support

### 4. Educational Context
- Saved conversation history
- Cost tracking (USD & INR)
- Generation time metrics
- Token usage analytics

## Complex Learning Prompts

Click the sparkle button to generate random learning prompts across 20 categories:

### Physics & Space (5)
- Black hole formation and event horizons
- Star lifecycle and Hertzsprung-Russell diagram
- Quantum entanglement
- Electromagnetic wave propagation
- Gravity and orbital mechanics

### Mathematics (5)
- Fourier transform and frequency analysis
- Mandelbrot set and fractal geometry
- Calculus limits and derivatives
- Pythagorean theorem proofs
- Linear algebra and matrix transformations

### Chemistry (5)
- Molecular bonding mechanisms
- Photosynthesis light reactions
- Periodic table and electron configuration
- Oxidation-reduction reactions
- Chemical equilibrium and Le Chatelier's principle

### Biology & Body Systems (5)
- **Heart anatomy and circulatory system** - Heartbeat cycle, blood flow, valve mechanics
- DNA replication at molecular level
- Immune system response to infections
- Cellular respiration vs photosynthesis
- Nervous system signal transmission

## Example Prompts for Testing

### Black Hole Explanation (Physics)
```
"Explain how a black hole forms from a dying star and visualize the event 
horizon, accretion disk, and gravitational lensing effect. Show how spacetime 
is curved and animate matter spiraling into the singularity with 
spaghettification forces."
```

**Expected Output:**
- Visual of star collapse
- Event horizon boundary animation
- Matter swirling with gravitational lensing
- Voice narration explaining physics
- Subtitles synced with animation

### Heart Anatomy & Function (Biology)
```
"Explain the human heart anatomy and how it pumps blood through the circulatory 
system. Visualize the four chambers, valves, and blood flow through arteries 
and veins. Animate a complete heartbeat cycle showing electrical signals 
triggering muscle contraction and valve opening/closing."
```

**Expected Output:**
- Anatomical cross-section of heart
- Blood flow animation through chambers
- Electrical conduction system visualization
- Valve opening/closing animation
- Synchronized heartbeat sound effects
- Medical explanations with subtitles

## Environment Variables

### Backend (`backend/.env`)
```env
# OpenRouter Models
OPENROUTER_ENDPOINT=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=qwen/qwen-3-32b-instruct
OPENROUTER_FALLBACK_MODEL=google/gemini-2.5-flash
OPENROUTER_VISUAL_PLANNER_MODEL=anthropic/claude-opus-4.8
OPENROUTER_VISUAL_GENERATOR_MODEL=anthropic/claude-sonnet-4-6

# Sarvam AI (Text-to-Speech)
SARVAM_API_KEY=your-key-here
SARVAM_BASE_URL=https://api.sarvam.ai
SARVAM_TTS_MODEL=bulbul:v3
SARVAM_DEFAULT_VOICE=shubh
SARVAM_FEMALE_VOICE=shruti
SARVAM_DEFAULT_LANGUAGE=hi-IN
SARVAM_SAMPLE_RATE=22050
SARVAM_AUDIO_FORMAT=wav

# Configuration
FRONTEND_ORIGIN=http://localhost:3000
LLM_TIMEOUT_SECONDS=120
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Endpoints

### Chat
- `POST /api/chat` - Send message and get streamed response (SSE)
- `POST /api/upload` - Upload document (PDF, DOCX)

### Narration
- `POST /api/narration` - Generate TTS audio for text

### Session
- `GET /api/conversation/{id}` - Retrieve conversation history

## Performance Metrics

- **Chat response time:** 2-8 seconds (Qwen3)
- **Animation generation:** 15-45 seconds per animation
- **Animation rendering:** 60 FPS (Canvas 2D)
- **Audio sync accuracy:** ±50ms
- **Subtitle latency:** Real-time (<100ms)

## Cost Optimization

- **Qwen3 for chat:** 5-6x cheaper than GLM-5.2
- **Claude models for animations:** Justified for quality
- **Average cost per animation:** $0.15-$0.45 USD (~₹12-₹37)
- **Token tracking:** Real-time cost display in UI

## Troubleshooting

### Animation not rendering
- Check browser console for errors
- Verify GSAP/Canvas libraries loaded
- Ensure backend is returning animation code

### Voice/audio not playing
- Verify Sarvam API key is valid
- Check audio MIME type (should be WAV)
- Test with Chrome/Firefox (Safari may have CORS issues)

### Model errors
- Ensure OpenRouter API key is set
- Check model names match OpenRouter API
- Verify fallback model is available

## Development

### File Structure
```
athena7/
├── frontend/
│   ├── components/       # React components
│   ├── lib/              # Utilities & API
│   ├── app/              # Next.js routes
│   └── styles/           # Tailwind + globals
├── backend/
│   ├── routers/          # API endpoints
│   ├── agents/           # AI agents (visual generator)
│   ├── services/         # LLM, TTS, document processing
│   └── a2a/              # Agent-to-agent orchestration
└── README.md
```

### Adding New Prompts
Edit `frontend/components/athena-workspace.tsx`:
```typescript
const complexPrompts = [
  "Your new prompt here with 'animate' keyword...",
  // ...
]
```

## Future Roadmap

- [ ] MP4 video export with embedded subtitles
- [ ] Multi-part animation sequences
- [ ] Interactive 3D visualizations (Three.js)
- [ ] Collaborative learning sessions
- [ ] Quiz generation from animations
- [ ] Mobile app (React Native)

## License

MIT

## Contact & Support

- GitHub: [harshaxyZ/athena7](https://github.com/harshaxyZ/athena7)
- Issues: Report bugs on GitHub Issues
- Feedback: Contribute ideas and improvements

---

**Athena** - Learn complex concepts through motion. Designed for students, built for understanding.
