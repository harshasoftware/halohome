/*
 * Copyright 2022 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Note: we use `wasm_bindgen_worker_`-prefixed message types to make sure
// we can handle bundling into other files, which might happen to have their
// own `postMessage`/`onmessage` communication channels.
//
// If we didn't take that into the account, we could send much simpler signals
// like just `0` or whatever, but the code would be less resilient.

console.log('[RayonWorker] workerHelpers.js loaded');

function waitForMsgType(target, type) {
  return new Promise(resolve => {
    target.addEventListener('message', function onMsg({ data }) {
      if (data?.type !== type) return;
      target.removeEventListener('message', onMsg);
      resolve(data);
    });
  });
}

waitForMsgType(self, 'wasm_bindgen_worker_init').then(async ({ init, receiver }) => {
  console.log('[RayonWorker] Received init message, importing astro_core.js...');
  try {
    // Modified for Vite/Netlify compatibility:
    // Use absolute path to static files in /public/wasm/ to avoid hashed filename issues
    // The WASM module and memory are passed via init, so we just need the JS glue code
    // Vite dev server refuses to import non-asset modules from /public.
    // In production this works because /public is served as-is.
    // `@vite-ignore` prevents import analysis so the worker can load the glue at runtime.
    // Use a computed specifier so Vite doesn't try to treat /public files as ESM imports in dev.
    const astroCoreUrl = new URL('/wasm/astro_core.js', globalThis.location?.href ?? 'http://localhost').toString();
    const pkg = await import(/* @vite-ignore */ astroCoreUrl);
    console.log('[RayonWorker] astro_core.js imported, initializing WASM...');
    await pkg.default(init);
    console.log('[RayonWorker] WASM initialized, sending ready message');
    postMessage({ type: 'wasm_bindgen_worker_ready' });
    pkg.wbg_rayon_start_worker(receiver);
  } catch (error) {
    console.error('[RayonWorker] Error during init:', error);
  }
}).catch(error => {
  console.error('[RayonWorker] Error waiting for init message:', error);
});

// Note: this is never used, but necessary to prevent a bug in Firefox
// (https://bugzilla.mozilla.org/show_bug.cgi?id=1702191) where it collects
// Web Workers that have a shared WebAssembly memory with the main thread,
// but are not explicitly rooted via a `Worker` instance.
//
// By storing them in a variable, we can keep `Worker` objects around and
// prevent them from getting GC-d.
let _workers;

export async function startWorkers(module, memory, builder) {
  console.log('[RayonWorker] startWorkers called with', builder.numThreads(), 'threads');
  if (builder.numThreads() === 0) {
    throw new Error(`num_threads must be > 0.`);
  }

  const workerInit = {
    type: 'wasm_bindgen_worker_init',
    init: { module_or_path: module, memory },
    receiver: builder.receiver()
  };

  console.log('[RayonWorker] Creating', builder.numThreads(), 'workers...');
  _workers = await Promise.all(
    Array.from({ length: builder.numThreads() }, async (_, i) => {
      console.log(`[RayonWorker] Creating worker ${i + 1}...`);
      try {
        // Modified for Vite/Netlify compatibility:
        // Use absolute path to static workerHelpers.js in /public/wasm/
        // This avoids Vite's filename hashing which breaks nested worker loading
        const worker = new Worker('/wasm/workerHelpers.js', {
          type: 'module'
        });
        worker.onerror = (e) => console.error(`[RayonWorker] Worker ${i + 1} error:`, e);
        worker.postMessage(workerInit);
        console.log(`[RayonWorker] Worker ${i + 1} created, waiting for ready...`);
        await waitForMsgType(worker, 'wasm_bindgen_worker_ready');
        console.log(`[RayonWorker] Worker ${i + 1} ready!`);
        return worker;
      } catch (error) {
        console.error(`[RayonWorker] Failed to create worker ${i + 1}:`, error);
        throw error;
      }
    })
  );
  console.log('[RayonWorker] All workers ready, calling builder.build()');
  builder.build();
}
