"""
Visual Generator — produces browser JavaScript for canvas animation.

Restored from original Vidya codebase with Gemini Flash for speed.
Produces rich, animated educational scenes with rough.js/GSAP/p5.js.
"""
from __future__ import annotations

import json
import logging
import re

from backend.dag.context import AgentContext, LessonStep
from backend.services.llm import llm_chat

logger = logging.getLogger("agents.visual_generator")

VISUAL_SYSTEM_PROMPT = """You are a creative coding expert making animated, hand-drawn educational scenes.

Write the BODY of a JavaScript function that draws ONE lesson scene. Your code runs
inside a sandboxed iframe with these globals ALREADY available (do NOT import or redefine them):
- `rough`   : Rough.js (hand-drawn/sketchy style). `rc` is a ready rough.canvas(board).
- `p5`      : p5.js constructor for animation loops.
- `fabric`  : Fabric.js for laid-out object scenes.
- `paper`   : Paper.js — vector graphics on the canvas. Call `paper.view.update()` after drawing.
- `anime`   : Anime.js — timeline-based DOM/CSS animations. Use `anime({...})` to animate
              elements, values, or SVG attributes with easing and staggering.
- `gsap`    : GSAP 3 — the most robust animation engine. Tween any JS object's values and
              repaint the canvas in the onUpdate callback.
- `board`   : a <canvas> element, exactly 1600x900.
- `ctx`     : board.getContext('2d').
- `rc`      : rough.canvas(board) — use for sketchy shapes.
- `stage`   : the container <div> (1600x900) holding the canvas.

STYLE — make it look like an inspiring teacher sketching on a whiteboard:
- PREFER rough.js (`rc`) for diagrams, arrows, boxes, circles, underlines — it gives the
  hand-drawn look. e.g. rc.rectangle(x,y,w,h,{stroke:'#14b8a6',roughness:2});
  rc.line(x1,y1,x2,y2,{stroke:'#ffffff'}); rc.circle(cx,cy,d,{fill:'#d9770640',fillStyle:'hachure'});
- Use `ctx` for text: set ctx.font (e.g. "bold 40px Inter, sans-serif"), ctx.fillStyle, ctx.fillText(...).
- Use `new p5(function(p){ p.setup=...; p.draw=...; }, stage)` ONLY when motion genuinely helps
  (e.g. a moving particle, a growing bar, orbital motion). Size the p5 canvas to 1600x900.
- Use `anime` for value-based animations — counters, progress bars, staggered reveals.
  Example: anime({ targets: obj, val: 100, duration: 2000, easing: 'easeInOutQuad',
  update: function() { ctx.fillText(Math.round(obj.val), 400, 300); } });
- Use `gsap` for smooth sequenced reveals and timelines.
  Example: gsap.timeline().to(obj1, {opacity:1, duration:0.5}).to(obj2, {opacity:1, duration:0.5});

RULES — the program MUST run without throwing:
- CANVAS SIZE: 1600 wide x 900 tall. ALL coordinates must use this full range.
- CRITICAL: Content MUST start at y=70 (the title). Do NOT push content down to y=300+.
- HARD LAYOUT RULE:
  1. TITLE: x=80, y=70, font="bold 52px Inter" — ALWAYS start here
  2. UNDERLINE: rc.line(80, 88, 80 + title_width, 88, ...)
  3. MAIN CONTENT: fill x=80 to x=1500, y=120 to y=650
     - Left half (x=80 to x=760): diagrams, illustrations
     - Right half (x=800 to x=1500): labels, explanations
  4. BOTTOM SUMMARY: x=80, y=720 to y=850 — key takeaway
- NEVER use y > 850 or x > 1500
- NEVER leave the right half or bottom area empty
- Background is dark (#1a1a2e) — use white (#ffffff) for text, bright colors for shapes
- Text sizes: titles 48-52px, body 28-36px, labels 24-28px
- Colors: #14b8a6 (teal), #d97706 (amber), #059669 (green), #ef4444 (red), #ffffff (text)
- Animate with setTimeout for staggered reveals so it feels like drawing step by step
- Use ONLY provided globals. No imports, no fetch, no external URLs.
- Do NOT wrap in a function, do NOT include <script> tags, do NOT output HTML or markdown.
- BE CONCISE: keep under ~120 lines.

Return ONLY raw JavaScript statements. Nothing else.

EXAMPLE 1 (sketchy diagram with animation):
// TITLE
ctx.font = "bold 52px Inter, sans-serif"; ctx.fillStyle = "#ffffff";
ctx.fillText("Water Cycle", 80, 70);
rc.line(80, 88, 430, 88, { stroke: '#14b8a6', strokeWidth: 3, roughness: 1 });

// LEFT — Sun + evaporation
rc.circle(340, 400, 260, { fill: '#d9770640', fillStyle: 'solid', stroke: '#d97706', roughness: 2 });
ctx.font = "bold 36px Inter, sans-serif"; ctx.fillStyle = "#d97706"; ctx.fillText("Sun", 305, 410);

// Animated arrows (staggered)
var arrows = [
  {x1:520, y1:400, x2:680, y2:280, label:"Evaporation", color:"#14b8a6"},
  {x1:700, y1:250, x2:1000, y2:250, label:"Condensation", color:"#059669"},
  {x1:1100, y1:280, x2:1100, y2:500, label:"Rain", color:"#3b82f6"},
];
arrows.forEach(function(a, i) {
  setTimeout(function() {
    rc.line(a.x1, a.y1, a.x2, a.y2, { stroke: a.color, strokeWidth: 3, roughness: 1.5 });
    rc.rectangle(a.x2-80, a.y2-30, 160, 60, { fill: a.color+'20', stroke: a.color, roughness: 1 });
    ctx.font = "bold 24px Inter, sans-serif"; ctx.fillStyle = "#ffffff";
    ctx.fillText(a.label, a.x2-50, a.y2+8);
  }, i * 600);
});

// BOTTOM SUMMARY
rc.rectangle(80, 720, 1440, 100, { fill: '#14b8a610', stroke: '#14b8a6', roughness: 1 });
ctx.font = "22px Inter, sans-serif"; ctx.fillStyle = "#94a3b8";
ctx.fillText("Key: Water continuously moves between Earth and atmosphere", 120, 780);

EXAMPLE 2 (animated counter with anime.js):
ctx.font = "bold 52px Inter, sans-serif"; ctx.fillStyle = "#ffffff";
ctx.fillText("Photosynthesis", 80, 70);
rc.line(80, 88, 520, 88, { stroke: '#14b8a6', strokeWidth: 3 });

// Animated percentage counter
var counter = {val: 0};
anime({ targets: counter, val: 85, duration: 2500, easing: 'easeInOutQuad',
  update: function() {
    ctx.clearRect(80, 200, 400, 100);
    ctx.font = "bold 80px Inter, sans-serif"; ctx.fillStyle = "#d97706";
    ctx.fillText(Math.round(counter.val) + "%", 80, 290);
    ctx.font = "24px Inter, sans-serif"; ctx.fillStyle = "#94a3b8";
    ctx.fillText("Energy conversion efficiency", 80, 320);
  }
});

// Staggered concept boxes
var concepts = [
  {x:600, y:180, w:400, h:70, text:"Sunlight → Chemical Energy", color:"#d97706"},
  {x:600, y:280, w:400, h:70, text:"CO2 + H2O → Glucose + O2", color:"#14b8a6"},
  {x:600, y:380, w:400, h:70, text:"Chlorophyll captures light", color:"#059669"},
];
concepts.forEach(function(c, i) {
  setTimeout(function() {
    rc.rectangle(c.x, c.y, c.w, c.h, { fill: c.color+'15', stroke: c.color, roughness: 1 });
    ctx.font = "bold 22px Inter, sans-serif"; ctx.fillStyle = "#ffffff";
    ctx.fillText(c.text, c.x+20, c.y+45);
  }, 800 + i * 500);
});

rc.rectangle(80, 720, 1440, 100, { fill: '#14b8a610', stroke: '#14b8a6', roughness: 1 });
ctx.font = "22px Inter, sans-serif"; ctx.fillStyle = "#94a3b8";
ctx.fillText("Key: Plants convert sunlight into food using chlorophyll", 120, 780);
"""


