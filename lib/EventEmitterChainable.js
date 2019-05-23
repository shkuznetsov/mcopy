const EventEmitter = require('events');

module.exports = class EventEmitterChainable extends EventEmitter {
	/**
	 * Adds the specified emitter to the chain
	 * @param {EventEmitter} emitter
	 */
	chain (emitter) {
		let listeners = {};
		let addListener = (event) => {
			if (event !== 'newListener' && event !== 'removeListener' && !listeners[event]) {
				listeners[event] = (...args) => this.emit(event, ...args);
				emitter.on(event, listeners[event]);
			}
		};
		this.eventNames().forEach((event) => addListener(event));
		this.on('newListener', (event) => addListener(event));
		this.on('removeListener', (event) => {
			if (listeners[event] && this.listenerCount(event) === 1) {
				emitter.removeListener(event, listeners[event]);
			}
		});
		return emitter;
	}
};