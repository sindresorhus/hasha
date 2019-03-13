/// <reference types="node"/>
import {Hash} from 'crypto';
import {Readable as ReadableStream} from 'stream';

export type ToStringEncoding = 'hex' | 'base64' | 'latin1';
export type HashaInput = Buffer | string | Array<Buffer | string>;
export type HashaEncoding = ToStringEncoding | 'buffer';

// TODO: Remove this clutter after https://github.com/Microsoft/TypeScript/issues/29729 is resolved
export type AlgorithmName = string & {algorithm?: unknown};

export interface Options<EncodingType = HashaEncoding> {
	/**
	 * Encoding of the returned hash.
	 *
	 * @default 'hex'
	 */
	readonly encoding?: EncodingType;

	/**
	 * Values: `md5` `sha1` `sha256` `sha512` *([Platform dependent](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm_options))*
	 *
	 * *The `md5` algorithm is good for [file revving](https://github.com/sindresorhus/rev-hash), but you should never use `md5` or `sha1` for anything sensitive. [They're insecure.](http://googleonlinesecurity.blogspot.no/2014/09/gradually-sunsetting-sha-1.html)*
	 *
	 * @default 'sha512'
	 */
	readonly algorithm?: 'md5' | 'sha1' | 'sha256' | 'sha512' | AlgorithmName;
}

declare const hasha: {
	/**
	 * Calculate the hash for a `string`, `Buffer`, or an array thereof.
	 *
	 * @param input - Data you want to hash.
	 *
	 * While strings are supported you should prefer buffers as they're faster to hash. Although if you already have a string you should not convert it to a buffer.
	 *
	 * Pass an array instead of concatenating strings and/or buffers. The output is the same, but arrays do not incur the overhead of concatenation.
	 *
	 * @returns A hash.
	 */
	(input: HashaInput): string;
	(input: HashaInput, options: Options<ToStringEncoding>): string;
	(input: HashaInput, options: Options<'buffer'>): Buffer;

	/**
	 * Create a [hash transform stream](https://nodejs.org/api/crypto.html#crypto_class_hash).
	 *
	 * @returns The created hash transform stream.
	 */
	stream(options?: Options<HashaEncoding>): Hash;

	/**
	 * Calculate the hash for a stream.
	 *
	 * @param stream - A stream you want to hash.
	 * @returns The calculated hash.
	 */
	fromStream(stream: ReadableStream): Promise<string | null>;
	fromStream(
		stream: ReadableStream,
		options?: Options<ToStringEncoding>
	): Promise<string | null>;
	fromStream(
		stream: ReadableStream,
		options?: Options<'buffer'>
	): Promise<Buffer | null>;

	/**
	 * Calculate the hash for a file.
	 *
	 * @param filePath - Path to a file you want to hash.
	 * @returns The calculated file hash.
	 */
	fromFile(filePath: string): Promise<string | null>;
	fromFile(
		filePath: string,
		options: Options<ToStringEncoding>
	): Promise<string | null>;
	fromFile(
		filePath: string,
		options: Options<'buffer'>
	): Promise<Buffer | null>;

	/**
	 * Synchronously calculate the hash for a file.
	 *
	 * @param filePath - Path to a file you want to hash.
	 * @returns The calculated file hash.
	 */
	fromFileSync(filePath: string): string;
	fromFileSync(filePath: string, options: Options<ToStringEncoding>): string;
	fromFileSync(filePath: string, options: Options<'buffer'>): Buffer;
};

export default hasha;
