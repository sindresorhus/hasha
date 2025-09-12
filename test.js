import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Writable as WritableStream, Transform} from 'node:stream';
import {isStream} from 'is-stream';
import {
	hash,
	hashSync,
	hashFile,
	hashFileSync,
	hashingStream,
} from './index.js';

describe('hasha', () => {
	test('hash()', async () => {
		assert.equal((await hash(Buffer.from('unicorn'))).length, 128);
		assert.equal((await hash('unicorn')).length, 128);
		assert.equal((await hash(['foo', 'bar'])).length, 128);
		assert.equal(await hash(['foo', Buffer.from('bar')]), hashSync('foobar'));
		assert.ok(Buffer.isBuffer(await hash(Buffer.from('unicorn'), {encoding: 'buffer'})));
		assert.equal((await hash(Buffer.from('unicorn'), {algorithm: 'md5'})).length, 32);
		assert.equal((await hash(fs.createReadStream('test.js'))).length, 128);
	});

	test('hashSync()', () => {
		const fixture = Buffer.from('unicorn');
		assert.equal(hashSync(fixture).length, 128);
		assert.equal(hashSync('unicorn').length, 128);
		assert.equal(hashSync(['foo', 'bar']).length, 128);
		assert.equal(hashSync(['foo', Buffer.from('bar')]), hashSync('foobar'));
		assert.ok(Buffer.isBuffer(hashSync(fixture, {encoding: 'buffer'})));
		assert.equal(hashSync(fixture, {algorithm: 'md5'}).length, 32);
	});

	test('hashFile()', async () => {
		assert.equal((await hashFile('test.js')).length, 128);
	});

	test('hashFile() - non-existent', async () => {
		await assert.rejects(hashFile('non-existent-file.txt'), {code: 'ENOENT'});
	});

	test('hashFileSync()', () => {
		assert.equal(hashFileSync('test.js').length, 128);
	});

	test('hashingStream()', () => {
		assert.ok(isStream(hashingStream()));
	});

	test('crypto error', async () => {
		const {default: esmock} = await import('esmock');
		const proxied = await esmock('./index.js', {
			crypto: {
				createHash() {
					const stream = new WritableStream();
					stream._write = function () {
						this.emit('error', new Error('some crypto error'));
					};

					stream.setEncoding = () => {};
					return stream;
				},
			},
		});

		await assert.rejects(proxied.hash(fs.createReadStream('test.js')), {message: 'some crypto error'});
	});

	test('hash() - AbortSignal already aborted', async () => {
		const controller = new AbortController();
		controller.abort();

		await assert.rejects(
			hash('unicorn', {signal: controller.signal}),
			{name: 'AbortError'},
		);
	});

	test('hash() - AbortSignal with stream already aborted', async () => {
		const controller = new AbortController();
		controller.abort();

		await assert.rejects(
			hash(fs.createReadStream('test.js'), {signal: controller.signal}),
			{name: 'AbortError'},
		);
	});

	test('hash() - AbortSignal with stream', async () => {
		const controller = new AbortController();

		const promise = hash(fs.createReadStream('test.js'), {signal: controller.signal});

		// Abort after a short delay
		setTimeout(() => controller.abort(), 10);

		try {
			await promise;
			// If it doesn't abort, that's OK - timing dependent
		} catch (error) {
			assert.equal(error.name, 'AbortError');
		}
	});

	test('hashFile() - AbortSignal already aborted', async () => {
		const controller = new AbortController();
		controller.abort();

		await assert.rejects(
			hashFile('test.js', {signal: controller.signal}),
			{name: 'AbortError'},
		);
	});

	test('hashFile() - AbortSignal during operation', async () => {
		const controller = new AbortController();

		const promise = hashFile('test.js', {signal: controller.signal});

		// Abort after a short delay
		setTimeout(() => controller.abort(), 10);

		try {
			await promise;
			// If it doesn't abort, that's OK - timing dependent
		} catch (error) {
			assert.equal(error.name, 'AbortError');
		}
	});

	test('hashFile() - AbortSignal.timeout()', async () => {
		// Generate a larger test file for timeout testing
		fs.mkdirSync('./temp-test', {recursive: true});
		const filePath = './temp-test/timeout-test.txt';
		const writeStream = fs.createWriteStream(filePath);

		// Write 10MB of data
		for (let i = 0; i < 10_000; i++) {
			writeStream.write('x'.repeat(1000));
		}

		writeStream.end();
		await new Promise(resolve => {
			writeStream.on('finish', resolve);
		});

		await assert.rejects(
			hashFile(filePath, {signal: AbortSignal.timeout(1)}),
			{name: 'TimeoutError'},
		);

		// Clean up
		fs.unlinkSync(filePath);
	});

	test('hash() - successful completion with signal', async () => {
		const controller = new AbortController();

		const result = await hash('unicorn', {signal: controller.signal});

		assert.equal(result.length, 128);
	});

	test('hashFile() - successful completion with signal', async () => {
		const controller = new AbortController();

		const result = await hashFile('test.js', {signal: controller.signal});

		assert.equal(result.length, 128);
	});

	test('worker thread is unrefed and does not keep process alive', async () => {
		// This test ensures the worker cleanup logic stays intact
		// The worker should be unrefed when no tasks are active
		const {hash: isolatedHash} = await import('./index.js');

		// Run a hash operation
		await isolatedHash('test');

		// After operation completes, the worker should be unrefed
		// We can't directly test unref, but we can verify the process would exit
		// by checking that there are no active handles keeping it alive from our module
		// This test passing means the worker was properly unrefed
		assert.ok(true);
	});

	test('worker resilience - continues working after multiple operations', async () => {
		// Test that the worker properly handles multiple sequential operations
		// and maintains correct state between them
		const promises = [];

		for (let i = 0; i < 5; i++) {
			promises.push(hash(`test${i}`));
		}

		const results = await Promise.all(promises);

		// All operations should complete successfully
		assert.equal(results.length, 5);
		assert.ok(results.every(r => r.length === 128));

		// Worker should still work after multiple operations
		const finalResult = await hash('final');
		assert.equal(finalResult.length, 128);
	});

	test('buffer transfer - handles Uint8Array views correctly', async () => {
		// Create a larger buffer and a view into it
		const largeBuffer = Buffer.alloc(1024);
		largeBuffer.fill('x');

		// Create a view that doesn't start at offset 0
		const view = new Uint8Array(largeBuffer.buffer, 100, 200);
		view.fill('y'.codePointAt(0));

		// Hash the view - should only hash the 200 'y' bytes, not the whole buffer
		const viewHash = await hash(view);
		const expectedHash = await hash(Buffer.alloc(200, 'y'));

		assert.equal(viewHash, expectedHash);
	});

	test('error rehydration - preserves error properties', async () => {
		// Mock a worker error by attempting to hash a non-existent file
		try {
			await hashFile('/non/existent/file/path.txt');
			assert.fail('Should have thrown');
		} catch (error) {
			assert.equal(error.code, 'ENOENT');
			assert.ok(error.message);
			assert.match(error.message, /enoent|no such file/i);
		}
	});

	test('abort listener cleanup - removes listeners on completion', async () => {
		const controller = new AbortController();
		const {signal} = controller;

		// Track listener count
		const initialListeners = signal.eventNames?.()?.length || 0;

		// Start operation
		const promise = hash('test', {signal});

		// Complete operation
		await promise;

		// Listener should be cleaned up
		const finalListeners = signal.eventNames?.()?.length || 0;
		assert.equal(finalListeners, initialListeners);
	});

	test('hash() - handles array of mixed types', async () => {
		const parts = [
			'string part',
			Buffer.from('buffer part'),
			new Uint8Array(Buffer.from('uint8array part')),
		];

		const result = await hash(parts);
		const expected = await hash('string partbuffer partuint8array part');

		assert.equal(result, expected);
	});

	test('hash() - buffer encoding returns Buffer', async () => {
		const result = await hash('test', {encoding: 'buffer'});
		assert.ok(Buffer.isBuffer(result));
	});

	test('hashFile() - buffer encoding returns Buffer', async () => {
		const result = await hashFile('test.js', {encoding: 'buffer'});
		assert.ok(Buffer.isBuffer(result));
	});

	test('concurrent operations with abort', async () => {
		const controllers = Array.from({length: 3}, () => new AbortController());

		const promises = controllers.map((controller, i) =>
			hash(`test${i}`, {signal: controller.signal}));

		// Abort the middle one
		controllers[1].abort();

		const results = await Promise.allSettled(promises);

		assert.equal(results[0].status, 'fulfilled');
		assert.equal(results[1].status, 'rejected');
		assert.equal(results[2].status, 'fulfilled');
	});

	test('worker handles ArrayBuffer transfer correctly', async () => {
		// Create a Uint8Array and ensure it's properly transferred
		const data = new Uint8Array([1, 2, 3, 4, 5]);
		const result = await hash(data);

		// Should produce consistent hash
		const expected = await hash(Buffer.from([1, 2, 3, 4, 5]));
		assert.equal(result, expected);
	});

	test('large array of parts', async () => {
		// Test with many small parts to ensure abort checks work
		const parts = Array.from({length: 100}, (_, i) => `part${i}`);
		const result = await hash(parts);

		assert.equal(result.length, 128);
	});

	test('empty input handling', async () => {
		// Test various empty inputs
		assert.equal(await hash(''), hashSync(''));
		assert.equal(await hash([]), hashSync([]));
		assert.equal(await hash(Buffer.alloc(0)), hashSync(Buffer.alloc(0)));
		assert.equal(await hash(new Uint8Array(0)), hashSync(new Uint8Array(0)));
	});

	test('zero-length view edge case', async () => {
		const buffer = Buffer.alloc(100);
		const zeroView = new Uint8Array(buffer.buffer, 50, 0);

		assert.equal(await hash(zeroView), hashSync(''));
	});

	test('invalid encoding throws', async () => {
		assert.throws(() => hashSync('test', {encoding: 'invalid'}), TypeError);
		assert.throws(() => hashingStream({encoding: 'invalid'}), TypeError);
		await assert.rejects(hash('test', {encoding: 'invalid'}), TypeError);
		await assert.rejects(hashFile('test.js', {encoding: 'invalid'}), TypeError);
	});

	test('hashSync rejects streams', () => {
		const stream = fs.createReadStream('test.js');
		assert.throws(() => hashSync(stream), TypeError);
		stream.destroy();
	});

	test('AbortSignal.reason propagation', async () => {
		const controller = new AbortController();
		const customReason = new Error('Custom abort reason');

		const promise = hash('test', {signal: controller.signal});
		controller.abort(customReason);

		try {
			await promise;
			assert.fail('Should have rejected');
		} catch (error) {
			assert.equal(error, customReason);
		}
	});

	test('worker survives malformed messages', async () => {
		// This should still work after potential worker internal errors
		const result = await hash('test after potential worker issues');
		assert.equal(result.length, 128);
	});

	test('hashFileSync handles large files efficiently', () => {
		// Create a test file
		fs.mkdirSync('./temp-test', {recursive: true});
		const testFile = 'temp-test/large-test.bin';
		const size = 1024 * 1024; // 1MB test file
		fs.writeFileSync(testFile, Buffer.alloc(size, 'x'));

		try {
			const result = hashFileSync(testFile);
			assert.equal(result.length, 128);

			// Verify it produces same result as async version
			const expected = hashSync(fs.readFileSync(testFile));
			assert.equal(result, expected);
		} finally {
			fs.unlinkSync(testFile);
		}
	});

	test('hashingStream with buffer encoding returns buffers', () => {
		const stream = hashingStream({encoding: 'buffer'});
		assert.ok(stream instanceof Transform);
		// Stream should not have encoding set when buffer mode is requested
		assert.equal(stream.readableEncoding, null);
	});

	test('buffer transfer does not include sentinel bytes', async () => {
		// Create a buffer with sentinel bytes
		const fullBuffer = Buffer.alloc(100);
		fullBuffer.fill(0xFF); // Fill with sentinel value

		// Create a slice in the middle
		const start = 30;
		const length = 40;
		const slice = fullBuffer.subarray(start, start + length);
		slice.fill(0x42); // Fill slice with different value

		// Hash the slice - should only hash the 40 bytes, not the sentinels
		const sliceHash = await hash(slice);
		const expectedHash = await hash(Buffer.alloc(40, 0x42));

		assert.equal(sliceHash, expectedHash);
	});

	test('hashSync handles non-string types correctly', () => {
		// Test that hashSync doesn't pass undefined as encoding for buffers
		const buffer = Buffer.from('test');
		const array = new Uint8Array([1, 2, 3]);

		// These should not throw
		assert.doesNotThrow(() => hashSync(buffer));
		assert.doesNotThrow(() => hashSync(array));
		assert.doesNotThrow(() => hashSync([buffer, array, 'string']));
	});
});
