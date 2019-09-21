import fs from 'fs';
import {Writable as WritableStream} from 'stream';
import test from 'ava';
import isStream from 'is-stream';
import proxyquire from 'proxyquire';
import semver from 'semver';
import hasha from '.';

test('hasha()', t => {
	const fixture = Buffer.from('unicorn');

	t.is(hasha(fixture).length, 128);
	t.is(hasha('unicorn').length, 128);
	t.is(hasha(['foo', 'bar']).length, 128);
	t.is(hasha(['foo', Buffer.from('bar')]), hasha('foobar'));
	t.true(Buffer.isBuffer(hasha(fixture, {encoding: 'buffer'})));
	t.is(hasha(fixture, {algorithm: 'md5'}).length, 32);
});

test('hasha.stream()', t => {
	t.true(isStream(hasha.stream()));
});

test('hasha.fromStream()', async t => {
	t.is((await hasha.fromStream(fs.createReadStream('test.js'))).length, 128);
});

test('crypto error', async t => {
	const proxied = proxyquire('.', {
		crypto: {
			createHash: () => {
				const stream = new WritableStream();
				stream._write = function () {
					this.emit('error', new Error('some crypto error'));
				};

				stream.setEncoding = () => {};
				return stream;
			}
		}
	});

	await t.throwsAsync(proxied.fromStream(fs.createReadStream('test.js')), 'some crypto error');
});

test('hasha.fromFile()', async t => {
	t.is((await hasha.fromFile('test.js')).length, 128);
});

test('hasha.fromFile(non-existent)', async t => {
	await t.throwsAsync(hasha.fromFile('non-existent-file.txt'), {code: 'ENOENT'});
});

test('hasha.fromFileSync()', t => {
	t.is(hasha.fromFileSync('test.js').length, 128);
});

if (semver.gt(process.versions.node, '10.5.0')) {
	const Worker = require('./worker');
	const worker = new Worker();

	test('worker.fromInput()', async t => {
		const fixture = Buffer.from('unicorn');

		t.is((await worker.fromInput(fixture)).length, 128);
		t.deepEqual(await worker.fromInput(fixture), hasha(fixture));
		t.is((await worker.fromInput('unicorn')).length, 128);
		t.is((await worker.fromInput(['foo', 'bar'])).length, 128);
		t.is(await worker.fromInput(['foo', Buffer.from('bar')]), hasha('foobar'));
		t.true(Buffer.isBuffer(await worker.fromInput(fixture, {encoding: 'buffer'})));
		t.is((await worker.fromInput(fixture, {algorithm: 'md5'})).length, 32);
	});

	test('worker.fromFile()', async t => {
		t.is((await worker.fromFile('test.js')).length, 128);
	});

	test('worker.fromFile(non-existent)', async t => {
		await t.throwsAsync(worker.fromFile('non-existent-file.txt'), {code: 'ENOENT'});
	});

	test('worker.fromFileSync()', async t => {
		t.is((await worker.fromFileSync('test.js')).length, 128);
	});
}
