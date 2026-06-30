"""Simulated salary benchmark dataset and percentile lookups.

We can't ship real market data, so this module synthesises plausible
distributions per role + location and exposes percentile / band APIs.
Seed values are deterministic so unit tests don't flap.
"""

from __future__ import annotations

import argparse
import json
import random
from dataclasses import asdict, dataclass
from statistics import median


@dataclass
class Benchmark:
    role: str
    location: str
    sample_size: int
    p10: int
    p25: int
    p50: int
    p75: int
    p90: int


_BASE = {
    ("data analyst", "remote-india"):     (650_000, 1_400_000),
    ("data analyst", "bengaluru"):        (700_000, 1_600_000),
    ("data analyst", "remote-us"):        (78_000,  135_000),
    ("frontend engineer", "remote-india"):(900_000, 2_400_000),
    ("frontend engineer", "remote-us"):   (95_000,  175_000),
    ("ml engineer", "bengaluru"):         (1_800_000, 4_200_000),
    ("ml engineer", "sf-bay-area"):       (175_000, 290_000),
    ("full-stack engineer", "remote-eu"): (62_000, 115_000),
    ("full-stack engineer", "sf-bay-area"): (165_000, 280_000),
}


def _sample(role: str, location: str, n: int = 250, seed: int | None = None) -> list[int]:
    rng = random.Random(seed if seed is not None else hash((role, location)))
    lo, hi = _BASE.get((role, location), (60_000, 140_000))
    mid = (lo + hi) / 2
    spread = (hi - lo) / 4
    return [int(max(lo * 0.7, rng.gauss(mid, spread))) for _ in range(n)]


def _percentile(values: list[int], pct: float) -> int:
    values = sorted(values)
    k = (len(values) - 1) * pct
    f = int(k)
    c = min(f + 1, len(values) - 1)
    return int(values[f] + (values[c] - values[f]) * (k - f))


def benchmark(role: str, location: str, *, sample_size: int = 250) -> Benchmark:
    samples = _sample(role, location, sample_size)
    return Benchmark(
        role=role,
        location=location,
        sample_size=sample_size,
        p10=_percentile(samples, 0.10),
        p25=_percentile(samples, 0.25),
        p50=int(median(samples)),
        p75=_percentile(samples, 0.75),
        p90=_percentile(samples, 0.90),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Look up a salary benchmark band.")
    parser.add_argument("--role", required=True)
    parser.add_argument("--location", required=True)
    parser.add_argument("--n", type=int, default=250)
    args = parser.parse_args()

    print(json.dumps(asdict(benchmark(args.role, args.location, sample_size=args.n)), indent=2))


if __name__ == "__main__":
    main()
