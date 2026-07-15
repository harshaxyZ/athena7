"""
Visual Generator — produces Scene JSON for the cinematic renderer.

Architecture: LLM outputs structured Scene JSON (what to teach and how to present it).
The renderer (frontend) owns all visual quality: composition, layout, colors, typography,
spacing, camera movement, easing, transitions, and animation polish.

The LLM NEVER generates Canvas/GSAP/JS code. It picks scene types from a fixed menu
and describes semantic intent. The renderer turns that into premium 2D animation.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re

from backend.config import settings
from backend.dag.context import AgentContext, LessonStep
from backend.services.llm import llm_chat

logger = logging.getLogger("agents.visual_generator")


# ─── SCENE JSON SCHEMA ──────────────────────────────────────────────
# This is the contract between the Director AI and the frontend renderer.
# The Director outputs JSON matching this schema. The renderer reads it
# and produces cinematic animation. New scene types can be added by
# extending SCENE_TYPES and adding a corresponding renderer function.

SCENE_TYPES = [
    "Hero",           # Big title + subtitle + atmospheric background
    "FlowDiagram",    # Connected steps with arrows, staggered reveal
    "Timeline",       # Events on a chronological line
    "Mechanism",      # Labeled parts showing how something works
    "CrossSection",   # Cutaway view with labeled layers
    "Journey",        # Step-by-step path with progress
    "Comparison",     # Side-by-side contrast
    "Graph",          # Animated chart with counter
    "Equation",       # Math with animated derivation
    "Summary",        # Key takeaways with icons
]

CAMERA_TYPES = [
    "static",         # No camera movement
    "pushIn",         # Zoom into focus area
    "pullOut",        # Zoom out to reveal context
    "pan",            # Horizontal or vertical pan
    "orbit",          # Circular camera movement
    "zoom",           # General zoom in/out
    "tilt",           # Vertical angle shift
    "focusShift",     # Rack focus between elements
]

POSITIONS = [
    "center", "left", "right", "top", "bottom",
    "top-left", "top-right", "bottom-left", "bottom-right",
    "left-third", "right-third", "full-width",
]

ENTER_ANIMATIONS = [
    "slideUp", "slideDown", "fade", "scalePop",
    "drawLine", "staggerReveal", "typewriter", "morphIn",
]

SCENE_JSON_SCHEMA_DESCRIPTION = """
Scene JSON schema (the Director outputs this):

{
  "title": "string — lesson title",
  "theme": "light" | "dark",
  "totalDuration": number (seconds, 30-300),
  "scenes": [
    {
      "type": one of SCENE_TYPES,
      "duration": number (seconds for this scene),
      "narration": "string — what the voiceover says during this scene",
      "camera": {
        "type": one of CAMERA_TYPES,
        "focus": "semantic position like center, left-third, etc.",
        "intensity": number (0.0-1.0, how dramatic the move is),
        "duration": number (seconds, typically matches scene duration)
      },
      "beats": [
        { "time": number (seconds from scene start), "subtitle": "string" }
      ],
      "data": { /* scene-type-specific content — see below */ }
    }
  ]
}

SCENE TYPE DATA SCHEMAS:

Hero:
  { "title": "string", "subtitle": "string", "emphasis": "string (optional tagline)" }

FlowDiagram:
  { "title": "string", "steps": [{"label": "string", "description": "optional"}], "direction": "horizontal"|"vertical" }

Timeline:
  { "title": "string", "events": [{"time": "string (label)", "label": "string", "description": "optional"}], "orientation": "horizontal"|"vertical" }

Mechanism:
  { "title": "string", "parts": [{"label": "string", "description": "string", "position": "semantic"}], "connections": [{"from": "label", "to": "label", "label": "optional"}] }

CrossSection:
  { "title": "string", "layers": [{"label": "string", "description": "string", "depth": number}], "cutaway": "optional description" }

