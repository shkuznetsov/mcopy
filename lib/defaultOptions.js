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
					return mergeObjects(suppliedValue, defaultValue);
				default:
					return suppliedValue;
			}
		default:
			return typeof suppliedValue === 'undefined' ? defaultValue : suppliedValue;
	}
};

const mergeObjects = (suppliedObject, defaultObject) => {
	for (let prop in defaultObject) if (defaultObject.hasOwnProperty(prop))
		suppliedObject[prop] = mergeValues(suppliedObject[prop], defaultObject[prop]);
	return suppliedObject;
};

const shouldBePositiveIntegerOrDefaultsTo = (defaultValue) => (suppliedValue) =>
	mergeValues(typeof suppliedValue === 'number' && suppliedValue >= 1 ? suppliedValue : undefined, defaultValue);

const shouldBeObjectOrDefaultsTo = (defaultValue) => (suppliedValue) =>
	mergeValues(typeof suppliedValue === 'object' ? suppliedValue : undefined, defaultValue);

const defaults = {
	deleteSource: false,
	createDir: true,
	overwrite: false,
	failOnError: true,
	autoStart: true,
	parallel: shouldBePositiveIntegerOrDefaultsTo(1),
	highWaterMark: shouldBePositiveIntegerOrDefaultsTo(4194304), // 4M
	globOpt: shouldBeObjectOrDefaultsTo({silent: true})
};

/**
 * Sanitises the supplied options, providing default values
 * @param optArgument
 */
module.exports = function (optArgument) {
	return mergeValues(optArgument, defaults);
};