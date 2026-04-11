# GEO (Generative Engine Optimization) Audit: halohome.app

**Date:** 2026-02-04  
**Framework:** geo-fundamentals skill — optimization for AI-powered search (ChatGPT, Claude, Perplexity, Gemini).  
**Goal:** Be cited in AI responses; content that is clear, authoritative, and easy to extract.

---

## 1. Executive Summary

| Area | Status | Notes |
|------|--------|--------|
| Content elements | Partial | Some summaries and “Last updated”; missing question titles, TL;DR at top, author, in-article FAQ |
| Technical elements | Weak | No Article/FAQPage/Person schema; fast loading via existing setup |
| AI crawler access | OK | robots.txt allows all (no block of GPTBot, PerplexityBot, Claude-Web) |
| Entity / definitions | Partial | Good definitions in product; blog could add more clear, citable definitions |

**Verdict:** Content is useful and structured but not yet optimized for AI citation. Add question-based titles, TL;DR/summaries at top, FAQ sections, author blocks, and structured data to improve GEO.

---

## 2. GEO Content Checklist vs Current Content

### Content Elements

| Element | Required for GEO | Landing | Blog (Methodology, Scout, etc.) |
|---------|-------------------|--------|----------------------------------|
| Question-based titles | Yes | No (brand/feature titles) | No (e.g. “How Our Scout Engine…”) |
| Summary / TL;DR at top | Yes | No | Scout/Duo/Astrology have mid-article summary; none at top |
| Original data with sources | Yes | Testimonials; no cited stats | Scout has comparison numbers; no formal “sources” |
| Expert quotes (name, title) | Yes | No | No |
| FAQ section (3–5 Q&A) | Yes | Yes (5 Q&A in FAQ) | No FAQ in blog posts |
| Clear definitions | Yes | Some in FAQ | Some in body; not in definition-style blocks |
| “Last updated” timestamp | Yes | No | Yes (e.g. “December 2024”) on several posts |
| Author with credentials | Yes | No | No |

### Technical Elements

| Element | Required for GEO | Current |
|---------|-------------------|--------|
| Article schema with dates | Yes | Not implemented |
| Person schema for author | Yes | Not implemented |
| FAQPage schema | Yes | Not implemented (Landing FAQ is present but unschematized) |
| Fast loading (< 2.5s) | Yes | To be confirmed (LCP preload recommended in SEO audit) |
| Clean HTML structure | Yes | Semantic sections; no schema |

### AI Crawler Access

| Crawler | Purpose | robots.txt |
|---------|---------|------------|
| GPTBot | ChatGPT / OpenAI | Allowed (User-agent: * Allow: /) |
| Claude-Web | Claude | Allowed |
| PerplexityBot | Perplexity | Allowed |
| Googlebot | Gemini (shared) | Allowed |

**Recommendation:** Keep AI crawlers allowed if you want AI citations. No change needed unless you decide to block specific bots.

---

## 3. RAG Retrieval Factors (How AI Selects Content)

| Factor | Weight | Current strength |
|--------|--------|-------------------|
| Semantic relevance | ~40% | Good — methodology, Scout, Vastu, Harmony Score are well described |
| Keyword match | ~20% | Moderate — add question-style headings and titles |
| Authority signals | ~15% | Weak — no author, no expert quotes, no schema |
| Freshness | ~10% | OK — “Last updated” on some posts; add dates to more |
| Source diversity | ~15% | Moderate — original product content; could add cited stats |

---

## 4. Content That Gets Cited (Gap Analysis)

| Element | Why it works for GEO | Current use |
|---------|----------------------|-------------|
| Original statistics | Unique, citable | Scout has some numbers; not framed as “data” with source |
| Expert quotes | Authority transfer | None |
| Clear definitions | Easy to extract | Partial; not in consistent definition format |
| Step-by-step guides | Actionable value | Strong (Methodology, Scout) |
| Comparison tables | Structured info | Scout has comparison cards; more tables would help |
| FAQ sections | Direct answers | Landing only; blog posts lack FAQ |

---

## 5. Prioritized Recommendations

### High impact (do first)

1. **Add GEO-optimized blog posts** with:
   - Question-based titles (e.g. “What Is a Harmony Score?”, “What Is Vastu Shastra?”).
   - TL;DR or 2–3 sentence summary at the very top.
   - Clear definition blocks (e.g. “**Harmony Score** is…”).
   - FAQ section (3–5 Q&A) at the end.
   - “Last updated” date and author byline (e.g. “Halo Home Team” or named author with role).

2. **Add FAQ to existing key posts** (e.g. Scout, Methodology, Duo Mode) — 3–5 questions each, with concise answers.

3. **Expose Landing FAQ to crawlers** — Ensure the FAQ section is in the main HTML (it is); add FAQPage schema so AI can parse it.

### Medium impact

4. **Add Article + Person schema** for blog posts (when per-route meta/schema is available): headline, datePublished, dateModified, author (Person with name/url).

5. **Add one or two “expert” or “founder” quotes** in key posts (name + title) to strengthen authority.

6. **Turn key stats into citable lines** — e.g. “Our Scout evaluates 3,000+ cities” with a clear, one-sentence statement and “Source: Halo Home” or similar.

### Lower impact

7. **Question-style H2s** in existing posts where it fits (e.g. “Why does distance calculation matter?”).
8. **Consistent “Last updated”** on all blog posts and, if possible, on the main landing/FAQ area.

---

## 6. New Blog Post(s) Created

- **What Is a Harmony Score? How Halo Home Evaluates Properties** — GEO-optimized post at `/blog/what-is-harmony-score` with question title, TL;DR at top, definitions (Harmony Score, Vastu Shastra, 8 direction zones), 5-question FAQ, author block, and “Last updated.” Serves as the template for future GEO posts.

---

## 7. Measurement (GEO)

| Metric | How to track |
|--------|----------------|
| AI citations | Manually search “[your topic]” in ChatGPT, Perplexity, Claude; check for “Halo Home” or halohome.app. |
| “According to [Brand]” mentions | Same as above. |
| AI-referred traffic | UTM parameters (e.g. `?utm_source=perplexity`) if you add share links or track referrers. |

---

## 8. Anti-Patterns to Avoid

| Don’t | Do |
|-------|----|
| Publish without dates | Add “Last updated” and, where possible, datePublished in schema |
| Vague attributions | Name sources; use “Halo Home analysis” or expert name + title |
| Skip author info | Add author byline and Person schema |
| Thin content | One comprehensive, scannable post per topic (definitions + FAQ + summary) |

---

*Audit follows the geo-fundamentals skill. For traditional SEO see `docs/SEO_FULL_TECHNICAL_AUDIT.md` and `docs/SEO_QUICK_AUDIT.md`.*
