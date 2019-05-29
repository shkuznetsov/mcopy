const glob = require('fast-glob');
const JobsCollection = require('./JobsCollectionChainable');

module.exports = class ResolveSourcesCollection extends JobsCollection {
	newJob (seed) {
		return new ResolveSourcesJob(seed, this.opt.globOpt);
	}
};

class ResolveSourcesJob {
	constructor (seed, globOpt) {
		this.globOpt = globOpt;
		// [<src>, <dest>] ?
		if (Array.isArray(seed)) {
			this.src = seed[0];
			this.dest = seed[1];
		}
		// {src: <src>, dest: <dest>} ?
		else if (typeof seed === 'object') {
			this.src = seed.src;
			this.dest = seed.dest;
		}
		// Umm, fishy
		else throw "Malformed input job: " + JSON.stringify(seed);
	}
	run () {
		return glob(this.src, this.globOpt).then((srcs) => srcs.map((src) => [src, this.dest]));
	}
}