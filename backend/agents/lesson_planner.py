"""
Agent 3: Lesson Planner
Creates a structured lesson with steps, each having visual + speech scripts.
"""
from __future__ import annotations

from backend.dag.context import AgentContext, LessonStep
from backend.services.llm import llm_json

PLANNER_SYSTEM_PROMPT = """You are an expert Indian school teacher creating a rich, in-depth lesson plan.
Given a knowledge graph and student class level, create a thorough step-by-step lesson.

Each step must have:
1. A VISUAL SCRIPT — detailed stage directions for what appears on the canvas
   - Describe specific shapes, SVG diagrams, labels, arrows, colors, and reveal animations
   - Each step's visual should be substantial: a full diagram, worked example, or concept map — not a single line of text
   - Build visuals that genuinely help a student SEE the concept
2. A SPEECH SCRIPT — what the teacher says while the visual is shown
   - Conversational, friendly, age-appropriate; explain the "why", not just the "what"
   - Use analogies and concrete examples relevant to Indian students
   - Include encouraging phrases and quick check-in questions
   - Aim for 3-6 sentences per step so the explanation has real depth
3. AVATAR GESTURE — what the animated teacher avatar does:
   - "explain" — normal talking gestures
   - "point" — pointing at the visual
   - "think" — thinking/explaining a concept
   - "celebrate" — celebrating when student gets it right
   - "wave" — greeting/waving

Length — SCALE TO THE CONTENT, do not pad or truncate:
- The number of steps must match how much there actually is to teach. Let the material decide.
- A one-line question or tiny topic → a short lesson (as few as 2-4 steps). Do NOT stretch it.
- A single concept → a focused lesson (~4-7 steps).
- A full chapter or many concepts → a long lesson (12-20+ steps). Do NOT compress it.
- Give each distinct concept, fact, formula, and worked example from the knowledge graph its own step(s).
  If there are 3 concepts, don't invent 12 steps; if there are 15, don't cram them into 8.

Structure (include only the parts the content warrants):
- greeting → (hook/motivation) → build each concept incrementally with its own worked example →
  connect concepts → (practice/application) → (common-mistake) → recap/summary → close.
- Cover EVERY key concept and fact from the knowledge graph; do not skip subtopics.
- Progress from simple to advanced so understanding compounds.

Output valid JSON:
{
  "lesson_title": "string",
  "total_steps": number,
  "steps": [
    {
      "step_id": 1,
      "visual_script": "string (detailed description for HTML generation)",
      "speech_script": "string (what teacher says — 3-6 sentences)",
      "avatar_gesture": "explain|point|think|celebrate|wave",
      "duration_estimate": number (seconds)
    }
  ]
}"""


async def plan_lesson(ctx: AgentContext) -> AgentContext:
    """Generate a structured lesson plan from the knowledge graph."""
    import json

    kg_json = json.dumps(ctx.knowledge_graph, ensure_ascii=False, indent=2)

    messages = [
        {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Student Class Level: {ctx.student_class}\n"
                f"Preferred Language: {ctx.language}\n"
                f"Knowledge Graph:\n{kg_json}"
            ),
        },
    ]

    result = await llm_json(messages=messages, temperature=0.5, agent="lesson_planner", session_id=ctx.session_id)

    # Parse into LessonStep objects
    steps_data = result.get("steps", [])
    ctx.lesson_steps = [
        LessonStep(
            step_id=step.get("step_id", i + 1),
            visual_script=step.get("visual_script", ""),
            speech_script=step.get("speech_script", ""),
            avatar_gesture=step.get("avatar_gesture", "explain"),
            duration_estimate=step.get("duration_estimate", 15),
        )
        for i, step in enumerate(steps_data)
    ]
    ctx.total_steps = len(ctx.lesson_steps)

    return ctx
