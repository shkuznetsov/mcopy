const defaultOptions = require('../lib/defaultOptions');

test("should use supplied value", () => {
	let opt = defaultOptions({
		createDir: false,
		deleteSource: true,
		parallel: 3,
		highWaterMark: 1024,
		globOpt: {silent: false, opt: 1}
	});
	expect(opt.createDir).toEqual(false);
	expect(opt.deleteSource).toEqual(true);
	expect(opt.parallel).toEqual(3);
	expect(opt.highWaterMark).toEqual(1024);
	expect(opt.globOpt.silent).toEqual(false);
	expect(opt.globOpt.opt).toEqual(1);
});

test("should default if parameter is missing", () => {
	let opt = defaultOptions({});
	expect(opt.createDir).toEqual(true);
	expect(opt.deleteSource).toEqual(false);
	expect(opt.parallel).toEqual(1);
	expect(opt.globOpt.silent).toEqual(true);
	expect(opt.globOpt.nodir).toEqual(true);
});

test("should deep-default objects", () => {
	let opt = defaultOptions({
		globOpt: {opt: 1}
	});
	expect(opt.globOpt.silent).toEqual(true);
	expect(opt.globOpt.opt).toEqual(1);
	expect(opt.globOpt.nodir).toEqual(true);
});

test("should default if a value supplied is wrong type", () => {
	let opt = defaultOptions({
		parallel: -1,
		highWaterMark: 0,
		globOpt: () => {}
	});
	expect(opt.parallel).toEqual(1);
	expect(opt.highWaterMark).toEqual(4194304);
	expect(opt.globOpt.silent).toEqual(true);
	expect(opt.globOpt.nodir).toEqual(true);
});

test("should not allow overriding the 'always' value", () => {
	let opt = defaultOptions({globOpt: {nodir: false}});
	expect(opt.globOpt.nodir).toEqual(true);
});