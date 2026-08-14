/*
 * What `require('electron')` yields in plain Node when the binary dist is
 * present: the package's index.js exports the binary PATH STRING, so every
 * named import (app, shell, ...) is undefined through CJS interop, and the
 * modules that read them at import time guard for that.
 *
 * Unit tests must behave the same with or without the binary on disk. On CI
 * the dist can be absent or half extracted, and electron's index.js then
 * tries to DOWNLOAD the binary at require time; two vitest workers race the
 * extraction and the whole suite dies (gates runs 31843762207, twice). This
 * stub pins the with-binary behavior. vi.mock('electron', ...) in individual
 * tests still wins over the alias, unchanged.
 */
module.exports = '/dev/null/electron-not-available-in-unit-tests';
