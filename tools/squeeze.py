#!/usr/bin/env python3
"""Squeeze dossier PNGs to <= 262144 bytes at 1280x720, without resizing.
Tries an optimized re-save first, then an adaptive palette (256, then 128
colours). Prints the before/after size of every file. Never touches a file
that is already under the cap."""
import sys
from pathlib import Path
from PIL import Image

CAP = 262144

def squeeze(path: Path) -> None:
    before = path.stat().st_size
    if before <= CAP:
        print(f"{path.name}: {before} B (already under cap)")
        return
    img = Image.open(path)
    # 1. Optimized RGBA/RGB re-save.
    img.save(path, optimize=True)
    size = path.stat().st_size
    if size <= CAP:
        print(f"{path.name}: {before} -> {size} B (optimized)")
        return
    # 2. Adaptive palette.
    for colors in (256, 192, 128):
        pal = img.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
        pal.save(path, optimize=True)
        size = path.stat().st_size
        print(f"{path.name}: {before} -> {size} B (palette {colors})")
        if size <= CAP:
            return
    print(f"{path.name}: STILL OVER CAP at {size} B", file=sys.stderr)
    sys.exit(1)

for name in sorted(Path("screenshots").glob("*.png")):
    squeeze(name)
print("done")
