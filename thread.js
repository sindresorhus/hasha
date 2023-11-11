import fs from 'node:fs';
import crypto from 'node:crypto';
import {parentPort} from 'node:worker_threads';

const handlers = {
	hashFile: (algorithm, filePath) => new Promise((resolve, reject) => {
		const hasher = crypto.createHash(algorithm);
		fs.createReadStream(filePath)
			// TODO: Use `Stream.pipeline`.
			.on('error', reject)
			.pipe(hasher)
			.on('error', reject)
			.on('finish', () => {
				const {buffer} = new Uint8Array(hasher.read());
				resolve({value: buffer, transferList: [buffer]});
			});
	}),
	async hash(algorithm, input) {
		const hasher = crypto.createHash(algorithm);

		for (const part of [input].flat()) {
			hasher.update(part);
		}

		const {buffer} = new Uint8Array(hasher.digest());
		return {value: buffer, transferList: [buffer]};
	},
};

parentPort.on('message', async message => {
	try {
		const {method, arguments_} = message;
		const handler = handlers[method];

		if (handler === undefined) {
			throw new Error(`Unknown method '${method}'`);
		}

		const {value, transferList} = await handler(...arguments_);
		parentPort.postMessage({id: message.id, value}, transferList);
	} catch (error) {
		const newError = {message: error.message, stack: error.stack};

		for (const [key, value] of Object.entries(error)) {
			if (typeof value !== 'object') {
				newError[key] = value;
			}
		}

		parentPort.postMessage({id: message.id, error: newError});
	}
});
