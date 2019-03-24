'use strict';

const mergeValues = (suppliedValue, defaultValue) => {
	switch (typeof defaultValue) {
		case 'function':
			return defaultValue(suppliedValue);
		case 'object':
			switch (typeof suppliedValue) {
				case 'undefined':
					suppliedValue = {};
				case 'object':
					for (let prop in defaultValue) if (defaultValue.hasOwnProperty(prop))
						suppliedValue[prop] = mergeValues(suppliedValue[prop], defaultValue[prop]);
				default:
					return suppliedValue;
			}
		default:
			return typeof suppliedValue === 'undefined' ? defaultValue : suppliedValue;
	}
};

const shouldBePositiveIntegerOrDefaultsTo = (defaultValue) => (suppliedValue) =>
	mergeValues(typeof suppliedValue === 'number' && suppliedValue >= 1 ? suppliedValue : undefined, defaultValue);

const shouldBeObjectOrDefaultsTo = (defaultValue) => (suppliedValue) =>
	mergeValues(typeof suppliedValue === 'object' ? suppliedValue : undefined, defaultValue);

const shouldAlwaysBe = (defaultValue) => () =>
	mergeValues(undefined, defaultValue);

const defaults = {
	deleteSource: false,
	createDir: true,
	overwrite: false,
	failOnError: true,
	autoStart: true,
	parallel: shouldBePositiveIntegerOrDefaultsTo(1),
	highWaterMark: shouldBePositiveIntegerOrDefaultsTo(4194304), // 4M
	globOpt: shouldBeObjectOrDefaultsTo({
		unique: shouldAlwaysBe(true),
		onlyFiles: shouldAlwaysBe(true)
	})
};

/**
 * Sanitises the supplied options, providing default values instead of the missing or invalid ones
 * @param {Object} [optArgument] - input object to sanitise
 * @return {Object} - sanitised options object
 */
module.exports = function (optArgument) {
	return mergeValues(optArgument, defaults);
};