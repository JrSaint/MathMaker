#!/usr/bin/env python3
"""Resize the MathMaker source icon for iOS and PWA tiles.

iOS shows transparent corners as a black wrapper when an icon is added to
the Home Screen, so this script composites the source PNG onto a solid
light-blue background (sampled to match the design's interior) and saves
opaque, edge-to-edge PNGs at the sizes the manifest references.
"""
from PIL import Image
import os

SOURCE_PATH = os.path.expanduser('~/Downloads/MathMaker.png')
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# Approximate light-blue background sampled from the design's interior
# (slightly biased toward the lighter top of the source's gradient).
BG_COLOR = (200, 226, 252)

SIZES = [
    (180, 'icon-180.png'),
    (192, 'icon-192.png'),
    (256, 'icon-256.png'),
    (512, 'icon-512.png'),
    (1024, 'icon-1024.png'),
]


def main():
    if not os.path.exists(SOURCE_PATH):
        raise SystemExit(f'Source icon not found at {SOURCE_PATH}')
    src = Image.open(SOURCE_PATH).convert('RGBA')
    print(f'source: {src.size} {src.mode}')

    # Composite onto a solid background so the result has no alpha. iOS
    # paints transparent pixels black on the Home Screen tile, so we
    # need a fully-opaque image.
    bg = Image.new('RGB', src.size, BG_COLOR)
    bg.paste(src, mask=src.split()[3])

    for size, name in SIZES:
        out = bg.resize((size, size), Image.LANCZOS)
        out_path = os.path.join(OUT_DIR, name)
        out.save(out_path, 'PNG', optimize=True)
        print(f'wrote {out_path}')


if __name__ == '__main__':
    main()
