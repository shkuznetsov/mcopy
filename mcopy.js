'use strict';

var fs = require('fs'),
	path = require('path'),
	mkdirp = require('mkdirp'),
	glob = require('glob'),
    globParent = require('glob-parent'),
    isGlob = require('is-glob'),
    defaults = require('defaults'),
    Machinegun = require('machinegun'),
    ProgressEmitter = require('./lib/ProgressEmitter.js');

module.exports = function () {

	const emitter = new ProgressEmitter();

	let filesArg, // Input array of file descriptor objects
		destArg, // Directory to copy files to
		optArg, // Options object
		callbackArg, // Callback function
		i = 0, files = [];

	if (Array.isArray(arguments[i])) filesArg = arguments[i++];
	else if (typeof arguments[i] == 'string') filesArg = [arguments[i++]];
	if (typeof arguments[i] == 'string') destArg = arguments[i++];
	if (typeof arguments[i] == 'object') optArg = arguments[i++];
	if (typeof arguments[i] == 'function') callbackArg = arguments[i];

	const opt = defaults(optArg, {
		files: filesArg,
		dest: destArg,
		callback: callbackArg,
		deleteSource: false,
		createDir: true,
		overwrite: false,
		failOnError: true,
		autoStart: true,
		parallel: 1,
		highWaterMark: 4194304, // 4M
		globOpt: {}
	});

	opt.globOpt = defaults(opt.globOpt, {silent: true});
	opt.globOpt.nodir = true;

	class File {
		constructor (src, dest, base, arg) {
			this.src = src;
			this.dest = dest;
			this.base = base;
			this.arg = arg;
			// Defaults
			this.error = null;
			this.stats = null;
			this.progress = 0;
		}

		static createFromArgument(file) {
			let src, dest;
			if (typeof file == 'string') {
				src = file;
				dest = destArg;
			}
			else if (typeof file == 'object') {
				src = file.src;
				dest = file.dest || opt.dest;
			}
			if (typeof src != 'string') throw TypeError(src + " is not a string (src)");
			return new File(src, dest, opt.base || globParent(src), file);
		}

		resolveGlob () {
			return new Promise((resolve, reject) => {
				if (!isGlob(this.src)) resolve([this]);
				else glob(this.src, opt.globOpt, (err, paths) => {
					if (err) resolve(this.onError(err));
					else {
						const files = [];
						paths.forEach((path) => files.push(new File(path, this.dest, this.base, this.arg)));
						resolve(files);
					}
				});
			});
		}

		onError(err) {
			// Error should only be emitted once per errored file
			if (!this.error) {
				this.error = (typeof err == 'string') ? new Error(err) : err;
				emitter.emit('error', this.error, this);
			}
			return opt.failOnError ? Promise.reject(this.err) : Promise.resolve();
		}

		stat() {
			return new Promise((resolve) => fs.stat(this.src, (err, stats) => {
				if (err) resolve(this.onError(err));
				else if (!stats.isFile()) resolve(this.onError(this.src + " is not a file (src)"));
				else {
					this.stats = stats;
					emitter.registerFile(stats.size);
					emitter.emit('stats', this);
					resolve(this);
				}
			}));
		}

		prepareDestination() {
			return new Promise((resolve) => {
				if (typeof this.dest == 'function') this.dest = this.dest(this);
				if (typeof this.dest != 'string') resolve(this.onError(this.dest + " is not a string (dest)"));
				else fs.stat(this.dest, (err, stats) => {
					if (err && err.code != 'ENOENT') resolve(this.onError(this.dest + " is not accessible (dest)"));
					else {
						if ((err && this.dest.slice(-1) == '/') || (!err && stats.isDirectory())) {
							this.dest = path.join(this.dest, path.relative(this.base, this.src));
						}
						mkdirp(path.dirname(this.dest), (err) => {
							if (err) resolve(this.onError(err));
							else resolve(this);
						});
					}
				});
			});
		}

		copy() {
			return new Promise((resolve) => {
				// Create streams
				this.read = fs.createReadStream(this.src, {highWaterMark: opt.highWaterMark});
				this.write = fs.createWriteStream(this.dest);
				// Attach events
				this.read.on('data', (chunk) => {
					this.progress += chunk.length;
					if (this.stats.size > this.progress) emitter.incBytesCopied(chunk.length);
				});
				this.read.on('error', (err) => resolve(this.onError(err)));
				this.write.on('error', (err) => resolve(this.onError(err)));
				this.write.on('finish', () => {
					emitter.incFilesCopied(this);
					resolve(this)}
				);
				// Abort copying if error occurs and failOnError is true
				if (opt.failOnError) emitter.on('error', () => this.abort());
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

	const resolveGlobs = (files) => Promise
		.all(files.map((file) => file.resolveGlob()))
		.then((files) => [].concat.apply([], files.filter((file) => !!file)));

	const statFiles = (files) => Promise
		.all(files.map((file) => file.stat()))
		.then((files) => files.filter((file) => !!file));

	const copyFiles = (files) => {
		const mg = new Machinegun({
			giveUpOnError: opt.failOnError,
			barrels: opt.parallel
		});
		files.forEach((file) => mg.load((cb) => {
			mg.on('giveUp', () => file.abort());
			return file.prepareDestination()
				.then((file) => file ? file.copy() : null)
				.then((file) => (file && opt.deleteSource) ? file.deleteSource() : null);
		}));
		return mg.promise();
	}

	const reportDone = () => {
		console.log('!!!');
	};

	const reportError = (err) => {
		console.error(err);
	};

	files = opt.files.map((file) => File.createFromArgument(file));

	resolveGlobs(files)
		.then(statFiles)
		.then(copyFiles)
		.then(reportDone)
		.catch(reportError);

	return emitter;
};