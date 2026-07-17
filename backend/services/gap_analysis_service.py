import json
from typing import Dict, Any, List
from rapidfuzz import fuzz
from .llm import call_gemini_gateway

def analyze_gaps(resume_content: Dict[str, Any], job_title: str, job_description: str) -> Dict[str, Any]:
    candidate_skills = resume_content.get("skills", []) or resume_content.get("parsed_skills", [])
    if not isinstance(candidate_skills, list):
        candidate_skills = []

    # Offline gap analysis using RapidFuzz to match candidate skills with common technical keywords
    job_text = (job_title + " " + job_description).lower()
    target_skills = ["react", "typescript", "node.js", "postgresql", "aws", "docker", "kubernetes", "fastapi", "python", "system design"]
    
    analyzed_skills = []
    ramp_plan = []
    
    # Calculate overlaps
    for target in target_skills:
        # Check similarity with any candidate skill
        best_match = 0
        for cand_s in candidate_skills:
            score = fuzz.ratio(str(cand_s).lower(), target)
            if score > best_match:
                best_match = score
        
        have_score = round(best_match)
        need_score = 80 if target in ["react", "typescript", "python", "node.js"] else 70
        
        # If the candidate clearly has the skill
        if target in [s.lower() for s in candidate_skills]:
            have_score = 90
            
        gap = max(0, need_score - have_score)
        priority = "strong" if gap <= 0 else ("high" if gap > 20 else "med")
        
        analyzed_skills.append({
            "name": target.capitalize(),
            "have": have_score,
            "need": need_score,
            "gap": gap,
            "priority": priority
        })

    # Heuristic ramp plan
    gaps = [s for s in analyzed_skills if s["gap"] > 0]
    if not gaps:
        ramp_plan = [
            {"week": "Week 1", "focus": "System Tuning", "item": "Review advanced postgres query metrics and optimization patterns.", "hours": 6},
            {"week": "Week 2", "focus": "Peer Mentorship", "item": "Participate in architecture reviews and lead internal design discussions.", "hours": 8}
        ]
    else:
        for idx, g in enumerate(gaps[:3]):
            week_str = f"Week {idx*2 + 1}-{idx*2 + 2}"
            ramp_plan.append({
                "week": week_str,
                "focus": f"Mastering {g['name']}",
                "item": f"Complete hands-on projects and tutorials for {g['name']}. Focus on integration and testing.",
                "hours": 10
            })

    fallback_result = {
        "role": job_title,
        "company": "Target Company",
        "compare_count": 284,
        "skills": analyzed_skills,
        "ramp_plan": ramp_plan,
        "resources": [
            "Designing Data-Intensive Applications by Martin Kleppmann",
            "Official documentation and quick-start guides",
            "Adika AI Interactive Practice Labs"
        ]
    }

    # LLM Prompt
    prompt = f"""You are a senior tech recruiter and career coach. Compare the candidate's resume content against successful hires for the role "{job_title}".
Identify the critical skills required, estimate the candidate's current level (have score, 0-100) vs the required bar (need score, 0-100), calculate the gap in points (need - have, or 0 if have >= need), set a priority ("high"|"med"|"low"|"strong" where strong means have >= need), design a concrete week-by-week ramp plan (week e.g. "Week 1-2", focus topic, concrete action item, hours estimate), and list 3-5 top resources.

RESUME CONTENT:
{json.dumps(resume_content)}

JOB DESCRIPTION:
{job_description}

Return ONLY a JSON object with this exact schema:
{{
  "role": "{job_title}",
  "company": "Target Company",
  "compare_count": 412,
  "skills": [
    {{ "name": "Skill Name", "have": number, "need": number, "gap": number, "priority": "high"|"med"|"low"|"strong" }}
  ],
  "ramp_plan": [
    {{ "week": "Week range", "focus": "Focus Area", "item": "Concrete resource/action", "hours": number }}
  ],
  "resources": ["Resource 1", "Resource 2"]
}}"""

    schema = {
        "name": "gap_analysis",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "required": ["role", "company", "compare_count", "skills", "ramp_plan", "resources"],
            "properties": {
                "role": {"type": "string"},
                "company": {"type": "string"},
                "compare_count": {"type": "number"},
                "skills": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["name", "have", "need", "gap", "priority"],
                        "properties": {
                            "name": {"type": "string"},
                            "have": {"type": "number"},
                            "need": {"type": "number"},
                            "gap": {"type": "number"},
                            "priority": {"type": "string", "enum": ["high", "med", "low", "strong"]}
                        }
                    }
                },
                "ramp_plan": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["week", "focus", "item", "hours"],
                        "properties": {
                            "week": {"type": "string"},
                            "focus": {"type": "string"},
                            "item": {"type": "string"},
                            "hours": {"type": "number"}
                        }
                    }
                },
                "resources": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        }
    }

    res = call_gemini_gateway(prompt, json_schema=schema)
    if res and isinstance(res, dict) and "skills" in res:
        return res
    return fallback_result

