import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Supabase's auth storage adapter. Native (iOS/Android) persists the session
 * - including the long-lived refresh token - in the platform Keychain/
 * Keystore via SecureStore instead of plain AsyncStorage, so it can't just be
 * read off disk from a rooted device or an unencrypted backup.
 *
 * SecureStore has a ~2048 byte per-value limit (Android Keystore-backed), and
 * a Supabase session (access + refresh token + user object) routinely
 * exceeds that, so values are split across multiple SecureStore entries and
 * reassembled on read.
 *
 * Web has no Keychain/Keystore equivalent and expo-secure-store is a no-op
 * there, so web keeps using AsyncStorage as before - same as this file's
 * existing `Platform.OS === 'web'` handling for session-URL detection.
 */

const CHUNK_SIZE = 1800;
const chunkCountKey = (key: string) => `${key}__chunks`;
const chunkKey = (key: string, i: number) => `${key}__${i}`;

async function getItem(key: string): Promise<string | null> {
  const countRaw = await SecureStore.getItemAsync(chunkCountKey(key));
  if (countRaw === null) return null;
  const count = Number(countRaw);
  const parts = await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(chunkKey(key, i)))
  );
  if (parts.some((p) => p === null)) return null;
  return parts.join('');
}

async function setItem(key: string, value: string): Promise<void> {
  const previousCountRaw = await SecureStore.getItemAsync(chunkCountKey(key));
  const previousCount = previousCountRaw === null ? 0 : Number(previousCountRaw);

  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(chunkKey(key, i), chunk)));
  // Drop any leftover chunks from a previous, longer value.
  await Promise.all(
    Array.from({ length: Math.max(0, previousCount - chunks.length) }, (_, i) =>
      SecureStore.deleteItemAsync(chunkKey(key, chunks.length + i))
    )
  );
  await SecureStore.setItemAsync(chunkCountKey(key), String(chunks.length));
}

async function removeItem(key: string): Promise<void> {
  const countRaw = await SecureStore.getItemAsync(chunkCountKey(key));
  const count = countRaw === null ? 0 : Number(countRaw);
  await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(chunkKey(key, i))));
  await SecureStore.deleteItemAsync(chunkCountKey(key));
}

export const authStorage = Platform.OS === 'web' ? AsyncStorage : { getItem, setItem, removeItem };
