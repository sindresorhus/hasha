/// <reference types="node"/>
import hasha from '.';
import {Worker as BaseWorker} from "worker_threads";

declare class Worker extends BaseWorker {
	constructor(options?: any);

	/**
	Calculate the hash for a `string`, `Buffer`, or an array thereof.

	@param input - Data you want to hash.

	While strings are supported you should prefer buffers as they're faster to hash. Although if you already have a string you should not convert it to a buffer.

	Pass an array instead of concatenating strings and/or buffers. The output is the same, but arrays do not incur the overhead of concatenation.

	@returns A hash.

	@example
	```
	import hasha = require('hasha');

	const worker = new hasha.Worker()

	worker.fromInput('unicorn');
	//=> 'e233b19aabc7d5e53826fb734d1222f1f0444c3a3fc67ff4af370a66e7cadd2cb24009f1bc86f0bed12ca5fcb226145ad10fc5f650f6ef0959f8aadc5a594b27'
	```
	*/
	fromInput(input: hasha.HashaInput): Promise<string>;
	fromInput(
		input: hasha.HashaInput,
		options: hasha.Options<hasha.ToStringEncoding>
	): Promise<string>;
	fromInput(input: hasha.HashaInput, options: hasha.Options<'buffer'>): Promise<Buffer>;

	/**
	Calculate the hash for a file.

	@param filePath - Path to a file you want to hash.
	@returns The calculated file hash.

	@example
	```
	import hasha = require('hasha');

	const worker = new hasha.Worker();

	(async () => {
		// Get the MD5 hash of an image
		const hash = await worker.fromFile('unicorn.png', {algorithm: 'md5'});

		console.log(hash);
		//=> '1abcb33beeb811dca15f0ac3e47b88d9'
	})();
	```
	*/
	fromFile(filePath: string): Promise<string | null>;
	fromFile(
		filePath: string,
		options: hasha.Options<hasha.ToStringEncoding>
	): Promise<string | null>;
	fromFile(
		filePath: string,
		options: hasha.Options<'buffer'>
	): Promise<Buffer | null>;

	/**
	Synchronously calculate the hash for a file.

	@param filePath - Path to a file you want to hash.
	@returns The calculated file hash.
	*/
	fromFileSync(filePath: string): Promise<string>;
	fromFileSync(
		filePath: string,
		options: hasha.Options<hasha.ToStringEncoding>
	): Promise<string>;
	fromFileSync(filePath: string, options: hasha.Options<'buffer'>): Promise<Buffer>;
}

export = Worker;
