export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
};

import { DatabaseService } from '../db/database';

/**
 * Safely get a value from IndexedDB with fallback
 * @param key - IndexedDB key
 * @param fallback - fallback value if key doesn't exist or parsing fails
 * @param parser - optional parser function (e.g., parseInt, JSON.parse)
 * @returns parsed value or fallback
 */
export const getFromIndexedDB = async <T>(
  key: string,
  fallback: T,
  parser?: (value: any) => T
): Promise<T> => {
  try {
    const stored = await DatabaseService.getMiscData(key);
    if (stored === null || stored === undefined) return fallback;

    if (parser) {
      return parser(stored);
    }

    return stored as T;
  } catch (error) {
    console.error(`❌ Error reading from IndexedDB key "${key}":`, error);
    return fallback;
  }
};

/**
 * Safely set a value in IndexedDB
 * @param key - IndexedDB key
 * @param value - value to store
 * @param serializer - optional serializer function (e.g., JSON.stringify)
 * @returns success boolean
 */
export const setToIndexedDB = async <T>(
  key: string,
  value: T,
  serializer?: (value: T) => any
): Promise<boolean> => {
  try {
    const valueToStore = serializer ? serializer(value) : value;
    return await DatabaseService.saveMiscData(key, valueToStore);
  } catch (error) {
    console.error(`❌ Error saving to IndexedDB key "${key}":`, error);
    return false;
  }
};

/**
 * LEGACY: Safely get a value from localStorage with fallback
 * @deprecated Use getFromIndexedDB instead
 */
export const getFromLocalStorage = <T>(
  key: string,
  fallback: T,
  parser?: (value: string) => T
): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;

    if (parser) {
      return parser(stored);
    }

    // Try to parse as JSON first, fallback to string
    try {
      return JSON.parse(stored);
    } catch {
      return stored as unknown as T;
    }
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return fallback;
  }
};

/**
 * LEGACY: Safely set a value in localStorage
 * @deprecated Use setToIndexedDB instead
 */
export const setToLocalStorage = <T>(
  key: string,
  value: T,
  serializer?: (value: T) => string
): boolean => {
  try {
    const valueToStore = serializer ? serializer(value) :
                        typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, valueToStore);
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage key "${key}":`, error);
    return false;
  }
};
