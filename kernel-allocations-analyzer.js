/*
 * Copyright 2019-2022, Haiku, Inc. All rights reserved.
 * Distributed under the terms of the MIT License.
 *
 * Authors:
 *              Augustin Cavalier <waddlesplash>
 */

var fs = require('fs'), child_process = require('child_process');

var file = fs.readFileSync(process.argv[2], {encoding: "utf-8"});
const lines = file.split("\r\n");
file = '';

var allocation_points_total = {}, allocation_points_live = {}, live_allocations = {};
for (var i in lines) {
	const line = lines[i].split(/[ \(\)]/);
	if (line[0] == "allocator:malloc") {
		// [ 'allocator:malloc', '32', '', '->', '0xffffffff82022f60', 'by', '<kernel_x86_64>module_init' ]
		const size = line[1], address = line[4], func = line[6];

		if (!(func in allocation_points_total)) {
			allocation_points_total[func] = {};
			allocation_points_live[func] = {};
		}
		if (!(size in allocation_points_total[func])) {
			allocation_points_total[func][size] = 0;
			allocation_points_live[func][size] = 0;
		}

		allocation_points_total[func][size]++;
		allocation_points_live[func][size]++;
		live_allocations[address] = { by: func, size: size };
	} else if (line[0] == "allocator:free") {
		// [ 'allocator:free', '0xffffffff9705e480', '', 'by', '<kernel_x86_64>read_port_etc' ]
		const address = line[1], func = line[4];

		if (!(address in live_allocations))
			continue;
		const alloc = live_allocations[address];

		allocation_points_live[alloc.by][alloc.size]--;
		delete live_allocations[address];
	}
}

function print(points, by_total) {
	console.log("\tsize\tcount");

	var sorted = Object.keys(points).sort(function(a, b) {
		a = points[a];
		b = points[b];
		var a_sum = 0, b_sum = 0;
		for (var i in a)
			a_sum += (by_total ? parseInt(i) : 1) * parseInt(a[i]);
		for (var i in b)
			b_sum += (by_total ? parseInt(i) : 1) * parseInt(b[i]);
		return b_sum - a_sum;
	});
	for (var i in sorted) {
		const itm = sorted[i];
		const pnt = points[itm];

		console.log(child_process.execSync("echo '" + itm + "' | c++filt").toString().replace('\n', ''));
		for (var j in pnt) {
			if (pnt[j] == 0)
				continue;
			console.log("\t" + j + "\t" + pnt[j]);
		}
	}
}

//print(allocation_points_total, false);
print(allocation_points_live, false);
