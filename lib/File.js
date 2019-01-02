'use strict';

const fs = require('fs'),
	path = require('path'),
	mkdirp = require('mkdirp'),
	glob = require('glob'),
    globParent = require('glob-parent'),
    isGlob = require('is-glob');

module.exports = class File {
	constructor (src, dest, opt, emitter) {
		// Src argument is a stats object with a 'path' property
		this.stats = src;
		this.src = src.path;
		this.basename = path.basename(this.src);
		// @dest is expected to be a string
		// This is because I'm fed up with copying things to ./undefined
		if (typeof dest !== 'string') {} // TODO: Throw an argument error
		// This version ONLY accepts a directory name as a destination
		this.dest = path.join(dest, this.basename);
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

	clone (newSrc) {
		return new File(newSrc, this.dest, this.base, this.arg, this.opt, this.emitter);
	}

	resolveGlob () {
		return new Promise((resolve, reject) => {
			if (!isGlob(this.src)) resolve([this]);
			else glob(this.src, this.opt.globOpt, (err, paths) => {
				if (err) reject(this.getError(err));
				else {
					const files = [];
					paths.forEach((path) => files.push(this.clone(path)));
					resolve(files);
				}
			});
		});
	}

	getError(err) {
		const error = (err instanceof Error) ? err : new Error(err);
		error.file = this;
		return error;
	}

	stat() {
		return new Promise((resolve, reject) => fs.stat(this.src, (err, stats) => {
			if (err) reject(this.getError(err));
			else if (!stats.isFile()) reject(this.getError(this.src + " is not a file (src)"));
			else {
				this.stats = stats;
				this.emitter.registerFile(stats.size);
				this.emitter.emit('stats', this);
				resolve(this);
			}
		}));
	}

	prepareDestination() {
		return new Promise((resolve, reject) => {
			if (typeof this.dest != 'string') reject(this.getError(this.dest + " is not a string (dest)"));
			else fs.stat(this.dest, (err, stats) => {
				// Throw if we failed because dest is inaccessible
				if (err && err.code != 'ENOENT') reject(this.getError(this.dest + " is not accessible (dest)"));
				else {
					// Check if the destination is (or looks like) a directory
					if ((err && this.dest.slice(-1) == '/') || (!err && stats.isDirectory())) {
						// And resolve it to a file path by adding globbed suffix
						this.dest = path.join(this.dest, path.relative(this.base, this.src));
					}
					// Ensure target directory exists
					if (this.opt.createDir) mkdirp(path.dirname(this.dest), (err) => {
						if (err) reject(this.getError(err));
						resolve(this)
					});
					else resolve(this);
				}
			});
		});
	}

	copy() {
		return new Promise((resolve, reject) => {
			// Create streams
			this.read = fs.createReadStream(this.src, {highWaterMark: this.opt.highWaterMark});
			this.write = fs.createWriteStream(this.dest);
			// Attach events
			this.read.on('data', (chunk) => {
				this.bytesCopied += chunk.length;
				this.emitter.incBytesCopied(chunk.length);
				this.emitter.emitProgress(this);
			});
			this.read.on('error', (err) => reject(this.getError(err)));
			this.write.on('error', (err) => reject(this.getError(err)));
			this.write.on('finish', () => {
				this.copied = true;
				this.emitter.incFilesCopied();
				this.emitter.emitProgress(this);
				resolve(this);
			});
			// Pipe streams
			this.read.pipe(this.write);
		});
	}

	deleteSource() {
		return new Promise((resolve, reject) => fs.unlink(this.src, (err) => {
			if (err) reject(this.getError(err));
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