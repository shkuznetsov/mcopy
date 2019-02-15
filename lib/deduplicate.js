import {syncRunner} from './runners';
import {CopyJob} from './copy';

exports.deduplicate = (opt) => (jobs) => syncRunner(jobs, opt);

exports.DeduplicateJob = class extends CopyJob {

};