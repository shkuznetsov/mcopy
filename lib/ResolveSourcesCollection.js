const glob = require('fast-glob');
const JobsCollection = require('./JobsCollectionChainable');

module.exports = class ResolveSourcesCollection extends JobsCollection {
	newJob (seed) {
		let src, dest;
		// [<src>, <dest>] ?
		if (Array.isArray(seed)) {
			src = seed[0];
			dest = seed[1];
		}
		// {src: <src>, dest: <dest>} ?
		else if (typeof seed === 'object') {
			src = seed.src;
			dest = seed.dest;
		}
		// Umm, fishy
		else {
			throw "Malformed input job: " + JSON.stringify(seed);
		}
		return new ResolveSourcesJob(src, dest, this.opt.globOpt);
	}
};

class ResolveSourcesJob {
	constructor (src, dest, globOpt) {
		this.src = src;
		this.dest = dest;
		this.globOpt = globOpt;
	}
	run () {
		return glob(this.src, this.globOpt).then((srcs) => srcs.map((src) => [src, this.dest]));
	}
}