/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { hashString } from 'molstar/lib/mol-data/util';
import { Color } from 'molstar/lib/mol-util/color';
import { ColorNames } from 'molstar/lib/mol-util/color/names';


/** Convert object to a human-friendly string (similar to JSON.stringify but without quoting keys) */
export function formatObject(obj: {} | undefined): string {
    if (!obj) return 'undefined';
    return JSON.stringify(obj).replace(/,("\w+":)/g, ', $1').replace(/"(\w+)":/g, '$1: ');
}

/** Return an object with keys `keys` and their values same as in `obj` */
export function pickObjectKeys<T extends {}, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
    const result: Partial<Pick<T, K>> = {};
    for (const key of keys) {
        if (Object.hasOwn(obj, key)) {
            result[key] = obj[key];
        }
    }
    return result as Pick<T, K>;
}

/** Return an object same as `obj` but without keys `keys` */
export function omitObjectKeys<T extends {}, K extends keyof T>(obj: T, omitKeys: readonly K[]): Omit<T, K> {
    const result: T = { ...obj };
    for (const key of omitKeys) {
        delete result[key];
    }
    return result as Omit<T, K>;
}

/** Create an object from keys and values (first key maps to first value etc.) */
export function objectFromKeysAndValues<K extends keyof any, V>(keys: K[], values: V[]): Record<K, V> {
    const obj: Partial<Record<K, V>> = {};
    for (let i = 0; i < keys.length; i++) {
        obj[keys[i]] = values[i];
    }
    return obj as Record<K, V>;
}

/** Equivalent to Pythonic `{k: getValue(k) for k in array}` */
export function mapArrToObj<K extends keyof any, V>(array: readonly K[], getValue: (key: K) => V): Record<K, V> {
    const result = {} as Record<K, V>;
    for (const key of array) {
        result[key] = getValue(key);
    }
    return result;
}

/** Equivalent to Pythonic `{k: getValue(k, v) for k, v in obj.items()}` */
export function mapObjToObj<K extends keyof any, VIn, VOut>(obj: Record<K, VIn>, getValue: (key: K, value: VIn) => VOut): Record<K, VOut> {
    const result = {} as Record<K, VOut>;
    for (const key in obj) {
        result[key] = getValue(key, obj[key]);
    }
    return result;
}

/** Decide if `obj` is a good old object (not array or null or other type). */
export function isReallyObject(obj: any): boolean {
    return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

/** Return a copy of object `obj` with sorted keys and dropped keys whose value is undefined. */
export function sortObjectKeys<T extends {}>(obj: T): T {
    const result = {} as T;
    for (const key of Object.keys(obj).sort() as (keyof T)[]) {
        const value = obj[key];
        if (value !== undefined) {
            result[key] = value;
        }
    }
    return result;
}

/** Like `Promise.all` but with objects instead of arrays */
export async function promiseAllObj<T extends {}>(promisesObj: { [key in keyof T]: Promise<T[key]> }): Promise<T> {
    const keys = Object.keys(promisesObj);
    const promises = Object.values(promisesObj);
    const results = await Promise.all(promises);
    return objectFromKeysAndValues(keys, results) as any;
}


/** Return an array containing integers from [start, end) if `end` is given,
 * or from [0, start) if `end` is omitted. */
export function range(start: number, end?: number): number[] {
    if (end === undefined) {
        end = start;
        start = 0;
    }
    const length = Math.max(end - start, 0);
    const result = Array(length);
    for (let i = 0; i < length; i++) {
        result[i] = start + i;
    }
    return result;
}

/** Copy all elements from `src` to the end of `dst`.
 * Equivalent to `dst.push(...src)`, but avoids storing element on call stack. Faster that `extend` from Underscore.js.
 * `extend(a, a)` will double the array
 */
export function extend<T>(dst: T[], src: ArrayLike<T>): void {
    const offset = dst.length;
    const nCopy = src.length;
    dst.length += nCopy;
    for (let i = 0; i < nCopy; i++) {
        dst[offset + i] = src[i];
    }
}

/** Check whether `array` is sorted, sort if not. */
export function sortIfNeeded<T>(array: T[], compareFn: (a: T, b: T) => number): T[] {
    const n = array.length;
    for (let i = 1; i < array.length; i++) {
        if (compareFn(array[i - 1], array[i]) > 0) {
            return array.sort(compareFn);
        }
    }
    return array;
}

/** Return a slice of `array` starting at the first element fulfilling `fromPredicate`
 * up to the last element thenceforward ;) fulfilling `whilePredicate`.
 * E.g. `takeFromWhile([1,2,3,4,6,2,5,6], x => x>=4, x => x%2===0)` -> `[4,6,2]` */
export function takeFromWhile<T>(array: T[], fromPredicate: (x: T) => boolean, whilePredicate: (x: T) => boolean): T[] {
    const start = array.findIndex(fromPredicate);
    if (start < 0) return []; // no elements fulfil fromPredicate
    const n = array.length;
    let stop = start;
    while (stop < n && whilePredicate(array[stop])) stop++;
    return array.slice(start, stop);
}

/** Return a slice of `array` starting at `fromIndex`
 * up to the last element thenceforward ;) fulfilling `whilePredicate`. */
export function takeWhile<T>(array: T[], whilePredicate: (x: T) => boolean, fromIndex: number = 0): T[] {
    const n = array.length;
    let stop = fromIndex;
    while (stop < n && whilePredicate(array[stop])) stop++;
    return array.slice(fromIndex, stop);
}

/** Remove all elements from the array which do not fulfil `predicate`. Return the modified array itself. */
export function filterInPlace<T>(array: T[], predicate: (x: T) => boolean): T[] {
    const n = array.length;
    let iDest = 0;
    for (let iSrc = 0; iSrc < n; iSrc++) {
        if (predicate(array[iSrc])) {
            array[iDest++] = array[iSrc];
        }
    }
    array.length = iDest;
    return array;
}


/** Represents either the result or the reason of failure of an operation that might have failed */
export type Maybe<T> = { ok: true, value: T } | { ok: false, error: any }

/** Try to await a promise and return an object with its result (if resolved) or with the error (if rejected) */
export async function safePromise<T>(promise: T): Promise<Maybe<Awaited<T>>> {
    try {
        const value = await promise;
        return { ok: true, value };
    } catch (error) {
        return { ok: false, error };
    }
}


/** A map where values are arrays. Handles missing keys when adding values. */
export class MultiMap<K, V> extends Map<K, V[]> {
    /** Append value to a key (handles missing keys) */
    add(key: K, value: V) {
        if (!this.has(key)) {
            this.set(key, []);
        }
        this.get(key)!.push(value);
    }
}

/** Basic subset of `Map<K, V>`, only needs to have `get` method */
export type Mapping<K, V> = Pick<Map<K, V>, 'get'>

/** Implementation of `Map` where keys are integers
 * and most keys are expected to be from interval `[0, limit)`.
 * For the keys within this interval, performance is better than `Map` (implemented by array).
 * For the keys out of this interval, performance is slightly worse than `Map`. */
export class NumberMap<K extends number, V> implements Mapping<K, V> {
    private array: V[];
    private map: Map<K, V>;
    constructor(public readonly limit: K) {
        this.array = new Array(limit);
        this.map = new Map();
    }
    get(key: K): V | undefined {
        if (0 <= key && key < this.limit) return this.array[key];
        else return this.map.get(key);
    }
    set(key: K, value: V): void {
        if (0 <= key && key < this.limit) this.array[key] = value;
        else this.map.set(key, value);
    }
}

/** A JSON-serializable value */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined }


