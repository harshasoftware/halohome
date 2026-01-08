/**
 * URL and HTML Sanitization Utilities
 *
 * This module provides security utilities for sanitizing user-controlled inputs
 * to prevent Cross-Site Scripting (XSS) attacks and CSS injection vulnerabilities
 * in marker rendering and other DOM operations.
 *
 * @module sanitize
 * @security These utilities are critical for preventing XSS attacks. Always use them
 * when handling user-controlled data that will be rendered in the DOM.
 *
 * @see {@link https://owasp.org/www-community/attacks/xss/|OWASP XSS Prevention}
 * @see {@link https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html|OWASP XSS Cheat Sheet}
 */

/**
 * List of dangerous URL protocols that can execute arbitrary code.
 *
 * @constant
 * @security These protocols are commonly used in XSS attacks:
 * - `javascript:` - Executes JavaScript code directly
 * - `vbscript:` - Executes VBScript (IE-specific, legacy attack vector)
 * - `file:` - Can access local file system (security sandbox bypass)
 * - `blob:` - Can execute content from Blob URLs
 *
 * Note: `data:` is handled separately to allow safe image data URIs
 */
const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'vbscript:',
  'file:',
  'blob:',
] as const;

/**
 * Safe data URI prefixes for images.
 * These are commonly used by avatar generators like DiceBear.
 *
 * @constant
 * @security Only image MIME types are allowed - no text/html or other executable types
 */
const SAFE_DATA_IMAGE_PREFIXES = [
  'data:image/svg+xml',
  'data:image/png',
  'data:image/jpeg',
  'data:image/jpg',
  'data:image/gif',
  'data:image/webp',
] as const;

/**
 * List of safe URL protocols that are explicitly allowed.
 *
 * @constant
 * @remarks Only HTTP and HTTPS are considered safe for external resources.
 * Protocol-relative URLs (//) and relative paths (/) are handled separately.
 */
const SAFE_PROTOCOLS = ['http:', 'https:'] as const;

/**
 * Sanitizes a URL to prevent XSS attacks by blocking dangerous protocols.
 *
 * This function validates URLs and only allows:
 * - `http://` and `https://` URLs (absolute URLs)
 * - Relative URLs starting with `/` (e.g., `/images/avatar.jpg`)
 * - Protocol-relative URLs starting with `//` (e.g., `//cdn.example.com/image.png`)
 * - Simple relative paths without protocols (e.g., `images/avatar.png`)
 *
 * It blocks dangerous protocols including:
 * - `javascript:` - Can execute arbitrary JavaScript
 * - `data:` - Can embed malicious content
 * - `vbscript:` - Can execute VBScript (legacy IE attack vector)
 * - `file:` - Can access local filesystem
 * - `blob:` - Can reference executable blob content
 *
 * @param url - The URL to sanitize (can be null, undefined, or any string)
 * @param fallback - Optional fallback value if URL is invalid (defaults to empty string)
 * @returns The sanitized URL if valid, or the fallback value if invalid/dangerous
 *
 * @security This function is essential for preventing XSS when handling user-provided URLs,
 * especially for avatar images, profile links, and other user-controlled resources.
 * Always use this function before setting `src` attributes or embedding URLs in HTML.
 *
 * @example
 * // Safe URLs pass through unchanged
 * sanitizeUrl('https://example.com/image.png') // 'https://example.com/image.png'
 * sanitizeUrl('/images/avatar.jpg') // '/images/avatar.jpg'
 *
 * @example
 * // Dangerous URLs return fallback (empty string by default)
 * sanitizeUrl('javascript:alert(1)') // ''
 * sanitizeUrl('data:text/html,<script>alert(1)</script>') // ''
 */
