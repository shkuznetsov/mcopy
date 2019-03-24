const path = require('path');

const {Job, JobsCollectionAsync} = require('./JobsAndCollections');
const CopyCollection = require('./CopyCollection');

module.exports = class ResolveDestinationsCollection extends JobsCollectionAsync {
	newNextCollection () {
		return new CopyCollection(this.opt, this.emitter);
	}
	newJob (src, dest) {
		return new ResolveDestinationsJob(this, src, dest);
	}
};

class ResolveDestinationsJob extends Job {
	async run () {
		let dest;
		// If dest is a function, call it
		if (typeof this.dest === 'function') dest = await this.dest(this.src);
		// ... or use the value as is otherwise
		else dest = this.dest;
		// If dest is an array, create a job for each element
		if (Array.isArray(dest)) dest.forEach((dest) => this.addJobToNextCollection(dest));
		// ... or just create a job for the value otherwise
		else this.addJobToNextCollection(dest);
	}
	addJobToNextCollection (dest) {
		if (dest) {
			dest = {path: path.resolve(dest, this.src.basename)};
			dest.basename = this.src.basename;
			dest.dirname = path.dirname(dest.path);
			this.collection.addJobToNextCollection(this.src, dest);
		}
	}
}