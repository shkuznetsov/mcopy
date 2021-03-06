const path = require('path');
const JobsCollection = require('./JobsCollectionChainable');

module.exports = class ResolveDestinationsCollection extends JobsCollection {
	newJob (seed) {
		return new ResolveDestinationsJob(seed[0], seed[1]);
	}
};

class ResolveDestinationsJob {
	constructor (src, dest) {
		this.src = src;
		this.dest = dest;
	}
	async run () {
		let result = [];
		let add = (dest) => result.push([this.src, path.join(dest, this.src.name)]);
		// If dest is a function, call it
		let dest = typeof this.dest === 'function' ? await this.dest(this.src) : this.dest;
		// If dest is an array, add each element to the result
		if (Array.isArray(dest)) dest.forEach(add);
		// ... or just add dest to the result otherwise
		else add(dest);
		// Resolve to the result
		return result;
	}
}