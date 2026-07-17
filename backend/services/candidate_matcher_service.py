from typing import Dict, Any, List
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from rapidfuzz import fuzz

def compute_match_score(resume_content: Dict[str, Any], job_requirements: Dict[str, Any]) -> int:
    # Extract texts
    resume_summary = resume_content.get("summary", "")
    resume_skills = " ".join(resume_content.get("skills", []) or resume_content.get("parsed_skills", []) or [])
    resume_exp = " ".join([
        f"{j.get('role', '')} {j.get('company', '')} {j.get('bullets', '')}"
        for j in resume_content.get("experience", []) or []
    ])
    resume_text = f"{resume_summary} {resume_skills} {resume_exp}".lower()

    job_title = job_requirements.get("title", "")
    job_desc = job_requirements.get("description", "")
    job_skills = " ".join(job_requirements.get("skills", []) or [])
    job_text = f"{job_title} {job_desc} {job_skills}".lower()

    if not resume_text.strip() or not job_text.strip():
        return 10

    # TF-IDF Cosine Similarity via scikit-learn
    try:
        vectorizer = TfidfVectorizer()
        tfidf = vectorizer.fit_transform([resume_text, job_text])
        cos_sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
    except Exception as e:
        print(f"Error computing scikit-learn similarity: {e}")
        cos_sim = 0.5

    # Mandatory skill match ratio via RapidFuzz
    mandatory_skills = job_requirements.get("skills", [])
    candidate_skills = resume_content.get("skills", []) or resume_content.get("parsed_skills", []) or []
    
    hits = 0
    for target in mandatory_skills:
        # check if any candidate skill matches target
        match_found = False
        for s in candidate_skills:
            if s.lower() == target.lower() or fuzz.ratio(s.lower(), target.lower()) > 85:
                match_found = True
                break
        if match_found:
            hits += 1

    skill_coverage = (hits / len(mandatory_skills)) if mandatory_skills else 1.0

    # Combine scores
    combined = 0.6 * (cos_sim * 100) + 0.4 * (skill_coverage * 100)
    
    # Cap score realistically
    final_score = min(96, max(12, round(combined)))
    return final_score

def rank_candidates_for_job(job_requirements: Dict[str, Any], candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    ranked = []
    for cand in candidates:
        resume = cand.get("resume", {})
        score = compute_match_score(resume.get("content", {}), job_requirements)
        
        # Identify missing skills
        job_skills = job_requirements.get("skills", [])
        cand_skills = resume.get("content", {}).get("skills", []) or resume.get("parsed_skills", []) or []
        gaps = [s for s in job_skills if s.lower() not in [cs.lower() for cs in cand_skills]]
        
        ranked.append({
            "candidate_id": cand.get("id"),
            "full_name": cand.get("full_name"),
            "email": cand.get("email"),
            "match_score": score,
            "skill_gaps": gaps,
            "experience_level": cand.get("experience_level")
        })
        
    # Sort descending by match score
    ranked.sort(key=lambda x: x["match_score"], reverse=True)
    return ranked
