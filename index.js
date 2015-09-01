'use strict';
var fs = require('fs');
var crypto = require('crypto');
var isStream = require('is-stream');
var Promise = require('pinkie-promise');

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

	var stream = crypto.createHash(opts.algorithm || 'sha512');
	stream.setEncoding(outputEncoding);
	return stream;
};

hasha.fromStream = function (stream, opts) {
	if (!isStream(stream)) {
		throw new TypeError('Expected a stream');
	}

	opts = opts || {};

	return new Promise(function (resolve, reject) {
		stream
			.pipe(hasha.stream(opts).on('error', reject))
			.on('error', reject)
			.on('finish', function () {
				resolve(this.read());
			});
	});
};

hasha.fromFile = function (fp, opts) {
	return hasha.fromStream(fs.createReadStream(fp), opts);
};

hasha.fromFileSync = function (fp, opts) {
	return hasha(fs.readFileSync(fp), opts);
};
