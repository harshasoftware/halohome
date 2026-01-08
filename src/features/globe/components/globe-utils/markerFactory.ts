/**
 * Marker Factory - Creates DOM elements for globe markers
 *
 * Centralized factory for creating marker HTML elements with consistent styling.
 * Used by MigrationGlobe's htmlElementCallback.
 *
 * @security Uses sanitization utilities to prevent XSS from user-controlled data
 */

import { sanitizeUrl, sanitizeColor, sanitizeHtmlAttribute } from '@/lib/utils/sanitize';

/**
 * Create a pending birth location marker (avatar with pulse animation)
 */
export function createPendingBirthMarker(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.pointerEvents = 'none';
  el.style.transform = 'translate(-50%, -50%)';

  el.innerHTML = `
    <style>
      @keyframes fadeInScale {
        from { opacity: 0; transform: scale(0.5); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes pulse-ring {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
        100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
      }
    </style>
    <div style="position: relative; animation: fadeInScale 0.3s ease-out;">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        width: 44px;
        height: 44px;
        background: rgba(100, 116, 139, 0.25);
        border-radius: 50%;
        animation: pulse-ring 1.5s ease-out infinite;
      "></div>
      <div style="
        width: 44px;
        height: 44px;
        background: #475569;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        border: 2px solid white;
        position: relative;
        z-index: 1;
      ">
        <svg style="width: 22px; height: 22px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
    </div>
  `;

  return el;
}

/**
 * Create a partner location marker (heart icon with pink styling)
 */
export function createPartnerMarker(avatarUrl?: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.pointerEvents = 'none';
  el.style.transform = 'translate(-50%, -50%)';

  // Sanitize avatar URL to prevent XSS
  const safeAvatarUrl = sanitizeUrl(avatarUrl);

  const avatarContent = safeAvatarUrl
    ? `<img src="${safeAvatarUrl}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><svg style="width: 22px; height: 22px; color: white; display: none;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
    : `<svg style="width: 22px; height: 22px; color: white;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

  el.innerHTML = `
    <style>
      @keyframes fadeInScale {
        from { opacity: 0; transform: scale(0.5); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes pulse-ring-partner {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
        100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
      }
    </style>
    <div style="position: relative; animation: fadeInScale 0.3s ease-out;">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        width: 44px;
        height: 44px;
        background: rgba(236, 72, 153, 0.25);
        border-radius: 50%;
        animation: pulse-ring-partner 1.5s ease-out infinite;
      "></div>
      <div style="
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, #ec4899, #db2777);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(236, 72, 153, 0.4);
        border: 2px solid white;
        position: relative;
        z-index: 1;
      ">
        ${avatarContent}
      </div>
    </div>
  `;

  return el;
}

/**
 * Create a paran crossing marker (two-color gradient dot)
 */
export function createParanMarker(color1: string, color2: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.alignItems = 'center';
  el.style.pointerEvents = 'auto';
  el.style.cursor = 'pointer';
  el.style.transform = 'translate(-50%, -50%)';

  // Sanitize colors to prevent CSS injection
  const safeColor1 = sanitizeColor(color1);
  const safeColor2 = sanitizeColor(color2);

  el.innerHTML = `
    <div style="
      position: relative;
      width: 12px;
      height: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 12px;
        height: 12px;
        background: linear-gradient(135deg, ${safeColor1} 50%, ${safeColor2} 50%);
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 1px 4px rgba(0,0,0,0.5);
      "></div>
    </div>
  `;

  return el;
}

/**
 * Create an analysis location marker (outline circle with pulse animation)
 * Uses cyan/teal color to distinguish from relocation (purple) and city (orange)
 */
export function createAnalysisMarker(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.pointerEvents = 'none';
  el.style.transform = 'translate(-50%, -50%)';

  el.innerHTML = `
    <style>
      @keyframes analysis-pulse-v2 {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
        100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
      }
    </style>
    <div style="position: relative; width: 22px; height: 22px;">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        width: 22px;
        height: 22px;
        background: transparent;
        border: 3px solid #06b6d4;
        border-radius: 50%;
        animation: analysis-pulse-v2 1.5s ease-out infinite;
      "></div>
      <div style="
        width: 22px;
        height: 22px;
        background: rgba(6, 182, 212, 0.15);
        border-radius: 50%;
        border: 3px solid #06b6d4;
        box-shadow: 0 0 12px rgba(6, 182, 212, 0.7), 0 2px 6px rgba(0, 0, 0, 0.3);
      "></div>
    </div>
  `;

  return el;
}

