var queue = require('./config/todos.js').queue;
var async = require('async');
var log = require('./modules/log.js');
var converters = require('./modules/converters.js');


async.eachSeries(queue,
	function (item, cb) {
		log.info('Processing item "'+item.key+'"')
		if (!converters[item.func]) throw new Error('Unknown converter "'+item.func+'"');

		converters[item.func].checkSkip(item.opts, function (skip) {
			if (skip) return cb();
			converters[item.func].convert(item.opts, cb);
		})
	},
	function () {

	}
)
