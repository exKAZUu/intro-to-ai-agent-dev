export function parseFeatureFlags(text) {
  return Object.fromEntries(text.split(',').map((entry) => entry.split('=')));
}
