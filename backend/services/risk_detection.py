import re
from typing import Dict, Any, List

def analyze_typing_behavior(typing_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    # Returns paste_detected, typing_speed_wpm, and risk_score
    paste_detected = False
    total_chars = 0
    total_time_ms = 0
    
    for action in typing_history:
        event = action.get("event", "")
        # Detect paste event
        if event == "paste" or action.get("is_paste", False):
            paste_detected = True
        
        # Calculate typing metrics if time was captured
        chars = action.get("char_count", 0)
        duration = action.get("duration_ms", 0)
        total_chars += chars
        total_time_ms += duration

    # standard WPM formula
    wpm = 0
    if total_time_ms > 0:
        words = total_chars / 5.0
        minutes = total_time_ms / 60000.0
        wpm = round(words / minutes) if minutes > 0 else 0

    risk_score = 0
    reasons = []
    
    if paste_detected:
        risk_score += 45
        reasons.append("External text paste action captured.")
    
    if wpm > 130:
        risk_score += 30
        reasons.append(f"Anomalous typing speed detected: {wpm} WPM.")
    elif wpm > 95:
        risk_score += 10
        reasons.append(f"Elevated typing speed: {wpm} WPM.")

    return {
        "paste_detected": paste_detected,
        "typing_wpm": wpm or 65, # default reasonable typing speed
        "risk_score": min(95, risk_score),
        "reasons": reasons
    }

def detect_ai_likelihood(text: str) -> float:
    # Rule-based syntactic check for common AI templates
    ai_phrases = [
        "delve", "testament", "tapestry", "in summary", "moreover",
        "consequently", "furthermore", "it is important to note",
        "designed a robust", "scalable solution"
    ]
    hits = sum(1 for phrase in ai_phrases if phrase in text.lower())
    
    # Simple probability model
    likelihood = 0.05
    if hits > 0:
        likelihood += min(0.90, hits * 0.15)
        
    # Sentence diversity check
    sentences = re.split(r"[.!?]+", text)
    sentences = [s.strip() for s in sentences if s.strip()]
    if sentences:
        lengths = [len(s.split()) for s in sentences]
        # AI content often has very uniform sentence lengths
        variance = float(sum((l - (sum(lengths)/len(lengths)))**2 for l in lengths) / len(lengths)) if len(lengths) > 1 else 100.0
        if variance < 12.0:
            likelihood += 0.20
            
    return min(0.95, round(likelihood, 2))
