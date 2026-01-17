# Halo Home Pricing Model

## Overview

This document outlines the pricing strategy for Halo Home, accounting for Regrid API integration costs and sustainable business margins.

---

## Regrid API Cost Assumptions

Based on available information:

| Regrid Plan | Annual Cost | Parcel Records | Tiles | Per-Parcel Cost |
|-------------|-------------|----------------|-------|-----------------|
| Standard Self-Serve | ~$12,000/yr | 120,000/yr | 12M/yr | ~$0.10/parcel |
| Premium Self-Serve | ~$18,000/yr | 120,000/yr | 12M/yr | ~$0.15/parcel |
| Enterprise (Custom) | $80,000+/yr | Unlimited* | Unlimited* | Negotiable |

**Key constraints:**
- Overage pricing applies beyond plan limits
- Tiles used for map rendering (multiple tiles per view)
- Each ZIP code search may query 15-50+ parcels depending on density

---

## Cost Per User Action

### Single Property Analysis
| Action | API Calls | Est. Cost |
|--------|-----------|-----------|
| Address lookup | 1 parcel | $0.10-0.15 |
| Property boundary | 1 parcel + tiles | $0.15-0.25 |
| Full Vastu analysis | 1 parcel | $0.10-0.15 |
| **Total** | | **$0.35-0.55** |

### ZIP Code Parcel Scout
| Action | API Calls | Est. Cost |
|--------|-----------|-----------|
| ZIP area query | 20-50 parcels | $2.00-7.50 |
| Tile rendering | ~100-200 tiles | $0.10-0.20 |
| **Total** | | **$2.10-7.70** |

---

## Halo Home Pricing Tiers

### Free Tier - "Explorer"
**Price: $0/month**

| Feature | Limit |
|---------|-------|
| Manual address analysis | 3/month |
| ZIP code scout | None |
| Search history | 7 days |
| Saved properties | 0 |
| Compass overlay | Basic |

**Cost to serve:** ~$1.05-1.65/active user/month
**Strategy:** Loss leader for conversion

---

### Pro Tier - "Homeseeker"
**Price: $9.99/month** (or $99/year - 17% discount)

| Feature | Limit |
|---------|-------|
| Property analysis | 25/month |
| ZIP code scout | 3/month |
| Search history | 90 days |
| Saved properties | 10 |
| Compass overlay | Full |
| Element balance chart | Yes |
| PDF reports | 5/month |
| Priority support | Email |

**Cost to serve:**
- 25 property analyses: ~$8.75-13.75
- 3 ZIP scouts: ~$6.30-23.10
- **Total API cost:** ~$15.05-36.85/month

**Margin analysis at $9.99:**
- If user uses 50% of allowance: ~$7.50-18.40 cost → Break-even to loss
- If user uses 25% of allowance: ~$3.75-9.20 cost → Marginal profit

**Recommendation:** Price at **$14.99/month** or **$149/year**
- At 50% usage: $7.50-18.40 cost → $7.49 to -$3.40 margin
- At 25% usage: $3.75-9.20 cost → $11.24-5.79 margin

---

### Business Tier - "Vastu Consultant"
**Price: $49.99/month** (or $499/year - 17% discount)

| Feature | Limit |
|---------|-------|
| Property analysis | 150/month |
| ZIP code scout | 20/month |
| Search history | Unlimited |
| Saved properties | 100 |
| Client workspaces | 5 |
| White-label reports | Unlimited |
| Bulk CSV export | Yes |
| API access | 500 calls/month |
| Priority support | Chat + Phone |

**Cost to serve:**
- 150 property analyses: ~$52.50-82.50
- 20 ZIP scouts: ~$42.00-154.00
- **Total API cost:** ~$94.50-236.50/month

**Margin analysis at $49.99:**
- At full usage: Significant loss
- At 30% usage: ~$28.35-70.95 cost → $21.64 to -$20.96 margin

**Recommendation:** Price at **$99.99/month** or **$999/year**
- At 30% usage: $28.35-70.95 cost → $71.64-29.04 margin
- At 50% usage: $47.25-118.25 cost → $52.74 to -$18.26 margin

---

### Enterprise Tier - "Developer/Agency"
**Price: Custom ($299+/month)**

| Feature | Limit |
|---------|-------|
| Everything in Business | ✓ |
| Unlimited analyses | ✓ |
| Full API access | Custom limits |
| Dedicated support | ✓ |
| Custom integrations | ✓ |
| SLA guarantee | 99.9% |
| Training | Included |

**Strategy:** Custom pricing based on expected volume with 40%+ margin target.

---

## Recommended Final Pricing

| Tier | Monthly | Annual | Savings |
|------|---------|--------|---------|
| **Free** | $0 | $0 | - |
| **Pro** | $14.99 | $149 | 17% |
| **Business** | $99.99 | $999 | 17% |
| **Enterprise** | Custom | Custom | - |

---

## Usage-Based Add-ons (Overage Protection)

When users exceed plan limits:

| Add-on | Price | Includes |
|--------|-------|----------|
| Extra Property Pack | $4.99 | 10 analyses |
| Extra Scout Pack | $9.99 | 5 ZIP scouts |
| Unlimited Day Pass | $2.99 | 24-hour unlimited |

---

## Cost Optimization Strategies

### 1. Caching Layer
- Cache parcel data for 24-48 hours
- Popular areas (high-density ZIPs) cached longer
- Reduces duplicate API calls by ~40-60%

### 2. Tiered Data Freshness
- Free: Cached data only (up to 7 days old)
- Pro: Fresh data with 24hr cache
- Business: Real-time data option

### 3. Smart Prefetching
- Prefetch adjacent parcels during scout
- Bundle requests to reduce overhead
- Use tiles API efficiently (request proper zoom levels)

### 4. Usage Throttling
- Soft limits with warnings at 80%
- Hard limits prevent overage
- Encourage annual plans for predictable costs

---

## Revenue Projections

### Conservative Scenario (Year 1)
| Tier | Users | MRR | ARR |
|------|-------|-----|-----|
| Free | 5,000 | $0 | $0 |
| Pro | 200 | $2,998 | $35,976 |
| Business | 20 | $1,999 | $23,988 |
| **Total** | 5,220 | **$4,997** | **$59,964** |

### Estimated Costs (Year 1)
| Item | Annual Cost |
|------|-------------|
| Regrid API (Standard) | $12,000 |
| Infrastructure | $3,600 |
| Support/Operations | $6,000 |
| **Total** | **$21,600** |

**Net margin:** ~$38,364 (64%)

---

## Competitive Analysis

| Competitor | Price | Features |
|------------|-------|----------|
| Generic Vastu apps | Free-$4.99 | No parcel data |
| Real estate APIs | $49-299/mo | No Vastu analysis |
| Halo Home Pro | $14.99/mo | Parcel + Vastu + History |

**Differentiation:** Only solution combining real parcel data with Vastu analysis.

---

## Implementation Notes

1. **Start with Standard Regrid plan** - $12K/year baseline
2. **Implement caching from day 1** - Redis/local cache layer
3. **Monitor API usage weekly** - Track cost per user
4. **Adjust pricing quarterly** - Based on actual usage patterns
5. **Upgrade to Premium/Enterprise** when exceeding 100K parcels/month

---

## Sources

- [Regrid API](https://regrid.com/api)
- [Regrid Self-Serve API Plans](https://app.regrid.com/api/plans)
- [Regrid Pricing](https://regrid.com/pricing)
- [Regrid 2023 Price Change Blog](https://regrid.com/blog/2023-parcel-data-price-change)
