/** Cache-busting version for CSS/JS, set by the build from a hash of their contents. */
export let ASSET_VERSION = 'dev';
export function setAssetVersion(v: string): void {
  ASSET_VERSION = v;
}