Journey:
  { "title": "string", "steps": [{"label": "string", "description": "optional", "icon": "optional"}], "progress": number (0-100, starting progress) }

Comparison:
  { "title": "string", "left": {"heading": "string", "items": ["string"]}, "right": {"heading": "string", "items": ["string"]} }

Graph:
  { "title": "string", "chartType": "bar"|"pie"|"line", "data": [{"label": "string", "value": number}], "unit": "string" }

Equation:
  { "title": "string", "equation": "string", "steps": [{"label": "string", "expression": "string"}], "result": "string" }

Summary:
  { "title": "string", "takeaways": [{"label": "string", "description": "string"}] }
"""

DIRECTOR_SYSTEM_PROMPT = f"""You are the Director AI for Athena, an educational animation platform.

Your job: read a lesson explanation and produce a Scene JSON that describes HOW to teach it visually.

RULES:
1. Output ONLY valid JSON. No markdown, no code fences, no explanations.
2. Think like a motion graphics director — what should the viewer SEE at each moment?
3. Describe INTENT, not pixels. Use semantic positions (center, left, right, top-left, etc.).
4. The RENDERER handles all visual quality: colors, typography, spacing, easing, camera.
5. Every scene understandable within 3 seconds.
6. Each scene communicates ONE key idea. Don't overcrowd.
7. Use 4-6 scenes for a typical lesson.
8. Each scene needs: narration, beats with subtitles, camera.

SCENE TYPES: Hero, FlowDiagram, Timeline, Mechanism, CrossSection, Comparison, Summary

CAMERA: static, pushIn, pullOut, pan, orbit, zoom

THEME: "light" for most topics. "dark" ONLY for astronomy/space/quantum physics.

DURATION: Total MUST be 60-180 seconds. Each scene 10-25 seconds.

BEATS: At least 2 per scene. 2-5 seconds apart. One clear sentence each.

NARRATION: Speak to a student. Clear, concise. ~2.5 words per second.

SCENE DATA SCHEMAS:

Hero: {{"title":"string","subtitle":"string"}}
FlowDiagram: {{"title":"string","steps":[{{"label":"string","description":"string"}}],"direction":"horizontal"|"vertical"}}
Timeline: {{"title":"string","events":[{{"time":"string","label":"string"}}],"orientation":"horizontal"|"vertical"}}
Mechanism: {{"title":"string","parts":[{{"label":"string","description":"string","position":"center|left|right|top|bottom"}}],"connections":[{{"from":"label","to":"label","label":"string"}}]}}
CrossSection: {{"title":"string","layers":[{{"label":"string","description":"string","depth":1}}]}}
Comparison: {{"title":"string","left":{{"heading":"string","items":["string"]}},"right":{{"heading":"string","items":["string"]}}}}
Summary: {{"title":"string","takeaways":[{{"label":"string","description":"string"}}]}}

OUTPUT FORMAT — return ONLY this JSON structure:
{{
  "title": "lesson title",
  "theme": "light" or "dark",
  "scenes": [
    {{
      "type": "scene type from list above",
      "duration": number in seconds,
      "narration": "what the voiceover says",
      "camera": {{"type": "camera type", "focus": "position", "intensity": 0.1-0.5}},
      "beats": [{{"time": number, "subtitle": "one sentence"}}],
      "data": {{ scene-type-specific data from schemas above }}
    }}
  ]
}}
"""


def _extract_json(raw: str) -> dict:
    """Extract JSON from LLM output, handling markdown fences and trailing text."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r'^```[a-zA-Z]*\n?', '', cleaned)
        cleaned = re.sub(r'\n?```$', '', cleaned).strip()
    json_match = re.search(r'\{.*\}', cleaned, re.DOTALL)
    if json_match:
        cleaned = json_match.group(0)
    return json.loads(cleaned)


