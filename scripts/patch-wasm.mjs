#!/usr/bin/env node
/**
 * Post-build script to patch astro_core.js with Rayon worker shim
 *
 * wasm-pack generates astro_core.js but doesn't include the necessary
 * shim for Vite compatibility with Rayon parallel workers. This script
 * patches the generated file and copies it to all required locations.
 *
 * Run after: wasm-pack build --target web
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SOURCE_FILE = path.join(ROOT, 'src/astro-core/pkg/astro_core.js');
const PUBLIC_FILE = path.join(ROOT, 'public/wasm/astro_core.js');

// The Rayon worker shim that enables Vite compatibility
const RAYON_SHIM = `
// ============================================
// Rayon Worker Shim for Vite Compatibility
// ============================================
// Vite dev server refuses to statically import JS modules from /public.
// We lazy-load the worker helpers at runtime and opt out of Vite import analysis.
let __rayonStartWorkers;
async function __getRayonStartWorkers() {
    if (!__rayonStartWorkers) {
        const workerHelpersUrl = new URL('/wasm/workerHelpers.js', globalThis.location?.href ?? 'http://localhost').toString();
        const mod = await import(/* @vite-ignore */ workerHelpersUrl);
        __rayonStartWorkers = mod.startWorkers;
    }
    return __rayonStartWorkers;
}
// ============================================
`;

// Markers to detect if already patched (check multiple patterns)
const PATCH_MARKERS = [
  '// Rayon Worker Shim for Vite Compatibility',
  '__getRayonStartWorkers',
  '/* @vite-ignore */ workerHelpersUrl',
  "module_or_path = '/wasm/astro_core_bg.wasm'"
];

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if already patched (any marker present)
  if (PATCH_MARKERS.some(marker => content.includes(marker))) {
    console.log(`✓ Already patched: ${path.relative(ROOT, filePath)}`);
    return true;
  }

  // Find the insertion point - after the initial imports/setup
  // Look for the first function or export declaration
  const insertPoint = content.indexOf('\nlet wasm;');

  if (insertPoint === -1) {
    // Alternative: insert after any initial comments
    const altPoint = content.indexOf('\nasync function');
    if (altPoint !== -1) {
      content = content.slice(0, altPoint) + RAYON_SHIM + content.slice(altPoint);
    } else {
      // Fallback: prepend to file
      content = RAYON_SHIM + content;
    }
  } else {
    content = content.slice(0, insertPoint) + RAYON_SHIM + content.slice(insertPoint);
  }

  // Also patch the initSync and __wbg_init functions to use the shim
  // Find and replace the startWorkers import pattern if it exists
  content = content.replace(
    /import\s*\{\s*startWorkers\s*\}\s*from\s*['"][^'"]+['"];?/g,
    '// startWorkers import removed - using __getRayonStartWorkers() shim instead'
  );

  // Replace direct startWorkers calls with the async getter
  content = content.replace(
    /\bstartWorkers\s*\(/g,
    '(await __getRayonStartWorkers())('
  );

  // Fix WASM URL to use absolute path instead of import.meta.url
  // This is critical for production builds where Vite bundles JS to /assets/
  // but WASM stays in /wasm/ (public folder)
  content = content.replace(
    /module_or_path = new URL\('astro_core_bg\.wasm', import\.meta\.url\);/g,
    "module_or_path = '/wasm/astro_core_bg.wasm';"
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Patched: ${path.relative(ROOT, filePath)}`);
  return true;
}

function copyToPublic() {
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`❌ Source file not found: ${SOURCE_FILE}`);
    return false;
  }

  // Ensure public/wasm directory exists
  const publicDir = path.dirname(PUBLIC_FILE);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.copyFileSync(SOURCE_FILE, PUBLIC_FILE);
  console.log(`✓ Copied to: ${path.relative(ROOT, PUBLIC_FILE)}`);
  return true;
}

function main() {
  console.log('\n🔧 Patching WASM files with Rayon worker shim...\n');

  // Patch the source file
  const patched = patchFile(SOURCE_FILE);

  if (patched) {
    // Copy to public directory
    copyToPublic();
  }

  console.log('\n✅ WASM patch complete!\n');
}

main();
