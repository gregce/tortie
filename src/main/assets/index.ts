/**
 * Asset serving for the renderer (Phase 12 item 6): the `gmux-asset:` scheme
 * that resolves images referenced by rendered markdown.
 */

export {
  ASSET_SCHEME,
  assetUrlForPath,
  registerAssetProtocol,
  registerAssetSchemePrivileged
} from './protocol';
