import json
import random
from typing import Dict, Any, List
from .llm import call_gemini_gateway

# Tiny jitter helper
def jitter(r=6) -> int:
    return random.randint(-r//2, r//2)

def generate_next_question(
    role_target: str,
    job_description: str,
    history: List[Dict[str, Any]],
    current_difficulty: str = "mid"
) -> str:
    # Heuristic fallback if LLM is not active
    fallback_questions = {
        "easy": [
            f"What is the difference between a list and a tuple in Python, and when would you use each?",
            f"Can you explain what an API is and the typical structure of an HTTP request?",
            f"How do you ensure code formatting and linting consistency in a team environment?"
        ],
        "mid": [
            f"Walk me through designing a rate-limited webhook ingestor targeting {role_target}.",
            f"How would you optimize a database query that is running slowly in production?",
            f"Explain the virtual DOM concept in React and how reconciliation works."
        ],
        "hard": [
            f"How do you guarantee at-least-once delivery without duplicate side effects under high-throughput queues?",
            f"Describe how you would design a globally distributed caching layer that avoids cache stampede.",
            f"Explain how you would coordinate hot-spot partitioning issues in PostgreSQL at 50K writes/second."
        ]
    }
    
    difficulty = current_difficulty.lower()
    if difficulty not in fallback_questions:
        difficulty = "mid"
        
    fallback = random.choice(fallback_questions[difficulty])

    prompt = f"""You are an advanced technical interviewer assessing a candidate for the role of "{role_target}".
Job description: {job_description}

Here is the conversation history so far:
{json.dumps(history)}

Generate the NEXT follow-up question. 
- Keep the question clear, technically demanding, and directly referencing previous details if appropriate.
- Do not repeat topics already discussed.
- Target the difficulty level: "{difficulty}".
- Respond with ONLY the question string, nothing else. Do not wrap in JSON."""

    res = call_gemini_gateway(prompt)
    if res and isinstance(res, str) and len(res.strip()) > 10:
        return res.strip()
    return fallback

def evaluate_candidate_answer(question: str, answer: str) -> Dict[str, Any]:
    wc = len(answer.split())
    
    # Identify question categories
    is_behavioral = any(h in question.lower() for h in ["time", "situation", "conflict", "disagree", "challenge", "tell me", "describe a"])
    is_system = any(h in question.lower() for h in ["design", "architect", "scale", "system", "microservice", "distributed", "deploy"])
    is_process = any(h in question.lower() for h in ["approach", "handle", "manage", "versioning", "test", "clean", "maintain", "debug", "optimize", "security"])
    
    # 1. Non-answer / Empty bucket
    if wc <= 3:
        score = 2
        clarity, technical, depth = 2, 2, 2
        feedback = "This is a one-word or empty response — nothing to evaluate. Please write a real answer."
        good = []
        improve = ["Write 2-4 focused sentences that directly address the question."]
    elif wc <= 8:
        score = 10 + jitter(4)
        clarity, technical, depth = 10, 6, 5
        feedback = "Too brief — this doesn't demonstrate any knowledge or reasoning."
        good = []
        improve = ["Write at least 2-3 complete sentences", "Explain your reasoning or approach", "Give at least one concrete detail"]
        
    # 2. Behavioral Response (STAR Heuristics)
    elif is_behavioral:
        if wc <= 20:
            score = 28 + jitter()
            clarity, technical, depth = 28, 20, 16
            feedback = "Mentions the topic but far too brief. Use the STAR structure: Situation, Action, Result."
            good = []
            improve = ["Set up the Situation in 1 sentence", "Describe your specific Action", "State the Result or outcome"]
        elif wc <= 38:
            score = 60 + jitter()
            clarity, technical, depth = 62, 54, 48
            feedback = "Covers the scenario but missing the outcome. Adding the result would bring this to 80+."
            good = ["Sets up the scenario", "On-topic and clear"]
            improve = ["State the specific result or resolution", "Quantify the impact if possible", "Mention what you learned"]
        elif wc <= 80:
            score = 85 + jitter()
            clarity, technical, depth = 84, 78, 76
            feedback = "Strong behavioral answer — covers the scenario, your approach, and the outcome concisely. Ideal length."
            good = ["Concise and well-structured", "Covers scenario + action + result", "Shows collaboration and judgment"]
            improve = ["Quantify the outcome if possible", "Add 1 sentence on what you learned"]
        else:
            score = 72 + jitter()
            clarity, technical, depth = 70, 70, 70
            feedback = "Good content, but a bit verbose. Aim for conciseness: clarity over length."
            good = ["Covers the scenario thoroughly", "Shows problem-solving ownership"]
            improve = ["Trim repetitive details — aim for 50-80 words", "Lead with the action, not the setup"]

    # 3. Technical / System / Design Responses
    else:
        if wc <= 20:
            score = 25 + jitter()
            clarity, technical, depth = 25, 18, 14
            feedback = "Too brief — no reasoning or specifics shown. Write 3-5 focused sentences."
            good = []
            improve = ["Explain your approach with a reason", "Name at least one specific technique or tool", "Give one sentence of context"]
        elif wc <= 35:
            score = 62 + jitter()
            clarity, technical, depth = 62, 56, 48
            feedback = "On-topic but needs a bit more — mention a specific tool, decision, or trade-off to reach 80+."
            good = ["On-topic", "Clear and direct"]
            improve = ["Name 1-2 specific tools or techniques you rely on", "Add one concrete example", "Mention one trade-off"]
        elif wc <= 80:
            score = 89 + jitter()
            clarity, technical, depth = 87, 84, 80
            feedback = "Solid, focused answer covering the key practices. Ideal length — precise and complete."
            good = ["Right length for a written interview", "Covers the key concepts", "Clear and direct"]
            improve = ["Name one specific tool or framework you used (e.g. JWT, Redis, Nginx)", "Add one concrete outcome"]
        else:
            score = 74 + jitter()
            clarity, technical, depth = 70, 72, 74
            feedback = "Shows depth of thinking, but is too long for a written interview. Try to write more concisely."
            good = ["Covers technical design points", "Shows depth of thinking"]
            improve = ["Cut to 40-70 words — remove unnecessary details", "State the core design trade-off in 1 sentence"]

    fallback_result = {
        "score": min(100, max(0, score)),
        "signals": {
            "clarity": min(100, max(0, clarity)),
            "technical": min(100, max(0, technical)),
            "depth": min(100, max(0, depth))
        },
        "feedback": feedback,
        "what_was_good": good,
        "what_to_improve": improve
    }

    prompt = f"""You are a strict technical interviewer evaluating a candidate's answer.
QUESTION: {question}
CANDIDATE ANSWER: {answer}

Grade the response objectively:
- score: 0-100 overall score.
- signals: technical, clarity, and depth scores (each 0-100).
- feedback: a short, constructive paragraph.
- what_was_good: list of 1-3 strong points.
- what_to_improve: list of 1-3 action items.

Return JSON only in the following schema:
{{
  "score": number,
  "signals": {{ "clarity": number, "technical": number, "depth": number }},
  "feedback": "string",
  "what_was_good": ["string"],
  "what_to_improve": ["string"]
}}"""

    schema = {
        "name": "evaluation",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "required": ["score", "signals", "feedback", "what_was_good", "what_to_improve"],
            "properties": {
                "score": {"type": "number"},
                "signals": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["clarity", "technical", "depth"],
                    "properties": {
                        "clarity": {"type": "number"},
                        "technical": {"type": "number"},
                        "depth": {"type": "number"}
                    }
                },
                "feedback": {"type": "string"},
                "what_was_good": {"type": "array", "items": {"type": "string"}},
                "what_to_improve": {"type": "array", "items": {"type": "string"}}
            }
        }
    }

    res = call_gemini_gateway(prompt, json_schema=schema)
    if res and isinstance(res, dict) and "score" in res:
        return res
    return fallback_result
