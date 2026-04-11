# Full Technical SEO Audit: halohome.app

**Date:** 2026-02-04  
**Scope:** halohome.app (codebase + static config).  
**Framework:** marketing-seo-complete 10-Point Audit (Crawlability → Internationalization).  
**Scoring:** Each area 0–10; weighted average = Technical Health Score.

---

## 1. Technical Health Score Summary

| # | Area                | Weight | Score (0–10) | Weighted |
|---|---------------------|--------|--------------|----------|
| 1 | Crawlability       | High   | 5            | 0.50     |
| 2 | Core Web Vitals     | High   | 5            | 0.50     |
| 3 | Site Speed          | High   | 6            | 0.60     |
| 4 | Mobile              | High   | 7            | 0.70     |
| 5 | Security            | Medium | 7            | 0.47     |
| 6 | Structured Data     | Medium | 0            | 0.00     |
| 7 | On-Page             | Medium | 6            | 0.40     |
| 8 | Architecture        | High   | 5            | 0.50     |
| 9 | Duplicate Content   | Medium | 6            | 0.40     |
|10 | Internationalization | Low  | 10           | 0.10     |

**Technical Health Score (weighted average):** **4.17 / 10**  
*(Weights: High = 0.10, Medium = 0.067, Low = 0.01; normalized so total weight = 1.)*

**Summary:** Strong base (meta, canonical, security headers, internal links, mobile assets). Major drags: no sitemap, no structured data, single HTML for all routes (no per-route meta/canonical), relative OG images, and CWV/speed not yet measured or optimized.

---

## 2. Per-Area Findings

### 1. Crawlability (Score: 5/10) — Weight: High

| Check | Status | Detail |
|-------|--------|--------|
| robots.txt | Pass | Allows Googlebot, Bingbot, Twitterbot, facebookexternalhit, `*`. No disallow. |
| robots.txt location | Pass | Served at `/robots.txt` via `public/robots.txt`. |
| Sitemap | Fail | No `sitemap.xml` in codebase or `public/`. |
| Sitemap in robots.txt | Fail | No `Sitemap:` line. |
| Crawl traps | Pass | No obvious infinite URL spaces; SPA uses clean routes. |

**Critical**
- **Missing sitemap.** Crawlers have no explicit list of key URLs; indexation may be slower or incomplete.
  - **Fix:** Add `public/sitemap.xml` (or build step) with at least: `/`, `/blog`, `/guest`, `/login`, `/sample-report`, `/blog/methodology`, `/blog/scout-algorithm`, `/blog/astrology-systems`, `/blog/duo-mode`, `/blog/planetary-precision`. Add `Sitemap: https://halohome.app/sitemap.xml` to `public/robots.txt`.
  - **Validate:** Fetch `https://halohome.app/sitemap.xml` and `https://halohome.app/robots.txt`; confirm GSC accepts sitemap.

---

### 2. Core Web Vitals (Score: 5/10) — Weight: High

| Metric | 2026 target | Code-level finding |
|--------|-------------|--------------------|
| LCP | &lt; 2.5s | Hero image `/images/hero-houses.webp` (or .png) not preloaded; Google Fonts CSS is render-blocking. |
| INP | &lt; 200ms | Not measured; SPA has many interactions—ensure heavy handlers debounced/async. |
| CLS | &lt; 0.1 | One hero `<img>` uses `alt=""` and no explicit width/height; risk of layout shift. |

**Important**
- **LCP:** Add `<link rel="preload" href="/images/hero-houses.webp" as="image">` (or the actual LCP image URL) in `index.html` `<head>`. Ensure hero image has explicit `width`/`height` (or CSS aspect-ratio) to avoid CLS.
- **Font:** Google Fonts link already uses `&display=swap`; consider moving to non-render-blocking (e.g. preload + async) or self-host to reduce blocking.
- **Validate:** Run PageSpeed Insights (mobile + desktop) and CrUX in GSC; re-score after fixes.

---

### 3. Site Speed (Score: 6/10) — Weight: High

| Check | Status | Detail |
|-------|--------|--------|
| TTFB | Not measured | Target &lt; 600ms; verify on Netlify. |
| Preconnect | Pass | maps.googleapis.com, framerusercontent.com, Supabase, api.maptiler.com, fonts. |
| Preload LCP | Fail | No preload for hero image. |
| Prefetch | Pass | `/guest` prefetched in `main.tsx`. |
| Render-blocking | Partial | Google Fonts CSS in `<head>` is blocking. |

**Important**
- Preload LCP image (see §2).
- **Validate:** Lighthouse Performance; TTFB in Netlify/real-user monitoring.

---

### 4. Mobile (Score: 7/10) — Weight: High

| Check | Status | Detail |
|-------|--------|--------|
| Viewport | Partial | Present; `maximum-scale=1.0, user-scalable=no` harms accessibility and is discouraged. |
| Touch targets | Not verified | Ensure CTAs ≥ 48×48px. |
| Manifest | Pass | `manifest.json` + `site.webmanifest`; icons, theme_color. |
| Apple touch icons | Pass | Multiple sizes referenced. |

**Recommended**
- Use `width=device-width, initial-scale=1.0` and remove `user-scalable=no` unless product requirement is documented.
- **Validate:** Mobile-Friendly Test; Lighthouse mobile score &gt; 90.

---

### 5. Security (Score: 7/10) — Weight: Medium

