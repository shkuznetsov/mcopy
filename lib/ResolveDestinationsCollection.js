const path = require('path');

const {MCJob, MCJobsCollection} = require('./JobsAndCollections');
const CopyCollection = require('./CopyCollection');

module.exports = class ResolveDestinationsCollection extends MCJobsCollection {
	newNextCollection () {
		return new CopyCollection(this.opt, this.emitter);
	}
	newJob (src, dest) {
		return new ResolveDestinationsJob(this, src, dest);
	}
};

class ResolveDestinationsJob extends MCJob {
	async run () {
		// If dest is a function, call it
		if (typeof this.dest === 'function') this.dest = await this.dest(this.src);
		// If dest is an array, create a job for each element
		if (Array.isArray(this.dest)) this.dest.forEach((dest) => this.addJobToNextCollection(dest));
		// ... or just create a job for the value otherwise
		else this.addJobToNextCollection(this.dest);
	}
	addJobToNextCollection (dest) {
		if (dest) {
			dest = {path: path.resolve(dest, this.src.basename)};
			dest.basename = this.src.basename;
			dest.dirname = path.dirname(dest.path);
			this.collection.next.addJob(this.src, dest);
		}
	}
}