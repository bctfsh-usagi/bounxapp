import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;
globalThis.process = globalThis.process || { env: {}, version: '', browser: true };
globalThis.process.nextTick = globalThis.process.nextTick || function(fn, ...args) {
  Promise.resolve().then(() => fn(...args));
};
