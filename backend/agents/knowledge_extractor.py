"""
Agent 2: Knowledge Extractor
Uses GLM-5.2 to extract concepts, relationships, and metadata from raw content.
"""
from __future__ import annotations

from backend.dag.context import AgentContext
from backend.services.llm import llm_json


EXTRACTOR_SYSTEM_PROMPT = """You are an expert educational content analyst for Indian K-12 students.
Given raw document content, extract:
1. Main topic and subtopics
2. Key concepts (with brief definitions)
3. Relationships between concepts
4. Difficulty level (easy/medium/hard for the given class)
5. Key facts, formulas, or definitions to teach
6. Visual concepts that would benefit from diagrams/animations

Output valid JSON with this structure:
{
  "topic": "string",
  "subtopics": ["string"],
  "concepts": [{"name": "string", "definition": "string", "importance": "high|medium|low"}],
  "relationships": [{"from": "string", "to": "string", "type": "depends_on|related_to|part_of"}],
  "difficulty": "easy|medium|hard",
  "key_facts": ["string"],
  "visual_concepts": ["string"],
  "suggested_flow": ["string"]
}"""


async def extract_knowledge(ctx: AgentContext) -> AgentContext:
    """Extract knowledge graph from the analyzed document content."""
    # Combine all text blocks into one content string
    full_text = "\n\n".join(
        block["content"] for block in ctx.extracted_blocks
        if block["type"] == "text"
    )

    if not full_text.strip():
        return ctx

    # Truncate if too long (leave room for response in 1M context)
    if len(full_text) > 100_000:
        full_text = full_text[:100_000] + "\n\n[Content truncated...]"

    messages = [
        {"role": "system", "content": EXTRACTOR_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Student Class Level: {ctx.student_class}\n\nDocument Content:\n{full_text}",
        },
    ]

    result = await llm_json(messages=messages, temperature=0.3, agent="knowledge_extractor", session_id=ctx.session_id)

    ctx.knowledge_graph = result
    ctx.topic = result.get("topic", "Untitled Topic")
    ctx.difficulty = result.get("difficulty", "medium")

    return ctx
