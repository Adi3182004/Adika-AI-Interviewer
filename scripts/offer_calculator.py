"""Compensation calculator for offer modelling.

Given a base band, location multiplier, and equity philosophy, return a
full offer breakdown the recruiter can paste into a candidate-facing
letter. No external services — everything is local arithmetic with
documented assumptions so finance can audit it.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass


LOCATION_MULTIPLIER = {
    "sf-bay-area": 1.00,
    "new-york": 0.98,
    "seattle": 0.95,
    "london": 0.85,
    "berlin": 0.78,
    "bengaluru": 0.45,
    "mumbai": 0.48,
    "remote-india": 0.42,
    "remote-eu": 0.80,
    "remote-us": 0.92,
}

LEVEL_BAND = {
    "junior":   (75_000, 95_000, 25_000),
    "mid":      (110_000, 135_000, 60_000),
    "senior":   (155_000, 185_000, 140_000),
    "staff":    (210_000, 245_000, 280_000),
    "principal":(260_000, 310_000, 420_000),
}


@dataclass
class Offer:
    level: str
    location: str
    base_salary: int
    target_bonus_pct: float
    equity_4yr: int
    sign_on: int
    total_year_one: int
    assumptions: list[str]


def build_offer(level: str, location: str, perf_multiplier: float = 1.0,
                bonus_pct: float = 0.12, sign_on: int = 15_000) -> Offer:
    if level not in LEVEL_BAND:
        raise ValueError(f"unknown level: {level}")
    if location not in LOCATION_MULTIPLIER:
        raise ValueError(f"unknown location: {location}")

    lo, hi, equity = LEVEL_BAND[level]
    loc_mul = LOCATION_MULTIPLIER[location]
    target_base = round((lo + (hi - lo) * 0.6) * loc_mul * perf_multiplier / 1000) * 1000

    equity_4yr = round(equity * loc_mul / 1000) * 1000
    year_one_equity = equity_4yr // 4
    total = target_base + round(target_base * bonus_pct) + year_one_equity + sign_on

    return Offer(
        level=level,
        location=location,
        base_salary=target_base,
        target_bonus_pct=bonus_pct,
        equity_4yr=equity_4yr,
        sign_on=sign_on,
        total_year_one=total,
        assumptions=[
            f"Anchored 60% into the {level} band before location adjustment.",
            f"Location multiplier applied: {loc_mul:.2f}.",
            f"Equity vests 25/25/25/25 over 4 years with a 1-year cliff.",
        ],
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a compensation offer.")
    parser.add_argument("--level", required=True, choices=list(LEVEL_BAND))
    parser.add_argument("--location", required=True, choices=list(LOCATION_MULTIPLIER))
    parser.add_argument("--perf", type=float, default=1.0)
    parser.add_argument("--bonus", type=float, default=0.12)
    parser.add_argument("--sign-on", type=int, default=15_000)
    args = parser.parse_args()

    offer = build_offer(args.level, args.location, args.perf, args.bonus, args.sign_on)
    print(json.dumps(asdict(offer), indent=2))


if __name__ == "__main__":
    main()
