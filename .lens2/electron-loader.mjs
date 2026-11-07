/* ESM loader hook: resolve every `electron` import to the LENS2 stub. */
export async function resolve(specifier, context, next) {
  if (specifier === 'electron') {
    return { url: new URL('./electron-stub.mjs', import.meta.url).href, shortCircuit: true, format: 'module' };
  }
  return next(specifier, context);
}
