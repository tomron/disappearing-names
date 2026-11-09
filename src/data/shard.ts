/** Shard id for a name: its first character as a hex code point. Shared by the build and the app. */
export const shardOf = (name: string) => name.codePointAt(0)!.toString(16);
