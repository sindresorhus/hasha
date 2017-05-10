import fs from 'fs';
import {Writable} from 'stream';
import test from 'ava';
import isStream from 'is-stream';
import proxyquire from 'proxyquire';
import m from '.';

test('hasha()', t => {
	const fixture = Buffer.from('unicorn');
	t.is(m(fixture).length, 128);
	t.is(m('unicorn').length, 128);
	t.is(m(['foo', 'bar']).length, 128);
	t.is(m(['foo', Buffer.from('bar')]), m('foobar'));
	t.true(Buffer.isBuffer(m(fixture, {encoding: 'buffer'})));
	t.is(m(fixture, {algorithm: 'md5'}).length, 32);
});

test('hasha.stream()', t => {
	t.true(isStream(m.stream()));
});

test('hasha.fromStream()', async t => {
	t.is((await m.fromStream(fs.createReadStream('test.js'))).length, 128);
});

test('crypto error', async t => {
	const proxied = proxyquire('./', {
		crypto: {
			createHash: () => {
				const stream = new Writable();
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
	t.is((await m.fromFile('test.js')).length, 128);
});

test('hasha.fromFile(non-existent)', async t => {
	const err = await t.throws(m.fromFile('non-existent-file.txt'));
	t.is(err.code, 'ENOENT');
});

test('hasha.fromFileSync()', t => {
	t.is(m.fromFileSync('test.js').length, 128);
});
