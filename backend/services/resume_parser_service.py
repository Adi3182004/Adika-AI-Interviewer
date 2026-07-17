import base64
import io
import re
from typing import Dict, Any, List
import pdfplumber
import docx
from .llm import call_gemini_gateway
from scripts.resume_parser import parse_resume as offline_parse_resume

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
    except Exception as e:
        print(f"Error parsing PDF with pdfplumber: {e}")
    return text

def extract_text_from_docx(docx_bytes: bytes) -> str:
    text = ""
    try:
        doc = docx.Document(io.BytesIO(docx_bytes))
        text = "\n".join([para.text for para in doc.paragraphs])
    except Exception as e:
        print(f"Error parsing DOCX with python-docx: {e}")
    return text

def parse_resume_to_json(file_name: str, file_type: str, file_data_url: str) -> Dict[str, Any]:
    # Extract raw base64 data
    b64_data = ""
    if "," in file_data_url:
        b64_data = file_data_url.split(",")[1]
    else:
        b64_data = file_data_url

    try:
        file_bytes = base64.b64decode(b64_data)
    except Exception as e:
        print(f"Error decoding base64 resume file: {e}")
        file_bytes = b""

    # Determine text based on file format
    raw_text = ""
    is_pdf = file_type.startswith("application/pdf") or file_name.lower().endswith(".pdf")
    is_docx = file_type.startswith("application/vnd.openxmlformats-officedocument.wordprocessingml.document") or file_name.lower().endswith(".docx")
    
    if is_pdf:
        raw_text = extract_text_from_pdf(file_bytes)
    elif is_docx:
        raw_text = extract_text_from_docx(file_bytes)
    else:
        try:
            raw_text = file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            raw_text = ""

    # Offline regex-based parser from scripts/resume_parser.py
    parsed_offline = {}
    if raw_text:
        try:
            # call offline parser function from scripts
            parsed_offline = asdict(offline_parse_resume(raw_text)) if hasattr(offline_parse_resume(raw_text), "_asdict") else offline_parse_resume(raw_text)
        except Exception as e:
            print(f"Offline parser error: {e}")

    # Convert dataclass or dict to standard structure
    fallback_experience = []
    if isinstance(parsed_offline, dict) and "sections" in parsed_offline:
        exp_text = parsed_offline["sections"].get("experience", "")
        if exp_text:
            fallback_experience = [{"company": "Experience", "role": "Details", "period": "", "bullets": exp_text}]

    fallback = {
        "summary": parsed_offline.get("sections", {}).get("summary", "") if isinstance(parsed_offline, dict) else "",
        "experience": fallback_experience,
        "education": [],
        "skills": parsed_offline.get("skills", []) if isinstance(parsed_offline, dict) else [],
        "projects": []
    }

    # If LLM key is present, refine the parsing
    prompt = f"""Extract this resume into clean structured JSON. Use empty strings/arrays for missing fields. For experience.bullets, join achievement lines with newlines.

RESUME TEXT:
{raw_text[:20000]}

Return JSON structure matching:
{{
  "summary": "string",
  "experience": [
    {{ "company": "string", "role": "string", "period": "string", "bullets": "string" }}
  ],
  "education": [
    {{ "school": "string", "degree": "string", "year": "string" }}
  ],
  "skills": ["string"],
  "projects": [
    {{ "name": "string", "description": "string" }}
  ]
}}"""

    schema = {
        "name": "resume",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "required": ["summary", "experience", "education", "skills", "projects"],
            "properties": {
                "summary": {"type": "string"},
                "experience": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["company", "role", "period", "bullets"],
                        "properties": {
                            "company": {"type": "string"},
                            "role": {"type": "string"},
                            "period": {"type": "string"},
                            "bullets": {"type": "string"}
                        }
                    }
                },
                "education": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["school", "degree", "year"],
                        "properties": {
                            "school": {"type": "string"},
                            "degree": {"type": "string"},
                            "year": {"type": "string"}
                        }
                    }
                },
                "skills": {"type": "array", "items": {"type": "string"}},
                "projects": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["name", "description"],
                        "properties": {
                            "name": {"type": "string"},
                            "description": {"type": "string"}
                        }
                    }
                }
            }
        }
    }

    parsed_llm = call_gemini_gateway(prompt, json_schema=schema)
    if parsed_llm and isinstance(parsed_llm, dict) and "skills" in parsed_llm:
        return parsed_llm

    return fallback