export function sanitizeUrl(url: string | null | undefined, fallback: string = ''): string {
  // Handle null/undefined/empty inputs
  if (url == null || url === '') {
    return fallback;
  }

  // Convert to string in case of other types
  const urlString = String(url);

  // Trim whitespace (handles padded malicious URLs like "  javascript:alert(1)")
  const trimmedUrl = urlString.trim();

  // Empty after trim
  if (trimmedUrl === '') {
    return fallback;
  }

  // Normalize for protocol checking (case-insensitive)
  const normalizedUrl = trimmedUrl.toLowerCase();

  // Block dangerous protocols
  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (normalizedUrl.startsWith(protocol)) {
      return fallback;
    }
  }

  // Check for safe absolute URLs
  for (const protocol of SAFE_PROTOCOLS) {
    if (normalizedUrl.startsWith(protocol)) {
      return trimmedUrl;
    }
  }

  // Check for safe data image URIs (used by avatar generators like DiceBear)
  for (const prefix of SAFE_DATA_IMAGE_PREFIXES) {
    if (normalizedUrl.startsWith(prefix)) {
      return trimmedUrl;
    }
  }

  // Allow protocol-relative URLs (//example.com/path)
  if (trimmedUrl.startsWith('//')) {
    return trimmedUrl;
  }

  // Allow relative URLs starting with /
  if (trimmedUrl.startsWith('/')) {
    // Ensure it's not a protocol-like pattern (e.g., "/\javascript:")
    // by checking for any dangerous protocol after normalization
    const decodedUrl = decodeURIComponentSafe(trimmedUrl).toLowerCase();
    for (const protocol of DANGEROUS_PROTOCOLS) {
      if (decodedUrl.includes(protocol)) {
        return fallback;
      }
    }
    return trimmedUrl;
  }

  // Allow relative paths without leading slash (e.g., "images/avatar.png")
  // but check they don't contain dangerous protocols
  if (!trimmedUrl.includes(':')) {
    return trimmedUrl;
  }

  // For URLs with colons that aren't safe protocols, check if it's a dangerous protocol
  // This catches things like "JAVASCRIPT:alert(1)" (case variations)
  // and URLs with encoded characters
  const decodedUrl = decodeURIComponentSafe(trimmedUrl).toLowerCase();
  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (decodedUrl.includes(protocol)) {
      return fallback;
    }
  }

  // If we reach here, it might be an unknown protocol - reject it for safety
  // This ensures we only allow explicitly safe patterns
  return fallback;
}

/**
 * Safely decode a URI component, returning the original string if decoding fails.
 */