def _sanitize(code: str) -> str:
    code = code.strip()
    if code.startswith("```"):
        code = re.sub(r'^```[a-zA-Z]*\n?', '', code)
        code = re.sub(r'\n?```$', '', code).strip()
    code = re.sub(r'^(js|javascript)\s*\n', '', code, flags=re.IGNORECASE)
    return code


def _is_js(code: str) -> bool:
    bad = ["import ", "from ", "def ", "class ", "self.", "manim", "numpy"]
    for b in bad:
        if b in code.lower():
            return False
    good = ["ctx.", "rc.", "setTimeout", "fillText", "fillStyle", "anime(", "gsap.", "rc.line", "rc.circle", "rc.rectangle"]
    return any(g in code for g in good)


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


async def generate_chat_visual(topic: str, description: str, session_id: str = "") -> str:
    messages = [
        {"role": "system", "content": VISUAL_SYSTEM_PROMPT},
        {"role": "user", "content": (
            f"Create a rich, animated educational scene for:\n"
            f"Topic: {topic}\n"
            f"Context: {description[:500]}\n\n"
            f"Use rough.js for hand-drawn shapes, setTimeout for staggered reveals, "
            f"anime.js for animated counters, and fill the ENTIRE canvas (1600x900)."
        )},
    ]

    try:
        code = await llm_chat(messages=messages, model="google/gemini-2.5-flash",
                             temperature=0.5, max_tokens=2000,
                             agent="visual_generator", session_id=session_id)
        program = _sanitize(code)
        if _is_js(program):
            return program

        # Retry with explicit JS-only instruction
        retry = messages + [{"role": "user", "content": (
            "Your previous output was NOT browser JavaScript. "
            "Output ONLY raw JavaScript statements using ctx, rc, anime, gsap. "
            "NOT Python. NOT manim. Example:\n"
            'ctx.font = "bold 52px Inter, sans-serif"; ctx.fillStyle = "#ffffff";\n'
            'ctx.fillText("Title", 80, 70);\n'
            'rc.line(80, 88, 400, 88, { stroke: "#14b8a6", strokeWidth: 3 });\n'
            'rc.circle(400, 400, 200, { fill: "#d9770640", stroke: "#d97706" });'
        )}]
        code2 = await llm_chat(messages=retry, model="google/gemini-2.5-flash",
                              temperature=0.4, max_tokens=2000,
                              agent="visual_generator", session_id=session_id)
        program2 = _sanitize(code2)
        return program2 if _is_js(program2) else _fallback(topic)
    except Exception as e:
        logger.warning(f"Chat visual failed: {e}")
        return _fallback(topic)
