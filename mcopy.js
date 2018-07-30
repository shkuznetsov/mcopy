'use strict';

const defaults = require('defaults'),
    Machinegun = require('../machinegun/index.js'),
    File = require('./lib/File.js'),
    ProgressEmitter = require('./lib/ProgressEmitter.js');

module.exports = function () {

	let opt, mg, errored;

	// This will be returned
	const emitter = new ProgressEmitter();

	// Parses input, initialises machinegun
	// Returns a promise for a list of File objects
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

		mg = new Machinegun({
			barrels: opt.parallel,
			giveUpOnError: opt.failOnError,
			ceaseFireOnEmpty: true,
			fireImmediately: false
		});

		mg.on('error', (err) => {
			if (!opt.failOnError) {
				emitter.emit('error', err);
				errored = true;
			}
		});

		resolve(opt.files.map((file) => File.createFromArgument(file, opt, emitter)));
	});

	const resolveGlobs = (inputFiles) => {
		const resolvedFiles = [];
		inputFiles.forEach((file) => mg.load(() => file.resolveGlob().then((files) => Array.prototype.push.apply(resolvedFiles, files))));
		return mg.fire().promise(resolvedFiles);
	};

	const statFiles = (inputFiles) => {
		const statFiles = [];
		inputFiles.forEach((file) => mg.load(() => file.stat().then((file) => statFiles.push(file))));
		return mg.fire().promise(statFiles);
	};

	const copyFiles = (inputFiles) => {
		inputFiles.forEach((file) => mg.load(() => {
			let promise = file.prepareDestination().then((file) => file.copy());
			// Add deletion to the promise chain only if opt.deleteSource is truthy
			if (opt.deleteSource) promise = promise.then((file) => file.deleteSource());
			// Abort copying if the whole machinegun gives up
			mg.on('giveUp', () => file.abort());
			return promise;
		}));
		return mg.fire().promise();
	};

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