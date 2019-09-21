'use strict';

const {
	Worker: BaseWorker, isMainThread, MessageChannel, parentPort
} = require('worker_threads');
const hasha = require('.');

if (isMainThread) {
	const wm = new WeakMap();

	const getHash = async (worker, method, args) => {
		const handlers = wm.get(worker);

		worker.ref();

		return new Promise((resolve, reject) => {
			const {port1: master, port2: slave} = new MessageChannel();

			master.on('message', ({error, value}) => {
				handlers.splice(handlers.indexOf(reject), 1);

				if (error) {
					reject(Object.defineProperties(new Error(), error));
				} else {
					resolve(value instanceof Uint8Array ?
						Buffer.from(value.buffer) : value);
				}

				master.close();
			});

			worker.postMessage({method, args, port: slave}, [slave]);

			handlers.push(reject);
		}).finally(() => worker.unref());
	};

	class Worker extends BaseWorker {
		constructor(options) {
			super(__filename, options);

			wm.set(this, []);

			const cleanup = error => {
				const handlers = wm.get(this);

				if (handlers) {
					handlers.forEach(reject => reject(error));
					wm.delete(this);
				}
			};

			this.on('error', error => {
				cleanup(error);

				if (this.listenerCount('error') < 2) {
					throw error;
				}
			});

			this.once('exit', code => {
				cleanup(new Error(`Worker exit code: ${code}`));
			});
		}

		fromInput(...args) {
			return getHash(this, 'fromInput', args);
		}

		fromFile(...args) {
			return getHash(this, 'fromFile', args);
		}

		fromFileSync(...args) {
			return getHash(this, 'fromFileSync', args);
		}
	}

	module.exports = Worker;
} else {
	parentPort.on('message', async ({method, args, port}) => {
		try {
			method = method === 'fromInput' ? hasha : hasha[method];
			port.postMessage({value: await method.call(hasha, ...args)});
		} catch (error) {
			port.postMessage({error: Object.getOwnPropertyDescriptors(error)});
		}
	});
}
