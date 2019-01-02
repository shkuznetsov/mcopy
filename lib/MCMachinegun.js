'use strict';

const Machinegun = require('machinegun');

module.exports = class MCMachinegun extends Machinegun {
	constructor (opt, emitter) {
		super({
			barrels: opt.parallel,
			giveUpOnError: opt.stopOnError,
			ceaseFireOnEmpty: true,
			fireImmediately: false
		});
		// Re-emit machinegun errors into the mcopy emitter
		this.on('error', emitter.emit.bind(emitter, 'error'));
	}
};