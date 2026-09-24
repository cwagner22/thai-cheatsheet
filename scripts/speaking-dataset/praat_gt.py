"""Praat (parselmouth) pitch and intensity ground truth for every clip.

Usage: praat_gt.py <DATA> [workers]
Writes $DATA/praat/<voice>/<id>.json = {"t", "f0" (null when unvoiced),
"tInt", "intensityDb", "params"}. Skips clips whose JSON already exists.
"""

from __future__ import annotations

import json
import math
import sys
from multiprocessing import Pool
from pathlib import Path

import parselmouth

# Pitch search range per voice: niwat is male, the other three are female.
RANGE = {"niwat": (60.0, 300.0), "google": (100.0, 500.0), "premwadee": (100.0, 500.0),
         "kanya": (100.0, 500.0)}


def one(job: tuple[str, str, str]) -> str | None:
    wav, out, voice = job
    try:
        floor, ceil = RANGE.get(voice, (60.0, 500.0))
        snd = parselmouth.Sound(wav)
        pitch = snd.to_pitch_ac(time_step=0.01, pitch_floor=floor, pitch_ceiling=ceil)
        f0 = pitch.selected_array["frequency"]
        inten = snd.to_intensity(time_step=0.01)
        res = {
            "t": [round(float(t), 4) for t in pitch.xs()],
            "f0": [round(float(v), 2) if v > 0 else None for v in f0],
            "tInt": [round(float(t), 4) for t in inten.xs()],
            "intensityDb": [round(float(v), 2) if math.isfinite(v) else None for v in inten.values[0]],
            "params": {"method": "to_pitch_ac", "time_step": 0.01, "pitch_floor": floor,
                       "pitch_ceiling": ceil, "intensity_time_step": 0.01},
        }
        tmp = Path(out + ".tmp")
        tmp.write_text(json.dumps(res, separators=(",", ":")))
        tmp.replace(out)
        return None
    except Exception as e:  # noqa: BLE001
        return f"{wav}: {e!r}"


def main() -> None:
    data = Path(sys.argv[1])
    workers = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    jobs = []
    for vdir in sorted((data / "audio").iterdir()):
        if not vdir.is_dir():
            continue
        odir = data / "praat" / vdir.name
        odir.mkdir(parents=True, exist_ok=True)
        for wav in sorted(vdir.glob("*.wav")):
            if wav.name.endswith(".tmp.wav"):
                continue
            out = odir / (wav.stem + ".json")
            if not out.exists():
                jobs.append((str(wav), str(out), vdir.name))
    print(f"{len(jobs)} clips to analyse", flush=True)
    errs = 0
    with Pool(workers) as pool:
        for k, err in enumerate(pool.imap_unordered(one, jobs, chunksize=16), 1):
            if err:
                errs += 1
                print(err, flush=True)
            if k % 1000 == 0:
                print(f"{k}/{len(jobs)}", flush=True)
    print(f"done, {errs} errors", flush=True)


if __name__ == "__main__":
    main()
