'use strict';
var fs = require('fs');
var test = require('ava');
var isStream = require('is-stream');
var hasha = require('./');

test('hasha()', function (t) {
	var fixture = new Buffer('unicorn');
	t.assert(hasha(fixture).length === 128);
	t.assert(hasha('unicorn').length === 128);
	t.assert(hasha({foo: 'bar'}).length === 128);
	t.assert(Buffer.isBuffer(hasha(fixture, {encoding: 'buffer'})));
	t.assert(hasha(fixture, {algorithm: 'md5'}).length === 32);
	t.end();
});

test('hasha.stream()', function (t) {
	t.assert(isStream(hasha.stream()));
	t.end();
});

test('hasha.fromStream()', function (t) {
	t.plan(1);

	hasha.fromStream(fs.createReadStream('test.js'), function (err, hash) {
		t.assert(hash.length === 128);
	});
});

test('hasha.fromFile()', function (t) {
	t.plan(1);

	hasha.fromFile('test.js', function (err, hash) {
		t.assert(hash.length === 128);
	});
});

test('hasha.fromFileSync()', function (t) {
	t.assert(hasha.fromFileSync('test.js').length === 128);
	t.end();
});
