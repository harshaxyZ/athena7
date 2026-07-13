"""
Agent 6: Q&A Content Preparer (runs in PARALLEL) + Doubt Handler
- prepare_qa_content: Pre-generates Q&A pairs for the lesson
- handle_doubt: Answers a student's doubt during a session
"""
from __future__ import annotations

from backend.dag.context import AgentContext
from backend.services.llm import llm_chat

QA_SYSTEM_PROMPT = """You are a friendly Indian school teacher preparing for student questions.
Given a lesson plan, generate:
1. Anticipated questions students might ask at each step
2. Clear, age-appropriate answers
3. Common misconceptions to address

Output valid JSON:
{
  "qa_pairs": [
    {
      "question": "string",
      "answer": "string",
      "related_step": number,
      "difficulty": "easy|medium|hard"
    }
  ],
  "anticipated_doubts": ["string"],
  "misconceptions": ["string"]
}"""

DOUBT_SYSTEM_PROMPT = """You are a friendly, patient AI teacher helping a {class_level} class student.

The student is currently in a lesson about: {topic}
The lesson is at step {step} of {total}.

The student asks: "{question}"

Answer their doubt:
- Be encouraging and positive
- Use simple language appropriate for their age
- Give a concrete example if possible
- If the doubt is off-topic, gently redirect to the lesson
- Keep it brief (2-4 sentences) so the lesson can continue
- Respond in the same language as the student's question

Return ONLY your answer text, no JSON or formatting."""


async def prepare_qa_content(ctx: AgentContext) -> AgentContext:
    """Pre-generate Q&A pairs and anticipated doubts for the lesson."""
    import json

    lesson_summary = "\n".join(
        f"Step {s.step_id}: {s.visual_script[:100]}..."
        for s in ctx.lesson_steps
    )

    messages = [
        {"role": "system", "content": QA_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Topic: {ctx.topic}\n"
                f"Class Level: {ctx.student_class}\n"
                f"Difficulty: {ctx.difficulty}\n\n"
                f"Lesson Steps:\n{lesson_summary}"
            ),
        },
    ]

    result = await llm_chat(messages=messages, temperature=0.4)
    try:
        parsed = json.loads(result)
        ctx.qa_pairs = parsed.get("qa_pairs", [])
        ctx.anticipated_doubts = parsed.get("anticipated_doubts", [])
    except json.JSONDecodeError:
        ctx.qa_pairs = []
        ctx.anticipated_doubts = []

    return ctx


async def handle_doubt(ctx: AgentContext) -> AgentContext:
    """Handle a student's real-time doubt during a teaching session."""
    class_map = {1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th",
                 6: "6th", 7: "7th", 8: "8th", 9: "9th", 10: "10th",
                 11: "11th", 12: "12th"}
    class_level = class_map.get(ctx.student_class, f"{ctx.student_class}th")

    # Determine current step
    current_step = ctx.total_steps // 2  # default to middle
    for step in ctx.lesson_steps:
        if not ctx.visual_html_map.get(step.step_id):
            current_step = step.step_id
            break

    messages = [
        {
            "role": "user",
            "content": DOUBT_SYSTEM_PROMPT.format(
                class_level=class_level,
                topic=ctx.topic,
                step=current_step,
                total=ctx.total_steps,
                question=ctx.user_question,
            ),
        },
    ]

    answer = await llm_chat(messages=messages, temperature=0.5, max_tokens=500)

    # Store the answer for the SSE stream
    ctx.knowledge_graph["doubt_answer"] = answer

    return ctx
