const parseArguments = require('../lib/parseArguments');
const CopyJob = require('../lib/CopyJob');

const run = function () { return parseArguments(arguments); };
const func = () => {};

const assertCopyJob = (job, src, dest) => {
	expect(job).toBeInstanceOf(CopyJob);
	expect(job.src).toEqual(src);
	expect(job.dest).toBe(dest);
};

test("should support single-job shorthand syntax", () => {
	let {jobs, opt, callback} = run('src', 'dest', {parallel: 3}, func);
	assertCopyJob(jobs[0], ['src'], 'dest');
	expect(opt.parallel).toEqual(3);
	expect(callback).toBe(func);
});

test("should support single-job verbose syntax", () => {
	let {jobs, opt, callback} = run({src: 'src', dest: 'dest'}, {parallel: 3}, func);
	assertCopyJob(jobs[0], ['src'], 'dest');
	expect(opt.parallel).toEqual(3);
	expect(callback).toBe(func);
});

test("should support multi-job shorthand syntax", () => {
	let {jobs, opt, callback} = run([['src1', 'dest1'], ['src2', 'dest2']], {parallel: 3}, func);
	assertCopyJob(jobs[0], ['src1'], 'dest1');
	assertCopyJob(jobs[1], ['src2'], 'dest2');
	expect(opt.parallel).toEqual(3);
	expect(callback).toBe(func);
});

test("should support multi-job verbose syntax", () => {
	let {jobs, opt, callback} = run([{src: 'src1', dest: 'dest1'}, {src: 'src2', dest: 'dest2'}], {parallel: 3}, func);
	assertCopyJob(jobs[0], ['src1'], 'dest1');
	assertCopyJob(jobs[1], ['src2'], 'dest2');
	expect(opt.parallel).toEqual(3);
	expect(callback).toBe(func);
});

test("should support array as a source in a single-job", () => {
	let {jobs, opt, callback} = run(['src1', 'src2'], 'dest', {parallel: 3}, func);
	assertCopyJob(jobs[0], ['src1', 'src2'], 'dest');
	expect(opt.parallel).toEqual(3);
	expect(callback).toBe(func);
});

test("should support array as a source in a multi-job", () => {
	let {jobs, opt, callback} = run([[['src11', 'src12'], 'dest1'], [['src21', 'src22'], 'dest2']], {parallel: 3}, func);
	assertCopyJob(jobs[0], ['src11', 'src12'], 'dest1');
	assertCopyJob(jobs[1], ['src21', 'src22'], 'dest2');
	expect(opt.parallel).toEqual(3);
	expect(callback).toBe(func);
});

test("should support function as a destination", () => {
	let {jobs, opt, callback} = run('src', func, {parallel: 3}, func);
	assertCopyJob(jobs[0], ['src'], func);
	expect(opt.parallel).toEqual(3);
	expect(callback).toBe(func);
});

test("should support callback without options in a single-job", () => {
	let {jobs, opt, callback} = run('src', 'dest', func);
	expect(callback).toBe(func);
});

test("should support callback without options in a multi-job", () => {
	let {jobs, opt, callback} = run([['src', 'dest'], ['src', 'dest']], func);
	expect(callback).toBe(func);
});
