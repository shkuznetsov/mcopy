const util = require('util');
const fs = require('fs');
const mkdirp = util.promisify(require('mkdirp'));
const unlink = util.promisify(fs.unlink);

const JobsCollection = require('./JobsCollectionChainable');

module.exports = class CopyCollection extends JobsCollection {
	constructor (opt) {
		super(opt);
		this.destsBySrc = {};
		this.srcsByDest = {};
	}
	newJob (seed) {
		let src = path.resolve(seed[0].path);
		let dest = path.resolve(seed[1]);
		// Is this a destination duplicate?
		if (this.srcsByDest[dest]) {
			// Is this is a full duplicate?
			if (this.srcsByDest[dest] === src) return;
			// No, it isn't - crash!
			else throw "Multiple sources can't copy to the same destination: " +
				`['${this.srcsByDest[dest]}', '${src}'] > '${dest}'`;
		}
		else this.srcsByDest[dest] = src;
		// Is this a source duplicate?
		if (this.destsBySrc[src]) this.destsBySrc[src]++;
		else this.destsBySrc[src] = 1;
		// Create the job
		return new CopyJob(seed, this, this.opt);
	}
	run () {
		return super.run().catch();
	}
	okToDeleteSource (src) {
		return !--this.destsBySrc[path.resolve(src)];
	}
};

class CopyJob {
	constructor (seed, emitter, opt) {
		this.src = seed[0];
		this.dest = seed[1];
		this.emitter = emitter;
		this.opt = opt;
	}
	async run () {
		await this.createDestinationDir();
		await this.checkDestinationDoesNotExist();
		await this.copy();
		await this.deleteSource();
		this.reportDone();
	}
	createDestinationDir () {
		if (this.opt.createDir) return mkdirp(this.dest.dirname);
	}
	checkDestinationDoesNotExist () {
		if (!this.opt.overwrite) return new Promise((resolve, reject) =>
			fs.access(this.dest.path, (err) => {
				// Error here means the file does not exist, which is good
				if (err) resolve();
				// And no error means the file exists, so we fail
				else reject(`Destination file exists: ${this.dest.path}`);
			})
		);
	}
	copy () {
		return new Promise((resolve, reject) => {
			let done = false;
			// Create streams
			let read = fs.createReadStream(this.src.path, {
				highWaterMark: this.opt.highWaterMark
			});
			let write = fs.createWriteStream(this.dest);
			// Initialise progress updater
			let progressInterval = setInterval(() => {
				this.emitter.emit('progress', this.src, this.dest, write.bytesWritten);
			}, this.opt.progressUpdateInterval);
			// Check the status and wrap things up
			const wrapUp = () => {
				if (done) return false;
				done = true;
				clearInterval(progressInterval);
				return true;
			};
			// Attach stream events
			read.on('error', (err) => wrapUp() && reject(err));
			write.on('error', (err) => wrapUp() && reject(err));
			write.on('finish', () => wrapUp() && resolve());
			// Attach an abortion handler
			this.emitter.on('error', () => {
				if (!wrapUp()) return;
				read.removeAllListeners();
				write.removeAllListeners();
				read.unpipe();
				write.end();
				// Remove the destination file
				unlink(this.dest).then(() => reject('Aborted'), reject);
			});
			// Pipe the streams together
			read.pipe(write);
		});
	}
	deleteSource () {
		if (this.opt.deleteSource &&
			this.collection.okToDeleteSource(this.src.path)) return unlink(this.src.path);
	}
}