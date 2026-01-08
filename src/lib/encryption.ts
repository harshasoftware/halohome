
// Helper to convert strings to ArrayBuffer
function str2ab(str: string): ArrayBuffer {
  return new TextEncoder().encode(str);
}

// Helper to convert ArrayBuffer to string
function ab2str(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

// Helper to convert ArrayBuffer to Base64
function ab2b64(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
function b642ab(b64: string): ArrayBuffer {
  const binary_string = window.atob(b64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generates a random salt for key derivation.
 * @returns {string} A Base64 encoded salt.
 */
export function generateSalt(): string {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  return ab2b64(salt);
}

/**
 * Derives a cryptographic key from a password and salt using PBKDF2.
 * @param {string} password The user's password.
 * @param {string} saltB64 The Base64 encoded salt.
 * @returns {Promise<CryptoKey>} The derived CryptoKey for AES-GCM.
 */
export async function deriveKeyFromPassword(password: string, saltB64: string): Promise<CryptoKey> {
  const salt = b642ab(saltB64);
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    str2ab(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts data (JSON object) using AES-GCM.
 * @param {CryptoKey} key The encryption key.
 * @param {T} data The JSON data to encrypt.
 * @returns {Promise<string>} A Base64 string containing the IV and the encrypted data.
 */
export async function encryptData<T = unknown>(key: CryptoKey, data: T): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedData = str2ab(JSON.stringify(data));

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encodedData
  );

  const result = new Uint8Array(iv.byteLength + encryptedContent.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedContent), iv.byteLength);
  
  return ab2b64(result.buffer);
}

/**
 * Decrypts data encrypted with AES-GCM.
 * @param {CryptoKey} key The decryption key.
 * @param {string} encryptedB64 The Base64 string of the IV and encrypted data.
 * @returns {Promise<T>} The decrypted JSON data.
 */
export async function decryptData<T = unknown>(key: CryptoKey, encryptedB64: string): Promise<T> {
  const encryptedDataWithIv = b642ab(encryptedB64);
  const iv = encryptedDataWithIv.slice(0, 12);
  const encryptedContent = encryptedDataWithIv.slice(12);

  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encryptedContent
  );

  return JSON.parse(ab2str(decryptedContent));
}

/**
 * Encrypts a file using AES-GCM.
 * @param {CryptoKey} key The encryption key.
 * @param {File} file The file to encrypt.
 * @returns {Promise<Blob>} The encrypted file as a Blob.
 */
export async function encryptFile(key: CryptoKey, file: File): Promise<Blob> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const fileBuffer = await file.arrayBuffer();

    const encryptedContent = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        fileBuffer
    );
    
    const result = new Uint8Array(iv.byteLength + encryptedContent.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encryptedContent), iv.byteLength);

    return new Blob([result.buffer], { type: 'application/octet-stream' });
}

/**
 * Decrypts a file encrypted with AES-GCM.
 * @param {CryptoKey} key The decryption key.
 * @param {Blob} encryptedBlob The encrypted file blob.
 * @returns {Promise<ArrayBuffer>} The decrypted file as a Blob with its original MIME type.
 */
export async function decryptFile(key: CryptoKey, encryptedBlob: Blob): Promise<ArrayBuffer> {
    const encryptedDataWithIv = await encryptedBlob.arrayBuffer();
    const iv = encryptedDataWithIv.slice(0, 12);
    const encryptedContent = encryptedDataWithIv.slice(12);

    const decryptedContent = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encryptedContent
    );

    return decryptedContent;
}