/**
 * Create a city location marker (orange dot)
 */
export function createCityMarker(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.pointerEvents = 'none';
  el.style.transform = 'translate(-50%, -50%)';

  el.innerHTML = `
    <div style="
      width: 18px;
      height: 18px;
      background: #f59e0b;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(245, 158, 11, 0.5);
    "></div>
  `;

  return el;
}

/**
 * Create a relocation marker (purple dot)
 */
export function createRelocationMarker(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.pointerEvents = 'none';
  el.style.transform = 'translate(-50%, -50%)';

  el.innerHTML = `
    <div style="
      width: 18px;
      height: 18px;
      background: #8b5cf6;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(139, 92, 246, 0.5);
    "></div>
  `;

  return el;
}

/**
 * Create a person location marker (avatar or count)
 */
export function createPersonMarker(
  name: string,
  avatarUrl: string,
  gender: 'male' | 'female' | string,
  count: number,
  onClick: () => void
): HTMLDivElement {
  const el = document.createElement('div');
  el.style.transform = 'translate(-50%, -50%)';
  el.style.background = 'rgba(255, 255, 255, 0.8)';
  el.style.borderRadius = '50%';
  el.style.padding = '4px';
  el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
  el.style.border = `2px solid ${gender === 'male' ? '#60A5FA' : '#F472B6'}`;
  el.style.cursor = 'pointer';
  el.style.pointerEvents = 'auto';

  // Sanitize user-controlled inputs to prevent XSS
  const safeAvatarUrl = sanitizeUrl(avatarUrl);
  const safeName = sanitizeHtmlAttribute(name);
  const safeInitial = safeName.charAt(0).toUpperCase();

  if (count > 1) {
    // Use DOM methods instead of innerHTML for count display
    const countDiv = document.createElement('div');
    countDiv.style.backgroundColor = '#FD6A02';
    countDiv.style.color = 'white';
    countDiv.style.borderRadius = '50%';
    countDiv.style.width = '32px';
    countDiv.style.height = '32px';
    countDiv.style.display = 'flex';
    countDiv.style.alignItems = 'center';
    countDiv.style.justifyContent = 'center';
    countDiv.style.fontSize = '14px';
    countDiv.textContent = String(count);
    el.appendChild(countDiv);
  } else if (safeAvatarUrl) {
    const img = new Image();
    img.src = safeAvatarUrl;
    img.style.width = '24px';
    img.style.height = '24px';
    img.style.borderRadius = '50%';
    img.onerror = () => {
      const fallback = document.createElement('div');
      fallback.style.width = '24px';
      fallback.style.height = '24px';
      fallback.style.borderRadius = '50%';
      fallback.style.backgroundColor = '#FD6A02';
      fallback.style.color = 'white';
      fallback.style.display = 'flex';
      fallback.style.alignItems = 'center';
      fallback.style.justifyContent = 'center';
      fallback.style.fontSize = '12px';
      fallback.textContent = safeInitial;
      el.innerHTML = '';
      el.appendChild(fallback);
    };
    el.appendChild(img);
  } else {
    // No avatar URL - show initial
    const fallback = document.createElement('div');
    fallback.style.width = '24px';
    fallback.style.height = '24px';
    fallback.style.borderRadius = '50%';
    fallback.style.backgroundColor = '#FD6A02';
    fallback.style.color = 'white';
    fallback.style.display = 'flex';
    fallback.style.alignItems = 'center';
    fallback.style.justifyContent = 'center';
    fallback.style.fontSize = '12px';
    fallback.textContent = safeInitial;
    el.appendChild(fallback);
  }

  el.onclick = onClick;

  return el;
}

/**
 * Create an empty/hidden marker for invalid data
 */
export function createEmptyMarker(): HTMLDivElement {
  const empty = document.createElement('div');
  empty.style.display = 'none';
  return empty;
}

/**
 * Create a line label marker (shows planet + line type on the globe)
 * Used to label ASC/DSC/MC/IC lines at their midpoints
 */
