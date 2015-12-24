import fs from 'fs';
import test from 'ava';
import isStream from 'is-stream';
import proxyquire from 'proxyquire';
import fn from './';

const Writeable = require('stream').Writable;

test('hasha()', t => {
	const fixture = new Buffer('unicorn');
	t.is(fn(fixture).length, 128);
	t.is(fn('unicorn').length, 128);
	t.is(fn(['foo', 'bar']).length, 128);
	t.is(fn(['foo', new Buffer('bar')]), fn('foobar'));
	t.true(Buffer.isBuffer(fn(fixture, {encoding: 'buffer'})));
	t.is(fn(fixture, {algorithm: 'md5'}).length, 32);
});

test('hasha.stream()', t => {
	t.true(isStream(fn.stream()));
});

test('hasha.fromStream()', async t => {
	t.is((await fn.fromStream(fs.createReadStream('test.js'))).length, 128);
});

test('crypto error', async t => {
	const proxied = proxyquire('./', {
		crypto: {
			createHash: () => {
				const stream = new Writeable();
				stream._write = function () {
					this.emit('error', new Error('some crypto error'));
				};
				stream.setEncoding = () => {};
				return stream;
			}
		}
	});

	await t.throws(proxied.fromStream(fs.createReadStream('test.js')), 'some crypto error');
});

test('hasha.fromFile()', async t => {
	t.is((await fn.fromFile('test.js')).length, 128);
});

test('hasha.fromFile(non-existent)', async t => {
	try {
		await fn.fromFile('non-existent-file.txt');
	} catch (err) {
		t.is(err.code, 'ENOENT');
	}
});

test('hasha.fromFileSync()', t => {
	t.is(fn.fromFileSync('test.js').length, 128);
});
