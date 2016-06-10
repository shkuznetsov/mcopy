'use strict';

const EventEmitter = require('events');

module.exports = class ProgressEmitter extends EventEmitter {
	constructor() {
		super();
		this.filesCopied = 0;
		this.filesTotal = 0;
		this.bytesCopied = 0;
		this.bytesTotal = 0;
	}

	registerFile(bytesTotal) {
		this.filesTotal++;
		this.bytesTotal += bytesTotal;
	}

	incBytesCopied(increment) {
		this.bytesCopied += increment;
	}

	incFilesCopied() {
		this.filesCopied++;
	}

	emitProgress(file) {
		this.emit('progress', {
			filesCopied: this.filesCopied,
			filesTotal: this.filesTotal,
			bytesCopied: this.bytesCopied,
			bytesTotal: this.bytesTotal
		}, file);
	}
}