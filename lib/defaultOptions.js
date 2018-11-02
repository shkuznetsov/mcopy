'use strict';

const shouldBeBooleanOrDefaultsTo = (defaultValue) => (value) =>
	typeof value !== 'undefined' ? !!value : defaultValue;

const shouldBePositiveIntegerOrDefaultsTo = (defaultValue) => (value) =>
	typeof value === 'number' && value >= 1 ? parseInt(value) : defaultValue;

const isObject = (defaultValue) => (value) =>
	typeof value === 'object' ? value : defaultValue;

const defaults = {
	deleteSource: shouldBeBooleanOrDefaultsTo(false),
	createDir: shouldBeBooleanOrDefaultsTo(true),
	overwrite: shouldBeBooleanOrDefaultsTo(false),
	failOnError: shouldBeBooleanOrDefaultsTo(true),
	autoStart: shouldBeBooleanOrDefaultsTo(true),
	parallel: shouldBePositiveIntegerOrDefaultsTo(1),
	highWaterMark: shouldBePositiveIntegerOrDefaultsTo(4194304), // 4M
	globOpt: isObject({})
};

/**
 * Sanitises the supplied options, providing default values
 * @param optArgument
 */
module.exports = function (optArgument) {
	let opt = {};
	for (let prop in defaults) opt[prop] = defaults[prop](optArgument(prop))
	return opt;
};