export function createLineLabelMarker(
  planet: string,
  lineType: string,
  color: string
): HTMLDivElement {
  const el = document.createElement('div');
  el.style.pointerEvents = 'none';
  el.style.transform = 'translate(-50%, -50%)';
  el.style.whiteSpace = 'nowrap';

  // Sanitize inputs to prevent XSS/CSS injection
  const safePlanet = sanitizeHtmlAttribute(planet);
  const safeLineType = sanitizeHtmlAttribute(lineType);
  const safeColor = sanitizeColor(color);

  // Get abbreviation for line type
  const lineAbbrev = safeLineType === 'ASC' || safeLineType === 'DSC' || safeLineType === 'MC' || safeLineType === 'IC'
    ? safeLineType
    : safeLineType.substring(0, 3);

  // Build DOM using safe methods instead of innerHTML with untrusted data
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.gap = '4px';
  container.style.background = 'rgba(15, 23, 42, 0.85)';
  container.style.backdropFilter = 'blur(4px)';
  container.style.padding = '3px 8px';
  container.style.borderRadius = '4px';
  container.style.border = `1px solid ${safeColor}`;
  container.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.4)';

  const dot = document.createElement('div');
  dot.style.width = '8px';
  dot.style.height = '8px';
  dot.style.background = safeColor;
  dot.style.borderRadius = '50%';
  dot.style.flexShrink = '0';

  const label = document.createElement('span');
  label.style.color = 'white';
  label.style.fontSize = '11px';
  label.style.fontWeight = '600';
  label.style.letterSpacing = '0.3px';
  label.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
  label.textContent = `${safePlanet} ${lineAbbrev}`;

  container.appendChild(dot);
  container.appendChild(label);
  el.appendChild(container);

  return el;
}

/**
 * Create a scout location marker (beneficial - green)
 * @param onClick - Optional click handler to show city info
 */
export function createScoutBeneficialMarker(onClick?: () => void): HTMLDivElement {
  const el = document.createElement('div');
  el.style.pointerEvents = onClick ? 'auto' : 'none';
  el.style.cursor = onClick ? 'pointer' : 'default';
  el.style.transform = 'translate(-50%, -50%)';

  if (onClick) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
  }

  el.innerHTML = `
    <div style="
      width: 16px;
      height: 16px;
      background: #22c55e;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(34, 197, 94, 0.5);
      transition: transform 0.15s ease;
    " class="scout-marker-dot"></div>
  `;

  // Add hover effect
  if (onClick) {
    el.addEventListener('mouseenter', () => {
      const dot = el.querySelector('.scout-marker-dot') as HTMLElement;
      if (dot) dot.style.transform = 'scale(1.2)';
    });
    el.addEventListener('mouseleave', () => {
      const dot = el.querySelector('.scout-marker-dot') as HTMLElement;
      if (dot) dot.style.transform = 'scale(1)';
    });
  }

  return el;
}

/**
 * Create a scout location marker (challenging - amber/orange)
 * @param onClick - Optional click handler to show city info
 */
export function createScoutChallengingMarker(onClick?: () => void): HTMLDivElement {
  const el = document.createElement('div');
  el.style.pointerEvents = onClick ? 'auto' : 'none';
  el.style.cursor = onClick ? 'pointer' : 'default';
  el.style.transform = 'translate(-50%, -50%)';

  if (onClick) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
  }

  el.innerHTML = `
    <div style="
      width: 16px;
      height: 16px;
      background: #f59e0b;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(245, 158, 11, 0.5);
      transition: transform 0.15s ease;
    " class="scout-marker-dot"></div>
  `;

  // Add hover effect
  if (onClick) {
    el.addEventListener('mouseenter', () => {
      const dot = el.querySelector('.scout-marker-dot') as HTMLElement;
      if (dot) dot.style.transform = 'scale(1.2)';
    });
    el.addEventListener('mouseleave', () => {
      const dot = el.querySelector('.scout-marker-dot') as HTMLElement;
      if (dot) dot.style.transform = 'scale(1)';
    });
  }

  return el;
}

/**
 * Create a scout highlight marker (pulsing ring for hovered cities)
 */