def build_roadmap_for_skill(skill: str) -> Dict[str, Any]:
    # Offline Roadmap Fallback
    fallback = {
        "skill": skill,
        "difficulty": "Intermediate",
        "total_weeks": 4,
        "weeks": [
            {
                "week": "Week 1",
                "topic": f"Foundations of {skill}",
                "objectives": [f"Understand core syntax and principles of {skill}", "Set up local environment"],
                "resources": [f"Official {skill} Documentation", f"{skill} absolute beginner course"]
            },
            {
                "week": "Week 2",
                "topic": "Practical Applications",
                "objectives": [f"Build simple CRUD pipelines in {skill}", "Add unit tests"],
                "resources": [f"Standard layout frameworks for {skill}", "Github reference examples"]
            },
            {
                "week": "Week 3",
                "topic": "Advanced Scalability",
                "objectives": ["Optimize process performance", "Implement caching and connection pools"],
                "resources": ["High-performance scaling tutorials", "Middleware patterns guide"]
            },
            {
                "week": "Week 4",
                "topic": "Deployment and Ops",
                "objectives": ["Containerize the application", "Set up CI/CD workflows"],
                "resources": ["Docker guidelines", "GitHub Actions workflows handbook"]
            }
        ],
        "capstone_title": f"Production-ready {skill} Ingestion Engine",
        "capstone_description": f"Build a structured, containerized server that ingests and processes records utilizing {skill}.",
        "capstone_time": "10 hours"
    }

    prompt = f"""Build a STUDENT-FRIENDLY, time-explicit week-by-week learning roadmap to master "{skill}" from scratch.
Break it into 4 detailed weeks. Describe the core topic, list 3 concrete objectives, and provide 2-3 specific learning resources (books, docs, tutorials) for each week.
Also propose a final capstone project to validate this skill.

Return ONLY a JSON object with this exact schema:
{{
  "skill": "{skill}",
  "difficulty": "Beginner"|"Intermediate"|"Advanced",
  "total_weeks": 4,
  "weeks": [
    {{
      "week": "Week range (e.g. Week 1)",
      "topic": "Topic title",
      "objectives": ["Objective 1", "Objective 2", ...],
      "resources": ["Resource 1 (e.g. book/url)", "Resource 2", ...]
    }}
  ],
  "capstone_title": "Project Title",
  "capstone_description": "Project Description",
  "capstone_time": "Estimated hours (e.g. 10 hours)"
}}"""

    schema = {
        "name": "roadmap",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "required": ["skill", "difficulty", "total_weeks", "weeks", "capstone_title", "capstone_description", "capstone_time"],
            "properties": {
                "skill": {"type": "string"},
                "difficulty": {"type": "string", "enum": ["Beginner", "Intermediate", "Advanced"]},
                "total_weeks": {"type": "number"},
                "weeks": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["week", "topic", "objectives", "resources"],
                        "properties": {
                            "week": {"type": "string"},
                            "topic": {"type": "string"},
                            "objectives": {"type": "array", "items": {"type": "string"}},
                            "resources": {"type": "array", "items": {"type": "string"}}
                        }
                    }
                },
                "capstone_title": {"type": "string"},
                "capstone_description": {"type": "string"},
                "capstone_time": {"type": "string"}
            }
        }
    }

    res = call_gemini_gateway(prompt, json_schema=schema)
    if res and isinstance(res, dict) and "weeks" in res:
        return res
    return fallback
