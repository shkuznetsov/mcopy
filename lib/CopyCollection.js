import util from 'util';
import mkdirpCb from 'mkdirp';

import {Job, JobsCollectionAsync} from 'JobsAndCollections';
import ResultsCollection from 'ResultsCollection';

const mkdirp = util.promisify(mkdirpCb);

export default class CopyCollection extends JobsCollectionAsync {
	constructor (opt, emitter) {
		super(opt, emitter);
		this.jobsBySrc = {};
		this.jobsByDest = {};
	}
	newNextCollection () {
		return new ResultsCollection(this.opt, this.emitter);
	}
	newJob (src, dest) {
		// Check for source duplicates
		let srcDuplicate = this.jobsBySrc[src.path];
		if (srcDuplicate) {
			srcDuplicate.addDestination(dest);
			return false;
		}
		// Check for destination duplicates
		let destDuplicate = this.jobsByDest[dest.path];
		if (destDuplicate) {
			throw "Multiple sources can't copy to the same destination: " +
				`['${destDuplicate.src.path}', '${src.path}'] > '${dest.path}'`;
		}
		// Create a new job
		let newJob = new CopyJob(this, src, dest);
		this.jobsBySrc[src.path] = newJob;
		this.jobsByDest[dest.path] = newJob;
		return newJob;
	}
}

class CopyJob extends Job {
	constructor (collection, src, dest) {
		super(collection, src, dest);
		// Destination is always an array
		this.dest = [dest];
	}
	addDestination (dest) {
		this.dest.push(dest);
	}
	async run () {
		if (this.opt.createDir) await this.prepareDestinationDirs();
		await this.copy();
		if (this.opt.deleteSource) await this.deleteSource();
	}

	async copy () {
	}

	async prepareDestinationDirs () {
		this.dest.forEach()
	}
}