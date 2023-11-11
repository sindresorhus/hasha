import process from 'node:process';
import {expectType} from 'tsd';
import {
	hash,
	hashSync,
	hashFile,
	hashFileSync,
	hashingStream,
} from './index.js';

expectType<string>(hashSync('unicorn'));
expectType<string>(hashSync('unicorn', {algorithm: 'md5'}));
expectType<string>(hashSync('unicorn', {encoding: 'latin1'}));
expectType<Buffer>(hashSync('unicorn', {encoding: 'buffer'}));

expectType<string>(hashSync(['unicorn']));
expectType<string>(hashSync([Buffer.from('unicorn', 'utf8')]));
expectType<string>(hashSync(['unicorn', Buffer.from('unicorn', 'utf8')]));

expectType<Promise<string>>(hash('unicorn'));
expectType<Promise<string>>(hash('unicorn', {algorithm: 'md5'}));
expectType<Promise<string>>(hash('unicorn', {encoding: 'latin1'}));
expectType<Promise<Buffer>>(hash('unicorn', {encoding: 'buffer'}));

expectType<Promise<string>>(hash(['unicorn']));
expectType<Promise<string>>(hash([Buffer.from('unicorn', 'utf8')]));
expectType<Promise<string>>(hash(['unicorn', Buffer.from('unicorn', 'utf8')]));

process.stdin.pipe(hashingStream()).pipe(process.stdout);

/* eslint-disable @typescript-eslint/no-unsafe-argument */
expectType<Promise<string>>(hash(process.stdin));
expectType<Promise<string>>(
	hash(process.stdin, {encoding: 'hex'}),
);
expectType<Promise<Buffer>>(
	hash(process.stdin, {encoding: 'buffer'}),
);
/* eslint-enable @typescript-eslint/no-unsafe-argument */

expectType<Promise<string>>(hashFile('unicorn.png'));
expectType<Promise<string>>(
	hashFile('unicorn.png', {encoding: 'base64'}),
);
expectType<Promise<Buffer>>(
	hashFile('unicorn.png', {encoding: 'buffer'}),
);

expectType<string>(hashFileSync('unicorn.png'));
expectType<string>(hashFileSync('unicorn.png', {encoding: 'base64'}));
expectType<Buffer>(hashFileSync('unicorn.png', {encoding: 'buffer'}));
