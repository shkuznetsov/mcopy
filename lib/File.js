'use strict';

const fs = require('fs'),
	path = require('path'),
	mkdirp = require('mkdirp'),
	glob = require('glob'),
    globParent = require('glob-parent'),
    isGlob = require('is-glob');

module.exports = class File {
	constructor (src, dest, base, arg, opt, emitter) {
		this.src = src;
		this.dest = dest;
		this.base = base;
		this.arg = arg;
		// DI
		this.opt = opt;
		this.emitter = emitter;
		// Defaults
		this.error = null;
		this.stats = null;
		this.bytesCopied = 0;
		this.copied = false;
		this.skip = false;
	}

	static createFromArgument(file, opt, emitter) {
		let src, dest;
		if (typeof file == 'string') {
			src = file;
			dest = opt.dest;
		}
		else if (typeof file == 'object') {
			src = file.src;
			dest = file.dest || opt.dest;
		}
		if (typeof src != 'string') throw TypeError(src + " is not a string (src)");
		return new File(src, dest, opt.base || globParent(src), file, opt, emitter);
	}

	clone (src) {
		return new File(src, this.dest, this.base, this.arg, this.opt, this.emitter);
	}

	resolveGlob () {
		return new Promise((resolve, reject) => {
			if (!isGlob(this.src)) resolve([this]);
			else glob(this.src, this.opt.globOpt, (err, paths) => {
				if (err) resolve(this.onError(err));
				else {
					const files = [];
					paths.forEach((path) => files.push(this.clone(path)));
					resolve(files);
				}
			});
		});
	}

	onError(err) {
		// Error should only be emitted once per errored file
		if (!this.error) {
			this.error = (typeof err == 'string') ? new Error(err) : err;
			this.emitter.emit('error', this.error, this);
		}
		return this.opt.failOnError ? Promise.reject(this.err) : Promise.resolve();
	}

	stat() {
		return new Promise((resolve) => fs.stat(this.src, (err, stats) => {
			if (err) resolve(this.onError(err));
			else if (!stats.isFile()) resolve(this.onError(this.src + " is not a file (src)"));
			else {
				this.stats = stats;
				this.emitter.registerFile(stats.size);
				this.emitter.emit('stats', this);
				resolve(this);
			}
		}));
	}

	prepareDestination() {
		return new Promise((resolve) => {
			if (typeof this.dest != 'string') resolve(this.onError(this.dest + " is not a string (dest)"));
			else fs.stat(this.dest, (err, stats) => {
				// Throw if we failed because dest is inaccessible
				if (err && err.code != 'ENOENT') resolve(this.onError(this.dest + " is not accessible (dest)"));
				else {
					// Check if destination is (or looks like) a directory
					if ((err && this.dest.slice(-1) == '/') || (!err && stats.isDirectory())) {
						// And resolve it to a file path by adding globbed suffix
						this.dest = path.join(this.dest, path.relative(this.base, this.src));
					}
					// Ensure target directory exists
					if (this.opt.createDir) mkdirp(path.dirname(this.dest), (err) => resolve(err ? this.onError(err) : this));
					else resolve(this);
				}
			});
		});
	}

	copy() {
		return new Promise((resolve) => {
			// Create streams
			this.read = fs.createReadStream(this.src, {highWaterMark: this.opt.highWaterMark});
			this.write = fs.createWriteStream(this.dest);
			// Attach events
			this.read.on('data', (chunk) => {
				this.bytesCopied += chunk.length;
				if (this.stats.size > this.bytesCopied) this.emitter.incBytesCopied(chunk.length);
			});
			this.read.on('error', (err) => resolve(this.onError(err)));
			this.write.on('error', (err) => resolve(this.onError(err)));
			this.write.on('finish', () => {
				this.copied = true;
				this.emitter.incFilesCopied(this);
				resolve(this);
			});
			// Abort copying if error occurs and failOnError is true
			if (this.opt.failOnError) this.emitter.on('error', () => this.abort());
			// Pipe streams
			this.read.pipe(this.write);
		});
	}

	deleteSource() {
		console.log(this.src);
		return new Promise((resolve) => fs.unlink(this.src, (err) => {
			if (err) resolve(this.onError(err));
			else resolve(this);
		}));
	}

	abort() {
		this.read.removeAllListeners();
		this.write.removeAllListeners();
		this.read.unpipe();
		this.write.end();
	}
}