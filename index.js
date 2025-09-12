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

const formatOutput = (buffer, encoding) => {
	if (encoding === 'buffer' || encoding === undefined) {
		return Buffer.from(buffer);
	}

	if (!['hex', 'base64', 'latin1'].includes(encoding)) {
		throw new TypeError(`Invalid encoding: ${encoding}`);
	}

	return Buffer.from(buffer).toString(encoding);
};

const recreateWorkerError = sourceError => {
	const error = new Error(sourceError.message);

	if (sourceError.name) {
		error.name = sourceError.name;
	}

	if (sourceError.stack) {
		error.stack = sourceError.stack;
	}

	for (const [key, value] of Object.entries(sourceError)) {
		if (!(key in error) && key !== 'message') {
			error[key] = value;
		}
	}

	return error;
};

const createWorker = () => {
	worker = new Worker(new URL('thread.js', import.meta.url));

	worker.on('message', message => {
		const task = tasks.get(message.id);

		if (!task) {
			// Task may have been aborted and cleaned up already
			return;
		}

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

	const handleWorkerError = error => {
		for (const task of tasks.values()) {
			task.reject(error);
		}

		tasks.clear();
		worker = undefined;
	};

	worker.on('error', handleWorkerError);
	worker.on('exit', code => {
		if (code !== 0) {
			handleWorkerError(new Error(`Worker thread exited with code ${code}`));
		}
	});
};

const taskWorker = (method, arguments_, signal) => new Promise((resolve, reject) => {
	const id = taskIdCounter++;

	const cleanup = () => {
		tasks.delete(id);
		if (tasks.size === 0) {
			worker?.unref();
		}
	};

	let abortCleanup;

	const handleTaskEnd = (fn, value) => {
		cleanup();
		abortCleanup?.();
		fn(value);
	};

	const task = {
		resolve: value => handleTaskEnd(resolve, value),
		reject: error => handleTaskEnd(reject, error),
	};

	tasks.set(id, task);

	// Handle abort signal
	if (signal) {
		const onAbort = () => {
			worker?.postMessage({id, abort: true});
			task.reject(signal.reason);
		};

		if (signal.aborted) {
			onAbort();
			return;
		}

		signal.addEventListener('abort', onAbort, {once: true});
		abortCleanup = () => signal.removeEventListener('abort', onAbort);
	}

	if (worker === undefined) {
		createWorker();
	}

	worker.ref();

	// Prepare transfer list for buffer inputs
	let transferList;
	if (method === 'hash' && arguments_[1]) {
		const parts = [arguments_[1]].flat();
		transferList = [];
		arguments_[1] = parts.map(part => {
			if (part instanceof Uint8Array) {
				const ab = part.buffer.slice(part.byteOffset, part.byteOffset + part.byteLength);
				transferList.push(ab);
				return ab;
			}

			return part;
		});

		if (arguments_[1].length === 1) {
			arguments_[1] = arguments_[1][0];
		}
	}

	worker.postMessage({id, method, arguments_}, transferList);
});

export async function hash(input, options = {}) {
	const {signal} = options;

	signal?.throwIfAborted();

	if (isStream(input)) {
		return new Promise((resolve, reject) => {
			const hashStream = hashingStream(options);

			signal?.addEventListener('abort', () => {
				input.destroy();
				hashStream.destroy();
				reject(signal.reason);
			}, {once: true});

			// TODO: Use `stream.compose` and `.toArray()`.
			input
				.on('error', reject)
				.pipe(hashStream)
				.on('error', reject)
				.on('finish', function () {
					resolve(this.read());
				});
		});
	}

	if (Worker === undefined) {
		return hashSync(input, options);
	}

	const {
		encoding = 'hex',
		algorithm = 'sha512',
	} = options;

	const hash = await taskWorker('hash', [algorithm, input], signal);
	return formatOutput(hash, encoding);
}

export function hashSync(input, {encoding = 'hex', algorithm = 'sha512'} = {}) {
	if (isStream(input)) {
		throw new TypeError('hashSync does not accept streams');
	}

	const hash = crypto.createHash(algorithm);

	for (const element of [input].flat()) {
		hash.update(element, typeof element === 'string' ? 'utf8' : undefined);
	}

	return formatOutput(hash.digest(), encoding);
}

export async function hashFile(filePath, options = {}) {
	const {signal} = options;

	signal?.throwIfAborted();

	if (Worker === undefined) {
		return hash(fs.createReadStream(filePath), options);
	}

	const {
		encoding = 'hex',
		algorithm = 'sha512',
	} = options;

	const hash = await taskWorker('hashFile', [algorithm, filePath], signal);
	return formatOutput(hash, encoding);
}

export function hashFileSync(filePath, {encoding = 'hex', algorithm = 'sha512'} = {}) {
	// Stream file synchronously for better memory usage with large files
	const hasher = crypto.createHash(algorithm);
	const chunkSize = 64 * 1024; // 64KB chunks
	const buffer = Buffer.alloc(chunkSize);
	const fd = fs.openSync(filePath, 'r');

	try {
		let bytesRead;
		let position = 0;

		do {
			bytesRead = fs.readSync(fd, buffer, 0, chunkSize, position);
			if (bytesRead > 0) {
				hasher.update(buffer.subarray(0, bytesRead));
				position += bytesRead;
			}
		} while (bytesRead > 0);
	} finally {
		fs.closeSync(fd);
	}

	return formatOutput(hasher.digest(), encoding);
}

export function hashingStream({encoding = 'hex', algorithm = 'sha512'} = {}) {
	if (encoding !== 'buffer' && !['hex', 'base64', 'latin1'].includes(encoding)) {
		throw new TypeError(`Invalid encoding: ${encoding}`);
	}

	const stream = crypto.createHash(algorithm);
	if (encoding !== 'buffer') {
		stream.setEncoding(encoding);
	}

	return stream;
}
