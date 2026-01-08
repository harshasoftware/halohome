/**
 * ScoutPanel Constants
 *
 * Static data and constants for the ScoutPanel component.
 */

/**
 * Country ISO code to full name mapping
 * Used for displaying country names in the UI
 */
export const COUNTRY_NAMES: Record<string, string> = {
  'US': 'United States', 'GB': 'United Kingdom', 'CA': 'Canada', 'AU': 'Australia',
  'DE': 'Germany', 'FR': 'France', 'IT': 'Italy', 'ES': 'Spain', 'PT': 'Portugal',
  'NL': 'Netherlands', 'BE': 'Belgium', 'CH': 'Switzerland', 'AT': 'Austria',
  'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark', 'FI': 'Finland', 'IS': 'Iceland',
  'IE': 'Ireland', 'PL': 'Poland', 'CZ': 'Czech Republic', 'HU': 'Hungary',
  'GR': 'Greece', 'TR': 'Turkey', 'RU': 'Russia', 'UA': 'Ukraine',
  'JP': 'Japan', 'KR': 'South Korea', 'CN': 'China', 'TW': 'Taiwan', 'HK': 'Hong Kong',
  'IN': 'India', 'TH': 'Thailand', 'VN': 'Vietnam', 'ID': 'Indonesia', 'PH': 'Philippines',
  'SG': 'Singapore', 'MY': 'Malaysia', 'NZ': 'New Zealand',
  'MX': 'Mexico', 'BR': 'Brazil', 'AR': 'Argentina', 'CL': 'Chile', 'CO': 'Colombia',
  'PE': 'Peru', 'VE': 'Venezuela', 'EC': 'Ecuador', 'UY': 'Uruguay',
  'ZA': 'South Africa', 'EG': 'Egypt', 'MA': 'Morocco', 'NG': 'Nigeria', 'KE': 'Kenya',
  'IL': 'Israel', 'AE': 'United Arab Emirates', 'SA': 'Saudi Arabia', 'QA': 'Qatar',
  'RO': 'Romania', 'BG': 'Bulgaria', 'HR': 'Croatia', 'SI': 'Slovenia', 'RS': 'Serbia',
  'SK': 'Slovakia', 'LT': 'Lithuania', 'LV': 'Latvia', 'EE': 'Estonia',
  'LU': 'Luxembourg', 'MT': 'Malta', 'CY': 'Cyprus', 'MC': 'Monaco',
  'PK': 'Pakistan', 'BD': 'Bangladesh', 'LK': 'Sri Lanka', 'NP': 'Nepal', 'MM': 'Myanmar',
  'KH': 'Cambodia', 'LA': 'Laos', 'AF': 'Afghanistan', 'IQ': 'Iraq', 'IR': 'Iran',
  'SY': 'Syria', 'JO': 'Jordan', 'LB': 'Lebanon', 'KW': 'Kuwait', 'BH': 'Bahrain',
  'OM': 'Oman', 'YE': 'Yemen', 'PS': 'Palestine', 'GE': 'Georgia', 'AM': 'Armenia',
  'AZ': 'Azerbaijan', 'KZ': 'Kazakhstan', 'UZ': 'Uzbekistan', 'TM': 'Turkmenistan',
  'TJ': 'Tajikistan', 'KG': 'Kyrgyzstan', 'MN': 'Mongolia',
  'BO': 'Bolivia', 'PY': 'Paraguay', 'GY': 'Guyana', 'SR': 'Suriname',
  'PA': 'Panama', 'CR': 'Costa Rica', 'NI': 'Nicaragua', 'HN': 'Honduras',
  'SV': 'El Salvador', 'GT': 'Guatemala', 'BZ': 'Belize', 'CU': 'Cuba',
  'DO': 'Dominican Republic', 'HT': 'Haiti', 'JM': 'Jamaica', 'TT': 'Trinidad and Tobago',
  'PR': 'Puerto Rico', 'DZ': 'Algeria', 'TN': 'Tunisia', 'LY': 'Libya', 'SD': 'Sudan',
  'ET': 'Ethiopia', 'GH': 'Ghana', 'CI': 'Ivory Coast', 'SN': 'Senegal', 'CM': 'Cameroon',
  'UG': 'Uganda', 'TZ': 'Tanzania', 'ZW': 'Zimbabwe', 'ZM': 'Zambia', 'MW': 'Malawi',
  'MZ': 'Mozambique', 'AO': 'Angola', 'CD': 'DR Congo', 'CG': 'Congo', 'RW': 'Rwanda',
  'BY': 'Belarus', 'MD': 'Moldova', 'BA': 'Bosnia', 'ME': 'Montenegro', 'MK': 'North Macedonia',
  'AL': 'Albania', 'XK': 'Kosovo', 'LI': 'Liechtenstein', 'AD': 'Andorra', 'SM': 'San Marino',
  'VA': 'Vatican City', 'FO': 'Faroe Islands', 'GL': 'Greenland',
  'BN': 'Brunei', 'MO': 'Macau', 'NC': 'New Caledonia', 'FJ': 'Fiji', 'PG': 'Papua New Guinea',
};

/**
 * Country name to ISO code (reverse mapping for backward compatibility)
 */
export const COUNTRY_CODES: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_NAMES).map(([code, name]) => [name, code])
);

/**
 * Get full country name from ISO code
 * @param countryCode - Two-letter ISO country code
 * @returns Full country name, or the code itself if not found
 */
export const getCountryName = (countryCode: string): string => {
  return COUNTRY_NAMES[countryCode] || countryCode;
};

/**
 * Convert country code or name to flag emoji
 * @param countryOrCode - Either a two-letter ISO code or full country name
 * @returns Flag emoji string, or empty string if invalid
 */
export const getCountryFlag = (countryOrCode: string): string => {
  // Check if it's already a 2-letter code
  const code = countryOrCode.length === 2 ? countryOrCode : COUNTRY_CODES[countryOrCode];
  if (!code) return '';
  return code
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(0x1F1E6 + char.charCodeAt(0) - 65))
    .join('');
};
