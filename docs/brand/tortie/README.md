# Tortie icon assets

The canonical Tortie mark is the seated sentinel: a watchful cat protected by the three-cut shell. It combines the feline meaning of “tortie” with the product promise of durable, sheltered continuity.

The mark is intentionally freestanding. Do not place it inside a generated rounded square, badge, circle, or other outer chrome.

## Asset map

| Use | Asset |
| --- | --- |
| Canonical transparent source | `master/tortie-master-1024.png` |
| Packaged macOS application icon | `macos/Tortie.icns` |
| macOS source representations | `macos/Tortie.iconset/` |
| Dock and general application PNGs | `dock/` |
| macOS menu-bar template images | `menu-bar/TortieTemplate.png` and `menu-bar/TortieTemplate@2x.png` |
| Menu-bar working source | `menu-bar/TortieTemplate-source.png` |
| Browser and touch icons | `web/` |
| Windows application icon | `windows/Tortie.ico` |

The macOS Dock normally displays the application icon, so `macos/Tortie.icns` is the shipping asset. The files in `dock/` are convenient PNG exports for documentation, launchers, previews, and non-bundled uses.

## Menu-bar use

The menu-bar artwork is a monochrome optical adaptation of the full-color mark. It has wider negative-space seams so the cat and shell remain legible at 18 points. The `Template` filename convention allows macOS to tint it automatically; Electron callers should also mark the loaded native image as a template image.

## Production notes

- All PNGs use transparency and the sRGB color space.
- The master is 1024 × 1024 pixels.
- The `.icns` contains the standard 16, 32, 128, 256, 512, and Retina representations.
- The Windows `.ico` contains 16, 32, 48, 64, 128, and 256 pixel representations.
- The master SHA-256 is `43ab1cbb3924b744ad91915f050aa98af280a54ff081200ef2b9c6ab6eac6d0c`.
- These files are the brand package only; they do not replace the current build icon automatically.

## Provenance

The seated sentinel was made in reference-guided image-edit mode from the selected three-cut shell. Its chroma matte was removed locally, the outer alpha edge was cleaned, and all production sizes were derived deterministically from the preserved 1024-pixel master. The menu-bar template was derived from the same master with an optical monochrome treatment.
