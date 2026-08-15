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
 *
 * This alias covers OUR imports only. A dependency that requires electron
 * itself is externalised and resolves through plain Node, so it reaches the
 * real package no matter what the alias says. That hole is closed separately
 * by ELECTRON_OVERRIDE_DIST_PATH in vitest.config.ts. Do not delete either
 * one believing the other covers it, because they cover different callers.
 */
module.exports = '/dev/null/electron-not-available-in-unit-tests';
