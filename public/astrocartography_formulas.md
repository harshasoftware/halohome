# Comprehensive Astrocartography Formulas (Tropical Zodiac)

## Table of Contents
1. [Preliminaries & Coordinate Systems](#1-preliminaries--coordinate-systems)
2. [Sidereal Time Calculation](#2-sidereal-time-calculation)
3. [Main Planetary Lines (Conjunctions to Angles)](#3-main-planetary-lines-conjunctions-to-angles)
4. [Aspect Lines (Trine, Sextile, Square, Opposition)](#4-aspect-lines-trine-sextile-square-opposition)
5. [Paran Lines (Planet-Planet Intersections)](#5-paran-lines-planet-planet-intersections)
6. [Implementation Notes & Optimizations](#6-implementation-notes--optimizations)
7. [Complete Calculation Workflow](#7-complete-calculation-workflow)
8. [Aspect Angles Reference](#8-aspect-angles-reference)
9. [Benefic/Malefic Classification Matrix](#9-beneficmalefic-classification-matrix)
10. [Conversion: Tropical to Sidereal](#10-conversion-tropical-to-sidereal)
11. [Summary: Complete Calculation Checklist](#11-summary-complete-calculation-checklist)
12. [Changelog](#changelog)

---

## 1. Preliminaries & Coordinate Systems

### 1.1 Input Data

For astrocartography calculations, you need:

- **Birth date/time in UTC** → converted to Julian Date (JD)
- **Planetary positions at birth** (from ephemeris):
  - Right Ascension $\alpha_i$ (in radians)
  - Declination $\delta_i$ (in radians)
- **Geographic coordinates** of any location:
  - Longitude $\lambda$ (east positive, in radians; range $[-\pi, \pi]$)
  - Latitude $\varphi$ (north positive, in radians; range $[-\pi/2, \pi/2]$)

### 1.2 Angle Conversions

**Degrees to Radians:**
$$\text{rad} = \text{deg} \times \frac{\pi}{180}$$

**Radians to Degrees:**
$$\text{deg} = \text{rad} \times \frac{180}{\pi}$$

**Normalize Angle to [0, 2π):**
$$\text{normalize}(a) = ((a \mod 2\pi) + 2\pi) \mod 2\pi$$

**Normalize Angle to (-π, π]:**
$$\text{normalize\_signed}(a) = \text{atan2}(\sin(a), \cos(a))$$

### 1.3 Julian Date Calculation

Given date (year, month, day) and time (hour, minute, second) in UTC:

$$JD = \text{day\_of\_year} + \frac{\text{hour}}{24} + \frac{\text{minute}}{1440} + \frac{\text{second}}{86400} + 2451545.0$$

For a more precise formula (Gregorian calendar):
$$JD = \left\lfloor \frac{1461(y + 4800 + \lfloor (m-14)/12 \rfloor)}{4} \right\rfloor + \left\lfloor \frac{367(m - 2 - 12(\lfloor (m-14)/12 \rfloor))}{12} \right\rfloor + d - \left\lfloor \frac{3(\lfloor (y + 4900 + \lfloor (m-14)/12 \rfloor)/100 \rfloor)}{4} \right\rfloor - 32045 + \frac{\text{UT}}{24}$$

where $y$ = year, $m$ = month (1-12), $d$ = day, UT = hour + minute/60 + second/3600.

---

## 2. Sidereal Time Calculation

Sidereal time is the angle of Earth's rotation, used to convert between celestial and local coordinates.

### 2.1 Greenwich Mean Sidereal Time (GMST)

The standard formula (IAU 1982, in degrees):

$$\theta_{G} = 280.46061837 + 360.98564736629 \times (JD - 2451545.0) + 0.000387933 \times T^2 - \frac{T^3}{38710000}$$

where:
$$T = \frac{JD - 2451545.0}{36525}$$

is the time interval in Julian centuries from J2000.0 epoch.

**Steps:**
1. Reduce $\theta_G$ to range $[0°, 360°)$ using: $\theta_G \leftarrow ((θ_G \mod 360°) + 360°) \mod 360°$
2. Convert to radians: $\theta_G \leftarrow \theta_G \times \pi/180$

### 2.2 Local Sidereal Time (LST)

For any geographic longitude $\lambda$ (in radians):

$$\theta_{\text{local}} = \theta_G + \lambda$$

Normalize back to $[0, 2\pi)$ if needed.

**Physical Interpretation:** The Local Sidereal Time is the Right Ascension of the meridian (north-south line) directly above the observer's location.

---

## 3. Main Planetary Lines (Conjunctions to Angles)

For each planet $i$ with equatorial coordinates $(\alpha_i, \delta_i)$:

### 3.1 Hour Angle

The hour angle $H_i$ measures how far a body is from the meridian:

$$H_i(\lambda) = \theta_{\text{local}} - \alpha_i = \theta_G + \lambda - \alpha_i$$

Normalize to $(-\pi, \pi]$.

**Physical Interpretation:**
- $H_i = 0$ → planet on upper meridian (MC)
- $H_i = \pi$ → planet on lower meridian (IC)
- $H_i = \pm \pi/2$ → planet on horizon (ASC/DSC)

### 3.2 MC Line (Upper Culmination / Midheaven)

**Condition:** $H_i = 0$

**Derivation:**
$$H_i = \theta_G + \lambda - \alpha_i = 0$$
$$\lambda_{\text{MC}} = \alpha_i - \theta_G$$

**Result:** The MC line is a **meridian** (N-S line) at a single longitude for all latitudes.

**Formula:**
$$\boxed{\lambda_{\text{MC}} = \text{normalize}(\alpha_i - \theta_G)}$$

This longitude, when crossed at any latitude, places the planet on your upper meridian (culminating).

### 3.3 IC Line (Lower Culmination / Imum Coeli)

**Condition:** $H_i = \pi$ (or $-\pi$, equivalent)

**Derivation:**
$$H_i = \theta_G + \lambda - \alpha_i = \pi$$
$$\lambda_{\text{IC}} = \alpha_i + \pi - \theta_G$$

**Result:** The IC line is a **meridian** (N-S line) at a single longitude for all latitudes, opposite the MC line.

**Formula:**
$$\boxed{\lambda_{\text{IC}} = \text{normalize}(\alpha_i + \pi - \theta_G)}$$

### 3.4 ASC/DSC Lines (Horizon / Rising and Setting)

**Condition:** Planet is exactly on the horizon: altitude $h = 0$

#### 3.4.1 Altitude Formula (Spherical Astronomy)

Given observer latitude $\varphi$, planet declination $\delta_i$, and hour angle $H_i$:

$$\sin h = \sin \varphi \sin \delta_i + \cos \varphi \cos \delta_i \cos H_i$$

#### 3.4.2 Rising/Setting Condition

Set $h = 0 \Rightarrow \sin h = 0$:

$$0 = \sin \varphi \sin \delta_i + \cos \varphi \cos \delta_i \cos H_i$$

Rearrange:
$$-\sin \varphi \sin \delta_i = \cos \varphi \cos \delta_i \cos H_i$$

Divide both sides by $\cos \varphi \cos \delta_i$ (valid when neither is zero):

$$-\tan \varphi \tan \delta_i = \cos H_i$$

Solve for latitude as a function of longitude:

$$\cos H_i = -\tan \varphi \tan \delta_i$$

$$\tan \varphi = -\frac{\cos H_i}{\tan \delta_i}$$

$$\boxed{\varphi(\lambda) = \arctan\left(-\frac{\cos H_i(\lambda)}{\tan \delta_i}\right)}$$

where $H_i(\lambda) = \theta_G + \lambda - \alpha_i$.

#### 3.4.3 Parametric Line Representation

The ASC/DSC line is a curve traced by:

$$\{(\lambda, \varphi(\lambda)) : \lambda \in [-\pi, \pi]\}$$

where $\varphi(\lambda)$ is computed from the formula above.

**Practical Algorithm:**
```
FOR each longitude λ from -180° to +180° (step 0.5° or 1°):
    H = θ_G + λ - α_i
    IF |tan(δ_i)| > ε (planet not near equator):
        φ = arctan(-cos(H) / tan(δ_i))
        IF |φ| ≤ 90°:
            store point (λ, φ)
        ENDIF
    ELSE:
        φ = 0 (planet near equator, line near equator)
        store point (λ, φ)
    ENDIF
ENDFOR
```

#### 3.4.4 Distinguishing ASC from DSC

Both rising and setting solutions satisfy the horizon equation. To distinguish:

**Method 1: Azimuth Check**

Compute azimuth $A$ (angle measured from north through east):

$$\sin A = \frac{\cos \delta_i \sin H_i}{\cos h}$$

At horizon ($h = 0$):

$$\sin A = \frac{\cos \delta_i \sin H_i}{1} = \cos \delta_i \sin H_i$$

**Classification:**
- **ASC (rising):** $A \approx 90°$ or $\sin A > 0$ and $H_i < 0$ (planet approaching meridian from the east)
- **DSC (setting):** $A \approx 270°$ or $\sin A < 0$ and $H_i > 0$ (planet leaving meridian toward the west)

**Method 2: Hour Angle Sign (Simplified)**

- If $\sin H_i < 0$: Planet is rising (ASC branch)
- If $\sin H_i > 0$: Planet is setting (DSC branch)

#### 3.4.5 Correct Formula Using arctan

The standard formula $\varphi = \arctan\left(-\frac{\cos \delta \cos H}{\sin \delta}\right)$ is robust and returns values directly in the latitude range $[-90°, 90°]$.

**Important Note:** Do NOT use `atan2` for this calculation! The `atan2` function returns angles in $[-180°, 180°]$, which is incorrect for latitude calculations. Use standard `arctan` (or `atan`) which naturally returns values in $[-90°, 90°]$.

**From the altitude equation:**
$$\sin \varphi \sin \delta + \cos \varphi \cos \delta \cos H = 0$$

**Solving for latitude:**
$$\tan \varphi = -\frac{\cos \delta \cos H}{\sin \delta}$$
$$\varphi = \arctan\left(-\frac{\cos \delta \cos H}{\sin \delta}\right)$$

**Edge Cases:**

1. **Degenerate case** ($|\sin \delta| < \epsilon$ AND $|\cos H| < \epsilon$):
   - All latitudes satisfy the horizon equation
   - Draw a full vertical segment from $-89°$ to $+89°$

2. **Polar case** ($|\sin \delta| < \epsilon$ but $\cos H \neq 0$):
   - $\tan \varphi \to \pm\infty$, so $\varphi \to \pm 90°$
   - Sign depends on $-\cos H$: if $\cos H > 0$, $\varphi = -90°$; else $\varphi = +90°$

**Practical Algorithm:**
```
FOR each longitude λ from -180° to +180° (step 0.5° or 1°):
    H = θ_G + λ - α_i
    sin_δ = sin(δ_i)
    cos_δ = cos(δ_i)
    cos_H = cos(H)
    sin_H = sin(H)

    IF sin_H >= 0:  // Not rising (for ASC), skip
        CONTINUE
    ENDIF

    IF |sin_δ| < ε AND |cos_H| < ε:  // Degenerate: all latitudes
        FOR lat = -89 TO 89 STEP 2:
            store point (λ, lat)
        ENDFOR
        CONTINUE
    ENDIF

    IF |sin_δ| < ε:  // Polar case
        φ = (cos_H > 0) ? -90 : 90
        store point (λ, φ)
        CONTINUE
    ENDIF

    // Standard formula using arctan (NOT atan2!)
    tan_φ = (-cos_δ × cos_H) / sin_δ
    φ = arctan(tan_φ) × 180/π
    φ = clamp(φ, -90, 90)  // Safety clamp
    store point (λ, φ)
ENDFOR
```

**References:**
- Sunrise equation: https://en.wikipedia.org/wiki/Sunrise_equation
- Rise/set algorithm: https://www.celestialprogramming.com/risesetalgorithm.html
- Spherical astronomy: https://promenade.imcce.fr/en/pages3/367.html

#### 3.4.6 Circumpolar Regions

**No Rising/Setting at Some Latitudes:**
- If planet declination exceeds $90° - |\varphi|$, planet is circumpolar (never sets)
- If planet declination is less than $-(90° - |\varphi|)$, planet never rises
- These regions have no ASC/DSC lines passing through

---

## 4. Aspect Lines (Trine, Sextile, Square, Opposition)

Aspect lines show locations where a planet forms a specific angular aspect (60°, 90°, 120°, 180°) with an angle (ASC, MC, etc.).

### 4.1 Angular Separation in Spherical Astronomy

The spherical angular distance $d$ between two points on the celestial sphere with coordinates $(\alpha_1, \delta_1)$ and $(\alpha_2, \delta_2)$:

$$\cos d = \sin \delta_1 \sin \delta_2 + \cos \delta_1 \cos \delta_2 \cos(\Delta \alpha)$$

where $\Delta \alpha = \alpha_1 - \alpha_2$ is the Right Ascension difference.

Equivalently:
$$d = \arccos[\sin \delta_1 \sin \delta_2 + \cos \delta_1 \cos \delta_2 \cos(\Delta \alpha)]$$

### 4.2 Aspect Line to MC (Simplest Case)

For planet $i$ forming aspect $A$ (e.g., $A = 120° = 2\pi/3$ for trine) to the MC:

**The MC's Right Ascension at longitude $\lambda$:**
$$\alpha_{\text{MC}} = \theta_G + \lambda$$

**Angular separation:**
$$d = \arccos[\sin \delta_i \sin(0) + \cos \delta_i \cos(0) \cos(\alpha_i - (\theta_G + \lambda))]$$
$$d = \arccos[\cos \delta_i \cos(\alpha_i - \theta_G - \lambda)]$$

**Aspect condition** (with orb $\epsilon$):
$$|d - A| < \epsilon \quad \text{or} \quad |d - (2\pi - A)| < \epsilon$$

The second condition accounts for the "other side" of the aspect (e.g., both trine and quincunx have similar separations).

**Solution:**
For a given aspect $A$, solve for $\lambda$:

$$\cos(\alpha_i - \theta_G - \lambda) = \frac{\cos A}{\cos \delta_i}$$

If $\left|\frac{\cos A}{\cos \delta_i}\right| \leq 1$:

$$\alpha_i - \theta_G - \lambda = \pm \arccos\left(\frac{\cos A}{\cos \delta_i}\right)$$

$$\lambda = \alpha_i - \theta_G \mp \arccos\left(\frac{\cos A}{\cos \delta_i}\right)$$

**Two solutions** (±) give two branches of the aspect line (one "before," one "after" the main MC line).

### 4.3 Aspect Line to ASC/DSC (Complex Case)

For aspects to the horizon (ASC/DSC), the angle's position depends on both latitude and longitude, making it a system of equations:

**Planet on horizon AND forming aspect to ASC:**

$$\begin{cases}
\sin h_{\text{planet}} = \sin \varphi \sin \delta_i + \cos \varphi \cos \delta_i \cos H_i = 0 & \text{(on horizon)} \\
d(\text{planet}, \text{ASC}) = A & \text{(aspect condition)}
\end{cases}$$

**Solution Strategy:** Numerical or grid search (see Section 6.3).

### 4.4 Aspect Angle Values

| Aspect | Degrees | Radians | Interpretation |
|--------|---------|---------|-----------------|
| Sextile | 60° | $\pi/3$ ≈ 1.047 | Benefic, supportive |
| Square | 90° | $\pi/2$ ≈ 1.571 | Malefic, tension |
| Trine | 120° | $2\pi/3$ ≈ 2.094 | Benefic, flowing |
| Opposition | 180° | $\pi$ ≈ 3.142 | Malefic, polarized |

**Minor aspects** (optional):
- Semisextile: 30° = $\pi/6$ ≈ 0.524
- Sesquiquadrate: 135° = $3\pi/4$ ≈ 2.356
- Quincunx: 150° = $5\pi/6$ ≈ 2.618

### 4.5 Orb (Tolerance) for Aspects

Orb is the allowed deviation from exact aspect angle:

- **Major aspects** (60°, 90°, 120°, 180°): ±2° orb
- **Minor aspects**: ±1° orb
- **Conversion to radians**: $\text{orb}_{\text{rad}} = \text{orb}_{\text{deg}} \times \pi/180$

**Example:** For a trine (120°) with 2° orb, accept aspects in range $[118°, 122°]$ or $[2.059, 2.129]$ radians.

---

## 5. Paran Lines (Planet-Planet Intersections)

Paran lines represent locations where **two planets are simultaneously angular** (each on an angle).

### 5.1 Paran Definition

A **paran** occurs at a location $(\lambda, \varphi)$ where:
- Planet 1 is on angle $A_1$ (ASC, DSC, MC, or IC)
- Planet 2 is on angle $A_2$ (ASC, DSC, MC, or IC)
- Both conditions are satisfied at the same instant and location

### 5.2 Paran Line as Latitude Circle

When both planets are on meridian angles (MC/IC), the resulting paran is often a **latitude circle** (constant latitude, all longitudes) or a **pair of points**.

**General Result:**
- For most paran combinations, the solution is a **constant latitude**
- The paran line is drawn as a horizontal band across the world map

### 5.3 Paran Calculation: MC/MC Case

**Both planets on MC (or one on MC, one on IC):**

For planet 1 on MC and planet 2 on MC simultaneously:

$$H_1 = \theta_G + \lambda - \alpha_1 = 0 \Rightarrow \lambda = \alpha_1 - \theta_G$$

$$H_2 = \theta_G + \lambda - \alpha_2 = 0 \Rightarrow \lambda = \alpha_2 - \theta_G$$

These two equations have no common solution unless $\alpha_1 = \alpha_2$ (same RA, very rare).

**Resolution:** Parans with both planets on meridian are **rare or non-existent** for distinct planets. Focus on mixed cases.

### 5.4 Paran Calculation: Mixed Case (Horizon + Meridian)

**Planet 1 on ASC/DSC, Planet 2 on MC:**

Planet 2 on MC:
$$\lambda_{\text{fixed}} = \alpha_2 - \theta_G$$

Planet 1 on horizon at this longitude:
$$\varphi = \arctan\left(-\frac{\cos H_1}{\tan \delta_1}\right)$$

where $H_1 = \theta_G + \lambda_{\text{fixed}} - \alpha_1$.

**Result:** A **single point** $(\lambda_{\text{fixed}}, \varphi)$ on the map.

### 5.5 Paran Calculation: Two Horizon Parans (Horizon + Horizon)

**Planet 1 on ASC/DSC, Planet 2 on ASC/DSC:**

Solve the system:

$$\begin{cases}
\varphi = \arctan\left(-\frac{\cos H_1(\lambda)}{\tan \delta_1}\right) \\
\varphi = \arctan\left(-\frac{\cos H_2(\lambda)}{\tan \delta_2}\right)
\end{cases}$$

where $H_i(\lambda) = \theta_G + \lambda - \alpha_i$.

**Solution:** Typically yields 0-4 points (depending on declinations).

**Numeric Solution:**
```
FOR each longitude λ from -180° to +180°:
    φ_1 = arctan(-cos(H_1(λ)) / tan(δ_1))
    φ_2 = arctan(-cos(H_2(λ)) / tan(δ_2))
    IF |φ_1 - φ_2| < ε:  // ε = small tolerance (e.g., 0.1°)
        record paran at (λ, φ_1)
    ENDIF
ENDFOR
```

### 5.6 Common Paran Types (Interpretive)

| Paran Combination | Description | Typical Effect |
|-------------------|-------------|-----------------|
| Venus-MC × Mars-ASC | Love (MC) meets passion (ASC) | Attraction, romantic encounters |
| Jupiter-MC × Saturn-IC | Expansion (MC) meets depth (IC) | Growth tempered by grounding |
| Sun-MC × Moon-IC | Identity (MC) meets emotion (IC) | Balanced self-expression |
| Mercury-ASC × Venus-DSC | Communication (ASC) meets partnership (DSC) | Eloquent relationships |
| Mars-DSC × Saturn-IC | Conflict (DSC) meets discipline (IC) | Relationship challenges requiring maturity |

---

## 6. Implementation Notes & Optimizations

### 6.1 Numerical Stability

**Use atan2 for angles, but NOT for latitude:**

The `atan2(y, x)` function is useful for angle calculations where quadrant matters (returns $[-\pi, \pi]$):

$$\text{atan2}(y, x) = \begin{cases}
\arctan(y/x) & \text{if } x > 0 \\
\arctan(y/x) + \pi & \text{if } x < 0, y \geq 0 \\
\arctan(y/x) - \pi & \text{if } x < 0, y < 0 \\
\pi/2 & \text{if } x = 0, y > 0 \\
-\pi/2 & \text{if } x = 0, y < 0
\end{cases}$$

**⚠️ CRITICAL: For latitude calculation, use arctan (NOT atan2!):**

The horizon latitude formula requires results in $[-90°, 90°]$, not $[-180°, 180°]$:

$$\varphi = \arctan\left(-\frac{\cos \delta \cos H}{\sin \delta}\right)$$

**Why atan2 fails for latitude:**
- `atan2(-cos(δ)cos(H), sin(δ))` returns values in $[-180°, 180°]$
- For planets with negative declination (e.g., Pluto at δ = -23°), this gives wrong quadrant results
- Example: Pluto at H=0 gives -113° instead of correct +67°
- Clamping to [-90°, 90°] distorts the geometry rather than fixing it

**Correct implementation:**
```
tan_phi = (-cos_delta * cos_H) / sin_delta
phi = atan(tan_phi)  // Returns [-90°, 90°] directly
```

### 6.2 Handling Poles and Edge Cases

**Celestial Poles** ($|\delta| = 90°$):
- Circumpolar bodies never rise/set
- Skip ASC/DSC calculations; only compute MC/IC

**Geographic Poles** ($|\varphi| = 90°$):
- All bodies rise and set (except at exact pole)
- Azimuth becomes undefined; handle separately

**Equatorial Planets** ($|\delta| < 0.1°$):
- ASC/DSC lines approach Earth's equator
- Use series expansion: $\varphi \approx -\cos H / \delta$ (first-order)

### 6.3 Grid Resolution for Line Mapping

For drawing smooth curves on a world map:

| Region | Longitude Step | Latitude Step | Notes |
|--------|----------------|---------------|-------|
| Tropics ($|\varphi| < 23.5°$) | 1° | 1° | Standard resolution |
| Mid-latitudes ($23.5° < |\varphi| < 66.5°$) | 0.5° | 0.5° | Curves more complex |
| Polar regions ($|\varphi| > 66.5°$) | 0.25° | 0.25° | High curvature |

**Adaptive Stepping by Declination:**

For ASC/DSC lines, the curve sharpness depends on planetary declination, not geographic latitude:

| Declination | Longitude Step | Points per Line | Notes |
|-------------|----------------|-----------------|-------|
| $|\delta| \geq 10°$ | 1.0° | ~360 | Normal curve, standard step |
| $|\delta| < 10°$ | 0.5° | ~720 | Sharp curves near equator crossing |
| $|\delta| < 5°$ | 0.25° | ~1440 | Very sharp, consider further refinement |

This adaptive approach uses finer resolution only where geometrically necessary, avoiding 4-10x overhead for all planets.

**Interpolation:**
- Compute grid points at coarse resolution (e.g., 2°)
- Interpolate between grid points using Catmull-Rom splines for smooth curves

### 6.4 Ephemeris Data

**Common Ephemerides:**
- **Swiss Ephemeris** (used by Astro.com): High-precision, free, standard in astrology
- **JPL DE430/DE432**: NASA's standard, higher precision
- **VSOP87**: Analytical theory, older but adequate

**Precision Requirements:**
- For astrocartography: 0.01° precision sufficient
- For relocation reading: 1° often adequate (lines are broad)
- For scientific validation: 0.001° (arcsecond) preferred

**Ayanamsa (for Sidereal):**
- Offset between tropical and sidereal zodiac ≈ 24°
- Varies by year due to precession
- Common systems: Lahiri (~24.0°), Fagan-Bradley (~24.4°), DeLuce (~26.4°)

---

## 7. Complete Calculation Workflow

### 7.1 Pseudocode Framework

```
FUNCTION compute_astrocartography_lines(birth_jd, planet_positions):
    """
    Compute all astrocartography lines for a birth chart.
    
    INPUT:
        birth_jd: Julian Date (UTC)
        planet_positions: dict {planet_name: (RA_rad, Dec_rad)}
    
    OUTPUT:
        dict with keys:
            - "planetary_lines": main conjunction lines
            - "aspect_lines": trine, square, etc.
            - "paran_lines": planet-planet intersections
            - "benefic_malefic": classification of each line
    """
    
    results = {
        "planetary_lines": {},
        "aspect_lines": {},
        "paran_lines": [],
        "metadata": {
            "birth_jd": birth_jd,
            "theta_G": None
        }
    }
    
    // Step 1: Compute Greenwich Sidereal Time
    theta_G = compute_gmst(birth_jd)
    results["metadata"]["theta_G"] = theta_G
    
    // Step 2: For each planet, compute main lines (MC, IC, ASC, DSC)
    FOR EACH (planet_name, (alpha, delta)) IN planet_positions:
        results["planetary_lines"][planet_name] = {
            "MC": compute_mc_line(alpha, theta_G),
            "IC": compute_ic_line(alpha, theta_G),
            "ASC": compute_asc_line(alpha, delta, theta_G),
            "DSC": compute_dsc_line(alpha, delta, theta_G)
        }
    ENDFOR
    
    // Step 3: For each planet and aspect type, compute aspect lines
    FOR EACH (planet_name, (alpha, delta)) IN planet_positions:
        FOR EACH aspect_deg IN [60, 90, 120, 180]:  // Sextile, Square, Trine, Opposition
            aspect_rad = aspect_deg * π / 180
            results["aspect_lines"][f"{planet_name}_{aspect_deg}deg"] = 
                compute_aspect_lines(alpha, delta, theta_G, aspect_rad, orb=0.035)
        ENDFOR
    ENDFOR
    
    // Step 4: Compute paran lines
    planet_names = list(planet_positions.keys())
    FOR i = 0 TO len(planet_names) - 2:
        FOR j = i + 1 TO len(planet_names) - 1:
            planet1_name = planet_names[i]
            planet2_name = planet_names[j]
            (alpha1, delta1) = planet_positions[planet1_name]
            (alpha2, delta2) = planet_positions[planet2_name]
            
            FOR EACH angle1 IN ["ASC", "DSC", "MC", "IC"]:
                FOR EACH angle2 IN ["ASC", "DSC", "MC", "IC"]:
                    paran = compute_paran_line(
                        alpha1, delta1, alpha2, delta2,
                        theta_G, angle1, angle2
                    )
                    IF paran IS NOT NULL:
                        results["paran_lines"].APPEND({
                            "planets": f"{planet1_name}_{angle1}-{planet2_name}_{angle2}",
                            "location": paran,
                            "benefic": classify_paran_benefic(planet1_name, planet2_name)
                        })
                    ENDIF
                ENDFOR
            ENDFOR
        ENDFOR
    ENDFOR
    
    RETURN results
ENDFUNCTION
```

### 7.2 Key Subroutines

```
FUNCTION compute_gmst(birth_jd):
    T = (birth_jd - 2451545.0) / 36525.0
    theta_G = 280.46061837 + 360.98564736629 * (birth_jd - 2451545.0) \
            + 0.000387933 * T^2 - T^3 / 38710000
    theta_G = normalize(theta_G * π / 180)
    RETURN theta_G
ENDFUNCTION

FUNCTION compute_mc_line(alpha, theta_G):
    lambda_mc = normalize(alpha - theta_G)
    RETURN {
        "longitude": lambda_mc * 180 / π,
        "description": "MC line (meridian, all latitudes)"
    }
ENDFUNCTION

FUNCTION compute_ic_line(alpha, theta_G):
    lambda_ic = normalize(alpha + π - theta_G)
    RETURN {
        "longitude": lambda_ic * 180 / π,
        "description": "IC line (meridian, all latitudes)"
    }
ENDFUNCTION

FUNCTION compute_asc_line(alpha, delta, theta_G):
    """
    Compute ASC (rising) line using arctan formula (NOT atan2!).
    Handles edge cases when sin(δ) ≈ 0.
    """
    line_points = []
    sin_delta = sin(delta)
    cos_delta = cos(delta)
    EPS = 1e-9

    FOR lambda_deg = -180 TO 180 STEP 1:
        lambda_rad = lambda_deg * π / 180
        H = normalize_signed(theta_G + lambda_rad - alpha)

        cos_H = cos(H)
        sin_H = sin(H)

        IF sin_H >= 0:  // Not rising, skip
            CONTINUE
        ENDIF

        // Degenerate case: all latitudes satisfy horizon equation
        IF |sin_delta| < EPS AND |cos_H| < EPS:
            FOR lat = -89 TO 89 STEP 2:
                line_points.APPEND((lambda_deg, lat))
            ENDFOR
            CONTINUE
        ENDIF

        // Polar case: sin(δ) ≈ 0, tan(φ) → ±∞
        IF |sin_delta| < EPS:
            phi_deg = (cos_H > 0) ? -90 : 90
            line_points.APPEND((lambda_deg, phi_deg))
            CONTINUE
        ENDIF

        // Standard formula: φ = arctan(-cos(δ)cos(H) / sin(δ))
        // Use arctan (NOT atan2!) to get result in [-90°, 90°]
        tan_phi = (-cos_delta * cos_H) / sin_delta
        phi = arctan(tan_phi)
        phi_deg = clamp(phi * 180 / π, -90, 90)
        line_points.APPEND((lambda_deg, phi_deg))
    ENDFOR

    RETURN {
        "type": "ASC",
        "line": line_points
    }
ENDFUNCTION

FUNCTION compute_dsc_line(alpha, delta, theta_G):
    """
    Compute DSC (setting) line using arctan formula (NOT atan2!).
    Same as ASC but with sin_H > 0 (setting condition).
    """
    line_points = []
    sin_delta = sin(delta)
    cos_delta = cos(delta)
    EPS = 1e-9

    FOR lambda_deg = -180 TO 180 STEP 1:
        lambda_rad = lambda_deg * π / 180
        H = normalize_signed(theta_G + lambda_rad - alpha)

        cos_H = cos(H)
        sin_H = sin(H)

        IF sin_H <= 0:  // Not setting, skip
            CONTINUE
        ENDIF

        // Degenerate case: all latitudes satisfy horizon equation
        IF |sin_delta| < EPS AND |cos_H| < EPS:
            FOR lat = -89 TO 89 STEP 2:
                line_points.APPEND((lambda_deg, lat))
            ENDFOR
            CONTINUE
        ENDIF

        // Polar case: sin(δ) ≈ 0, tan(φ) → ±∞
        IF |sin_delta| < EPS:
            phi_deg = (cos_H > 0) ? -90 : 90
            line_points.APPEND((lambda_deg, phi_deg))
            CONTINUE
        ENDIF

        // Standard formula: φ = arctan(-cos(δ)cos(H) / sin(δ))
        // Use arctan (NOT atan2!) to get result in [-90°, 90°]
        tan_phi = (-cos_delta * cos_H) / sin_delta
        phi = arctan(tan_phi)
        phi_deg = clamp(phi * 180 / π, -90, 90)
        line_points.APPEND((lambda_deg, phi_deg))
    ENDFOR

    RETURN {
        "type": "DSC",
        "line": line_points
    }
ENDFUNCTION

FUNCTION compute_aspect_lines(alpha, delta, theta_G, aspect_rad, orb=0.035):
    """Aspect lines to MC (simplest case)"""
    lines = {"MC": [], "IC": []}
    
    FOR lambda_deg = -180 TO 180 STEP 0.5:
        lambda_rad = lambda_deg * π / 180
        
        // MC: planet's aspect to LST
        theta_mc = theta_G + lambda_rad
        alpha_diff = normalize_signed(alpha - theta_mc)
        
        // Angular separation (use arccos for robustness)
        cos_sep = cos(delta) * cos(alpha_diff)
        sep = acos(clamp(cos_sep, -1, 1))
        
        // Check if within aspect ± orb
        IF |sep - aspect_rad| < orb OR |sep - (2π - aspect_rad)| < orb:
            H = theta_mc - alpha
            TRY:
                sin_delta = sin(delta)
                cos_delta = cos(delta)
                IF |sin_delta| > 1e-10:
                    // Use atan (NOT atan2!) for latitude in [-90°, 90°]
                    tan_phi = (-cos_delta * cos(H)) / sin_delta
                    phi = atan(tan_phi)
                    lines["MC"].APPEND((lambda_deg, phi * 180 / π))
                ENDIF
            CATCH:
                CONTINUE
            ENDTRY
        ENDIF
    ENDFOR
    
    RETURN lines
ENDFUNCTION

FUNCTION compute_paran_line(alpha1, delta1, alpha2, delta2, theta_G, angle1, angle2):
    """Compute paran where planet 1 is on angle1 AND planet 2 is on angle2"""
    
    // Case: Planet 1 on ASC/DSC, Planet 2 on MC
    IF angle1 IN ["ASC", "DSC"] AND angle2 == "MC":
        lambda_fixed = normalize(alpha2 - theta_G)

        H1 = theta_G + lambda_fixed - alpha1
        TRY:
            sin_delta1 = sin(delta1)
            cos_delta1 = cos(delta1)
            IF |sin_delta1| > 1e-10:
                // Use atan (NOT atan2!) for latitude in [-90°, 90°]
                tan_phi = (-cos_delta1 * cos(H1)) / sin_delta1
                phi_paran = atan(tan_phi)
                RETURN {
                    "latitude": phi_paran * 180 / π,
                    "longitude": lambda_fixed * 180 / π,
                    "type": f"{angle1}-{angle2}"
                }
            ENDIF
        CATCH:
            RETURN NULL
        ENDTRY
    ENDIF
    
    // Additional paran cases...
    // (Implement for all 16 angle combinations)
    
    RETURN NULL
ENDFUNCTION
```

---

## 8. Aspect Angles Reference

### 8.1 Major Aspects

| Aspect | Degrees | Radians | Approximate | Interpretation |
|--------|---------|---------|-------------|-----------------|
| **Conjunction** | 0° | 0 | 0 | Exact overlap (main lines) |
| **Sextile** | 60° | π/3 | 1.047 | Benefic, harmonious support |
| **Square** | 90° | π/2 | 1.571 | Malefic, internal tension |
| **Trine** | 120° | 2π/3 | 2.094 | Benefic, flowing ease |
| **Opposition** | 180° | π | 3.142 | Malefic, polarized dynamics |

### 8.2 Minor Aspects

| Aspect | Degrees | Radians | Approximate | Interpretation |
|--------|---------|---------|-------------|-----------------|
| **Semisextile** | 30° | π/6 | 0.524 | Subtle support |
| **Quintile** | 72° | 2π/5 | 1.257 | Creative expression |
| **Sesquiquadrate** | 135° | 3π/4 | 2.356 | Mild friction |
| **Quincunx** | 150° | 5π/6 | 2.618 | Adjustment needed |
| **Semisquare** | 45° | π/4 | 0.785 | Mild challenge |

### 8.3 Orb Recommendations

| Aspect Category | Typical Orb | In Radians |
|-----------------|-------------|-----------|
| **Major Aspects (60°, 90°, 120°, 180°)** | ±2° | ±0.035 |
| **Minor Aspects** | ±1° | ±0.0175 |
| **Tight Aspects (conjunction)** | ±0.5° | ±0.0087 |
| **Wide Aspects (for maps)** | ±3° | ±0.0524 |

---

## 9. Benefic/Malefic Classification Matrix

### 9.1 Full Classification Table

| Planet | Inherent Nature | Main Line Quality | Trine Effect | Square Effect | Exaltation Sign | Detriment Sign | Domicile |
|--------|-----------------|-------------------|--------------|---------------|-----------------|----------------|----------|
| **Sun** | Neutral/Benefic | Vitality, visibility, identity | Enhanced confidence | Ego conflicts, overexposure | Aries | Libra | Leo |
| **Moon** | Neutral | Emotional anchoring, instinct, home | Emotional ease, comfort | Mood instability, sensitivity | Taurus | Scorpio | Cancer |
| **Mercury** | Neutral/Benefic | Communication, learning, networking | Clear expression, quick wit | Mental confusion, miscommunication | Virgo | Sagittarius | Gemini, Virgo |
| **Venus** | **Benefic** | Love, beauty, harmony, pleasure | Amplified attraction, grace | Relational tension, jealousy | Pisces | Virgo | Taurus, Libra |
| **Mars** | **Malefic** | Drive, conflict, passion, aggression | Directed ambition, courage | Explosive anger, recklessness | Capricorn | Cancer | Aries, Scorpio |
| **Jupiter** | **Benefic** | Expansion, luck, growth, opportunity | Abundant blessings, success | Excess, overconfidence, waste | Cancer | Gemini | Sagittarius |
| **Saturn** | **Malefic** | Discipline, work, limits, responsibility | Structured success, perseverance | Restriction, delay, depression | Libra | Aries | Capricorn |
| **Uranus** | Modern Malefic | Innovation, sudden change, technology | Breakthrough ideas, liberation | Instability, shock, rebellion | Scorpio | Leo | Aquarius |
| **Neptune** | Modern Malefic | Spirituality, illusion, compassion | Inspired creativity, transcendence | Deception, escapism, confusion | Cancer | Virgo | Pisces |
| **Pluto** | Modern Malefic | Transformation, power, death/rebirth | Deep regeneration, empowerment | Power struggles, obsession, loss | Aries | Taurus | Scorpio |

### 9.2 Sect Effects (Day vs Night Birth)

**Diurnal Chart** (Sun above horizon at birth):
- **Sect Benefic:** Sun, Jupiter
- **Sect Malefic:** Mars, Saturn
- **Neutral:** Moon, Mercury, Venus, modern planets

**Nocturnal Chart** (Sun below horizon at birth):
- **Sect Benefic:** Moon, Venus
- **Sect Malefic:** Mars, Saturn
- **Neutral:** Sun, Mercury, Jupiter, modern planets

**Application:** A benefic in sect (aligned with day/night) is stronger; malefic in sect is more challenging.

### 9.3 Interpretive Combinations

| Planetary Influence | Main Line | Trine Aspect | Square Aspect | Paran with Benefic | Paran with Malefic |
|-------------------|-----------|--------------|---------------|-------------------|-------------------|
| Venus (benefic) | Romance, charm | Irresistible attraction | Love conflicts | Enhanced pleasure | Complicated love |
| Mars (malefic) | Drive, conflict | Productive ambition | Rash aggression | Passionate energy | Destructive conflict |
| Jupiter (benefic) | Growth, luck | Easy expansion | Careless excess | Abundant fortune | Lucky escapes from trouble |
| Saturn (malefic) | Discipline, work | Solid achievement | Restriction | Hard-won success | Isolated struggle |
| Neptune (malefic) | Spirituality, illusion | Artistic inspiration | Deceptive fog | Creative awakening | Spiritual confusion |
| Pluto (malefic) | Power, rebirth | Transformative power | Power struggles | Deep healing | Obsessive control |

---

## 10. Conversion: Tropical to Sidereal

### 10.1 Ayanamsa (Tropical-Sidereal Offset)

The **Ayanamsa** is the angular difference between the tropical and sidereal zodiac systems. It varies with time due to Earth's precession.

**Formula for Lahiri Ayanamsa** (most common in Vedic astrology):

$$\text{Ayanamsa}(T) = 23°10'01''.66 + 0°004'40''.6354 \times T + 0°0000001''.39656 \times T^2 - 0°0000000''.05375 \times T^3$$

where $T$ is the time in Julian centuries from J2000.0.

**Simplified (for most years):**
$$\text{Ayanamsa} \approx 23° + 0°004'41'' \times (T - 2000.0) / 100$$

### 10.2 Conversion Formulas

**Tropical to Sidereal:**
$$\alpha_{\text{sidereal}} = \alpha_{\text{tropical}} - \text{Ayanamsa}$$

$$\delta_{\text{sidereal}} = \delta_{\text{tropical}} \quad \text{(declination unchanged)}$$

Note: Declination is the same; only Right Ascension shifts.

**Sidereal to Tropical:**
$$\alpha_{\text{tropical}} = \alpha_{\text{sidereal}} + \text{Ayanamsa}$$

### 10.3 Common Ayanamsa Systems

| System | Founder | Approx. Value (2024) | Notes |
|--------|---------|-------------------|-------|
| **Lahiri** | S. K. Lahiri | 23°58' | Standard in Vedic astrology |
| **Fagan-Bradley** | Cyril Fagan | 24°02' | Western sidereal option |
| **DeLuce** | Robert DeLuce | 26°20' | Less common |
| **Raman** | B. V. Raman | 23°53' | Alternative Vedic |
| **Sayana-Nirayana** | Surya Siddhanta | ~24°04' | Ancient Indian system |

### 10.4 Impact on Astrocartography Lines

**Key Point:** Converting coordinates (RA, Dec) to sidereal does NOT change the geometric lines themselves; it only changes the **sign/constellation interpretation.**

**Example:**
- Tropical: Venus is at 15° Libra (RA ≈ 203°)
- Sidereal: Same Venus is at 21° Virgo (RA ≈ 179°, i.e., 203° - 24°)
- **The geographic lines are identical**; you're just reading different sign contexts

**Implication:** If implementing sidereal astrocartography:
1. Compute all lines using sidereal RA/Dec
2. Interpret which sign each line occupies using sidereal zodiac
3. Consider additional Vedic elements (Nakshatras, Dashas) if desired

---

## 11. Summary: Complete Calculation Checklist

### 11.1 Pre-Calculation Checklist

- [ ] Obtain birth date/time in **UTC** (not local time)
- [ ] Confirm exact birth time (hospital records preferred, not "noon" estimates)
- [ ] Obtain birth coordinates (latitude/longitude, ideally to nearest minute)
- [ ] Source planetary ephemeris (Swiss Ephemeris, JPL DE430, etc.)
- [ ] Choose zodiac system (tropical or sidereal; if sidereal, select Ayanamsa)
- [ ] Select desired precision level (0.01° typical for astrocartography)

### 11.2 Calculation Phase 1: Setup

- [ ] Convert birth date/time to Julian Date (JD)
- [ ] Compute Greenwich Mean Sidereal Time (GMST) using sidereal time formula
- [ ] Verify GMST is in range [0°, 360°) or [0, 2π)
- [ ] Obtain planetary RA (α) and Dec (δ) from ephemeris for birth instant
- [ ] If sidereal: apply Ayanamsa correction to all RA values

### 11.3 Calculation Phase 2: Main Planetary Lines

For **each planet** ($i$):
- [ ] Compute MC line: $\lambda_{\text{MC}} = \alpha_i - \theta_G$
- [ ] Compute IC line: $\lambda_{\text{IC}} = \alpha_i + \pi - \theta_G$
- [ ] Compute ASC line: parametric curve using $\varphi(\lambda) = \arctan(-\cos H_i / \tan \delta_i)$
- [ ] Compute DSC line: same curve, filtered for $\sin H_i > 0$ (setting)
- [ ] Normalize all longitudes to $[-180°, 180°]$ or $[0°, 360°)$

### 11.4 Calculation Phase 3: Aspect Lines (Optional)

For **each planet** and **each aspect type** (60°, 90°, 120°, 180°):
- [ ] Compute angular separation between planet and each angle (ASC, MC, etc.)
- [ ] Find all longitudes where separation = aspect angle ± orb
- [ ] For each longitude, solve for corresponding latitude(s)
- [ ] Classify as benefic (trine/sextile) or malefic (square/opposition)

### 11.5 Calculation Phase 4: Paran Lines (Optional)

For **each pair of planets** and **each angle combination** (16 total):
- [ ] Set up system: Planet 1 on angle1 AND Planet 2 on angle2
- [ ] Solve for common location(s)
- [ ] Extract resulting point or line
- [ ] Classify as benefic or malefic based on planet pair

### 11.6 Calculation Phase 5: Classification

For **each line** (main, aspect, paran):
- [ ] Identify planet(s) involved
- [ ] Look up inherent benefic/malefic nature
- [ ] Consider sector (benefic in sect stronger, malefic in sect more challenging)
- [ ] Apply aspect modifier (e.g., trine softens, square hardens)
- [ ] Assign overall quality: benefic, neutral, or malefic

### 11.7 Validation & QA

- [ ] Verify MC/IC lines are meridians (single longitude, all latitudes)
- [ ] Verify ASC/DSC lines are great-circle curves (never crosses own MC/IC line unless planet is at pole)
- [ ] Verify all lines are within Earth bounds (lat $[-90°, 90°]$, lon $[-180°, 180°]$)
- [ ] Spot-check 2-3 points against manual calculation or third-party tool
- [ ] Inspect for discontinuities or unexpected jumps (usually indicate branch crossings, acceptable)

### 11.8 Interpretation & Output

- [ ] Generate world map with all lines overlaid
- [ ] Color-code by planet (or use line styles: solid, dashed, dotted for benefic/malefic)
- [ ] Label major intersections (parans, strong combinations)
- [ ] Provide text interpretations for user's birth location and locations of interest
- [ ] Include caveats: astrocartography is one lens; personality and free will matter

---

## Appendix A: Code Example (Pseudocode)

```
// Example: Computing all major astrocartography lines

FUNCTION astrocartography_main():
    // Input
    birth_date = "1990-01-15"
    birth_time = "14:30:00 UTC"
    birth_location = (latitude=40.7128, longitude=-74.0060)  // New York
    
    // Step 1: Ephemeris lookup
    planets = {
        "Sun": (RA=289.0°, Dec=−20.9°),       // Example values
        "Moon": (RA=45.0°, Dec=+8.5°),
        "Mercury": (RA=305.0°, Dec=−18.0°),
        "Venus": (RA=320.0°, Dec=−12.0°),
        "Mars": (RA=150.0°, Dec=+5.0°),
        "Jupiter": (RA=123.0°, Dec=+3.0°),
        "Saturn": (RA=200.0°, Dec=−10.0°)
    }
    
    // Convert to radians
    FOR EACH planet:
        planet.RA *= π/180
        planet.Dec *= π/180
    ENDFOR
    
    // Step 2: Compute Julian Date
    JD = gregorian_to_jd(1990, 1, 15, 14, 30, 0)
    
    // Step 3: Compute GMST
    theta_G = compute_gmst(JD)
    
    // Step 4: Compute all lines
    FOR EACH (planet_name, planet) IN planets:
        // Main lines
        mc_line = compute_mc_line(planet.RA, theta_G)
        ic_line = compute_ic_line(planet.RA, theta_G)
        asc_line = compute_asc_line(planet.RA, planet.Dec, theta_G)
        dsc_line = compute_dsc_line(planet.RA, planet.Dec, theta_G)
        
        PRINT f"{planet_name} MC: {mc_line.longitude}°"
        PRINT f"{planet_name} IC: {ic_line.longitude}°"
        PRINT f"{planet_name} ASC: {len(asc_line.line)} points"
        PRINT f"{planet_name} DSC: {len(dsc_line.line)} points"
    ENDFOR
    
    // Step 5: Generate map
    map = create_world_map()
    FOR EACH line IN all_lines:
        draw_line_on_map(map, line)
    ENDFOR
    SAVE map AS "astrocartography_map.png"
ENDFUNCTION
```

---

## Appendix B: References & Further Reading

1. **Astrocartography Pioneers:**
   - Jim Lewis: Founder of modern astrocartography (Astro*Carto*Graphy)
   - Papers on relocation astrology available through astrolabe.com

2. **Astronomical/Mathematical References:**
   - Meeus, J. "Astronomical Algorithms" (2nd ed., 1998): Standard reference for ephemeris calculations
   - Seidelmann, P. K. "Explanatory Supplement to the Astronomical Almanac" (3rd ed., 2013)
   - Vallado, D. A., et al. "Fundamentals of Astrodynamics and Applications" (2013): Coordinate transforms

3. **Astrology Specific:**
   - Hadamowicz, R. "A Manual of Astrocartography" (1982)
   - Lewis, J. "Art & Interpretation of Astrocartography" (1999)
   - Online: Astro.com documentation, AskNova tutorials

4. **Software References:**
   - Swiss Ephemeris library: www.astro.com/swisseph
   - JPL Ephemerides: ssd.jpl.nasa.gov
   - Astropy (Python): astropy.org

---

## Changelog

### Version 1.1 (December 29, 2025)

**Critical Bug Fix: ASC/DSC Horizon Latitude Calculation**

**Problem:** Pluto, Mars, and other planets with certain declinations had incomplete or missing ASC/DSC lines on the globe.

**Root Cause:** The horizon latitude formula was incorrectly using `atan2(-cos(δ)cos(H), sin(δ))` which returns values in [-180°, 180°]. For planets with negative declination (like Pluto at δ ≈ -23°), this produced values outside the valid latitude range [-90°, 90°]:

```
Example: Pluto at H=0, δ=-23°
  atan2(-cos(-23°)×cos(0), sin(-23°))
  = atan2(-0.92, -0.39)
  = -113° ← WRONG (clamped to -90°, distorts geometry)
```

**Solution:** Use standard `atan()` instead of `atan2()`:

```
tan_phi = (-cos_delta * cos_H) / sin_delta
phi = atan(tan_phi)  // Returns [-90°, 90°] directly

Example: Pluto at H=0, δ=-23°
  tan_phi = (-0.92 × 1.0) / (-0.39) = 2.36
  phi = atan(2.36) = +67° ← CORRECT
```

**Files Modified:**
- `src/astro-core/src/lib.rs` - Rust/WASM implementation
- `src/lib/astro-calculator.ts` - TypeScript fallback
- `src/workers/astro.worker.ts` - Web Worker implementation

**Edge Cases Handled:**
1. `|sin(δ)| < ε AND |cos(H)| < ε`: Return None (vertical line at all latitudes)
2. `|sin(δ)| < ε`: Return ±90° based on sign of `-cos(δ)cos(H)`
3. Standard case: Use `atan(tan_phi)` for correct [-90°, 90°] result

**Additional Fix:** WASM was building to wrong directory (`src/astro-wasm/`) but code imported from `src/astro-core/pkg/`. Rebuilt to correct path.

---

### Version 1.2 (December 29, 2025)

**Enhancement: Adaptive Longitude Stepping for Low-Declination Planets**

**Problem:** Planets with low declination (|δ| < 10°) like Mars or Pluto when crossing the celestial equator have sharply curving ASC/DSC lines. A uniform 1° longitude step undersamples these curves, causing:
- Large latitude jumps (>30°) between adjacent points
- Segment splitting that discards valid curve sections
- Incomplete or fragmented line rendering

**Solution:** Implement adaptive longitude stepping:

```rust
// In Rust WASM (lib.rs)
let dec_deg = position.declination.abs() * RAD_TO_DEG;
let adaptive_step = if dec_deg < 10.0 { 0.5 } else { longitude_step };
```

```typescript
// In TypeScript fallback
const decDeg = Math.abs(declination) * RAD_TO_DEG;
const adaptiveStep = decDeg < 10 ? 0.5 : longitudeStep;
```

**Rationale:**
- Low-declination planets (~720 points at 0.5° step) vs normal (~360 points at 1° step)
- Only 4x more points where actually needed
- Professional astrocartography software uses similar variable grids (0.25°-1°)

**Additional Improvement: Increased Jump Threshold**

Changed segment splitting threshold in `MigrationGlobe.tsx` from 30° to 60° to:
- Tolerate sharper bends that are geometrically valid
- Reduce false-positive segment breaks
- Preserve more of the original curve geometry

**Files Modified:**
- `src/astro-core/src/lib.rs` - Rust/WASM: Added `adaptive_step` based on declination
- `src/lib/astro-calculator.ts` - TypeScript: Added adaptive stepping to ASC/DSC
- `src/workers/astro.worker.ts` - Web Worker: Added adaptive stepping to ASC/DSC
- `src/features/globe/components/MigrationGlobe.tsx` - Increased `latThreshold` from 30° to 60°

---

**Document Version:** 1.2
**Last Updated:** December 29, 2025
**Author:** Comprehensive Astrocartography Formula Reference
**License:** Open for educational and non-commercial use

---

This comprehensive document provides all formulas, workflows, and interpretive guidance needed to implement or understand astrocartography calculations in the tropical zodiac system. Use it as a technical reference for development, validation, or deepening astrological knowledge.
