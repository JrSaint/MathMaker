#!/usr/bin/env python3
"""Resize the MathMaker source icon into the sizes referenced by manifest.json."""
from PIL import Image
import os

SOURCE_PATH = os.path.expanduser('~/Downloads/MathMaker.png')
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

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
    src = Image.open(SOURCE_PATH)
    print(f'source: {src.size} {src.mode}')
    if src.mode != 'RGBA':
        src = src.convert('RGBA')
    for size, name in SIZES:
        out = src.resize((size, size), Image.LANCZOS)
        out_path = os.path.join(OUT_DIR, name)
        out.save(out_path, 'PNG', optimize=True)
        print(f'wrote {out_path}')


if __name__ == '__main__':
    main()