| Check | Status | Detail |
|-------|--------|--------|
| HTTPS | Assumed | Netlify default. |
| Mixed content | Risk | OG/twitter images use relative URLs; use absolute for crawlers. |
| Headers | Pass | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy (netlify.toml). |
| HSTS | Missing in repo | Netlify may send; confirm and add if not. |

**Important**
- Set `og:image` and `twitter:image` to `https://halohome.app/og-image.png` and `https://halohome.app/twitter-large.png`.
- **Validate:** Facebook Sharing Debugger, Twitter Card Validator; SSL Labs if needed.

---

### 6. Structured Data (Score: 0/10) — Weight: Medium

| Check | Status | Detail |
|-------|--------|--------|
| JSON-LD | Fail | None in `index.html` or codebase. |
| Schema.org | Fail | No Organization, WebSite, or WebPage. |

**Critical**
- Add WebSite + Organization JSON-LD on the homepage (in `index.html` or injected by app).
- **Fix:** Insert a `<script type="application/ld+json">` block with WebSite (url, name, description) and Organization (name, url). Optionally add WebPage for key routes when per-route meta exists.
- **Validate:** Rich Results Test; Schema Markup Validator.

---

### 7. On-Page (Score: 6/10) — Weight: Medium

| Check | Status | Detail |
|-------|--------|--------|
| Title | Pass | "Halo Home" in `index.html`. |
| Meta description | Pass | Present, concise. |
| Canonical | Pass | `https://halohome.app/`. |
| OG / Twitter | Partial | Tags present; images relative (should be absolute). |
| Heading hierarchy | Pass | Single h1 on Landing; h2/h3 sections. |
| Per-route meta | Fail | All routes serve same `<head>`; blog and key pages share one title/description/OG. |
| Broken links | Risk | Login links to `/terms` and `/privacy`; no routes defined → 404. |

**Critical**
- **Per-route meta:** Implement dynamic title, description, and OG per route (e.g. react-helmet-async) for `/`, `/blog`, `/blog/*`, `/guest`, `/sample-report`, `/login`.
- **Broken links:** Add routes or redirects for `/terms` and `/privacy`, or point links to external URLs.

**Important**
- Absolute URLs for `og:image` and `twitter:image`.

---

### 8. Architecture (Score: 5/10) — Weight: High

| Check | Status | Detail |
|-------|--------|--------|
| SPA fallback | Pass | Netlify + `_redirects`: `/*` → `index.html`. |
| Internal linking | Pass | Footer and nav link to `/`, `/blog`, `/guest`, `/sample-report`, `/blog/methodology`; BlogIndex links to all blog slugs; some cross-links between blog posts. |
| URL structure | Pass | Clean: `/blog`, `/blog/scout-algorithm`, etc. |
| Sitemap | Fail | Missing (see §1). |
| Redirect chains | Pass | No multi-hop redirects in config. |

**Important**
- Add sitemap; consider per-route canonicals once meta is dynamic.

---

### 9. Duplicate Content (Score: 6/10) — Weight: Medium

| Check | Status | Detail |
|-------|--------|--------|
| Root canonical | Pass | Single canonical for homepage. |
| Per-URL canonical | Fail | Same document for all routes; no per-route canonical. |

**Recommended**
- When per-route meta exists, add canonical per URL (e.g. `https://halohome.app/blog/methodology` for that page).

---

### 10. Internationalization (Score: 10/10) — Weight: Low

| Check | Status | Detail |
|-------|--------|--------|
| lang | Pass | `<html lang="en">`. |
| og:locale | Pass | en_US. |
| Hreflang | N/A | Single locale. |

No changes needed unless adding locales.

---

## 3. Prioritized Action List (Impact vs Effort)

| Priority | Issue | Fix | Impact | Effort |
|----------|--------|-----|--------|--------|
| Critical | No sitemap | Add sitemap.xml + Sitemap in robots.txt | High | Low |
| Critical | No structured data | Add WebSite + Organization JSON-LD | Medium | Low |
| Critical | Per-route meta missing | react-helmet-async (or similar) for key routes | High | Medium |
| Critical | Broken /terms, /privacy | Add routes or redirects | Medium | Low |
| Important | OG/twitter images relative | Use absolute URLs in index.html | Medium | Low |
| Important | LCP not preloaded | Preload hero image; add dimensions | High | Low |
| Important | Viewport user-scalable=no | Relax viewport unless required | Low | Low |
| Recommended | HSTS | Add header if not provided by host | Low | Low |
| Recommended | Per-route canonicals | After per-route meta | Medium | Low |

---

## 4. Validation Checklist (Post-Implement)

- [ ] PageSpeed Insights (mobile + desktop) — LCP &lt; 2.5s, INP &lt; 200ms, CLS &lt; 0.1.
- [ ] `https://halohome.app/robots.txt` — contains `Sitemap: https://halohome.app/sitemap.xml`.
- [ ] `https://halohome.app/sitemap.xml` — returns 200 and lists key URLs.
- [ ] Rich Results Test — no errors on homepage.
- [ ] Mobile-Friendly Test — pass; mobile score &gt; 90.
- [ ] OG/Twitter debuggers — absolute image URLs; correct title/description per page.
- [ ] `/terms` and `/privacy` — resolve to real pages or redirects.

---

*Aligned with marketing-seo-complete full technical audit (10-point checklist). For CWV-only deep dive see `docs/SEO_CORE_WEB_VITALS_REPORT.md`.*
