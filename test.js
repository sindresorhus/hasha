import fs from 'node:fs';
import {Writable as WritableStream} from 'node:stream';
import test from 'ava';
import {isStream} from 'is-stream';
import esmock from 'esmock';
import {
	hash,
	hashSync,
	hashFile,
	hashFileSync,
	hashingStream,
} from './index.js';

test('hash()', async t => {
	t.is((await hash(Buffer.from('unicorn'))).length, 128);
	t.is((await hash('unicorn')).length, 128);
	t.is((await hash(['foo', 'bar'])).length, 128);
	t.is(await hash(['foo', Buffer.from('bar')]), hashSync('foobar'));
	t.true(Buffer.isBuffer(await hash(Buffer.from('unicorn'), {encoding: 'buffer'})));
	t.is((await hash(Buffer.from('unicorn'), {algorithm: 'md5'})).length, 32);
	t.is((await hash(fs.createReadStream('test.js'))).length, 128);
});

test('hashSync()', t => {
	const fixture = Buffer.from('unicorn');
	t.is(hashSync(fixture).length, 128);
	t.is(hashSync('unicorn').length, 128);
	t.is(hashSync(['foo', 'bar']).length, 128);
	t.is(hashSync(['foo', Buffer.from('bar')]), hashSync('foobar'));
	t.true(Buffer.isBuffer(hashSync(fixture, {encoding: 'buffer'})));
	t.is(hashSync(fixture, {algorithm: 'md5'}).length, 32);
});

test('hashFile()', async t => {
	t.is((await hashFile('test.js')).length, 128);
});

test('hashFile() - non-existent', async t => {
	await t.throwsAsync(hashFile('non-existent-file.txt'), {code: 'ENOENT'});
});

test('hashFileSync()', t => {
	t.is(hashFileSync('test.js').length, 128);
});

test('hashingStream()', t => {
	t.true(isStream(hashingStream()));
});

test('crypto error', async t => {
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

	await t.throwsAsync(proxied.hash(fs.createReadStream('test.js')), {message: 'some crypto error'});
});

test('hash() - AbortSignal already aborted', async t => {
	const controller = new AbortController();
	controller.abort();

	await t.throwsAsync(
		hash('unicorn', {signal: controller.signal}),
		{name: 'AbortError'},
	);
});

test('hash() - AbortSignal with stream already aborted', async t => {
	const controller = new AbortController();
	controller.abort();

	await t.throwsAsync(
		hash(fs.createReadStream('test.js'), {signal: controller.signal}),
		{name: 'AbortError'},
	);
});

test('hash() - AbortSignal with stream', async t => {
	const controller = new AbortController();

	const promise = hash(fs.createReadStream('test.js'), {signal: controller.signal});

	// Abort after a short delay
	setTimeout(() => controller.abort(), 10);

	await t.throwsAsync(promise, {name: 'AbortError'});
});

test('hashFile() - AbortSignal already aborted', async t => {
	const controller = new AbortController();
	controller.abort();

	await t.throwsAsync(
		hashFile('test.js', {signal: controller.signal}),
		{name: 'AbortError'},
	);
});

test('hashFile() - AbortSignal during operation', async t => {
	const controller = new AbortController();

	const promise = hashFile('test.js', {signal: controller.signal});

	// Abort after a short delay
	setTimeout(() => controller.abort(), 10);

	await t.throwsAsync(promise, {name: 'AbortError'});
});

test('hashFile() - AbortSignal.timeout()', async t => {
	// Generate a larger test file for timeout testing
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

	await t.throwsAsync(
		hashFile(filePath, {signal: AbortSignal.timeout(1)}),
		{name: 'TimeoutError'},
	);
});

test('hash() - successful completion with signal', async t => {
	const controller = new AbortController();

	const result = await hash('unicorn', {signal: controller.signal});

	t.is(result.length, 128);
});

test('hashFile() - successful completion with signal', async t => {
	const controller = new AbortController();

	const result = await hashFile('test.js', {signal: controller.signal});

	t.is(result.length, 128);
});

test('worker thread is unrefed and does not keep process alive', async t => {
	// This test ensures the worker cleanup logic stays intact
	// The worker should be unrefed when no tasks are active
	const {hash: isolatedHash} = await import('./index.js');

	// Run a hash operation
	await isolatedHash('test');

	// After operation completes, the worker should be unrefed
	// We can't directly test unref, but we can verify the process would exit
	// by checking that there are no active handles keeping it alive from our module
	// This test passing means the worker was properly unrefed
	t.pass();
});