def _validate_scene_json(data: dict) -> str | None:
    """Validate Scene JSON structure. Returns error message or None if valid."""
    if not isinstance(data, dict):
        return "Root must be a JSON object"
    if "scenes" not in data or not isinstance(data["scenes"], list):
        return "Missing or invalid 'scenes' array"
    if len(data["scenes"]) == 0:
        return "scenes array is empty"
    if len(data["scenes"]) > 10:
        return "Too many scenes (max 10)"

    valid_types = set(SCENE_TYPES)
    for i, scene in enumerate(data["scenes"]):
        if "type" not in scene:
            return f"Scene {i}: missing 'type'"
        if scene["type"] not in valid_types:
            return f"Scene {i}: invalid type '{scene['type']}'. Must be one of: {', '.join(sorted(valid_types))}"
        if "duration" not in scene:
            return f"Scene {i}: missing 'duration'"
        try:
            dur = int(scene["duration"])
            if dur < 3 or dur > 60:
                return f"Scene {i}: duration must be 3-60 seconds, got {dur}"
        except (ValueError, TypeError):
            return f"Scene {i}: duration must be a number, got '{scene['duration']}'"
        if "narration" not in scene or not scene["narration"]:
            return f"Scene {i}: missing 'narration'"
        if "beats" not in scene or not isinstance(scene["beats"], list) or len(scene["beats"]) < 1:
            return f"Scene {i}: must have at least 1 beat marker"
        if "data" not in scene or not isinstance(scene["data"], dict):
            return f"Scene {i}: missing 'data' object"
        if "camera" in scene and isinstance(scene["camera"], dict):
            cam_type = scene["camera"].get("type", "static")
            if cam_type not in CAMERA_TYPES:
                return f"Scene {i}: invalid camera type '{cam_type}'"

    return None

