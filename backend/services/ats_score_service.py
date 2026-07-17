import re
import math
from typing import Dict, Any, List
from .llm import call_gemini_gateway

ACTION_VERBS = [
    "led", "developed", "designed", "optimized", "built", "implemented", "managed",
    "created", "architected", "engineered", "scaled", "streamlined", "increased",
    "decreased", "reduced", "delivered", "automated", "integrated", "launched",
    "spearheaded", "coordinated", "migrated", "refactored", "deployed", "shipped",
    "improved", "established", "maintained", "mentored", "collaborated", "drove",
]

TECH_KEYWORDS = [
    "react", "node", "typescript", "javascript", "python", "java", "go", "rust",
    "docker", "kubernetes", "aws", "gcp", "azure", "postgresql", "mysql", "mongodb",
    "redis", "graphql", "rest", "grpc", "microservices", "ci/cd", "terraform",
    "nextjs", "vue", "angular", "express", "django", "spring", "flask", "rails",
    "git", "linux", "sql", "nosql", "kafka", "rabbitmq", "nginx", "webpack",
]

METRIC_REGEX = re.compile(
    r"\b\d+\s*(%|x|k|m|b|ms|sec|hrs?|days?|users?|requests?|records?|endpoints?|repos?|tests?)\b|"
    r"\b\d+[\+\-]?\s*(million|billion|thousand|hundred)\b|\$\s*\d+|\b\d{2,}\b",
    re.IGNORECASE
)

def calculate_ats_score(content: Dict[str, Any]) -> int:
    if not content:
        return 8

    summary = content.get("summary", "").strip()
    experience = content.get("experience", [])
    if not isinstance(experience, list):
        experience = []
    education = content.get("education", [])
    if not isinstance(education, list):
        education = []
    
    # Handle both "skills" list and "parsed_skills"
    skills = content.get("skills", [])
    if not isinstance(skills, list):
        skills = content.get("parsed_skills", [])
    if not isinstance(skills, list):
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(",") if s.strip()]
        else:
            skills = []

    projects = content.get("projects", [])
    if not isinstance(projects, list):
        projects = []

    def bullets_text(job: Dict[str, Any]) -> str:
        bullets = job.get("bullets", "")
        if isinstance(bullets, str):
            return bullets.lower()
        if isinstance(bullets, list):
            return " ".join(bullets).lower()
        desc = job.get("description", "")
        if isinstance(desc, str):
            return desc.lower()
        return ""

    # 1. Keyword / Content Richness (0-40 pts)
    kw_score = 0
    if len(summary) > 200:
        kw_score += 10
    elif len(summary) > 80:
        kw_score += 7
    elif len(summary) > 30:
        kw_score += 4

    full_text = " ".join([
        summary,
        " ".join([f"{j.get('role', '')} {bullets_text(j)}" for j in experience]),
        " ".join([f"{p.get('name', '')} {p.get('description', '')}" for p in projects]),
        " ".join(skills)
    ]).lower()

    tech_matches = sum(1 for kw in TECH_KEYWORDS if kw in full_text)
    kw_score += min(18, tech_matches * 1.2)

    all_bullets = " ".join([bullets_text(j) for j in experience])
    metric_matches = len(METRIC_REGEX.findall(all_bullets))
    kw_score += min(12, metric_matches * 2.5)

    kw_score = min(40, kw_score)

    # 2. Skill Depth (0-20 pts)
    skill_score = 0
    unique_skills = list(set([str(s).lower().strip() for s in skills if s]))
    skill_count = len(unique_skills)

    if skill_count >= 12:
        skill_score += 12
    elif skill_count >= 8:
        skill_score += 9
    elif skill_count >= 5:
        skill_score += 6
    elif skill_count >= 2:
        skill_score += 3

    has_language = any(s in unique_skills for s in ["javascript","typescript","python","java","go","rust","c++","c#","ruby","php","swift","kotlin"])
    has_cloud = any(s in unique_skills for s in ["aws","gcp","azure","docker","kubernetes","terraform"])
    has_db = any(s in unique_skills for s in ["postgresql","mysql","mongodb","redis","sqlite","dynamodb","firebase"])
    diversity = sum([has_language, has_cloud, has_db])
    skill_score += diversity * 2.67

    skill_score = min(20, round(skill_score))

    # 3. Experience Quality (0-15 pts)
    exp_score = 0
    if len(experience) > 0:
        exp_score += min(4.0, len(experience) * 1.5)
        action_verb_count = 0
        has_metrics = False
        total_words = 0

        for job in experience:
            txt = bullets_text(job)
            action_verb_count += sum(1 for v in ACTION_VERBS if v in txt)
            if METRIC_REGEX.search(txt):
                has_metrics = True
            total_words += len(txt.split())

        if has_metrics:
            exp_score += 5
        exp_score += min(3.0, action_verb_count * 0.4)
        exp_score += 3 if total_words > 150 else (1.5 if total_words > 60 else 0)

    exp_score = min(15, round(exp_score))

    # 4. Project Relevance (0-10 pts)
    proj_score = 0
    if len(projects) > 0:
        proj_score += min(4.0, len(projects) * 1.5)
        proj_text = " ".join([f"{p.get('name', '')} {p.get('description', '')}" for p in projects]).lower()
        proj_tech_matches = sum(1 for kw in TECH_KEYWORDS if kw in proj_text)
        proj_score += min(6.0, proj_tech_matches * 0.8)
    proj_score = min(10, round(proj_score))

    # 5. Education (0-5 pts)
    edu_score = 0
    if len(education) > 0:
        edu_score += 3
        edu_text = " ".join([f"{e.get('degree', '')} {e.get('school', '')}" for e in education]).lower()
        if any(w in edu_text for w in ["computer", "engineering", "science", "mathematics"]):
            edu_score += 1
        if education[0].get("year") or education[0].get("gpa"):
            edu_score += 1
    edu_score = min(5, edu_score)

    # 6. Formatting / Structure (0-5 pts)
    fmt_score = 0
    if len(summary) > 0: fmt_score += 1
    if len(experience) > 0: fmt_score += 1
    if len(education) > 0: fmt_score += 1
    if len(skills) > 0: fmt_score += 1
    if len(projects) > 0: fmt_score += 1
    fmt_score = min(5, fmt_score)

    # 7. Recruiter Readability (0-5 pts)
    read_score = 0
    if len(summary) > 50: read_score += 2
    if len(skills) >= 5: read_score += 2
    if len(experience) > 0 and len(bullets_text(experience[0])) > 30: read_score += 1
    read_score = min(5, read_score)

    total = kw_score + skill_score + exp_score + proj_score + edu_score + fmt_score + read_score
    return min(94, max(5, round(total)))

