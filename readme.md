<h1 align="center">
	<br>
	<br>
	<br>
	<img width="380" src="https://rawgit.com/sindresorhus/hasha/master/media/logo.svg" alt="hasha">
	<br>
	<br>
	<br>
	<br>
	<br>
</h1>

> Get the hash of a buffer/string/stream/file

[![Build Status](https://travis-ci.org/sindresorhus/hasha.svg?branch=master)](https://travis-ci.org/sindresorhus/hasha)

Convenience wrapper around the core [`crypto` module](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm) with good defaults.


## Install

```
$ npm install --save hasha
```


## Usage

```js
var hasha = require('hasha');

hasha(new Buffer('unicorn'));
//=> 'e233b19aabc7d5e53826fb734d1222f1f0444c3a3fc67ff4af370a66e7cadd2cb24009f1bc86f0bed12ca5fcb226145ad10fc5f650f6ef0959f8aadc5a594b27'

process.stdin.pipe(hasha.stream()).pipe(process.stdout);

hasha.fromFile('unicorn.png', {algorithm: 'md5'}, function (err, hash) {
	console.log(hash);
	//=> '1abcb33beeb811dca15f0ac3e47b88d9'
});
```


## API

See the Node.js [`crypto` docs](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm) for more about hashing.

### hasha(input, [options])

#### input

*Required*  
Type: `buffer`, `string`

Buffer you want to hash.

While strings are supported you should prefer buffers as they're faster to hash.

### hasha.stream([options])

Returns a [hash transform stream](https://nodejs.org/api/crypto.html#crypto_class_hash).

### hasha.fromStream(input, [options], callback)

#### input

*Required*  
Type: `stream`

#### callback(error, hash)

### hasha.fromFile(input, [options], callback)

#### input

*Required*  
Type: `string`

Path to the file to hash.

#### callback(error, hash)

### hasha.fromFileSync(input, [options])

Returns the hash.

#### input

*Required*  
Type: `string`

Path to the file to hash.


## Options

##### encoding

Type: `string`  
Default: `hex`  
Values: `hex`, `base64`, `buffer`, `binary`

Encoding of the returned hash.

##### algorithm

Type: `string`  
Default: `sha512`  
Values: `md5`, `sha1`, `sha256`, `sha512`, etc *([platform dependent](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm))*

*The `md5` algorithm is good for [file revving](https://github.com/sindresorhus/rev-hash), but you should never use `md5` or `sha1` for anything else. [They're insecure.](http://googleonlinesecurity.blogspot.no/2014/09/gradually-sunsetting-sha-1.html)*


## CLI

```
$ npm install --global hasha
```

```
$ hasha --help

  Usage
    $ hasha <text>
    $ cat <file> | hasha

  Example
    $ hasha unicorn --algorithm=md5
    1abcb33beeb811dca15f0ac3e47b88d9

  Options
    --algorithm  Cipher algorithm: md5,sha1,sha256,sha512  Default: sha512s
    --encoding   Output encoding: hex,base64,buffer,binary  Default: hex
```


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
