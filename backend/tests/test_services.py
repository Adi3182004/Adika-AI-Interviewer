import pytest
from backend.services import (
    ats_score_service,
    resume_parser_service,
    gap_analysis_service,
    candidate_matcher_service,
    interview_intel_service,
    risk_detection,
    analytics_service
)

def test_ats_score_service():
    resume_content = {
        "summary": "Experienced backend engineer specializing in Python, FastAPI, and PostgreSQL.",
        "skills": ["python", "fastapi", "postgresql", "docker", "git"],
        "experience": [
            {
                "company": "Tech Labs",
                "role": "Software Engineer",
                "bullets": ["Designed and implemented a rate-limited REST API processing 10K requests/sec using FastAPI and Redis.", "Led migration of database to PostgreSQL."]
            }
        ],
        "projects": [
            {
                "name": "E-Commerce Backend",
                "description": "Built a scalable microservice using Python and Docker."
            }
        ],
        "education": [
            {
                "school": "University of Tech",
                "degree": "B.S. Computer Science",
                "year": "2020-2024"
            }
        ]
    }
    
    score = ats_score_service.calculate_ats_score(resume_content)
    assert 0 <= score <= 94
    
    feedback = ats_score_service.generate_ats_feedback(resume_content, score)
    assert "summary" in feedback
    assert "sections" in feedback
    assert len(feedback["sections"]) == 5

def test_gap_analysis_service():
    resume_content = {
        "skills": ["python", "react", "typescript"]
    }
    analysis = gap_analysis_service.analyze_gaps(resume_content, "Senior Backend Engineer", "FastAPI, PostgreSQL, AWS required.")
    
    assert "role" in analysis
    assert "skills" in analysis
    assert "ramp_plan" in analysis
    
    # Check that roadmap is built
    roadmap = gap_analysis_service.build_roadmap_for_skill("FastAPI")
    assert "weeks" in roadmap
    assert len(roadmap["weeks"]) == 4

def test_candidate_matcher_service():
    resume = {"content": {"skills": ["python", "fastapi"]}}
    job = {"title": "FastAPI Developer", "skills": ["python", "fastapi", "aws"], "description": "Need a backend dev."}
    
    score = candidate_matcher_service.compute_match_score(resume["content"], job)
    assert 0 <= score <= 100

def test_interview_intel_service():
    question = "Explain what a rate-limiter is and how you would design one."
    answer = "I would use a token bucket algorithm stored in Redis to track per-user limits and block exceeding calls."
    
    grades = interview_intel_service.evaluate_candidate_answer(question, answer)
    assert "score" in grades
    assert "signals" in grades
    assert "clarity" in grades["signals"]

def test_risk_detection():
    typing_history = [
        {"event": "keydown", "char_count": 1, "duration_ms": 100},
        {"event": "paste", "char_count": 100, "duration_ms": 50}
    ]
    behavior = risk_detection.analyze_typing_behavior(typing_history)
    assert behavior["paste_detected"] is True
    assert behavior["risk_score"] >= 45

    ai_lik = risk_detection.detect_ai_likelihood("delve into the rich tapestry of this testament")
    assert ai_lik > 0.10

def test_analytics_service():
    apps = [
        {"stage": "interview", "match_score": 85},
        {"stage": "sourced", "match_score": 70},
        {"stage": "interview", "match_score": 90}
    ]
    summary = analytics_service.summarize_pipeline_applications(apps)
    assert summary["total_applications"] == 3
    assert summary["average_match_score"] == 81.7
    assert summary["stage_counts"]["interview"] == 2
