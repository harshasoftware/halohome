# Core Web Vitals Report: halohome.app

**Date:** 2026-02-04  
**Scope:** LCP, INP, CLS (2026 thresholds).  
**Source:** Codebase review; lab/field data to be filled from PageSpeed Insights and CrUX.

---

## 1. 2026 Targets (marketing-seo-complete)

| Metric | Target | Impact |
|--------|--------|--------|
| **LCP** (Largest Contentful Paint) | &lt; 2.5s | Mobile-first indexing threshold |
| **INP** (Interaction to Next Paint) | &lt; 200ms | Replaced FID; user engagement signal |
| **CLS** (Cumulative Layout Shift) | &lt; 0.1 | Layout stability; ranking factor |

**Note:** Use **field data (CrUX)** as source of truth; lab (Lighthouse/PageSpeed) for debugging.

---

## 2. Current Code-Level Findings

### LCP (Largest Contentful Paint)

| Finding | Severity | Location |
|---------|----------|----------|
| LCP candidate not preloaded | High | Hero image is likely LCP: `/images/hero-houses.webp` or `/images/hero-houses.png` (Landing.tsx). No `<link rel="preload">` in `index.html`. |
| Render-blocking font | Medium | `index.html` line ~90: Google Fonts stylesheet loaded in `<head>`; blocks first paint until CSS loads. Query already has `&display=swap`. |
| No fetchpriority on LCP image | Low | Hero `<img>` could use `fetchpriority="high"` when implemented in React (and preload in HTML). |

**Recommended actions**
1. In `index.html` `<head>`, add:
   ```html
   <link rel="preload" href="/images/hero-houses.webp" as="image" />
   ```
   (Use the URL that the browser actually requests first—.webp if supported.)
2. Optionally preload the critical font CSS and load it async, or self-host the font to reduce round-trips.
3. Give the hero `<img>` explicit dimensions (or reserved space via aspect-ratio) to avoid CLS and ensure stable LCP.

**Validation**
- Run PageSpeed Insights (mobile + desktop); check “Largest Contentful Paint” and “Eliminate render-blocking resources.”
- After deploy, confirm CrUX LCP &lt; 2.5s for key URLs.

---

### INP (Interaction to Next Paint)

| Finding | Severity | Location |
|---------|----------|----------|
| Heavy JS on many routes | Medium | SPA with globe, charts, workers; ensure event handlers are short or deferred. |
| No INP-specific audit done | — | Need lab + field data to identify slow interactions. |

**Recommended actions**
1. Run Lighthouse (or Chrome DevTools) and review “Minimize main-thread work” and long tasks.
2. Debounce/throttle search and map handlers; move heavy work to Web Workers (already used for scout/WASM).
3. Monitor INP in CrUX and RUM; target &lt; 200ms.

**Validation**
- Chrome DevTools Performance → record interaction → check “Main thread” and input delay.
- CrUX “Interaction to Next Paint” for origin and key pages.

---

### CLS (Cumulative Layout Shift)

| Finding | Severity | Location |
|---------|----------|----------|
| Hero image without dimensions | Medium | `Landing.tsx`: hero `<img>` has no `width`/`height`; layout can shift when image loads. |
| One hero img with empty alt | Low | `alt=""` is fine for decorative; ensure the visible hero image has descriptive alt and dimensions. |
| Initial loader → content | Low | `#initial-loader` hides; ensure no large layout jump when React mounts (e.g. reserved min-height or smooth transition). |

**Recommended actions**
1. Add explicit `width` and `height` (or CSS `aspect-ratio` + reserved space) to the hero image in Landing so layout is stable before load.
2. Reserve space for above-the-fold images and ads; avoid inserting content above existing content without reservation.
3. Check that fonts don’t cause FOIT/FOUT with large layout shift; `display=swap` is in use.

**Validation**
- Lighthouse “Cumulative Layout Shift”; “Avoid large layout shifts” section.
- CrUX CLS &lt; 0.1.

---

## 3. Summary Table (to fill with data)

| Metric | Target | Lab (PSI) | Field (CrUX) | Status |
|--------|--------|-----------|--------------|--------|
| LCP    | &lt; 2.5s | _Measure_ | _GSC/CrUX_   | ⬜ |
| INP    | &lt; 200ms | _Measure_ | _GSC/CrUX_   | ⬜ |
| CLS    | &lt; 0.1  | _Measure_ | _GSC/CrUX_   | ⬜ |

---

## 4. Next Steps

1. **Measure:** Run PageSpeed Insights on `https://halohome.app/` and key URLs (e.g. `/blog`, `/guest`). Note LCP, INP, CLS and “Opportunities”/“Diagnostics.”
2. **Field data:** In GSC (Experience → Core Web Vitals), review CrUX for LCP, INP, CLS and fix URLs that “Need improvement” or “Poor.”
3. **Implement:** Apply preload + dimensions for LCP image; re-run Lighthouse and confirm improvements.
4. **Monitor:** Track CWV in CrUX and optional RUM; set alert if any metric fails threshold.

---

*Aligned with marketing-seo-complete CWV guide and assets/cwv/core-web-vitals-report template. For full site audit see `docs/SEO_FULL_TECHNICAL_AUDIT.md`.*
