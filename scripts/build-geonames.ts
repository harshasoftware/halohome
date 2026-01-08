#!/usr/bin/env node
/**
 * GeoNames Data Builder
 *
 * Downloads and processes GeoNames cities15000 data into a compact JSON format
 * for use in the frontend. Run this during build or as a one-time setup.
 *
 * Usage: node scripts/build-geonames.ts
 *
 * Output: src/data/geonames-cities.ts (~2-3MB)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEONAMES_URL = 'https://download.geonames.org/export/dump/cities15000.zip';
const DATA_DIR = path.join(__dirname, '../data/geonames');
const OUTPUT_FILE = path.join(__dirname, '../src/data/geonames-cities.ts');

interface GeoCity {
  id: number;        // geonameid
  n: string;         // name
  a: number;         // lat
  o: number;         // lng (o for longitude)
  p: number;         // population
  c: string;         // country code
  z: string | null;  // timezone
}

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location!, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', reject);
  });
}

async function unzipFile(zipPath: string, destDir: string): Promise<string> {
  const { execSync } = await import('child_process');
  execSync(`unzip -o "${zipPath}" -d "${destDir}"`);
  return path.join(destDir, 'cities15000.txt');
}

async function processGeoNamesFile(txtPath: string): Promise<GeoCity[]> {
  const cities: GeoCity[] = [];

  const fileStream = fs.createReadStream(txtPath);
  const rl = readline.createInterface({ input: fileStream });

  for await (const line of rl) {
    if (!line || line.startsWith('#')) continue;
    const cols = line.split('\t');
    if (cols.length < 19) continue;

    const [
      geonameid,
      name,
      _asciiname,
      _altNames,
      lat,
      lng,
      _featureClass,
      _featureCode,
      countryCode,
      _cc2,
      _admin1,
      _admin2,
      _admin3,
      _admin4,
      population,
      _elevation,
      _dem,
      timezone,
    ] = cols;

    const pop = parseInt(population || '0', 10) || 0;

    // Only include cities with population >= 15000
    if (pop < 15000) continue;

    cities.push({
      id: parseInt(geonameid, 10),
      n: name,
      a: parseFloat(lat),
      o: parseFloat(lng),
      p: pop,
      c: countryCode,
      z: timezone || null,
    });
  }

  // Sort by population descending for efficient lookups
  cities.sort((a, b) => b.p - a.p);

  return cities;
}

function generateTypeScriptFile(cities: GeoCity[]): string {
  return `/**
 * GeoNames Cities Database
 *
 * Auto-generated from GeoNames cities15000 dataset.
 * Contains ${cities.length.toLocaleString()} cities with population >= 15,000
 *
 * Field mapping (compact for bundle size):
 * - id: GeoNames ID
 * - n: City name
 * - a: Latitude
 * - o: Longitude
 * - p: Population
 * - c: Country code (ISO 2-letter)
 * - z: Timezone
 *
 * DO NOT EDIT - regenerate with: npx ts-node scripts/build-geonames.ts
 */

export interface GeoCity {
  id: number;
  n: string;
  a: number;
  o: number;
  p: number;
  c: string;
  z: string | null;
}

// Expanded interface for external use
export interface City {
  geonameId: number;
  name: string;
  lat: number;
  lng: number;
  population: number;
  countryCode: string;
  timezone: string | null;
}

// Convert compact format to full format
export function expandCity(c: GeoCity): City {
  return {
    geonameId: c.id,
    name: c.n,
    lat: c.a,
    lng: c.o,
    population: c.p,
    countryCode: c.c,
    timezone: c.z,
  };
}

// Compact city data (${(JSON.stringify(cities).length / 1024 / 1024).toFixed(2)}MB uncompressed)
export const GEONAMES_CITIES: GeoCity[] = ${JSON.stringify(cities)};

// Export count for reference
export const GEONAMES_CITY_COUNT = ${cities.length};
`;
}

async function main() {
  console.log('Building GeoNames city database...\n');

  // Create data directory
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const zipPath = path.join(DATA_DIR, 'cities15000.zip');
  const txtPath = path.join(DATA_DIR, 'cities15000.txt');

  // Check if we already have the txt file
  if (!fs.existsSync(txtPath)) {
    console.log('Downloading GeoNames cities15000.zip...');
    await downloadFile(GEONAMES_URL, zipPath);
    console.log('Download complete.\n');

    console.log('Extracting...');
    await unzipFile(zipPath, DATA_DIR);
    console.log('Extraction complete.\n');
  } else {
    console.log('Using existing cities15000.txt\n');
  }

  console.log('Processing cities...');
  const cities = await processGeoNamesFile(txtPath);
  console.log(`Found ${cities.length.toLocaleString()} cities with population >= 15,000\n`);

  // Stats
  const byCountry = new Map<string, number>();
  for (const c of cities) {
    byCountry.set(c.c, (byCountry.get(c.c) || 0) + 1);
  }

  console.log('Top 10 countries by city count:');
  const topCountries = [...byCountry.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [country, count] of topCountries) {
    console.log(`  ${country}: ${count}`);
  }
  console.log();

  console.log('Generating TypeScript file...');
  const tsContent = generateTypeScriptFile(cities);
  fs.writeFileSync(OUTPUT_FILE, tsContent);

  const fileSizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1);
  console.log(`Written to: ${OUTPUT_FILE}`);
  console.log(`File size: ${fileSizeKB} KB\n`);

  console.log('Done! The city data is now available at:');
  console.log('  import { GEONAMES_CITIES } from "@/data/geonames-cities"');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
