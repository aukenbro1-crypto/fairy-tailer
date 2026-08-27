#!/usr/bin/env python3
"""Derive #fff4e6 versions of the supplied four paper textures.

White pixels become the exact cream base. Darker texture marks retain their
relative intensity, preserving the original frequency and character.
"""

from pathlib import Path

from PIL import Image


BASE = (255, 244, 230)
ASSET_DIR = Path(__file__).resolve().parents[1] / "server" / "templates" / "assets" / "book"


def recolor(source: Image.Image) -> Image.Image:
    bands = source.convert("RGB").split()
    return Image.merge(
        "RGB",
        tuple(band.point([round(channel * value / 255) for value in range(256)]) for band, channel in zip(bands, BASE)),
    )


for index in range(1, 5):
    source_path = ASSET_DIR / f"hardcover-paper-{index}.jpg"
    target_path = ASSET_DIR / f"cream-speckle-paper-{index}.jpg"
    with Image.open(source_path) as source:
        recolor(source).save(target_path, "JPEG", quality=95, subsampling=0, optimize=True)
    print(target_path)
