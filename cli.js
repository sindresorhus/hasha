#!/usr/bin/env node
'use strict';
var meow = require('meow');
var hasha = require('./');

var cli = meow({
	help: [
		'Usage',
		'  $ hasha <text>',
		'  $ cat <file> | hasha',
		'',
		'Example',
		'  $ hasha unicorn --algorithm=md5',
		'  1abcb33beeb811dca15f0ac3e47b88d9',
		'',
		'Options',
		'  --algorithm  Cipher algorithm: md5,sha1,sha256,sha512   Default: sha512s',
		'  --encoding   Output encoding: hex,base64,buffer,binary  Default: hex'
	].join('\n')
});

var input = cli.input[0];

if (!input && process.stdin.isTTY) {
	cli.showHelp();
	process.exit();
}

if (input) {
	console.log(hasha(input, cli.flags));
} else {
	process.stdin.pipe(hasha.stream(cli.flags)).pipe(process.stdout);
}
