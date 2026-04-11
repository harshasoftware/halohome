# Quick SEO Audit: halohome.app

**Date:** 2026-02-04  
**Scope:** halohome.app + codebase (quick audit per marketing-seo-complete skill)  
**Method:** Codebase review + 10-point abbreviated checklist. Live fetch timed out; findings are code/static-asset based.

---

## Executive Summary

| Area              | Status   | Notes |
|-------------------|----------|--------|
| Crawlability      | ✅ Good  | robots.txt allows all; no sitemap |
| Core Web Vitals   | ⚠️ Verify | Not measured here; preconnect/prefetch in place |
| Site speed        | ⚠️ Verify | Render-blocking font; no LCP preload |
| Mobile            | ✅ Good  | Viewport, touch icons, manifest |
| Security          | ⚠️ Partial | Strong headers; no HSTS |
| Structured data   | ❌ Missing | No JSON-LD / schema.org |
| On-page           | ✅ Good  | Title, description, canonical, OG/Twitter |
| Architecture      | ⚠️ Gaps  | SPA; no per-route meta; no sitemap |
| Duplicate content | ✅ OK    | Single canonical for root |
| Internationalization | N/A  | en_US only |

**Overall:** Solid base (meta, canonical, robots, security headers). Main gaps: **no sitemap**, **no structured data**, **OG images relative URLs**, **no per-route meta** for blog/landing, **viewport user-scalable=no** (accessibility).

---

## 1. Crawlability

| Check | Result | Detail |
|-------|--------|--------|
| robots.txt | ✅ | `public/robots.txt` allows Googlebot, Bingbot, Twitterbot, facebookexternalhit, `*`. No disallow. |
| Sitemap | ❌ | No `sitemap.xml` or sitemap reference in codebase. |
| Sitemap in robots.txt | ❌ | robots.txt does not reference a sitemap. |

**Recommendations:**
- Add `sitemap.xml` (static or generated) with at least: `/`, `/blog`, `/guest`, `/login`, and key blog URLs.
- Add `Sitemap: https://halohome.app/sitemap.xml` to `robots.txt`.

---

## 2. Core Web Vitals (Code-Level)

| Signal | Finding |
|--------|---------|
| LCP | No explicit preload for LCP image (hero image in Landing). Font is render-blocking (Google Fonts stylesheet). |
| INP | Not measurable from code; app is React/SPA with many interactions—ensure heavy handlers are debounced/async. |
| CLS | Favicon and layout present; no obvious missing dimensions on critical images in `index.html`. |

**Recommendations:**
- Run PageSpeed Insights (mobile + desktop) and CrUX in GSC; target LCP &lt; 2.5s, INP &lt; 200ms, CLS &lt; 0.1.
- Preload LCP image (e.g. hero image) and consider `font-display: swap` (already in `index.css` for one font; ensure Google Fonts request uses `&display=swap`).
- Add explicit width/height to any above-the-fold images to avoid CLS.

---

## 3. Site Speed

| Check | Result |
|-------|--------|
| Preconnect | ✅ Used for maps.googleapis.com, framerusercontent.com, Supabase, api.maptiler.com, fonts. |
| Preload | ❌ No preload for LCP image or critical font. |
| Prefetch | ✅ `/guest` prefetched from `main.tsx`. |
| Render-blocking | ⚠️ Google Fonts CSS in `<head>` is render-blocking; consider self-host or `display=swap` + async. |

**Recommendations:**
- Add `<link rel="preload" href="/path/to/hero-image" as="image">` for the main hero image.
- Ensure TTFB &lt; 600ms (verify on Netlify; consider edge/cache for `index.html`).

---

## 4. Mobile

| Check | Result |
|-------|--------|
| Viewport | ✅ Present. ⚠️ `maximum-scale=1.0, user-scalable=no` can hurt accessibility and is discouraged (Google). |
| Touch targets | Not verified in code; ensure CTAs ≥ 48×48px. |
| Manifest | ✅ `manifest.json` and `site.webmanifest`; icons and theme_color. |
| Apple touch icons | ✅ Multiple sizes; `apple-touch-icon.png` and `/images/ios/` references. |

**Recommendations:**
- Prefer `width=device-width, initial-scale=1.0` and avoid `user-scalable=no` unless required; document if kept for product reason.
- Run Mobile-Friendly Test and Lighthouse mobile; target mobile score &gt; 90.

---

## 5. Security

| Check | Result |
|-------|--------|
| HTTPS | Assumed (Netlify default). |
| Mixed content | OG/twitter images use relative URLs (`/og-image.png`, `/twitter-large.png`); resolve to absolute on social crawlers. |
| Headers (netlify.toml) | ✅ X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy. |
| HSTS | ❌ Not set in code; Netlify may add; confirm and consider explicit `Strict-Transport-Security` if not. |

