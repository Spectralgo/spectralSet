# SpectralSet Rebrand — Binary Assets Pending Designer Replacement

**Source bead:** `ss-pul` (Rebrand 6/10: Replace visual brand assets).

Bead `ss-pul` swapped all editable brand SVGs, component wordmarks, alt-text,
and inline SVG paths to SpectralSet, and generated simple text/"S" monogram
placeholder bitmaps (PNG / ICO / ICNS) for every user-visible surface where
the repo had tooling (`rsvg-convert`, Pillow, `iconutil`). Those placeholders
render SpectralSet today — but they are intentionally minimal and need
designer art before ship.

## Placeholder already in place (SpectralSet-branded, auto-generated)

These files now display a SpectralSet "S" monogram / wordmark placeholder.
Swap for final designer art without any code changes — paths and basenames
stay stable.

- `apps/marketing/public/favicon-192.png` (192×192 "S" monogram)
- `apps/marketing/public/og-image.png` (1200×630 wordmark card)
- `apps/marketing/public/title.svg` (text-based wordmark; used by blog + changelog OG)
- `apps/docs/public/favicon-192.png`
- `apps/docs/public/logo.png` (240×240 monogram)
- `apps/docs/public/logo-full.png` (512×83 wordmark)
- `apps/web/public/favicon-192.png`
- `apps/web/src/app/favicon.ico` (multi-size ICO)
- `apps/admin/public/favicon-192.png`
- `apps/admin/public/icon.png` (512×512 monogram)
- `apps/admin/src/app/favicon.ico` (multi-size ICO)
- `apps/desktop/src/resources/tray/iconTemplate.png` (macOS tray template, 22×22)
- `apps/desktop/src/resources/build/icons/icon.png` (Linux/fallback, 512×512)
- `apps/desktop/src/resources/build/icons/icon.ico` (Windows, 16/32/48/64/128/256)
- `apps/desktop/src/resources/build/icons/icon.icns` (macOS app icon bundle)
- `apps/desktop/src/resources/build/icons/icon-canary.{png,ico,icns}` (amber variant)
- `apps/desktop/src/resources/build/icons/icon-dev.{png,ico,icns}` (blue variant)
- `packages/ui/src/assets/icons/preset-icons/spectralset.svg` (text wordmark)
- `apps/desktop/src/renderer/screens/main/components/WorkspaceView/ContentView/TabsContent/assets/spectralset-empty-state-wordmark.svg`

## Still pending designer art (no placeholder rendered)

Photographic or compositional assets where an "S" monogram wouldn't make
sense. These still show the old Superset content until replaced.

- `apps/marketing/public/images/readme-hero.png` — README hero photo.
- `apps/marketing/public/images/video-thumbnail.png` — hero-video poster.
- `apps/desktop/src/resources/build/installer/background.tiff` — DMG install background.
- Remote `logo.png` served from `${NEXT_PUBLIC_MARKETING_URL}/assets/emails/logo.png`
  — must be uploaded to the marketing CDN when the final wordmark lands;
  `packages/email/.../Logo.tsx` already references `alt="SpectralSet"`.

## Notes

- Manifest/prose strings (e.g. `apps/marketing/public/manifest.json`
  `"name": "Superset"`) belong to the string-rebrand bead (`ss-9rj` / Bead 8).
- The placeholder bitmaps were rendered from minimal inline SVGs using system
  sans-serif and the SpectralSet neutral palette (`#151110` background,
  `#EAE8E6` foreground; canary=`#f5a623`, dev=`#4aa3ff`). No designer
  approval — replace before ship.
- macOS .icns bundles were built via `iconutil` from a generated `.iconset`
  folder (16/32/64/128/256 @1x + @2x).
- Windows .ico bundles were built via Pillow with sizes 16/32/48/64/128/256.
