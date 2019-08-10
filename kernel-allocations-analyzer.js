/*
 * (C) 2019 Augustin Cavalier <waddlesplash>.
 * Released under the MIT license.
 */

var fs = require('fs'), child_process = require('child_process');

var file = fs.readFileSync(process.argv[2], {encoding: "utf-8"});
const lines = file.split("\r\n");
file = '';

var allocation_points = {};
for (var i in lines) {
	var line = lines[i].split(/[ \(\)]/);
	if (line[0] != "allocator:malloc")
		continue; //TODO frees

	// [ 'allocator:malloc', '32', '', '->', '0xffffffff82022f60', 'by', '<kernel_x86_64>module_init' ]
	if (!(line[6] in allocation_points))
		allocation_points[line[6]] = {};
	if (!(line[1] in allocation_points[line[6]]))
		allocation_points[line[6]][line[1]] = 0;
	allocation_points[line[6]][line[1]]++;
}

console.log("\tsize\tcount");

var sorted = Object.keys(allocation_points).sort(function(a, b) {
	a = allocation_points[a];
	b = allocation_points[b];
	var a_sum = 0, b_sum = 0;
	for (var i in a)
		a_sum += /*parseInt(i) * */ parseInt(a[i]);
	for (var i in b)
		b_sum += /*parseInt(i) * */ parseInt(b[i]);
	return b_sum - a_sum;
});
for (var i in sorted) {
	var itm = sorted[i];
	var pnt = allocation_points[itm];

	console.log(child_process.execSync("echo '" + itm +"' | c++filt").toString().replace('\n', ''));
	for (var j in pnt)
		console.log("\t" + j + "\t" + pnt[j]);
}
