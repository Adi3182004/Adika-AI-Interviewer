import pandas as pd
import numpy as np
from typing import List, Dict, Any

def summarize_pipeline_applications(applications: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not applications:
        return {
            "total_applications": 0,
            "stage_counts": {},
            "average_match_score": 0.0,
            "conversion_rates": {}
        }

    # Load applications into a pandas DataFrame
    df = pd.DataFrame(applications)

    total_apps = len(df)
    
    # Calculate counts per stage
    stage_counts = df["stage"].value_counts().to_dict() if "stage" in df else {}

    # Calculate average match score using numpy
    avg_score = 0.0
    if "match_score" in df:
        scores = df["match_score"].dropna().values
        if len(scores) > 0:
            avg_score = float(np.mean(scores))

    # Stage conversion relative to total applications
    conversion_rates = {}
    for stage, count in stage_counts.items():
        conversion_rates[stage] = round(float(count / total_apps) * 100, 1)

    return {
        "total_applications": total_apps,
        "stage_counts": {str(k): int(v) for k, v in stage_counts.items()},
        "average_match_score": round(avg_score, 1),
        "conversion_rates": conversion_rates
    }

def get_salary_benchmark_stats(role: str, experience_level: str) -> Dict[str, Any]:
    # Mock database distribution of salaries for analytical percentiles
    base_salaries = {
        "junior": [60000, 75000, 82000, 90000, 95000, 105000],
        "mid": [95000, 110000, 120000, 130000, 140000, 155000],
        "senior": [140000, 160000, 175000, 190000, 210000, 240000]
    }
    
    level = experience_level.lower()
    if level not in base_salaries:
        level = "mid"
        
    data = base_salaries[level]
    
    # Calculate percentiles using numpy
    p25 = float(np.percentile(data, 25))
    p50 = float(np.percentile(data, 50))
    p75 = float(np.percentile(data, 75))
    
    return {
        "role": role,
        "experience_level": level,
        "percentile_25": round(p25),
        "median": round(p50),
        "percentile_75": round(p75),
        "market_range": f"${round(p25):,} - ${round(p75):,}"
    }
