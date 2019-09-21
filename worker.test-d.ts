import {expectType} from 'tsd';
import Worker = require('./worker');

const worker = new Worker();

expectType<Promise<string>>(worker.fromInput('unicorn'));
expectType<Promise<string>>(worker.fromInput('unicorn', {algorithm: 'md5'}));
expectType<Promise<string>>(worker.fromInput('unicorn', {encoding: 'latin1'}));
expectType<Promise<Buffer>>(worker.fromInput('unicorn', {encoding: 'buffer'}));

expectType<Promise<string>>(worker.fromInput(['unicorn']));
expectType<Promise<string>>(worker.fromInput([Buffer.from('unicorn', 'utf8')]));
expectType<Promise<string>>(worker.fromInput(['unicorn', Buffer.from('unicorn', 'utf8')]));

expectType<Promise<string | null>>(worker.fromFile('unicorn.png'));
expectType<Promise<string | null>>(
	worker.fromFile('unicorn.png', {encoding: 'base64'})
);
expectType<Promise<Buffer | null>>(
	worker.fromFile('unicorn.png', {encoding: 'buffer'})
);

expectType<Promise<string>>(worker.fromFileSync('unicorn.png'));
expectType<Promise<string>>(worker.fromFileSync('unicorn.png', {encoding: 'base64'}));
expectType<Promise<Buffer>>(worker.fromFileSync('unicorn.png', {encoding: 'buffer'}));
