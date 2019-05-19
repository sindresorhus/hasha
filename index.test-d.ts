import {expectType} from 'tsd';
import hasha = require('.');

expectType<string>(hasha('unicorn'));
expectType<string>(hasha('unicorn', {algorithm: 'md5'}));
expectType<string>(hasha('unicorn', {encoding: 'latin1'}));
expectType<Buffer>(hasha('unicorn', {encoding: 'buffer'}));

expectType<string>(hasha(['unicorn']));
expectType<string>(hasha([Buffer.from('unicorn', 'utf8')]));
expectType<string>(hasha(['unicorn', Buffer.from('unicorn', 'utf8')]));

expectType<Promise<string>>(hasha.async('unicorn'));
expectType<Promise<string>>(hasha.async('unicorn', {algorithm: 'md5'}));
expectType<Promise<string>>(hasha.async('unicorn', {encoding: 'latin1'}));
expectType<Promise<Buffer>>(hasha.async('unicorn', {encoding: 'buffer'}));

expectType<Promise<string>>(hasha.async(['unicorn']));
expectType<Promise<string>>(hasha.async([Buffer.from('unicorn', 'utf8')]));
expectType<Promise<string>>(hasha.async(['unicorn', Buffer.from('unicorn', 'utf8')]));

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