VISUAL_SYSTEM_PROMPT = """You are a creative coding expert making animated, educational scenes.

Write the BODY of a JavaScript function that draws ONE animated lesson scene. Your code runs
inside a sandboxed iframe with these globals ALREADY available (do NOT import or redefine them):
- `rough`   : Rough.js (hand-drawn style). `rc` is a ready rough.canvas(board).
- `p5`      : p5.js constructor for animation loops.
- `anime`   : Anime.js — value-based animations with easing.
- `gsap`    : GSAP 3 — timeline-based tweening.
- `board`   : a <canvas> element, exactly 1600x900.
- `ctx`     : board.getContext('2d').
- `rc`      : rough.canvas(board).

STYLE — make it visually rich, colorful, and dynamic:
- Use `gsap.timeline()` for sequenced reveals with staggered timing.
- Use `anime({...})` for counters, progress bars, morphing values.
- Use `requestAnimationFrame` for continuous motion (particles, rotations, orbits).
- Use `rc` for sketchy shapes (circles, arrows, boxes, lines).
- Use `ctx` for bold text labels.
- Make it MOVING — not static. At least 3 different animations staggered in time.
- Use bright colors on dark background: #14b8a6 (teal), #f59e0b (amber), #ef4444 (red), #3b82f6 (blue), #8b5cf6 (purple), #ffffff (text).

RULES:
- CANVAS: 1600x900. Use the FULL canvas area.
- TITLE at top-left (x=80, y=70, font bold 48px).
- MAIN CONTENT: fill the center with animated diagrams/visualizations.
- Background: #0f172a (dark navy).
- At least 3 staggered animations using gsap or anime or requestAnimationFrame.
- Use ONLY provided globals. No imports, no fetch, no external URLs.
- Do NOT wrap in a function or include <script> tags.
- Keep under ~150 lines.
- DO NOT draw subtitle/caption text at the bottom of the canvas — the player has its own subtitle overlay.
- Return ONLY raw JavaScript statements.

EXAMPLE (animated diagram with motion):
ctx.font = "bold 48px Inter, sans-serif"; ctx.fillStyle = "#ffffff";
ctx.fillText("Photosynthesis", 80, 70);
rc.line(80, 88, 480, 88, { stroke: '#14b8a6', strokeWidth: 3 });

// Sun with pulsing glow
var sunScale = {val: 1};
rc.circle(300, 350, 200, { fill: '#f59e0b30', stroke: '#f59e0b', strokeWidth: 2, roughness: 1.5 });
ctx.font = "bold 28px Inter"; ctx.fillStyle = "#f59e0b"; ctx.fillText("☀ Sun", 255, 360);
anime({ targets: sunScale, val: [1, 1.15, 1], duration: 2000, loop: true, easing: 'easeInOutQuad',
  update: function() { /* pulse effect */ }
});

// Animated arrows with stagger
var arrows = [
  {x1:450, y1:350, x2:650, y2:250, label:"Light Energy", color:"#f59e0b"},
  {x1:700, y1:250, x2:1000, y2:250, label:"Chlorophyll", color:"#22c55e"},
  {x1:1050, y1:300, x2:1050, y2:500, label:"Glucose", color:"#14b8a6"},
];
arrows.forEach(function(a, i) {
  var lineProgress = {val: 0};
  anime({ targets: lineProgress, val: 1, duration: 1000, delay: i * 500, easing: 'easeOutQuad',
    update: function() {
      var cx = a.x1 + (a.x2 - a.x1) * lineProgress.val;
      var cy = a.y1 + (a.y2 - a.y1) * lineProgress.val;
      rc.line(a.x1, a.y1, cx, cy, { stroke: a.color, strokeWidth: 3 });
      if (lineProgress.val >= 0.9) {
        ctx.font = "bold 22px Inter"; ctx.fillStyle = "#ffffff";
        ctx.fillText(a.label, a.x2 + 10, a.y2 + 8);
      }
    }
  });
});

// Rotating leaf
var leafAngle = 0;
function drawLeaf() {
  ctx.save();
  ctx.translate(800, 400);
  ctx.rotate(leafAngle);
  rc.ellipse(0, 0, 120, 60, { fill: '#22c55e40', stroke: '#22c55e', roughness: 1 });
  ctx.restore();
  leafAngle += 0.02;
  requestAnimationFrame(drawLeaf);
}
drawLeaf();

rc.rectangle(80, 750, 1440, 80, { fill: '#14b8a610', stroke: '#14b8a6', roughness: 1 });
ctx.font = "20px Inter"; ctx.fillStyle = "#94a3b8";
ctx.fillText("Key: Plants capture sunlight and convert it to chemical energy", 120, 795);
"""


def _sanitize(code: str) -> str:
    code = code.strip()
    if code.startswith("```"):
        code = re.sub(r'^```[a-zA-Z]*\n?', '', code)
        code = re.sub(r'\n?```$', '', code).strip()
    code = re.sub(r'^(js|javascript)\s*\n', '', code, flags=re.IGNORECASE)
    return code


def _validation_error(code: str) -> str | None:
    lowered = code.lower()
    forbidden = ["import ", "def ", "class ", "self.", "manim", "numpy", "fetch(", "xmlhttprequest", "websocket", "localstorage", "sessionstorage", "document.cookie", "window.parent", "window.top", "eval("]
    match = next((item for item in forbidden if item in lowered), None)
    if match:
        return f"Forbidden API or syntax: {match.strip()}"
    good = ["ctx.", "rc.", "setTimeout", "fillText", "anime(", "gsap.", "requestAnimationFrame"]
    if not any(item in code for item in good):
        return "The program does not draw or animate anything"
    if len(code) < 180:
        return "The program is too short to be a meaningful scene"
    return None


def _is_js(code: str) -> bool:
    return _validation_error(code) is None


