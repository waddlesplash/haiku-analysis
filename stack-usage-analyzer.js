/*
 * (C) 2019 Augustin Cavalier <waddlesplash>.
 * Released under the MIT license.
 */

var fs = require('fs');

function walkSync(dir, callback) {
	var files = fs.readdirSync(dir);
	files.forEach(function(file) {
		var dirfile = dir + file;
		if (fs.statSync(dirfile).isDirectory()) {
			walkSync(dirfile + '/', callback);
		} else {
			callback(dirfile);
		}
	});
}

// example line:
// VMKernelArea.cpp:28:1:static VMKernelArea* VMKernelArea::Create(VMAddressSpace*, const char*, uint32)     80      static

var functions = [];
walkSync(process.argv[2], function (file) {
	if (!file.endsWith(".su"))
		return;

	const lines = fs.readFileSync(file, {encoding: "utf-8"}).split("\n");
	for (var i in lines) {
		var line = lines[i].split(':', 4);
		if (line.length != 4)
			continue;
		var func = {
			file: line[0],
			line: line[1],
			column: line[2],
		};

		// now get everything past the file/line/column
		line = lines[i].substr(line[0].length + line[1].length + line[2].length + 3);

		// names are mangled, we have to mind the parens
		var parens = -1, j;
		for (j = 0; j < line.length; j++) {
			switch (line[j]) {
			case '(':
				if (parens == -1)
					parens = 0;
				parens++;
				break;
			case ')':
				parens--;
				break;
			default:
				break;
			}
			if (parens == 0)
				break;
		}
		func.name = line.substr(0, j + 1);
		line = line.substr(j + 1).split(/\s+/);
		func.usage = parseInt(line[line.length - 2]);
		if (func.usage < 32)
			continue; // ignore very small functions

		functions.push(func);
	}
});

functions.sort(function (a, b) {
	return b.usage - a.usage;
});

console.log("||**file**||**usage**||**function**||");
for (var i in functions) {
	var f = functions[i];
	console.log("||" + f.file + "||" + f.usage + "||{{{" + f.name + "}}}||");
}