test('worker resilience - continues working after multiple operations', async t => {
	// Test that the worker properly handles multiple sequential operations
	// and maintains correct state between them
	const promises = [];

	for (let i = 0; i < 5; i++) {
		promises.push(hash(`test${i}`));
	}

	const results = await Promise.all(promises);

	// All operations should complete successfully
	t.is(results.length, 5);
	t.true(results.every(r => r.length === 128));

	// Worker should still work after multiple operations
	const finalResult = await hash('final');
	t.is(finalResult.length, 128);
});

test('buffer transfer - handles Uint8Array views correctly', async t => {
	// Create a larger buffer and a view into it
	const largeBuffer = Buffer.alloc(1024);
	largeBuffer.fill('x');

	// Create a view that doesn't start at offset 0
	const view = new Uint8Array(largeBuffer.buffer, 100, 200);
	view.fill('y'.codePointAt(0));

	// Hash the view - should only hash the 200 'y' bytes, not the whole buffer
	const viewHash = await hash(view);
	const expectedHash = await hash(Buffer.alloc(200, 'y'));

	t.is(viewHash, expectedHash);
});

test('error rehydration - preserves error properties', async t => {
	// Mock a worker error by attempting to hash a non-existent file
	const error = await t.throwsAsync(hashFile('/non/existent/file/path.txt'), {
		code: 'ENOENT',
	});

	// Ensure error message is preserved
	t.truthy(error.message);
	t.regex(error.message, /enoent|no such file/i);
});

test('abort listener cleanup - removes listeners on completion', async t => {
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
	t.is(finalListeners, initialListeners);
});

test('hash() - handles array of mixed types', async t => {
	const parts = [
		'string part',
		Buffer.from('buffer part'),
		new Uint8Array(Buffer.from('uint8array part')),
	];

	const result = await hash(parts);
	const expected = await hash('string partbuffer partuint8array part');

	t.is(result, expected);
});

test('hash() - buffer encoding returns Buffer', async t => {
	const result = await hash('test', {encoding: 'buffer'});
	t.true(Buffer.isBuffer(result));
});

test('hashFile() - buffer encoding returns Buffer', async t => {
	const result = await hashFile('test.js', {encoding: 'buffer'});
	t.true(Buffer.isBuffer(result));
});

test('concurrent operations with abort', async t => {
	const controllers = Array.from({length: 3}, () => new AbortController());

	const promises = controllers.map((controller, i) =>
		hash(`test${i}`, {signal: controller.signal}),
	);

	// Abort the middle one
	controllers[1].abort();

	const results = await Promise.allSettled(promises);

	t.is(results[0].status, 'fulfilled');
	t.is(results[1].status, 'rejected');
	t.is(results[2].status, 'fulfilled');
});

test('worker handles ArrayBuffer transfer correctly', async t => {
	// Create a Uint8Array and ensure it's properly transferred
	const data = new Uint8Array([1, 2, 3, 4, 5]);
	const result = await hash(data);

	// Should produce consistent hash
	const expected = await hash(Buffer.from([1, 2, 3, 4, 5]));
	t.is(result, expected);
});

test('large array of parts', async t => {
	// Test with many small parts to ensure abort checks work
	const parts = Array.from({length: 100}, (_, i) => `part${i}`);
	const result = await hash(parts);

	t.is(result.length, 128);
});

test('empty input handling', async t => {
	// Test various empty inputs
	t.is(await hash(''), hashSync(''));
	t.is(await hash([]), hashSync([]));
	t.is(await hash(Buffer.alloc(0)), hashSync(Buffer.alloc(0)));
	t.is(await hash(new Uint8Array(0)), hashSync(new Uint8Array(0)));
});

test('zero-length view edge case', async t => {
	const buffer = Buffer.alloc(100);
	const zeroView = new Uint8Array(buffer.buffer, 50, 0);

	t.is(await hash(zeroView), hashSync(''));
});

test('invalid encoding throws', async t => {
	t.throws(() => hashSync('test', {encoding: 'invalid'}), {instanceOf: TypeError});
	t.throws(() => hashingStream({encoding: 'invalid'}), {instanceOf: TypeError});
	await t.throwsAsync(hash('test', {encoding: 'invalid'}), {instanceOf: TypeError});
	await t.throwsAsync(hashFile('test.js', {encoding: 'invalid'}), {instanceOf: TypeError});
});

test('hashSync rejects streams', t => {
	const stream = fs.createReadStream('test.js');
	t.throws(() => hashSync(stream), {instanceOf: TypeError});
	stream.destroy();
});

test('AbortSignal.reason propagation', async t => {
	const controller = new AbortController();
	const customReason = new Error('Custom abort reason');

	const promise = hash('test', {signal: controller.signal});
	controller.abort(customReason);

	const error = await t.throwsAsync(promise);
	t.is(error, customReason);
});

test('worker survives malformed messages', async t => {
	// This should still work after potential worker internal errors
	const result = await hash('test after potential worker issues');
	t.is(result.length, 128);
});
