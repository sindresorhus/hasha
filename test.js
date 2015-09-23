'use strict';
var fs = require('fs');
var test = require('ava');
var isStream = require('is-stream');
var hasha = require('./');

test('hasha()', function (t) {
	var fixture = new Buffer('unicorn');
	t.is(hasha(fixture).length, 128);
	t.is(hasha('unicorn').length, 128);
	t.true(Buffer.isBuffer(hasha(fixture, {encoding: 'buffer'})));
	t.is(hasha(fixture, {algorithm: 'md5'}).length, 32);
	t.end();
});

test('hasha.stream()', function (t) {
	t.true(isStream(hasha.stream()));
	t.end();
});

test('hasha.fromStream()', function (t) {
	return hasha.fromStream(fs.createReadStream('test.js')).then(function (hash) {
		t.is(hash.length, 128);
	});
});

test('hasha.fromFile()', function (t) {
	return hasha.fromFile('test.js').then(function (hash) {
		t.is(hash.length, 128);
	});
});

test('hasha.fromFile(non-existent)', function (t) {
	t.plan(1);
	return hasha.fromFile('non-existent-file.txt').catch(function (err) {
		t.is(err.code, 'ENOENT');
	});
});

test('hasha.fromFileSync()', function (t) {
	t.is(hasha.fromFileSync('test.js').length, 128);
	t.end();
});