**Recommendations:**
- Add `Strict-Transport-Security` (e.g. `max-age=31536000; includeSubDomains`) if not already provided by host.
- Use absolute URLs for `og:image` and `twitter:image` (e.g. `https://halohome.app/og-image.png`) so crawlers don’t resolve relative incorrectly.

---

## 6. Structured Data

| Check | Result |
|-------|--------|
| JSON-LD | ❌ None in `index.html` or found in codebase. |
| Schema.org | ❌ No Organization, WebSite, or WebPage schema. |

**Recommendations:**
- Add WebSite + Organization JSON-LD on the homepage (and optionally WebPage for key routes).
- Validate with Rich Results Test / Schema Markup Validator.

---

## 7. On-Page

| Check | Result |
|-------|--------|
| Title | ✅ "Halo Home" in `index.html`. |
| Meta description | ✅ Present, concise. |
| Canonical | ✅ `https://halohome.app/`. |
| OG tags | ✅ og:title, og:description, og:type, og:image, og:url, og:site_name, og:locale; image dimensions. |
| Twitter cards | ✅ summary_large_image, twitter:site, title, description, image. |
| Heading hierarchy | ✅ Landing has single h1; h2/h3 sections. |

**Gaps:**
- All routes serve same `index.html`; **blog and other public routes have no per-route title/description/OG** (SPA). Crawlers and shares will see only the default “Halo Home” meta.
- OG/twitter images are relative; should be absolute.

**Recommendations:**
- Use a solution for per-route meta (e.g. react-helmet-async or similar) for at least: `/`, `/blog`, `/blog/*`, `/guest`, `/sample-report`, so each has unique title, description, and OG.
- Set `og:image` and `twitter:image` to `https://halohome.app/og-image.png` (and same for twitter asset).

---

## 8. Architecture

| Check | Result |
|-------|--------|
| SPA fallback | ✅ Netlify and `_redirects` send `/*` to `index.html`. |
| Internal linking | Not audited; ensure blog index and key pages link to each other. |
| URL structure | ✅ Clean routes: `/blog`, `/blog/scout-algorithm`, etc. |
| Sitemap | ❌ Missing (see §1). |

**Recommendations:**
- Add sitemap including all public routes and important blog URLs.
- Ensure blog index and articles cross-link for crawl and topical authority.

---

## 9. Duplicate Content

| Check | Result |
|-------|--------|
| Canonical | ✅ Single canonical on root. |
| Per-route canonicals | ❌ Not implemented (same document for all routes). |

For an SPA with one HTML, duplicate content risk is mostly per-URL identity (e.g. `/blog` vs `/`). Once per-route meta and sitemap exist, add per-route canonicals (e.g. canonical for each blog post URL).

---

## 10. Internationalization

| Check | Result |
|-------|--------|
| lang | ✅ `<html lang="en">`. |
| og:locale | ✅ en_US. |
| Hreflang | N/A (single locale). |

No change needed unless you add locales.

---

## Priority Fixes (Abbreviated)

| Priority | Action | Expected benefit |
|----------|--------|-------------------|
| High | Add `sitemap.xml` and reference in robots.txt | Crawlability, indexation. |
| High | Use absolute URLs for `og:image` and `twitter:image` | Correct previews in social and some crawlers. |
| High | Add JSON-LD (WebSite + Organization) on homepage | Rich results eligibility, entity clarity. |
| Medium | Per-route meta (title, description, OG) for key routes | Better snippets and shares for blog/landing. |
| Medium | Consider relaxing viewport (avoid `user-scalable=no`) | Accessibility and mobile UX. |
| Medium | Preload LCP image; ensure font-display swap | LCP and INP. |
| Low | Add HSTS header if not provided by host | Security best practice. |

---

## Validation Checklist (Post-Implement)

- [ ] PageSpeed Insights (mobile + desktop) – LCP, INP, CLS in range.
- [ ] `https://halohome.app/robots.txt` – contains Sitemap line.
- [ ] `https://halohome.app/sitemap.xml` – returns and lists key URLs.
- [ ] Rich Results Test – no errors on homepage.
- [ ] Mobile-Friendly Test – pass.
- [ ] OG/Twitter debuggers – absolute image URLs, correct title/description per page.

---

*Audit follows the marketing-seo-complete quick-audit approach and 10-point technical framework.*  
**In this repo:** Full 10-point audit → `docs/SEO_FULL_TECHNICAL_AUDIT.md`; CWV-only → `docs/SEO_CORE_WEB_VITALS_REPORT.md`.*
