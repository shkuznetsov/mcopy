const parseArguments = require('../lib/parseArguments');
const CopyJob = require('../lib/CopyJob');

const run = function () { return parseArguments(arguments); };
const func = () => {};

const assertCopyJob = (job, src, dest) => {
	expect(job).toBeInstanceOf(CopyJob);
	expect(job.src).toEqual(src);
	expect(job.dest).toBe(dest);
};

describe('parseArguments', function() {

	it("should support single-job shorthand syntax", function() {
		let {jobs, opt, callback} = run('src', 'dest', {parallel: 3}, func);
		assertCopyJob(jobs[0], ['src'], 'dest');
		expect(opt.parallel).toEqual(3);
		expect(callback).toBe(func);
	});

	it("should support single-job verbose syntax", function() {
		let {jobs, opt, callback} = run({src: 'src', dest: 'dest'}, {parallel: 3}, func);
		assertCopyJob(jobs[0], ['src'], 'dest');
		expect(opt.parallel).toEqual(3);
		expect(callback).toBe(func);
	});

	it("should support multi-job shorthand syntax", function() {
		let {jobs, opt, callback} = run([['src1', 'dest1'], ['src2', 'dest2']], {parallel: 3}, func);
		assertCopyJob(jobs[0], ['src1'], 'dest1');
		assertCopyJob(jobs[1], ['src2'], 'dest2');
		expect(opt.parallel).toEqual(3);
		expect(callback).toBe(func);
	});

	it("should support multi-job verbose syntax", function() {
		let {jobs, opt, callback} = run([{src: 'src1', dest: 'dest1'}, {src: 'src2', dest: 'dest2'}], {parallel: 3}, func);
		assertCopyJob(jobs[0], ['src1'], 'dest1');
		assertCopyJob(jobs[1], ['src2'], 'dest2');
		expect(opt.parallel).toEqual(3);
		expect(callback).toBe(func);
	});

	it("should support array as a source", function() {
		let {jobs, opt, callback} = run(['src1', 'src2'], 'dest', {parallel: 3}, func);
		assertCopyJob(jobs[0], ['src1', 'src2'], 'dest');
		expect(opt.parallel).toEqual(3);
		expect(callback).toBe(func);
	});

	it("should support function as a destination", function() {
		let {jobs, opt, callback} = run('src', func, {parallel: 3}, func);
		assertCopyJob(jobs[0], ['src'], func);
		expect(opt.parallel).toEqual(3);
		expect(callback).toBe(func);
	});
});