# SpectralSet Rebrand — Binary Assets Pending Designer Replacement

**Source bead:** `ss-pul` (Rebrand 6/10: Replace visual brand assets).

Bead `ss-pul` swapped all editable brand SVGs, component wordmarks, alt-text,
and inline SVG paths to SpectralSet placeholders (text-based wordmarks marked
with `TODO(ss-pul)`). The binary PNG/ICO/ICNS/TIFF assets below still reference
the old Superset visual identity and need to be regenerated from final
SpectralSet artwork.

Until these are replaced, the running bytes still show the old wordmark — but
every surface that loads them has been re-labelled, re-named, or re-wired so
that dropping in the new file (same path, same basename) is a one-shot swap
with no code changes.

## Marketing site (`apps/marketing/public/`)
- `images/readme-hero.png` — README hero image.
- `images/video-thumbnail.png` — hero-video poster frame.
- `og-image.png` — default social/OG card (1200×630).
- `favicon-192.png` — PWA icon (192×192).

## Docs site (`apps/docs/public/`)
- `logo.png` — header logo (240×240); consumed by `src/lib/layout.shared.tsx`.
- `logo-full.png` — wide wordmark variant (512×83).
- `favicon-192.png` — docs PWA icon.

## Web app (`apps/web/`)
- `public/favicon-192.png`
- `src/app/favicon.ico`

## Admin app (`apps/admin/`)
- `public/favicon-192.png`
- `public/icon.png`
- `src/app/favicon.ico`

## Desktop (`apps/desktop/`)
- `src/resources/build/icons/icon.icns` — macOS app icon bundle.
- `src/resources/build/icons/icon.ico` — Windows app icon.
- `src/resources/build/icons/icon.png` — Linux/fallback app icon.
- `src/resources/build/icons/icon-canary.{icns,ico,png}` — canary channel.
- `src/resources/build/icons/icon-dev.{icns,ico,png}` — dev channel.
- `src/resources/tray/iconTemplate.png` — macOS tray template.
- `src/resources/build/installer/background.tiff` — DMG background.

## Email (`packages/email/`)
- Remote asset served from `${NEXT_PUBLIC_MARKETING_URL}/assets/emails/logo.png`
  — needs to be uploaded to the marketing CDN alongside the new marketing
  wordmark; component already references `alt="SpectralSet"`.

## Notes

- Manifest/prose strings (e.g. `apps/marketing/public/manifest.json`
  `"name": "Superset"`) are owned by the string-rebrand bead (`ss-9rj` / Bead 8).
- OG card backgrounds rendered at request time by
  `apps/marketing/src/app/{blog,changelog}/[slug]/opengraph-image.tsx` now use
  the SpectralSet placeholder `title.svg`; they will automatically pick up the
  final wordmark once `title.svg` is replaced.
- Shared UI wordmark (`packages/ui/src/assets/icons/preset-icons/spectralset.svg`)
  is a text-based SVG placeholder and can be replaced in-place when art lands.