def generate_ats_feedback(content: Dict[str, Any], score: int) -> Dict[str, Any]:
    summary = content.get("summary", "").strip()
    experience = content.get("experience", [])
    education = content.get("education", [])
    skills = content.get("skills", [])
    projects = content.get("projects", [])

    def bullets_text(job: Dict[str, Any]) -> str:
        bullets = job.get("bullets", "")
        if isinstance(bullets, str):
            return bullets
        if isinstance(bullets, list):
            return " ".join(bullets)
        return job.get("description", "") or ""

    has_metrics = False
    for j in experience:
        if METRIC_REGEX.search(bullets_text(j)):
            has_metrics = True
            break

    # Calculate individual section scores
    summary_score = 92 if len(summary) > 200 else (78 if len(summary) > 100 else (60 if len(summary) > 40 else (35 if len(summary) > 0 else 5)))
    exp_score = 88 if has_metrics and len(experience) >= 2 else (75 if has_metrics else (62 if len(experience) >= 2 else 45))
    edu_score = 95 if len(education) > 0 and education[0].get("gpa") else (82 if len(education) > 0 else 5)
    skill_score = 90 if len(skills) >= 12 else (78 if len(skills) >= 8 else (65 if len(skills) >= 5 else (48 if len(skills) >= 2 else 10)))
    proj_score = 82 if len(projects) >= 3 else (70 if len(projects) >= 2 else 55)

    sections = [
        {
            "name": "Summary",
            "score": summary_score,
            "tip": "Good intro — add the specific role title and 1-2 top technologies to strengthen keyword match." if len(summary) > 100
                   else ("Summary is too brief. Expand to 2-3 sentences covering your role, top technologies, and years of experience." if len(summary) > 0
                         else "Missing professional summary. Add one to immediately tell ATS and recruiters who you are.")
        },
        {
            "name": "Experience",
            "score": exp_score,
            "tip": "No work experience found. Add internships, projects, or freelance work." if len(experience) == 0
                   else ("Good use of metrics. Ensure every bullet starts with a strong action verb (Led, Built, Reduced…)." if has_metrics
                         else "Add quantified metrics to bullet points: % improvements, user counts, response time reductions, etc.")
        },
        {
            "name": "Education",
            "score": edu_score,
            "tip": "No education records. Add degree, institution, and graduation year." if len(education) == 0
                   else ("Well structured. Add relevant coursework if GPA < 3.5 or if applying to top companies." if education[0].get("gpa")
                         else "Add GPA (if ≥ 3.5) and relevant coursework to strengthen this section.")
        },
        {
            "name": "Skills",
            "score": skill_score,
            "tip": "Good skill breadth. Organise into categories: Languages, Frameworks, Cloud, Databases, Tools." if len(skills) >= 8
                   else (f"You have {len(skills)} skills listed — aim for 10–15 relevant skills grouped by category." if len(skills) >= 3
                         else "Skills section is sparse. List all technical skills, frameworks, tools, and cloud platforms you know.")
        },
        {
            "name": "Projects",
            "score": proj_score,
            "tip": "No projects listed. Add 2–3 technical projects with tech stack, your role, and quantified impact." if len(projects) == 0
                   else ("Add live demo links or GitHub URLs to every project to increase recruiter credibility." if len(projects) >= 2
                         else "Only one project listed. Add 1–2 more to demonstrate breadth of experience.")
        }
    ]

    general_summary = "Strong resume — recruiter-ready. Focus on quantified achievements and role-specific keywords to push past 85." if score >= 80 \
                      else ("Solid foundation. Add measurable impact to experience bullets and expand your skills section to improve the score." if score >= 65 \
                            else ("The resume has good structure but lacks detail. Flesh out bullets with action verbs, metrics, and technologies." if score >= 45 \
                                  else "Resume is incomplete. Populate all sections — especially experience, skills, and projects — before applying."))

    return {"summary": general_summary, "sections": sections}

