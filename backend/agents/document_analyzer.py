"""
Agent 1: Document Analyzer
Extracts and structures content from uploaded files.
"""
from __future__ import annotations

from backend.dag.context import AgentContext, SessionStatus
from backend.services.file_processor import extract_content


async def analyze_document(ctx: AgentContext) -> AgentContext:
    """Parse the uploaded document and populate extracted_blocks."""
    ctx.status = SessionStatus.PROCESSING

    if ctx.raw_file_path:
        blocks = extract_content(ctx.raw_file_path, ctx.file_type)
        ctx.extracted_blocks = blocks
    elif ctx.user_question:
        # Direct question — no file to parse
        ctx.extracted_blocks = [{
            "type": "text",
            "content": ctx.user_question,
            "page": 1,
        }]
    else:
        ctx.error = "No content provided"
        return ctx

    return ctx
