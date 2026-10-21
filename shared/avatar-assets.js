import assets from './content/avatar-paths.json' with { type: 'json' };

// A local illustrative identity, stable across pages and visits. This is not a photo.
export function avatarForPerson(person) {
  const identity = typeof person === 'string' ? person : person?.id || person?.handle || person?.name;
  if (!identity || !assets.length) return null;
  let hash = 2166136261;
  for (const character of String(identity)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return assets[(hash >>> 0) % assets.length];
}
export const avatarAssetCount = assets.length;
