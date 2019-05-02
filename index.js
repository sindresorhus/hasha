'use strict';
const fs = require('fs');
const crypto = require('crypto');
const {Worker} = require('worker_threads');
const isStream = require('is-stream');

let worker; // Lazy
let taskIdCounter = 0;
const tasks = new Map();

const recreateWorkerError = sourceError => {
	const error = new Error(sourceError.message);

	for (const key of Object.keys(sourceError)) {
		if (key !== 'message') {
			error[key] = sourceError[key];
		}
	}

	return error;
};

const createWorker = () => {
	worker = new Worker('./thread.js');
	worker.on('message', message => {
		const task = tasks.get(message.id);
		tasks.delete(message.id);
		if (tasks.size === 0) {
			worker.unref();
		}

		if (message.error === undefined) {
			task.resolve(message.value);
		} else {
			task.reject(recreateWorkerError(message.error));
		}
	});
	worker.on('error', err => {
		// Any error here is effectively an equivalent of segfault, and have no scope, so we just throw it on callback level
		throw err;
	});
};

const taskWorker = (value, transferList) => new Promise((resolve, reject) => {
	const id = taskIdCounter++;
	tasks.set(id, {resolve, reject});
	if (worker === undefined) {
		createWorker();
	}

	worker.postMessage({id, value}, transferList);
});

const hasha = (input, options = {}) => {
	let outputEncoding = options.encoding || 'hex';

	if (outputEncoding === 'buffer') {
		outputEncoding = undefined;
	}

	const hash = crypto.createHash(options.algorithm || 'sha512');

	const update = buffer => {
		const inputEncoding = typeof buffer === 'string' ? 'utf8' : undefined;
		hash.update(buffer, inputEncoding);
	};

	if (Array.isArray(input)) {
		input.forEach(update);
	} else {
		update(input);
	}

	return hash.digest(outputEncoding);
};

hasha.stream = (options = {}) => {
	let outputEncoding = options.encoding || 'hex';

	if (outputEncoding === 'buffer') {
		outputEncoding = undefined;
	}

	const stream = crypto.createHash(options.algorithm || 'sha512');
	stream.setEncoding(outputEncoding);
	return stream;
};

hasha.fromStream = async (stream, options = {}) => {
	if (!isStream(stream)) {
		throw new TypeError('Expected a stream');
	}

	return new Promise((resolve, reject) => {
		// TODO: Use `stream.pipeline` and `stream.finished` when targeting Node.js 10
		stream
			.on('error', reject)
			.pipe(hasha.stream(options))
			.on('error', reject)
			.on('finish', function () {
				resolve(this.read());
			});
	});
};

hasha.fromFile = async (filePath, options) => {
	const algorithm = options !== undefined && options.algorithm !== undefined ? options.algorithm : 'sha512';
	const encoding = options !== undefined && options.encoding !== undefined ? options.encoding : 'hex';

	const hash = await taskWorker({filePath, algorithm});

	if (encoding === 'buffer') {
		return Buffer.from(hash);
	}

	return Buffer.from(hash).toString(encoding);
};

hasha.fromFileSync = (filePath, options) => hasha(fs.readFileSync(filePath), options);

module.exports = hasha;