def get_ats_analysis(content: Dict[str, Any]) -> Dict[str, Any]:
    # Try calling the LLM first
    prompt = f"""You are an ATS auditor. Score this resume objectively on a scale of 0-100.
Note that the maximum score a perfect resume can get is 94, and no resume should score above 94.
Grade realistically and critically, penalizing missing metrics, generic descriptions, or lack of quantified impact.
Extract skills (lowercase, deduped), and give per-section feedback for Summary, Experience, Education, Skills, Projects.

RESUME CONTENT:
{json.dumps(content)}

Return JSON only in the following schema:
{{
  "ats_score": number,
  "parsed_skills": ["skill1", "skill2"],
  "feedback": {{
    "summary": "general summary string",
    "sections": [
      {{ "name": "Summary"|"Experience"|"Education"|"Skills"|"Projects", "score": number, "tip": "string" }}
    ]
  }}
}}"""
    
    schema = {
        "name": "ats",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "required": ["ats_score", "parsed_skills", "feedback"],
            "properties": {
                "ats_score": {"type": "number"},
                "parsed_skills": {"type": "array", "items": {"type": "string"}},
                "feedback": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["summary", "sections"],
                    "properties": {
                        "summary": {"type": "string"},
                        "sections": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": ["name", "score", "tip"],
                                "properties": {
                                    "name": {"type": "string"},
                                    "score": {"type": "number"},
                                    "tip": {"type": "string"}
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    res = call_gemini_gateway(prompt, json_schema=schema)
    if res and isinstance(res, dict) and "ats_score" in res:
        # Limit the score to 94
        res["ats_score"] = min(94, round(res["ats_score"]))
        return res
    
    # Heuristic fallback
    score = calculate_ats_score(content)
    feedback = generate_ats_feedback(content, score)
    return {
        "ats_score": score,
        "parsed_skills": [s.lower() for s in content.get("skills", []) or content.get("parsed_skills", []) if s],
        "feedback": feedback
    }