function decodeURIComponentSafe(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

/**
 * Default fallback color used when color validation fails.
 */
const DEFAULT_FALLBACK_COLOR = '#808080';

/**
 * Set of CSS named colors (basic and extended) for validation.
 */
const CSS_NAMED_COLORS = new Set([
  // Basic colors
  'black', 'silver', 'gray', 'grey', 'white', 'maroon', 'red', 'purple',
  'fuchsia', 'green', 'lime', 'olive', 'yellow', 'navy', 'blue', 'teal', 'aqua',
  // Extended colors
  'aliceblue', 'antiquewhite', 'aquamarine', 'azure', 'beige', 'bisque',
  'blanchedalmond', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
  'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan',
  'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgrey', 'darkgreen',
  'darkkhaki', 'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid',
  'darkred', 'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray',
  'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue',
  'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen',
  'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'greenyellow', 'honeydew',
  'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush',
  'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgrey', 'lightgreen', 'lightpink',
  'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey',
  'lightsteelblue', 'lightyellow', 'limegreen', 'linen', 'magenta',
  'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen',
  'mediumslateblue', 'mediumspringgreen', 'mediumturquoise', 'mediumvioletred',
  'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'oldlace',
  'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod', 'palegreen',
  'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff', 'peru', 'pink',
  'plum', 'powderblue', 'rebeccapurple', 'rosybrown', 'royalblue', 'saddlebrown',
  'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna', 'skyblue', 'slateblue',
  'slategray', 'slategrey', 'snow', 'springgreen', 'steelblue', 'tan', 'thistle',
  'tomato', 'turquoise', 'violet', 'wheat', 'whitesmoke', 'yellowgreen',
  // Special values
  'transparent', 'currentcolor', 'inherit',
]);

/**
 * Regular expression patterns for dangerous CSS functions that could be used for injection.
 */
const DANGEROUS_CSS_PATTERNS = [
  /url\s*\(/i,
  /expression\s*\(/i,
  /javascript\s*:/i,
  /behavior\s*:/i,
  /binding\s*:/i,
  /-moz-binding\s*:/i,
  /var\s*\(/i,
  /calc\s*\(/i,
  /env\s*\(/i,
  /attr\s*\(/i,
  /image\s*\(/i,
  /image-set\s*\(/i,
  /cross-fade\s*\(/i,
  /element\s*\(/i,
] as const;

/**
 * Regular expression patterns for valid CSS color formats.
 */
const COLOR_PATTERNS = {
  hex3: /^#[0-9a-f]{3}$/i,
  hex4: /^#[0-9a-f]{4}$/i,
  hex6: /^#[0-9a-f]{6}$/i,
  hex8: /^#[0-9a-f]{8}$/i,
  rgb: /^rgba?\(\s*(\d{1,3}%?\s*[,\s]\s*){2}\d{1,3}%?\s*(\/\s*(0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i,
  hsl: /^hsla?\(\s*(\d{1,3}(deg|rad|grad|turn)?)\s*[,\s]\s*\d{1,3}%\s*[,\s]\s*\d{1,3}%\s*(\/\s*(0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i,
} as const;

/**
 * Sanitizes a CSS color value to prevent CSS injection attacks.
 *
 * @param color - The color value to sanitize
 * @param fallback - Optional fallback color if input is invalid (defaults to '#808080')
 * @returns The sanitized color value if valid, or the fallback color if invalid
 */
export function sanitizeColor(
  color: string | null | undefined,
  fallback: string = DEFAULT_FALLBACK_COLOR
): string {
  // Handle null/undefined/empty inputs
  if (color == null || color === '') {
    return fallback;
  }

  // Convert to string in case of other types
  const colorString = String(color);

  // Trim whitespace
  const trimmedColor = colorString.trim();

  // Empty after trim
  if (trimmedColor === '') {
    return fallback;
  }

  // Check for dangerous CSS patterns first (case-insensitive)
  for (const pattern of DANGEROUS_CSS_PATTERNS) {
    if (pattern.test(trimmedColor)) {
      return fallback;
    }
  }

  // Normalize for checking (lowercase)
  const normalizedColor = trimmedColor.toLowerCase();

  // Check if it's a named color
  if (CSS_NAMED_COLORS.has(normalizedColor)) {
    return trimmedColor;
  }

  // Check hex patterns
  if (
    COLOR_PATTERNS.hex3.test(trimmedColor) ||
    COLOR_PATTERNS.hex4.test(trimmedColor) ||
    COLOR_PATTERNS.hex6.test(trimmedColor) ||
    COLOR_PATTERNS.hex8.test(trimmedColor)
  ) {
    return trimmedColor;
  }

  // Check rgb/rgba pattern
  if (COLOR_PATTERNS.rgb.test(trimmedColor)) {
    return trimmedColor;
  }

  // Check hsl/hsla pattern
  if (COLOR_PATTERNS.hsl.test(trimmedColor)) {
    return trimmedColor;
  }

  // If no valid pattern matched, return fallback
  return fallback;
}

/**
 * HTML entity mappings for characters that need escaping in HTML attributes.
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
} as const;

/**
 * Regular expression to match characters that need escaping in HTML.
 */
const HTML_ESCAPE_REGEX = /[&<>"']/g;

/**
 * Escapes special characters for safe use in HTML attributes and text content.
 *
 * @param value - The string value to escape
 * @returns The escaped string safe for use in HTML, or empty string for null/undefined
 */
export function sanitizeHtmlAttribute(value: string | null | undefined): string {
  // Handle null/undefined inputs
  if (value == null) {
    return '';
  }

  // Convert to string in case of other types
  const stringValue = String(value);

  // Empty string returns empty
  if (stringValue === '') {
    return '';
  }

  // Replace all special characters with their HTML entity equivalents
  return stringValue.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char] || char);
}
