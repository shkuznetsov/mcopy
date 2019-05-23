const EventEmitter = require('events');
const EventEmitterChainable = require('../lib/EventEmitterChainable');

test("should allow post-chain subscription and unsubscription", () => {
	let ev = new EventEmitter();
	let ec = new EventEmitterChainable();
	ec.chain(ev);
	let handler = jest.fn();
	ec.on('test', handler);
	ev.emit('test', 'p1', 'p2');
	ec.removeListener('test', handler);
	ev.emit('test', 'p3', 'p4');
	expect(handler.mock.calls).toEqual([['p1', 'p2']]);
});

test("should allow pre-chain subscription and unsubscription", () => {
	let ev = new EventEmitter();
	let ec = new EventEmitterChainable();
	let handler = jest.fn();
	ec.on('test', handler);
	ec.chain(ev);
	ev.emit('test', 'p1', 'p2');
	ec.removeListener('test', handler);
	ev.emit('test', 'p3', 'p4');
	expect(handler.mock.calls).toEqual([['p1', 'p2']]);
});