var EventEmitter = require('events'),
    machinegun = require('../machinegun/index.js'),
    fs = require('fs');

module.exports = function () {

	var emitter = new EventEmitter()
	    filesArg, globArg, destDir, optArg, callbackArg,
	    i = 0;

	if (Array.isArray(arguments[i])) filesArg = arguments[i++];
	else if (typeof arguments[i] == 'string') globArg = arguments[i++];
	if (typeof arguments[i] == 'string') destDir = arguments[i++];
	if (typeof arguments[i] == 'object') optArg = arguments[i++];
	if (typeof arguments[i] == 'function') callbackArg = arguments[i];

	var opt = defaults(optArg, {
		srcDelete: false,
		destCreateDir: true,
		destOverwrite: false,
		failOnError: true,
		autoStart: true,
		parallel: 1,
		highWaterMark: 4194304 // 4M
	});

	if (!filesArg && Array.isArray(opt.files)) filesArg = opt.files;
	if (!globArg && typeof opt.glob == 'string') globArg = opt.glob;
	if (!destDir && typeof opt.dest == 'string') destDir = opt.dest;

	// Start asynchronously to allow attachment of event handlers
	process.nextTick(function () {

		var filesCopied = 0,
		    filesTotal = 0,
		    bytesCopied = 0,
		    bytesTotal = 0,
		    running = 0,
			error = null;

		var File = function (arg) {
			this.arg = arg;
			if (typeof arg == 'object') {
				this.src = arg.src;
				this.dest = arg.dest;
			}
			if (typeof this.dest != 'string') this.dest = destDir;
			this.setPaths = function (src, dest) {
				if (typeof src == 'string') this.src = src;
				if (typeof dest == 'string') this.dest = dest;
			};

			this.state = 'unstarted';

			files.push(this);
		};

		var resolveGlob = function () {
			var globber = require('glob');
			var globOpt = defaults(opt.globOpt, {nodir: true, silent: true});

			globber(globArg, globOpt, function (err, files) {
				var globBase = require('glob-parent')(globArg);
				// TODO: handle error
				files.map(function (file) {
					new File(null, file, path.join(destDir, path.relative(globBase, path)));
				});
				// TODO: pass it on
			});
		};

		var registerFiles = function () {
			filesArg.map(function (file) {
				new File(file);
			});
		}

		var stat = function () {
			for (var i = 0; i < filesTotal; ++i) {
				files[i] = {
					paths: paths[i],
					state: 'unstarted'
				};
				fs.stat(files[i].paths.src, statCallback.bind(null, files[i]));
			}
		};

		var copy = function () {
			for (var i = 0; i < filesTotal && running < opt.parallel; ++i) {
				var file = files[i];
				if (file.state == 'unstarted') {
					file.read = fs.createReadStream(file.paths.src, {highWaterMark: opt.highWaterMark})
						.on('data', copyOnData.bind(null, file))
						.on('error', copyOnError.bind(null, file));
					file.write = fs.createWriteStream(file.paths.dest)
						.on('error', copyOnError.bind(null, file))
						.on('finish', copyOnFinish.bind(null, file));
					file.read.pipe(file.write);
					file.state = 'copying';
					running++;
				}
			}

			if (!running) complete();
		};

		var complete = function () {
			if (!error) emitter.emit('success');
			emitter.emit('complete', error);
			if (callback) callback(error);
		};

		var emitError = function (err, file) {
			if (file) file.state = 'errored';
			if (!error || !opt.failOnError) {
				if (emitter.listeners('error').length) emitter.emit('error', err, file ? file.paths : null);
				error = err;
			}
		};

		var emitProgress = function (file) {
			emitter.emit('progress', {
				filesCopied: filesCopied,
				filesTotal: filesTotal,
				bytesCopied: bytesCopied,
				bytesTotal: bytesTotal,
				file: file.paths,
				fileBytesCopied: file.bytesCopied,
				fileBytesTotal: file.bytesTotal
			});
		};

		var statCallback = function (file, err, st) {
			if (err) {
				emitError(err, file);
			} else if (!st.isFile()) {
				emitError(new Error(file.paths.src + " is not a file"), file);
			} else {
				emitter.emit('stat', file, st);
				file.bytesCopied = 0;
				file.bytesTotal = st.size;
				bytesTotal += st.size;
			}

			if (!--running) {
				if (!error || !opt.failOnError) copy();
				else complete();
			}
		};

		var copyOnData = function (file, chunk) {
			//console.log('copyOnData');
			bytesCopied += chunk.length;
			file.bytesCopied += chunk.length;
			emitProgress(file);
		};

		var copyOnFinish = function (file) {
			//console.log('copyOnFinish');
			running--;
			filesCopied++;
			file.state = 'succeeded';
			emitProgress(file);
			copy();
		};

		var copyOnError = function (file, err) {
			//console.log('copyOnError');
			running--;
			file.state = 'errored';
			emitError(err, file);
			if (opt.failOnError) cleanAllRunning();
			else copy();
		};

		var cleanAllRunning = function () {
			for (var i = 0; i < filesTotal; ++i) {
				var file = files[i];
				if (file.state == 'copying') {
					file.read.removeAllListeners();
					file.write.removeAllListeners();
					file.read.unpipe();
					file.write.end();
					//TODO: Remove destination file
					running--;
				}
			}
		};


		// Ignite the process
		if ()

	});

	return emitter;
};