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
