const cartesian = require('cartesian');
const parseArguments = require('../lib/parseArguments');

const combinations = cartesian({
	multipleJobs: [true, false],
	shorthandSyntax: [true, false],
	srcArray: [true, false],
	destFunction: [true, false],
	optExists: [true, false],
	callbackExists: [true, false]
});

const fxSrcs = ['s1', 's2', 's3', 's4'];
const fxDestStrings = ['d1', 'd2'];
const fxDestFunctions = [() => {}, () => {}];
const fxOpt = {};
const fxCallback = () => {};

combinations.forEach((param) => test(JSON.stringify(param), () => {

	let fxSrc = (n) => param.srcArray ? [fxSrcs[n*2], fxSrcs[n*2 + 1]] : fxSrcs[n];
	let fxDest = (n) => param.destFunction ? fxDestFunctions[n] : fxDestStrings[n];

	let createJob = (n) => {
		let src = fxSrc(n);
		let dest = fxDest(n);
		return param.shorthandSyntax ? [src, dest] : {src, dest};
	};

	let assertJob = (n, job) => {
		let src = param.shorthandSyntax ? job[0] : job.src;
		let dest = param.shorthandSyntax ? job[1] : job.dest;
		expect(src).toEqual(fxSrc(n));
		expect(dest).toBe(fxDest(n));
	};

	let args;

	if (param.multipleJobs) args = [[createJob(0), createJob(1)]];
	else if (param.shorthandSyntax) args = createJob(0);
	else args = [createJob(0)];

	if (param.optExists) args.push(fxOpt);
	if (param.callbackExists) args.push(fxCallback);
	let {jobs, opt, callback} = parseArguments(args);

	expect(Array.isArray(jobs)).toBe(true);
	expect(jobs.length).toEqual(param.multipleJobs ? 2 : 1);
	assertJob(0, jobs[0]);
	if (param.multipleJobs) assertJob(1, jobs[1]);
	if (param.optExists) expect(opt).toBe(fxOpt);
	if (param.callbackExists) expect(callback).toBe(fxCallback);

}));