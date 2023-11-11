import fs from 'node:fs';
import crypto from 'node:crypto';
import {isStream} from 'is-stream';

const {Worker} = await (async () => {
	try {
		return await import('node:worker_threads');
	} catch {
		return {};
	}
})();

let worker; // Lazy
let taskIdCounter = 0;
const tasks = new Map();

const recreateWorkerError = sourceError => {
	const error = new Error(sourceError.message);

	for (const [key, value] of Object.entries(sourceError)) {
		if (key !== 'message') {
			error[key] = value;
		}
	}

	return error;
};

const createWorker = () => {
	worker = new Worker(new URL('thread.js', import.meta.url));

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

	worker.on('error', error => {
		// Any error here is effectively an equivalent of segfault, and have no scope, so we just throw it on callback level
		throw error;
	});
};

const taskWorker = (method, arguments_, transferList) => new Promise((resolve, reject) => {
	const id = taskIdCounter++;
	tasks.set(id, {resolve, reject});

	if (worker === undefined) {
		createWorker();
	}

	worker.ref();
	worker.postMessage({id, method, arguments_}, transferList);
});

export async function hash(input, options = {}) {
	if (isStream(input)) {
		return new Promise((resolve, reject) => {
			// TODO: Use `stream.compose` and `.toArray()`.
			input
				.on('error', reject)
				.pipe(hashingStream(options))
				.on('error', reject)
				.on('finish', function () {
					resolve(this.read());
				});
		});
	}

	if (Worker === undefined) {
		return hashSync(input, options);
	}

	let {
		encoding = 'hex',
		algorithm = 'sha512',
	} = options;

	if (encoding === 'buffer') {
		encoding = undefined;
	}

	const hash = await taskWorker('hash', [algorithm, input]);

	if (encoding === undefined) {
		return Buffer.from(hash);
	}

	return Buffer.from(hash).toString(encoding);
}

export function hashSync(input, {encoding = 'hex', algorithm = 'sha512'} = {}) {
	if (encoding === 'buffer') {
		encoding = undefined;
	}

	const hash = crypto.createHash(algorithm);

	const update = buffer => {
		const inputEncoding = typeof buffer === 'string' ? 'utf8' : undefined;
		hash.update(buffer, inputEncoding);
	};

	for (const element of [input].flat()) {
		update(element);
	}

	return hash.digest(encoding);
}

export async function hashFile(filePath, options = {}) {
	if (Worker === undefined) {
		return hash(fs.createReadStream(filePath), options);
	}

	const {
		encoding = 'hex',
		algorithm = 'sha512',
	} = options;

	const hash = await taskWorker('hashFile', [algorithm, filePath]);

	if (encoding === 'buffer') {
		return Buffer.from(hash);
	}

	return Buffer.from(hash).toString(encoding);
}

export function hashFileSync(filePath, options) {
	return hashSync(fs.readFileSync(filePath), options);
}

export function hashingStream({encoding = 'hex', algorithm = 'sha512'} = {}) {
	if (encoding === 'buffer') {
		encoding = undefined;
	}

	const stream = crypto.createHash(algorithm);
	stream.setEncoding(encoding);
	return stream;
}
