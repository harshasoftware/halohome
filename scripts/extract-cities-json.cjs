#!/usr/bin/env node
/**
 * Extract cities data from TypeScript to JSON for dynamic loading
 * This reduces bundle duplication across main bundle and workers
 */

const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../src/data/geonames-cities.ts');
const outputPath = path.join(__dirname, '../public/data/geonames-cities.json');

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read the TypeScript file
const content = fs.readFileSync(inputPath, 'utf8');

// Extract the array from: export const GEONAMES_CITIES: GeoCity[] = [...]
const match = content.match(/export const GEONAMES_CITIES: GeoCity\[\] = (\[[\s\S]*?\]);/);

if (!match) {
  console.error('Could not find GEONAMES_CITIES array in source file');
  process.exit(1);
}

const arrayStr = match[1];

// Parse and validate
let cities;
try {
  cities = JSON.parse(arrayStr);
} catch (e) {
  console.error('Failed to parse cities array:', e.message);
  process.exit(1);
}

console.log(`Extracted ${cities.length} cities`);

// Write as compact JSON (no pretty printing to save space)
fs.writeFileSync(outputPath, JSON.stringify(cities));

const stats = fs.statSync(outputPath);
console.log(`Written to ${outputPath}`);
console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
