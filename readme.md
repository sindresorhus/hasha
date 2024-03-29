<h1 align="center">
	<br>
	<br>
	<br>
	<img width="380" src="media/logo.svg" alt="hasha">
	<br>
	<br>
	<br>
	<br>
	<br>
</h1>

> Hashing made simple. Get the hash of a buffer/string/stream/file.

Convenience wrapper around the core [`crypto` Hash class](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm) with simpler API and better defaults.

## Install

```sh
npm install hasha
```

## Usage

```js
import {hash} from 'hasha';

await hash('unicorn');
//=> 'e233b19aabc7d5e53826fb734d1222f1f0444c3a3fc67ff4af370a66e7cadd2cb24009f1bc86f0bed12ca5fcb226145ad10fc5f650f6ef0959f8aadc5a594b27'
```

## API

See the Node.js [`crypto` docs](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm_options) for more about hashing.

### hash(input, options?)

The operation is executed using `worker_threads`. A thread is lazily spawned on the first operation and lives until the end of the program execution. It's unrefed, so it won't keep the process alive.

Returns a hash asynchronously.

### hashSync(input, options?)

Returns a hash.

#### input

Type: `Uint8Array | string | Array<Uint8Array | string> | NodeJS.ReadableStream` *(`NodeJS.ReadableStream` is not available in `hashSync`)*

The value to hash.

While strings are supported you should prefer buffers as they're faster to hash. Although if you already have a string you should not convert it to a buffer.

Pass an array instead of concatenating strings and/or buffers. The output is the same, but arrays do not incur the overhead of concatenation.

#### options

Type: `object`

##### encoding

Type: `string`\
Default: `'hex'`\
Values: `'hex' | 'base64' | 'buffer' | 'latin1'`

The encoding of the returned hash.

##### algorithm

Type: `string`\
Default: `'sha512'`\
Values: `'md5' | 'sha1' | 'sha256' | 'sha512'` *([Platform dependent](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm_options))*

*The `md5` algorithm is good for [file revving](https://github.com/sindresorhus/rev-hash), but you should never use `md5` or `sha1` for anything sensitive. [They're insecure.](https://security.googleblog.com/2014/09/gradually-sunsetting-sha-1.html)*

### hashFile(filePath, options?)

The operation is executed using `worker_threads`. A thread is lazily spawned on the first operation and lives until the end of the program execution. It's unrefed, so it won't keep the process alive.

Returns a `Promise` for the calculated file hash.

```js
import {hashFile} from 'hasha';

// Get the MD5 hash of an image
await hashFile('unicorn.png', {algorithm: 'md5'});
//=> '1abcb33beeb811dca15f0ac3e47b88d9'
```

### hashFileSync(filePath, options?)

Returns the calculated file hash.

```js
import {hashFileSync} from 'hasha';

// Get the MD5 hash of an image
hashFileSync('unicorn.png', {algorithm: 'md5'});
//=> '1abcb33beeb811dca15f0ac3e47b88d9'
```

### hashingStream(options?)

Returns a [hash transform stream](https://nodejs.org/api/crypto.html#crypto_class_hash).

```js
import {hashingStream} from 'hasha';

// Hash the process input and output the hash sum
process.stdin.pipe(hashingStream()).pipe(process.stdout);
```

## Related

- [hasha-cli](https://github.com/sindresorhus/hasha-cli) - CLI for this module
- [crypto-hash](https://github.com/sindresorhus/crypto-hash) - Tiny hashing module that uses the native crypto API in Node.js and the browser
- [hash-object](https://github.com/sindresorhus/hash-object) - Get the hash of an object
- [md5-hex](https://github.com/sindresorhus/md5-hex) - Create a MD5 hash with hex encoding
