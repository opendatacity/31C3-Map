var items = {
	'originals':{},
	'overview_iso':{needs:['originals'], func:'overview', opts:'iso'},
	'overview_top':{needs:['originals'], func:'overview', opts:'top'},
	'tiles_iso':{needs:['overview_iso'], func:'tiles', opts:'iso'},
	'tiles_top':{needs:['overview_top'], func:'tiles', opts:'top'}
}

var queue = Object.keys(items).map(function (key) {
	var item = items[key];

	item.key = key;

	item.func = item.func || item.key;
	
	if (!item.needs) item.needs = [];

	item.needs_map = {};
	item.needs.forEach(function (need) { item.needs_map[need] = true });

	return item;
})

queue.sort(function (a,b) {
	var a_lt_b = b.needs_map[a.key];
	var b_lt_a = a.needs_map[b.key];

	if (a_lt_b && b_lt_a) throw new Error('tree is not sortable');
	if (a_lt_b) return -1;
	if (b_lt_a) return  1;
	return 0;
});

exports.items = items;
exports.queue = queue;