/** Return a canonical string representation for a JSON-able object,
 * independent from object key order and undefined properties. */
export function canonicalJsonString(obj: Json) {
    return JSON.stringify(obj, (key, value) => isReallyObject(value) ? sortObjectKeys(value) : value);
}

/** Return a pretty JSON representation for a JSON-able object,
 * (single line, but use space after comma). E.g. '{"name": "Bob", "favorite_numbers": [1, 2, 3]}' */
export function onelinerJsonString(obj: Json) {
    return JSON.stringify(obj, undefined, '\t').replace(/,\n\t*/g, ', ').replace(/\n\t*/g, '');
}

/** Return an array of all distinct values from `values`
 * (i.e. with removed duplicates).
 * Uses deep equality for objects and arrays,
 * independent from object key order and undefined properties.
 * E.g. {a: 1, b: undefined, c: {d: [], e: null}} is equal to {c: {e: null, d: []}}, a: 1}.
 * If two or more objects in `values` are equal, only the first of them will be in the result. */
export function distinct<T extends Json>(values: T[]): T[] {
    const seen = new Set<string>();
    const result: T[] = [];
    for (const value of values) {
        const key = canonicalJsonString(value);
        if (!seen.has(key)) {
            seen.add(key);
            result.push(value);
        }
    }
    return result;
}


/** Return `true` if `value` is not `undefined` or `null`.
 * Prefer this over `value !== undefined`
 * (for maybe if we want to allow `null` in `AnnotationRow` in the future) */
export function isDefined<T>(value: T | undefined | null): value is T {
    return value !== undefined && value !== null;
}
/** Return `true` if at least one of `values` is not `undefined` or `null`. */
export function isAnyDefined(...values: any[]): boolean {
    return values.some(v => isDefined(v));
}
/** Return filtered array containing all original elements except `undefined` or `null`. */
export function filterDefined<T>(elements: (T | undefined | null)[]): T[] {
    return elements.filter(x => x !== undefined && x !== null) as T[];
}

/** Create an 8-hex-character hash for a given input string, e.g. 'spanish inquisition' -> 'bd65e59a' */
export function stringHash(input: string): string {
    const uint32hash = hashString(input) >>> 0; // >>>0 converts to uint32, LOL
    return uint32hash.toString(16).padStart(8, '0');
}

/** Return type of elements in a set */
export type ElementOfSet<S> = S extends Set<infer T> ? T : never

/** Convert `colorString` (either X11 color name like 'magenta' or hex code like '#ff00ff') to Color.
 * Return `undefined` if `colorString` cannot be converted. */
export function decodeColor(colorString: string | undefined): Color | undefined {
    if (colorString === undefined) return undefined;
    let result: Color | undefined;
    if (isHexColorString(colorString)) {
        if (colorString.length === 4) {
            // convert short form to full form (#f0f -> #ff00ff)
            colorString = `#${colorString[1]}${colorString[1]}${colorString[2]}${colorString[2]}${colorString[3]}${colorString[3]}`;
        }
        result = Color.fromHexStyle(colorString);
        if (result !== undefined && !isNaN(result)) return result;
    }
    result = ColorNames[colorString.toLowerCase() as keyof typeof ColorNames];
    if (result !== undefined) return result;
    return undefined;
}

/** Hexadecimal color string, e.g. '#FF1100' */
export type HexColor = string & { '@type': 'HexColorString' }
export function HexColor(str: string) {
    if (!isHexColorString(str)) {
        throw new Error(`ValueError: "${str}" is not a valid hex color string`);
    }
    return str as HexColor;
}

/** Regular expression matching a hexadecimal color string, e.g. '#FF1100' or '#f10' */
const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;

/** Decide if a string is a valid hexadecimal color string (6-digit or 3-digit, e.g. '#FF1100' or '#f10') */
export function isHexColorString(str: any): str is HexColor {
    return typeof str === 'string' && hexColorRegex.test(str);
}
