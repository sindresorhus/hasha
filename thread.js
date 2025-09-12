import fs from 'node:fs';
import crypto from 'node:crypto';
import {parentPort} from 'node:worker_threads';

// Helper to prepare buffer for transfer
const prepareBufferTransfer = buffer => {
	const transferBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
	return {value: transferBuffer, transferList: [transferBuffer]};
};

const handlers = {
	hashFile: (algorithm, filePath, signal) => new Promise((resolve, reject) => {
		signal?.throwIfAborted();

		const hasher = crypto.createHash(algorithm);
		// Use larger buffer for better performance with large files
		const readStream = fs.createReadStream(filePath, {
			signal,
			highWaterMark: 256 * 1024, // 256KB chunks for better throughput
		});

		signal?.addEventListener('abort', () => {
			readStream.destroy();
			hasher.destroy();
			reject(signal.reason);
		}, {once: true});

		readStream
			// TODO: Use `Stream.pipeline`.
			.on('error', reject)
			.pipe(hasher)
			.on('error', reject)
			.on('finish', () => resolve(prepareBufferTransfer(hasher.read())));
	}),
	async hash(algorithm, input, signal) {
		signal?.throwIfAborted();

		const hasher = crypto.createHash(algorithm);
		const parts = [input].flat();

		for (const part of parts) {
			signal?.throwIfAborted();
			if (part instanceof ArrayBuffer) {
				hasher.update(new Uint8Array(part));
			} else if (typeof part === 'string') {
				hasher.update(part, 'utf8');
			} else {
				hasher.update(part);
			}
		}

		return prepareBufferTransfer(hasher.digest());
	},
};

// Track active operations for abort handling
const activeOperations = new Map();

parentPort.on('message', async message => {
	const {id} = message;

	try {
		// Handle abort messages
		if (message.abort) {
			const operation = activeOperations.get(id);

			if (operation) {
				operation.controller.abort();
				activeOperations.delete(id);
			}

			return;
		}

		const {method, arguments_} = message;
		const handler = handlers[method];

		if (!handler) {
			throw new Error(`Unknown method '${method}'`);
		}

		// Create an AbortController for this operation
		const controller = new AbortController();
		activeOperations.set(id, {controller});

		const {value, transferList} = await handler(...arguments_, controller.signal);

		activeOperations.delete(id);
		parentPort.postMessage({id, value}, transferList);
	} catch (error) {
		activeOperations.delete(id);

		const newError = {
			message: error.message,
			name: error.name,
			stack: error.stack,
			...Object.fromEntries(Object.entries(error).filter(([key, value]) => !['message', 'name', 'stack'].includes(key) && typeof value !== 'object')),
		};

		parentPort.postMessage({id, error: newError});
	}
});
