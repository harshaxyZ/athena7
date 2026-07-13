"""
Document ingestion — extract text and structure from PDFs, images, and plain text.
"""
from __future__ import annotations

import logging
from pathlib import Path

import fitz  # PyMuPDF
import pdfplumber

logger = logging.getLogger("services.file_processor")


def extract_from_pdf(file_path: str) -> list[dict]:
    """
    Extract text blocks and images from a PDF file.
    Returns a list of content blocks: [{"type": "text"|"image", "content": ..., "page": ...}]
    """
    blocks = []

    # Extract text with pdfplumber (better text layout)
    try:
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if text and text.strip():
                    blocks.append({
                        "type": "text",
                        "content": text.strip(),
                        "page": page_num,
                    })
    except Exception as e:
        logger.warning(f"pdfplumber extraction failed: {e}")

    # If pdfplumber got nothing, fall back to PyMuPDF
    if not blocks:
        try:
            doc = fitz.open(file_path)
            for page_num, page in enumerate(doc, 1):
                text = page.get_text()
                if text and text.strip():
                    blocks.append({
                        "type": "text",
                        "content": text.strip(),
                        "page": page_num,
                    })
            doc.close()
        except Exception as e:
            logger.error(f"PyMuPDF extraction also failed: {e}")

    # Try to extract images from PDF
    try:
        doc = fitz.open(file_path)
        for page_num, page in enumerate(doc, 1):
            images = page.get_images(full=True)
            for img_idx, img in enumerate(images):
                xref = img[0]
                base_image = doc.extract_image(xref)
                if base_image:
                    blocks.append({
                        "type": "image",
                        "content": f"[Image on page {page_num}, idx {img_idx}: {base_image.get('ext', 'unknown')}]",
                        "page": page_num,
                        "width": base_image.get("width", 0),
                        "height": base_image.get("height", 0),
                    })
        doc.close()
    except Exception as e:
        logger.warning(f"Image extraction failed: {e}")

    return blocks


def extract_from_text(file_path: str) -> list[dict]:
    """Read a plain text file."""
    content = Path(file_path).read_text(encoding="utf-8")
    return [{"type": "text", "content": content, "page": 1}]


def extract_from_docx(file_path: str) -> list[dict]:
    """Extract paragraphs and tables from a modern Word document."""
    from docx import Document
    document = Document(file_path)
    blocks: list[dict] = []
    for index, paragraph in enumerate(document.paragraphs, 1):
        text = paragraph.text.strip()
        if text:
            blocks.append({"type": "text", "content": text, "section": f"Paragraph {index}"})
    for table_index, table in enumerate(document.tables, 1):
        rows = [" | ".join(cell.text.strip() for cell in row.cells) for row in table.rows]
        if any(rows):
            blocks.append({"type": "text", "content": "\n".join(rows), "section": f"Table {table_index}"})
    return blocks


def extract_from_pptx(file_path: str) -> list[dict]:
    """Extract text from PowerPoint slides while retaining slide numbers."""
    from pptx import Presentation
    presentation = Presentation(file_path)
    blocks: list[dict] = []
    for slide_number, slide in enumerate(presentation.slides, 1):
        texts = [shape.text.strip() for shape in slide.shapes if hasattr(shape, "text") and shape.text.strip()]
        if texts:
            blocks.append({"type": "text", "content": "\n".join(texts), "page": slide_number, "section": f"Slide {slide_number}"})
    return blocks


def extract_content(file_path: str, file_type: str) -> list[dict]:
    """
    Route extraction based on file type.
    Returns unified content block list.
    """
    ext = file_type.lower()

    suffix = Path(file_path).suffix.lower().lstrip(".")
    ext = suffix or ext.lstrip(".")
    if ext == "pdf":
        blocks = extract_from_pdf(file_path)
        if not any(block.get("type") == "text" and block.get("content", "").strip() for block in blocks):
            raise ValueError("This PDF contains no extractable text. Scanned PDFs require OCR, which is not configured.")
        return blocks
    if ext in ("txt", "text", "md", "markdown"):
        return extract_from_text(file_path)
    if ext == "docx":
        return extract_from_docx(file_path)
    if ext == "pptx":
        return extract_from_pptx(file_path)
    if ext == "doc":
        raise ValueError("Legacy .doc files are not supported. Convert the file to .docx and upload it again.")
    raise ValueError(f"Unsupported file type: .{ext}. Use PDF, TXT, MD, DOCX, or PPTX.")