def _fallback(topic: str = "") -> str:
    t = (topic or "Topic")[:30].replace('"', '\\"')
    return f'''
ctx.font = "bold 52px Inter, sans-serif"; ctx.fillStyle = "#ffffff";
ctx.fillText("{t}", 80, 70);
rc.line(80, 88, 700, 88, {{ stroke: '#14b8a6', strokeWidth: 3, roughness: 1 }});

rc.circle(400, 400, 250, {{ fill: '#14b8a620', stroke: '#14b8a6', roughness: 2 }});
ctx.font = "bold 36px Inter, sans-serif"; ctx.fillStyle = "#14b8a6";
ctx.fillText("{t}", 280, 410);

var items = ["Step 1: Concept", "Step 2: Process", "Step 3: Result"];
items.forEach(function(item, i) {{
  setTimeout(function() {{
    rc.rectangle(800, 180 + i * 120, 500, 80, {{ fill: '#d9770615', stroke: '#d97706', roughness: 1 }});
    ctx.font = "bold 24px Inter, sans-serif"; ctx.fillStyle = "#ffffff";
    ctx.fillText(item, 830, 230 + i * 120);
  }}, i * 600);
}});

rc.rectangle(80, 720, 1440, 100, {{ fill: '#14b8a610', stroke: '#14b8a6', roughness: 1 }});
ctx.font = "22px Inter, sans-serif"; ctx.fillStyle = "#94a3b8";
ctx.fillText("Key concept explanation", 120, 780);
'''


async def generate_step_visual(ctx: AgentContext, step: LessonStep) -> str:
    if not step.visual_script:
        return _fallback(ctx.topic)

    messages = [
        {"role": "system", "content": VISUAL_SYSTEM_PROMPT},
        {"role": "user", "content": (
            f"Topic: {ctx.topic}\n"
            f"Step {step.step_id} of {ctx.total_steps}\n"
            f"Visual Script:\n{step.visual_script}"
        )},
    ]

    try:
        code = await llm_chat(messages=messages, model="google/gemini-2.5-flash",
                             temperature=0.5, max_tokens=2000,
                             agent="visual_generator", session_id=ctx.session_id)
        program = _sanitize(code)
        return program if _is_js(program) else _fallback(ctx.topic)
    except Exception as e:
        logger.warning(f"Visual gen failed step {step.step_id}: {e}")
        return _fallback(ctx.topic)


def _estimate_duration(storyboard: dict) -> int:
    """Estimate animation duration in seconds based on beats."""
    beats = storyboard.get("beats", [])
    if beats and isinstance(beats, list) and len(beats) > 0:
        last_beat = beats[-1]
        if isinstance(last_beat, dict) and "time" in last_beat:
            try:
                t = last_beat.get("time", 14)
                if isinstance(t, str) and ":" in t:
                    parts = t.split(":")
                    t = int(parts[0]) * 60 + int(parts[1])
                return int(t) + 2
            except (ValueError, TypeError):
                pass
    dur = storyboard.get("duration", 15)
    try:
        if isinstance(dur, str) and ":" in dur:
            parts = dur.split(":")
            dur = int(parts[0]) * 60 + int(parts[1])
        return max(8, min(30, int(dur)))
    except (ValueError, TypeError):
        return 15


