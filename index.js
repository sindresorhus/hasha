'use strict';
var fs = require('fs');
var crypto = require('crypto');
var isStream = require('is-stream');

var hasha = module.exports = function (buf, opts) {
	opts = opts || {};

	var inputEncoding = typeof buf === 'string' ? 'utf8' : undefined;
	var outputEncoding = opts.encoding || 'hex';

	if (outputEncoding === 'buffer') {
		outputEncoding = undefined;
	}

	return crypto
		.createHash(opts.algorithm || 'sha512')
		.update(buf, inputEncoding)
		.digest(outputEncoding);
};

hasha.stream = function (opts) {
	opts = opts || {};

	var outputEncoding = opts.encoding || 'hex';

	if (outputEncoding === 'buffer') {
		outputEncoding = undefined;
	}

	var stream = crypto.createHash(opts.algorithm || 'sha512')
	stream.setEncoding(outputEncoding);
	return stream;
};

hasha.fromStream = function (stream, opts, cb) {
	if (!isStream(stream)) {
		throw new TypeError('Expected a stream');
	}

	if (typeof opts !== 'object') {
		cb = opts;
		opts = {};
	}

	stream
		.pipe(hasha.stream(opts).on('error', cb))
		.on('error', cb)
		.on('finish', function () {
			cb(null, this.read());
		});
};

hasha.fromFile = function (pth, opts, cb) {
	if (typeof opts !== 'object') {
		cb = opts;
		opts = {};
	}

	hasha.fromStream(fs.createReadStream(pth), opts, cb);
};

hasha.fromFileSync = function (pth, opts) {
	return hasha(fs.readFileSync(pth), opts);
};
