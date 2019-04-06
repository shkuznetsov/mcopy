const defaultOptions = require('../lib/defaultOptions');

const assertGlobOpt = (opt) => {
	expect(opt.globOpt.unique).toEqual(true);
	expect(opt.globOpt.onlyFiles).toEqual(true);
	expect(opt.globOpt.stats).toEqual(true);
};

test("should use supplied value", () => {
	let opt = defaultOptions({
		createDir: false,
		deleteSource: true,
		parallel: 3,
		highWaterMark: 1024,
		globOpt: {testOpt: 1}
	});
	expect(opt.createDir).toEqual(false);
	expect(opt.deleteSource).toEqual(true);
	expect(opt.parallel).toEqual(3);
	expect(opt.globOpt.testOpt).toEqual(1);
	assertGlobOpt(opt);
});

test("should default if parameter is missing", () => {
	let opt = defaultOptions({});
	expect(opt.createDir).toEqual(true);
	expect(opt.deleteSource).toEqual(false);
	expect(opt.parallel).toEqual(1);
	assertGlobOpt(opt);
});

test("should deep-default objects", () => {
	let opt = defaultOptions({
		globOpt: {testOpt: 1}
	});
	expect(opt.globOpt.testOpt).toEqual(1);
	assertGlobOpt(opt);
});

test("should default if a value supplied is wrong type", () => {
	let opt = defaultOptions({
		parallel: -1,
		highWaterMark: 0,
		globOpt: () => {}
	});
	expect(opt.parallel).toEqual(1);
	expect(opt.highWaterMark).toEqual(4194304);
	assertGlobOpt(opt);
});

test("should not allow overriding the 'always' value", () => {
	let opt = defaultOptions({
		globOpt: {
			unique: false,
			onlyFiles: false,
			stats: false
		}
	});
	assertGlobOpt(opt);
});