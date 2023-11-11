import {type Hash} from 'node:crypto';
import {type LiteralUnion} from 'type-fest';

export type HashInput = HashSyncInput | NodeJS.ReadableStream;
export type HashSyncInput = Uint8Array | string | Array<Uint8Array | string>;
export type StringEncoding = 'hex' | 'base64' | 'latin1';
export type HashEncoding = StringEncoding | 'buffer';

export type HashAlgorithm = LiteralUnion<
'md5' | 'sha1' | 'sha256' | 'sha512',
string
>;

export type Options<EncodingType extends HashEncoding = 'hex'> = {
	/**
	The encoding of the returned hash.

	@default 'hex'
	*/
	readonly encoding?: EncodingType;

	/**
	The available values are [platform dependent](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm_options).

	_The `md5` algorithm is good for [file revving](https://github.com/sindresorhus/rev-hash), but you should never use `md5` or `sha1` for anything sensitive. [They're insecure.](https://security.googleblog.com/2014/09/gradually-sunsetting-sha-1.html)_

	@default 'sha512'
	*/
	readonly algorithm?: HashAlgorithm;
};

/**
Calculate the hash of a `string`, `Uint8Array`, or an array thereof.

@param input - The value to hash.
@returns A hash.

The operation is executed using `worker_threads`. A thread is lazily spawned on the first operation and lives until the end of the program execution. It's unrefed, so it won't keep the process alive.

While strings are supported you should prefer buffers as they're faster to hash. Although if you already have a string you should not convert it to a buffer.

Pass an array instead of concatenating strings and/or buffers. The output is the same, but arrays do not incur the overhead of concatenation.

@example
```
import {hash} from 'hasha';

await hash('unicorn');
//=> 'e233b19aabc7d5e53826fb734d1222f1f0444c3a3fc67ff4af370a66e7cadd2cb24009f1bc86f0bed12ca5fcb226145ad10fc5f650f6ef0959f8aadc5a594b27'
```
*/
export function hash(input: HashInput, options?: Options<StringEncoding>): Promise<string>;
export function hash(input: HashInput, options?: Options<'buffer'>): Promise<Buffer>;

/**
Synchronously calculate the hash of a `string`, `Uint8Array`, or an array thereof.

@param input - The value to hash.
@returns A hash.

While strings are supported you should prefer buffers as they're faster to hash. Although if you already have a string you should not convert it to a buffer.

Pass an array instead of concatenating strings and/or buffers. The output is the same, but arrays do not incur the overhead of concatenation.

@example
```
import {hashSync} from 'hasha';

hashSync('unicorn');
//=> 'e233b19aabc7d5e53826fb734d1222f1f0444c3a3fc67ff4af370a66e7cadd2cb24009f1bc86f0bed12ca5fcb226145ad10fc5f650f6ef0959f8aadc5a594b27'
```
*/
export function hashSync(input: HashSyncInput, options?: Options<StringEncoding>): string;
export function hashSync(input: HashSyncInput, options?: Options<'buffer'>): Buffer;

/**
Calculate the hash of a file.

@param filePath - Path to a file you want to hash.
@returns The calculated file hash.

The operation is executed using `worker_threads`. A thread is lazily spawned on the first operation and lives until the end of the program execution. It's unrefed, so it won't keep the process alive.

@example
```
import {hashFile} from 'hasha';

// Get the MD5 hash of an image
await hashFile('unicorn.png', {algorithm: 'md5'});
//=> '1abcb33beeb811dca15f0ac3e47b88d9'
```
*/
export function hashFile(filePath: string, options?: Options<StringEncoding>): Promise<string>;
export function hashFile(filePath: string, options?: Options<'buffer'>): Promise<Buffer>;

/**
Synchronously calculate the hash of a file.

@param filePath - Path to a file you want to hash.
@returns The calculated file hash.

@example
```
import {hashFileSync} from 'hasha';

// Get the MD5 hash of an image
hashFileSync('unicorn.png', {algorithm: 'md5'});
//=> '1abcb33beeb811dca15f0ac3e47b88d9'
```
*/
export function hashFileSync(filePath: string, options?: Options<StringEncoding>): string;
export function hashFileSync(filePath: string, options?: Options<'buffer'>): Buffer;

/**
Create a [hash transform stream](https://nodejs.org/api/crypto.html#crypto_class_hash).

@example
```
import {hashingStream} from 'hasha';

// Hash the process input and output the hash sum
process.stdin.pipe(hashingStream()).pipe(process.stdout);
```
*/
export function hashingStream(options?: Options): Hash;
