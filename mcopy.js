var EventEmitter = require('events'),
    fs = require('fs');
    defaults = require('defaults');

module.exports = function () {
	// This is going to be returned
	var emitter = new EventEmitter();

	var i = 0, paths = [], opt = {}, callback = null;

	if (Array.isArray(arguments[i])) paths = arguments[i++];
	if (typeof arguments[i] == 'object') opt = arguments[i++];
	if (typeof arguments[i] == 'function') callback = arguments[i];

	if (!paths.length && Array.isArray(opt.files)) paths = opt.files;

	opt = defaults(opt, {
		srcDelete: false,
		destCreateDir: true,
		destOverwrite: false,
		failOnError: true,
		autoStart: true,
		parallel: 1,
		highWaterMark: 4194304 // 4M
	});

	// Start asynchronously to allow attachment of event handlers
	process.nextTick(function () {

		var files = [],
		    filesCopied = 0,
		    filesTotal = paths.length,
		    bytesCopied = 0,
		    bytesTotal = 0,
		    running = filesTotal,
			error = null;

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
		if (filesTotal) stat();
		// Or complete immediately if there's nothing to do
		else complete();
	});

	return emitter;
};