async def generate_chat_visual(topic: str, description: str, session_id: str = "", part: int = 1, total_parts: int = 1) -> dict:
    """Plan, code, and validate a topic-specific canvas animation with multi-part support."""
    part_suffix = f"\n[PART {part} OF {total_parts}]" if total_parts > 1 else ""
    plan_prompt = [
        {"role": "system", "content": "Return compact JSON only: title, caption (2 sentences), duration (10-20 seconds), visual_style, and 3-5 timed beats with action, objects, camera, and subtitle fields."},
        {"role": "user", "content": f"Topic: {topic}\nContext: {description[:500]}{part_suffix}\n\nRETURN ONLY VALID JSON."}
    ]
    plan_raw = await llm_chat(messages=plan_prompt, model=settings.OPENROUTER_VISUAL_PLANNER_MODEL, temperature=0.35, max_tokens=1000, agent="visual_planner", session_id=session_id)
    # Extract JSON robustly using regex if there's markdown wrapping or trailing text
    import re
    json_match = re.search(r"(\{.*\})", plan_raw, re.DOTALL)
    cleaned_plan = json_match.group(1) if json_match else plan_raw.strip()
    try:
        plan = json.loads(cleaned_plan)
    except json.JSONDecodeError as exc:
        raise ValueError("The animation storyboard could not be parsed") from exc

    # Validate and fix duration
    duration = _estimate_duration(plan)
    plan["duration"] = max(8, min(30, duration))

    messages = [
        {"role": "system", "content": VISUAL_SYSTEM_PROMPT},
        {"role": "user", "content": f"Exact request: {topic}{part_suffix}\nStoryboard JSON: {json.dumps(plan)}\nCreate a topic-specific animated scene. Do not substitute another topic. Use requestAnimationFrame or GSAP for continuous motion and fill the full canvas. SYNC beats with narration."}
    ]
    feedback = ""
    for attempt in range(2):
        request = messages if not feedback else messages + [{"role": "user", "content": f"The previous program failed validation: {feedback}. Rewrite it as safe raw JavaScript only."}]
        code = await llm_chat(messages=request, model=settings.OPENROUTER_VISUAL_GENERATOR_MODEL, temperature=0.45, max_tokens=3000, agent="visual_generator", session_id=session_id)
        program = _sanitize(code)
        feedback = _validation_error(program) or ""
        if not feedback:
            # Generate TTS audio for animation narration
            audio_base64 = None
            narration = str(plan.get("caption", description[:220]))
            if narration:
                try:
                    from backend.services.tts import text_to_speech_base64
                    audio_base64 = await text_to_speech_base64(narration, language="en-IN")
                except Exception as e:
                    logger.warning(f"TTS generation failed: {e}")
            
            return {
                "type": "js_scene",
                "code": program,
                "plan": plan,
                "topic": topic,
                "caption": narration,
                "duration": plan["duration"],
                "beats": plan.get("beats", []),
                "audio_base64": audio_base64,
                "part": part,
                "total_parts": total_parts,
            }
    raise ValueError(f"Generated animation was unsafe or invalid: {feedback}")


