#!/usr/bin/env node

import https from 'https';
import crypto from 'crypto';
import fs from 'fs';

// Configuration
const KEY_ID = 'F2P59D763T';
const ISSUER_ID = '51600d4a-1ff7-4a57-9da9-b109d357eb86';
const PRIVATE_KEY_PATH = '/Users/itsnappyboy/Downloads/AuthKey_F2P59D763T.p8';
const BUNDLE_ID = 'llc.teamchai.cartostar';

// Load descriptions from individual text files in ./descriptions/
// Locale code → filename mapping (App Store Connect locale codes)
const LOCALE_FILES = {
  'en-US': 'en-US.txt',
  'es-ES': 'es-ES.txt',
  'pt-BR': 'pt-BR.txt',
  'de-DE': 'de-DE.txt',
  'fr-FR': 'fr-FR.txt',
  'it': 'it.txt',
  'ja': 'ja.txt',
  'tr': 'tr.txt',
  'hi': 'hi.txt',
  'ar-SA': 'ar.txt',
  'th': 'th.txt',
  'ko': 'ko.txt',
  'id': 'id.txt',
  'zh-Hans': 'zh-Hans.txt',
  'zh-Hant': 'zh-Hant.txt',
  'uk': 'uk.txt',
  'ru': 'ru.txt',
  'ms': 'ms.txt',
  'el': 'el.txt',
};

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DESCRIPTIONS_DIR = join(__dirname, 'descriptions');

const DESCRIPTIONS = {};
for (const [locale, filename] of Object.entries(LOCALE_FILES)) {
  const filePath = join(DESCRIPTIONS_DIR, filename);
  if (fs.existsSync(filePath)) {
    DESCRIPTIONS[locale] = fs.readFileSync(filePath, 'utf8').trim();
    console.log(`Loaded ${locale} from ${filename}`);
  } else {
    console.warn(`Warning: ${filename} not found, skipping ${locale}`);
  }
}

// Generate JWT token
function generateJWT() {
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

  const header = {
    alg: 'ES256',
    kid: KEY_ID,
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 1200,
    aud: 'appstoreconnect-v1'
  };

  const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${headerBase64}.${payloadBase64}`;

  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  const signature = sign.sign(privateKey);

  // Convert DER signature to raw r||s format for ES256
  const derSignature = signature;
  let r, s;

  let offset = 2;
  if (derSignature[1] > 0x80) offset += derSignature[1] - 0x80;
  offset++;

  let rLen = derSignature[offset++];
  if (rLen > 0x80) {
    const lenBytes = rLen - 0x80;
    rLen = 0;
    for (let i = 0; i < lenBytes; i++) {
      rLen = (rLen << 8) | derSignature[offset++];
    }
  }

  r = derSignature.slice(offset, offset + rLen);
  offset += rLen;

  offset++;
  let sLen = derSignature[offset++];
  if (sLen > 0x80) {
    const lenBytes = sLen - 0x80;
    sLen = 0;
    for (let i = 0; i < lenBytes; i++) {
      sLen = (sLen << 8) | derSignature[offset++];
    }
  }

  s = derSignature.slice(offset, offset + sLen);

  const padOrTrim = (buf, len) => {
    if (buf.length === len) return buf;
    if (buf.length > len) return buf.slice(buf.length - len);
    const padded = Buffer.alloc(len);
    buf.copy(padded, len - buf.length);
    return padded;
  };

  r = padOrTrim(r, 32);
  s = padOrTrim(s, 32);

  const rawSignature = Buffer.concat([r, s]);
  const signatureBase64 = rawSignature.toString('base64url');

  return `${headerBase64}.${payloadBase64}.${signatureBase64}`;
}

// Make API request
function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const token = generateJWT();

    const options = {
      hostname: 'api.appstoreconnect.apple.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            console.error(`API Error ${res.statusCode}:`, JSON.stringify(parsed, null, 2));
            reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          if (res.statusCode >= 400) {
            reject(new Error(`API Error ${res.statusCode}: ${data}`));
          } else {
            resolve(data);
          }
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Get app ID
async function getAppId() {
  console.log('Fetching app...');
  const response = await apiRequest('GET', `/v1/apps?filter[bundleId]=${BUNDLE_ID}`);
  if (response.data && response.data.length > 0) {
    return response.data[0].id;
  }
  throw new Error('App not found');
}

// Get the app store version (READY_FOR_SUBMISSION or PREPARE_FOR_SUBMISSION)
async function getAppStoreVersion(appId) {
  console.log('Fetching app store versions...');
  const response = await apiRequest('GET', `/v1/apps/${appId}/appStoreVersions?filter[appStoreState]=READY_FOR_SUBMISSION,PREPARE_FOR_SUBMISSION,IN_REVIEW,WAITING_FOR_REVIEW&limit=5`);

  if (response.data && response.data.length > 0) {
    // Prefer version 1.5.1 if found
    const v151 = response.data.find(v => v.attributes.versionString === '1.5.1');
    if (v151) return v151;
    // Otherwise return the first editable version
    return response.data[0];
  }
  throw new Error('No editable app store version found. Make sure version 1.5.1 exists in App Store Connect.');
}

// Get existing localizations for a version
async function getVersionLocalizations(versionId) {
  const response = await apiRequest('GET', `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=40`);
  return response.data || [];
}

// Create or update a version localization description
async function updateVersionLocalization(versionId, locale, description, existingLocalizations) {
  const existing = existingLocalizations.find(l => l.attributes.locale === locale);

  if (existing) {
    console.log(`  Updating ${locale}...`);
    await apiRequest('PATCH', `/v1/appStoreVersionLocalizations/${existing.id}`, {
      data: {
        type: 'appStoreVersionLocalizations',
        id: existing.id,
        attributes: {
          description: description
        }
      }
    });
    console.log(`  ✓ ${locale} updated`);
  } else {
    console.log(`  Creating ${locale}...`);
    await apiRequest('POST', '/v1/appStoreVersionLocalizations', {
      data: {
        type: 'appStoreVersionLocalizations',
        attributes: {
          locale: locale,
          description: description
        },
        relationships: {
          appStoreVersion: {
            data: {
              type: 'appStoreVersions',
              id: versionId
            }
          }
        }
      }
    });
    console.log(`  ✓ ${locale} created`);
  }
}

// Main
async function main() {
  try {
    console.log('=== App Store Connect Description Uploader ===\n');

    const appId = await getAppId();
    console.log(`Found app: ${appId}\n`);

    const version = await getAppStoreVersion(appId);
    console.log(`Found version: ${version.attributes.versionString} (${version.id}) — state: ${version.attributes.appStoreState}\n`);

    const existingLocalizations = await getVersionLocalizations(version.id);
    console.log(`Found ${existingLocalizations.length} existing localizations\n`);

    console.log('=== Updating Descriptions ===\n');

    for (const [locale, description] of Object.entries(DESCRIPTIONS)) {
      try {
        await updateVersionLocalization(version.id, locale, description, existingLocalizations);
      } catch (error) {
        console.error(`  ✗ Error updating ${locale}: ${error.message}`);
      }
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('\n=== Done ===');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
