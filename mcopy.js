'use strict';

const defaults = require('defaults'),
    Machinegun = require('machinegun'),
    File = require('./lib/File.js'),
    ProgressEmitter = require('./lib/ProgressEmitter.js');

module.exports = function () {

	let opt, errored;

	const emitter = new ProgressEmitter();

	emitter.on('error', () => { errored = true });

	const parseInput = (args) => new Promise((resolve, reject) => {
		let filesArg, // Input array of file descriptor objects
			destArg, // Directory to copy files to
			optArg, // Options object
			callbackArg, // Callback function
			i = 0, files = [];

		if (Array.isArray(args[i])) filesArg = args[i++];
		else if (typeof args[i] == 'string') filesArg = [args[i++]];
		if (typeof args[i] == 'string') destArg = args[i++];
		if (typeof args[i] == 'object') optArg = args[i++];
		if (typeof args[i] == 'function') callbackArg = args[i];

		opt = defaults(optArg, {
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

		files = opt.files.map((file) => File.createFromArgument(file, opt, emitter));

		resolve(files);
	});

	const resolveGlobs = (files) => Promise
		.all(files.map((file) => file.resolveGlob()))
		.then((files) => [].concat.apply([], files.filter((file) => file)));

	const statFiles = (files) => Promise
		.all(files.map((file) => file.stat()))
		.then((files) => files.filter((file) => file && !file.skip));

	const copyFiles = (files) => {
		if (!files.length) return Promise.resolve();
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

	const reportComplete = (err) => {
		if (err && emitter.listenerCount('error')) emitter.emit('error', err);
		if (!errored && !err) emitter.emit('success');
		emitter.emit('complete');
		if (typeof opt.callback == 'function') opt.callback(err);
	};

	parseInput(arguments)
		.then(resolveGlobs)
		.then(statFiles)
		.then(copyFiles)
		.then(reportComplete, reportComplete);

	return emitter;
};