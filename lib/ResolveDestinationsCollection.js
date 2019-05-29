const path = require('path');
const JobsCollection = require('./JobsCollectionChainable');

module.exports = class ResolveDestinationsCollection extends JobsCollection {
	newJob (seed) {
		return new ResolveDestinationsJob(seed);
	}
};

class ResolveDestinationsJob {
	constructor (seed) {
		this.src = seed[0];
		this.dest = seed[1];
	}
	async run () {
		let result = [], basename = path.basename(this.src);
		let add = (dest) => result.push([this.src, path.join(dest, basename)]);
		// If dest is a function, call it
		if (typeof this.dest === 'function') this.dest = await this.dest(this.src);
		// If dest is an array, add each element to the result
		if (Array.isArray(this.dest)) this.dest.forEach(add);
		// ... or just add dest to the result otherwise
		else add(this.dest);
		// Resolve to the result
		return result;
	}
}