async def generate_multipart_animations(topic: str, full_explanation: str, session_id: str = "") -> dict:
    """Intelligently split long animations into parts and generate them with pre-fetching."""
    # Estimate total duration from explanation length
    estimated_minutes = max(1, len(full_explanation.split()) // 150)

    if estimated_minutes <= 3:
        # Single animation
        animation = await generate_chat_visual(topic, full_explanation, session_id, part=1, total_parts=1)
        return {
            "type": "multipart",
            "parts": [animation],
            "total_parts": 1,
            "total_duration": animation["duration"],
        }

    elif estimated_minutes <= 5:
        # Two parts: generate part 1, queue part 2
        part1 = await generate_chat_visual(topic, full_explanation, session_id, part=1, total_parts=2)
        # Queue part 2 in background (don't await yet)
        part2_task = asyncio.create_task(generate_chat_visual(topic, full_explanation, session_id, part=2, total_parts=2))

        return {
            "type": "multipart",
            "parts": [part1],
            "queued_parts": [{"task": part2_task, "part_num": 2}],
            "total_parts": 2,
            "total_duration": part1["duration"],  # Will add part 2 duration when ready
        }

    else:
        # Three parts: generate part 1, queue parts 2 and 3
        part1 = await generate_chat_visual(topic, full_explanation, session_id, part=1, total_parts=3)
        part2_task = asyncio.create_task(generate_chat_visual(topic, full_explanation, session_id, part=2, total_parts=3))
        part3_task = asyncio.create_task(generate_chat_visual(topic, full_explanation, session_id, part=3, total_parts=3))

        return {
            "type": "multipart",
            "parts": [part1],
            "queued_parts": [{"task": part2_task, "part_num": 2}, {"task": part3_task, "part_num": 3}],
            "total_parts": 3,
            "total_duration": part1["duration"],
        }


# ─── NEW: Scene JSON Pipeline (V2 Architecture) ──────────────────────
# The Director AI outputs Scene JSON. The frontend renderer reads it
# and produces cinematic animation. No LLM-generated JS code.

async def generate_scene_json(
    topic: str,
    explanation: str,
    session_id: str = "",
) -> dict:
    """
    Single-call pipeline: Director reads explanation → outputs Scene JSON.

    Returns dict with:
      - "scene_json": the validated Scene JSON (dict)
      - "total_duration": total animation duration in seconds
      - "narration": combined narration text for TTS
      - "beats": flattened beat list for subtitle sync
    """
    messages = [
        {"role": "system", "content": DIRECTOR_SYSTEM_PROMPT},
        {"role": "user", "content": (
            f"Topic: {topic}\n\n"
            f"Lesson explanation to visualize:\n{explanation[:2000]}\n\n"
            f"Produce the Scene JSON for this lesson. "
            f"Total duration should match the explanation length "
            f"(roughly 2.5 words per second of narration)."
        )},
    ]

    max_attempts = 2
    last_error = None

    for attempt in range(max_attempts):
        try:
            raw = await asyncio.wait_for(
                llm_chat(
                    messages=messages,
                    model=settings.OPENROUTER_DIRECTOR_MODEL,
                    temperature=0.4,
                    max_tokens=4000,
                    agent="director",
                    session_id=session_id,
                ),
                timeout=60.0,
            )

            scene_json = _extract_json(raw)
            validation_error = _validate_scene_json(scene_json)
            if validation_error:
                last_error = validation_error
                messages.append({"role": "user", "content": (
                    f"Your JSON had an error: {validation_error}\n"
                    f"Fix it and return valid Scene JSON only."
                )})
                continue

            # Extract combined narration and beats
            all_narrations = []
            all_beats = []
            time_offset = 0
            for scene in scene_json["scenes"]:
                all_narrations.append(scene.get("narration", ""))
                for beat in scene.get("beats", []):
                    all_beats.append({
                        "time": beat.get("time", 0) + time_offset,
                        "subtitle": beat.get("subtitle", ""),
                    })
                time_offset += scene.get("duration", 10)

            total_duration = sum(s.get("duration", 10) for s in scene_json["scenes"])

            return {
                "scene_json": scene_json,
                "total_duration": total_duration,
                "narration": " ".join(all_narrations),
                "beats": all_beats,
            }

        except json.JSONDecodeError as e:
            last_error = f"JSON parse error: {e}"
            messages.append({"role": "user", "content": (
                f"Your output was not valid JSON: {e}\n"
                f"Return ONLY a valid JSON object, no markdown fences."
            )})
        except asyncio.TimeoutError:
            last_error = "Director timed out after 60s"
            logger.warning(f"Director attempt {attempt + 1} timed out")
            break
        except Exception as e:
            last_error = str(e)
            logger.warning(f"Director attempt {attempt + 1} failed: {e}")
            break

    # All attempts failed — generate a simple fallback scene
    logger.warning(f"Director failed, using fallback scene: {last_error}")
    return {
        "scene_json": {
            "title": topic[:50],
            "theme": "light",
            "scenes": [{
                "type": "Hero",
                "duration": max(60, len(explanation.split()) // 3),
                "narration": explanation[:500],
                "camera": {"type": "static", "focus": "center", "intensity": 0.1},
                "beats": [{"time": 0, "subtitle": explanation[:100]}],
                "data": {"title": topic[:50], "subtitle": "Visual explanation"}
            }],
        },
        "total_duration": max(60, len(explanation.split()) // 3),
        "narration": explanation[:500],
        "beats": [{"time": 0, "subtitle": explanation[:100]}],
    }

    # All attempts failed — fallback scene returned above
