// Find the areas which are "wasting" the most RAM. (In reality, it finds
// the areas with the fewest mapped pages. It can't detect duplicate shared
// areas, or mmap'ed cache areas that will get flushed when there is low
// memory availablility, etc. so its output will be rather deceiving.)

#include <OS.h>
#include <vector>
#include <algorithm>
#include <stdio.h>
#include <string.h>

int main()
{
	std::vector<area_info> infos;

	int32 teamCookie = 0;
	team_info tinfo;
	while (get_next_team_info(&teamCookie, &tinfo) >= B_OK) {
		ssize_t cookie = 0;
		area_info info;
		while (get_next_area_info(tinfo.team, &cookie, &info) == B_OK) {
			infos.push_back(info);
		}
	}

	std::sort(infos.begin(), infos.end(), [](area_info i1, area_info i2) -> bool {
		return (i1.size - i1.ram_size) < (i2.size - i2.ram_size);
	});

	uint64 total_waste = 0;
	for (const area_info& areaInfo : infos) {
#if 0
		/* Enable this to include kernel areas in the output.
		* Usually these are strange enough to not be useful. */
		if (areaInfo.team == 1)
			continue;
#endif
		if (strstr(areaInfo.name, "_seg") != NULL
				|| strstr(areaInfo.name, "stack") != NULL
				|| areaInfo.area == 1)
			continue;
		if (areaInfo.size == areaInfo.ram_size)
			continue;

		printf("%5" B_PRId32 " %32s %8" B_PRIuSIZE " %8" B_PRIu32 "\n",
			areaInfo.area,
			areaInfo.name,
			areaInfo.size / 1024,
			areaInfo.ram_size / 1024);
		total_waste += areaInfo.size - areaInfo.ram_size;
	}
	printf("----------------------------------------------------------\n");
	printf("   ID                             name     size   ram_size\n");
	printf("\n");
	printf("total waste: %lld MB\n", (total_waste / 1024) / 1024);

	return 0;
}
