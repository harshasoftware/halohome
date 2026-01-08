/**
 * ScoutPanel Constants
 *
 * Static data and constants for the ScoutPanel component.
 */

import React from 'react';
import {
  Briefcase,
  Heart,
  Activity,
  Home,
  Sparkles,
  DollarSign,
  LayoutGrid,
} from 'lucide-react';

/**
 * Lucide icon mapping for categories
 */
export const CATEGORY_ICONS: Record<string, React.ElementType> = {
  career: Briefcase,
  love: Heart,
  health: Activity,
  home: Home,
  wellbeing: Sparkles,
  wealth: DollarSign,
  overall: LayoutGrid,
};

/**
 * Category-specific colors for visual distinction
 */
export const CATEGORY_COLORS: Record<string, {
  selected: string;
  unselected: string;
  icon: string;
}> = {
  overall: {
    selected: 'bg-slate-700 dark:bg-white/15 border-slate-600 dark:border-white/30 text-white',
    unselected: 'bg-slate-100 dark:bg-white/[0.03] border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.06]',
    icon: 'text-slate-500 dark:text-slate-400',
  },
  career: {
    selected: 'bg-blue-600 dark:bg-blue-500/30 border-blue-500 dark:border-blue-400/50 text-white',
    unselected: 'bg-blue-50 dark:bg-blue-500/[0.08] border-blue-200 dark:border-blue-400/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/[0.15]',
    icon: 'text-blue-500 dark:text-blue-400',
  },
  love: {
    selected: 'bg-pink-500 dark:bg-pink-500/30 border-pink-400 dark:border-pink-400/50 text-white',
    unselected: 'bg-pink-50 dark:bg-pink-500/[0.08] border-pink-200 dark:border-pink-400/20 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-500/[0.15]',
    icon: 'text-pink-500 dark:text-pink-400',
  },
  health: {
    selected: 'bg-green-600 dark:bg-green-500/30 border-green-500 dark:border-green-400/50 text-white',
    unselected: 'bg-green-50 dark:bg-green-500/[0.08] border-green-200 dark:border-green-400/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-500/[0.15]',
    icon: 'text-green-500 dark:text-green-400',
  },
  home: {
    selected: 'bg-amber-500 dark:bg-amber-500/30 border-amber-400 dark:border-amber-400/50 text-white',
    unselected: 'bg-amber-50 dark:bg-amber-500/[0.08] border-amber-200 dark:border-amber-400/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/[0.15]',
    icon: 'text-amber-500 dark:text-amber-400',
  },
  wellbeing: {
    selected: 'bg-purple-500 dark:bg-purple-500/30 border-purple-400 dark:border-purple-400/50 text-white',
    unselected: 'bg-purple-50 dark:bg-purple-500/[0.08] border-purple-200 dark:border-purple-400/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/[0.15]',
    icon: 'text-purple-500 dark:text-purple-400',
  },
  wealth: {
    selected: 'bg-emerald-600 dark:bg-emerald-500/30 border-emerald-500 dark:border-emerald-400/50 text-white',
    unselected: 'bg-emerald-50 dark:bg-emerald-500/[0.08] border-emerald-200 dark:border-emerald-400/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/[0.15]',
    icon: 'text-emerald-500 dark:text-emerald-400',
  },
};

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