export function createScoutHighlightMarker(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.pointerEvents = 'none';
  el.style.transform = 'translate(-50%, -50%)';

  el.innerHTML = `
    <div style="
      position: relative;
      width: 40px;
      height: 40px;
    ">
      <div style="
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 3px solid #6366f1;
        animation: scout-pulse 1s ease-out infinite;
      "></div>
      <div style="
        position: absolute;
        inset: 8px;
        border-radius: 50%;
        border: 2px solid #a5b4fc;
        animation: scout-pulse 1s ease-out 0.3s infinite;
      "></div>
    </div>
    <style>
      @keyframes scout-pulse {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(2);
          opacity: 0;
        }
      }
    </style>
  `;

  return el;
}

/**
 * Format count for display (e.g., 1500 -> "1.5k")
 */
function formatCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  return `${Math.round(count / 1000)}k`;
}

/**
 * Create a scout cluster marker (beneficial - green with count)
 * @param count - Number of markers in the cluster
 * @param onClick - Optional click handler to zoom into the cluster
 */
export function createScoutClusterBeneficialMarker(count: number, onClick?: () => void): HTMLDivElement {
  const el = document.createElement('div');
  el.style.pointerEvents = onClick ? 'auto' : 'none';
  el.style.cursor = onClick ? 'pointer' : 'default';
  el.style.transform = 'translate(-50%, -50%)';
  if (onClick) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
  }

  const size = count > 100 ? 36 : count > 20 ? 32 : 28;
  const fontSize = count > 100 ? 11 : count > 20 ? 10 : 9;

  el.innerHTML = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(34, 197, 94, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="
        color: white;
        font-size: ${fontSize}px;
        font-weight: 700;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      ">${formatCount(count)}</span>
    </div>
  `;

  return el;
}

/**
 * Create a scout cluster marker (challenging - amber with count)
 * @param count - Number of markers in the cluster
 * @param onClick - Optional click handler to zoom into the cluster
 */
export function createScoutClusterChallengingMarker(count: number, onClick?: () => void): HTMLDivElement {
  const el = document.createElement('div');
  el.style.pointerEvents = onClick ? 'auto' : 'none';
  el.style.cursor = onClick ? 'pointer' : 'default';
  el.style.transform = 'translate(-50%, -50%)';
  if (onClick) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
  }

  const size = count > 100 ? 36 : count > 20 ? 32 : 28;
  const fontSize = count > 100 ? 11 : count > 20 ? 10 : 9;

  el.innerHTML = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="
        color: white;
        font-size: ${fontSize}px;
        font-weight: 700;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      ">${formatCount(count)}</span>
    </div>
  `;

  return el;
}

/**
 * Create a scout cluster marker (mixed - split green/amber with counts)
 * @param beneficialCount - Number of beneficial markers in the cluster
 * @param challengingCount - Number of challenging markers in the cluster
 * @param onClick - Optional click handler to zoom into the cluster
 */
export function createScoutClusterMixedMarker(
  beneficialCount: number,
  challengingCount: number,
  onClick?: () => void
): HTMLDivElement {
  const el = document.createElement('div');
  el.style.pointerEvents = onClick ? 'auto' : 'none';
  el.style.cursor = onClick ? 'pointer' : 'default';
  el.style.transform = 'translate(-50%, -50%)';
  if (onClick) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
  }

  const total = beneficialCount + challengingCount;
  const size = total > 100 ? 40 : total > 20 ? 36 : 32;
  const fontSize = total > 100 ? 9 : 8;

  // Calculate the split percentage
  const beneficialPercent = (beneficialCount / total) * 100;

  el.innerHTML = `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size}px;
    ">
      <div style="
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: conic-gradient(
          #22c55e 0deg ${beneficialPercent * 3.6}deg,
          #f59e0b ${beneficialPercent * 3.6}deg 360deg
        );
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      "></div>
      <div style="
        position: absolute;
        inset: 3px;
        border-radius: 50%;
        background: rgba(15, 23, 42, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
      ">
        <span style="
          color: #4ade80;
          font-size: ${fontSize}px;
          font-weight: 700;
          line-height: 1;
        ">${formatCount(beneficialCount)}</span>
        <span style="
          color: #fbbf24;
          font-size: ${fontSize}px;
          font-weight: 700;
          line-height: 1;
        ">${formatCount(challengingCount)}</span>
      </div>
    </div>
  `;

  return el;
}
