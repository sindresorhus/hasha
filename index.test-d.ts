import {expectType} from 'tsd-check';
import hasha from '.';

expectType<string>(hasha('unicorn'));
expectType<string>(hasha('unicorn', {algorithm: 'md5'}));
expectType<string>(hasha('unicorn', {encoding: 'latin1'}));
expectType<Buffer>(hasha('unicorn', {encoding: 'buffer'}));

process.stdin.pipe(hasha.stream()).pipe(process.stdout);

expectType<Promise<string | null>>(hasha.fromStream(process.stdin));
expectType<Promise<string | null>>(
	hasha.fromStream(process.stdin, {encoding: 'hex'})
);
expectType<Promise<Buffer | null>>(
	hasha.fromStream(process.stdin, {encoding: 'buffer'})
);

expectType<Promise<string | null>>(hasha.fromFile('unicorn.png'));
expectType<Promise<string | null>>(
	hasha.fromFile('unicorn.png', {encoding: 'base64'})
);
expectType<Promise<Buffer | null>>(
	hasha.fromFile('unicorn.png', {encoding: 'buffer'})
);

expectType<string>(hasha.fromFileSync('unicorn.png'));
expectType<string>(hasha.fromFileSync('unicorn.png', {encoding: 'base64'}));
expectType<Buffer>(hasha.fromFileSync('unicorn.png', {encoding: 'buffer'}));
