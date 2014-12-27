$(function () {
	var map = new Map();
})

function Map() {
	var retina = L.Browser.retina;
	var f = 16384;

	var projection = {
		project: function (latlng) {
			return new L.Point(latlng.lng/f, -latlng.lat/f);
		},
		unproject: function (point) {
			return new L.LatLng(-point.y*f, point.x*f);
		}
	};

	var crs = L.extend({}, L.CRS, {
		projection: projection,
		transformation: new L.Transformation(1, 0, 1, 0),
		scale: function (zoom) {
			return 256*Math.pow(2, zoom);
		}
	});

	var map = L.map('map', {
		minZoom: 0,
		maxZoom: 8,
		zoom: 2,
		center: [-0.5*f,0.5*f],
		maxBounds: [[-f,0],[0,f]],
		crs: crs
	});

	config.map.tileLayers.forEach(function (layer) {
		layer.leaflet = L.tileLayer(layer.tileUrl, {
			minZoom: 0,
			maxZoom: 8,
			maxNativeZoom: 6,
			tileSize: retina ? 128 : 256,
			zoomOffset: retina ? 1 : 0,
			attribution: '<a href="https://events.ccc.de/congress/2013/">31C3</a> | Improve the code on <a href="https://github.com/OpenDataCity/31c3-map">GitHub</a>!',
			noWrap: true
		})

		P.addProjection(
			layer.name,
			function (p) {
				var minD = 1e60;
				var level, levelIndex;
				layer.levels.forEach(function (_level, index) {
					var d = sqr(p[0] - _level.c[0]) + sqr(p[1] - _level.c[1]);
					if (d < minD) {
						minD = d;
						level = _level;
						levelIndex = index;
					}
				})
				var det = level.dx[0]*level.dy[1] - level.dy[0]*level.dx[1];
				var x = (p[0] - level.p0[0])/det;
				var y = (p[1] - level.p0[1])/det;
				var result = [
					levelIndex,
					 x*level.dy[1] - y*level.dy[0],
					-x*level.dx[1] + y*level.dx[0]
				]
				return result;
			},
			function (p) {
				var level = layer.levels[p[0]];
				return [
					p[1]*level.dx[0] + p[2]*level.dy[0] + level.p0[0],
					p[1]*level.dx[1] + p[2]*level.dy[1] + level.p0[1]
				]
			}
		)
	})

	P.addProjection(
		'map',
		function (p) { return [-p[1],  p[0]] },
		function (p) { return [ p[1], -p[0]] }
	)

	setTileLayer(0);

	function setTileLayer(index) {
		var layer = config.map.tileLayers[index]
		layer.leaflet.addTo(map);

		var bounds = [
			P.project(layer.levels[0].c, 'global', 'map'),
			P.project(layer.levels[4].c, 'global', 'map')
		]
		map.fitBounds(bounds);

		/*
		// Zeigt für die einzelnen Etagen an:
		// - Bounding Box
		// - Center Point
		// - Separating Line
		for (var i = 0; i <= 4; i++) {
			var bounds = [
				P.project([i,0,0], layer.name, 'map'),
				P.project([i,5940,4320], layer.name, 'map')
			]
			L.rectangle(bounds, {weight:1, color:'#0f0', fill:false }).addTo(map);
			L.circleMarker(
				P.project(layer.levels[i].c, 'global', 'map'),
				{weight:1, color:'#f00'}).addTo(map);
		}

		for (var i = 0; i < 4; i++) {
			var c0 = layer.levels[i  ].c;
			var c1 = layer.levels[i+1].c;
			var c = [(c0[0]+c1[0])/2, (c0[1]+c1[1])/2];
			var d = [(c0[0]-c1[0])*2, (c0[1]-c1[1])*2];
			var line = [
				P.project([c[0]-d[1],c[1]+d[0]], 'global', 'map'),
				P.project([c[0]+d[1],c[1]-d[0]], 'global', 'map')
			]
			L.polyline(line, {weight:1, color:'#f00'}).addTo(map);
		}
		*/
	}

	loadLabelLayers();

	map.on('mousemove', function (e) {
		$('#searchtext').val(P.project([e.latlng.lat, e.latlng.lng], 'map', 'top'))
	})

	function sqr(x) {
		return x*x;
	}

	function loadLabelLayers() {

		var canvasTiles = L.tileLayer.canvasRetina({async:true});
		canvasTiles.drawTile = function(canvas, tilePoint, zoom) {
			var ctx = canvas.getContext('2d');

			var tileSize = canvas.width;
			var areaSize = Math.pow(2, 14-zoom);
			var zoomFactor = tileSize/areaSize;
			var x0 = tilePoint.x*areaSize;
			var y0 = tilePoint.y*areaSize;

			config.map.labelLayers.forEach(function (layer) {
				if (!layer.active || !layer.entries) return;
				layer.entries.forEach(function (entry) {

					switch (entry.type) {
						case 'label':
							var size = Math.pow(0.5, entry.depth)*128*zoomFactor;
							var x = (entry.pPoint[0]-x0)*zoomFactor;
							var y = (entry.pPoint[1]-y0)*zoomFactor;

							ctx.fillStyle = '#000';
							ctx.font = 'normal 300 '+size+'px "Helvetica Neue"';
							ctx.textAlign = 'center';
							ctx.textBaseline = 'middle';
							ctx.beginPath();
							ctx.fillText(entry.title, x, y);
							ctx.fill();
						break;
						default:
							console.error('Unknown Type "'+entry.label+'"');
					}
				})
			})

			canvasTiles.tileDrawn(canvas);
		}
		canvasTiles.addTo(map);

		config.map.labelLayers.forEach(function (layer) {
			if (layer.active) loadLabelLayer(layer);
		})

		function loadLabelLayer(layer) {
			$.getJSON(layer.url, function (data) {
				layer.entries = data.entries;
				layer.entries.forEach(function (entry) {
					entry.pPoint = P.project(entry.point, 'top', 'global');
				})
				if (layer.active) canvasTiles.redraw();
			})
		}
	}
}

L.TileLayer.CanvasRetina = L.TileLayer.Canvas.extend({
	_createTile: function () {
		var tile = L.DomUtil.create('canvas', 'leaflet-tile');
		if (L.Browser.retina) {
			tile.width = tile.height = this.options.tileSize*2;
			tile.style.width = tile.style.height = this.options.tileSize + 'px';
		} else {
			tile.width = tile.height = this.options.tileSize;
		}
		tile.onselectstart = tile.onmousemove = L.Util.falseFn;
		return tile;
	},
});


L.tileLayer.canvasRetina = function (options) {
	return new L.TileLayer.CanvasRetina(options);
};

var P = function () {
	// Globale Projektion ist [0..16384,0..16384], euklidisch, wie ein großes Bild, mit [0,0] links oben.
	var projections = {};
	function addProjection (name, funcTo, funcFrom) {
		projections[name] = {
			funcTo:  funcTo,
			funcFrom:funcFrom
		}
	}
	function project (point, nameFrom, nameTo) {
		return projections[nameTo].funcTo(projections[nameFrom].funcFrom(point));
	}

	addProjection(
		'global',
		function (p) { return p },
		function (p) { return p }
	)

	return {
		addProjection: addProjection,
		project: project
	}
}()



//////// Old Code

/*

//some Levenshtein-distnace code
//http://www.merriampark.com/ld.htm, http://www.mgilleland.com/ld/ldjavascript.htm, Damerau–Levenshtein distance (Wikipedia)
var levDist = function(s, t) {
    var d = []; //2d matrix

    // Step 1
    var n = s.length;
    var m = t.length;

    if (n == 0) return m;
    if (m == 0) return n;

    //Create an array of arrays in javascript (a descending loop is quicker)
    for (var i = n; i >= 0; i--) d[i] = [];

    // Step 2
    for (var i = n; i >= 0; i--) d[i][0] = i;
    for (var j = m; j >= 0; j--) d[0][j] = j;

    // Step 3
    for (var i = 1; i <= n; i++) {
        var s_i = s.charAt(i - 1);

        // Step 4
        for (var j = 1; j <= m; j++) {

            //Check the jagged ld total so far
            if (i == j && d[i][j] > 4) return n;

            var t_j = t.charAt(j - 1);
            var cost = (s_i == t_j) ? 0 : 1; // Step 5

            //Calculate the minimum
            var mi = d[i - 1][j] + 1;
            var b = d[i][j - 1] + 1;
            var c = d[i - 1][j - 1] + cost;

            if (b < mi) mi = b;
            if (c < mi) mi = c;

            d[i][j] = mi; // Step 6

            //Damerau transposition
            if (i > 1 && j > 1 && s_i == t.charAt(j - 2) && s.charAt(i - 2) == t_j) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
            }
        }
    }

    // Step 7
    return d[n][m];
}

var things = { '42': [ -24.847, 4.482 ],
	Coffeenerds: [ 64.091, 63.105 ],
	'La Quadrature du Net': [ 60.63, 45.791 ],
	'Quality Alcohol': [ 56.17, -5.098 ],
	'Villa Straylight': [ 55.628, 11.162 ],
	'Word-lounge': [ 27.45, -2.549 ],
	Kids: [ 26.981, 27.51 ],
	Relax: [ 40.447, 53.965 ],
	'Hall 17': [ 54.214, 47.373 ],
	'Hall F': [ 11.006, -60.469 ],
	'Hall E': [ 1.845, -61.172 ],
	'Hall D': [ -7.188, -61.084 ],
	'Food-hacking': [ 2.021, -45.088 ],
	'Gängeviertel': [ -0.176, -26.279 ],
	'Hall G': [ 10.833, -26.191 ],
	'Speakers-corner': [ -8.407, 20.039 ],
	'Full Circle': [ -6.49, 27.861 ],
	Chaoswelle: [ 2.899, 46.758 ],
	Leiwandville: [ -24.847, 4.482 ],
	'Civic Summit': [ -22.837, 4.395 ],
	Teckids: [ -22.675, 7.119 ],
	pyneo: [ -22.269, 9.58 ],
	irish: [ -22.269, 13.008 ],
	OSM: [ -22.431, 17.139 ],
	xenomorphs: [ -24.287, 9.229 ],
	fabhack: [ -23.725, 15.205 ],
	AKV: [ -25.245, 12.92 ],
	DFRi: [ -25.165, 15.996 ],
	'Modern Poland': [ -27.137, 13.799 ],
	'Lübeck': [ -27.684, 2.549 ],
	Freifunk: [ -29.535, 2.549 ],
	Sendezentrum: [ -33.358, 4.307 ],
	Lockpicking: [ -33.064, 15.82 ],
	HacklabKiKa: [ -33.651, 23.643 ],
	Amsterdam: [ -34.886, 21.006 ],
	MW: [ -35.102, 25.313 ],
	Heaven: [ -39.572, 19.6 ],
	POC: [ -28.382, 29.355 ],
	'linux call router': [ -31.653, 30.85 ],
	sigrok: [ -31.728, 34.453 ],
	C3S: [ -28.15, 37.617 ],
	'#youbroketheinternet': [ -27.45, 40.078 ],
	WHS: [ -25.879, 39.639 ],
	HACAS: [ -24.687, 38.584 ],
	Cryptoparty: [ -18.813, 36.65 ],
	I2P: [ -19.311, 39.199 ],
	EFF: [ -18.062, 41.309 ],
	EDRi: [ -16.383, 45.527 ],
	FiFF: [ -16.046, 47.637 ],
	'Noisy square': [ -18.73, 45.352 ],
	GSM: [ -15.961, 30.674 ],
	'Hall 13': [ -14.179, 34.541 ],
	'Hall 14': [ -11.781, 38.672 ],
	sublab: [ -55.104, -30.19 ],
	'Kinky Geeks': [ -56.873, -29.839 ],
	C3PB: [ -53.982, -26.235 ],
	Mannheim: [ -55.354, -22.236 ],
	'Double octo*': [ -54.214, -19.907 ],
	'WOB Space': [ -54.496, -14.897 ],
	'Black Space': [ -55.154, -17.402 ],
	'Aussenstelle 511': [ -54.801, -11.689 ],
	Milliways: [ -55.204, -8.921 ],
	'Chaos inkl.': [ -56.729, -26.016 ],
	Frankfurt: [ -56.487, -22.544 ],
	'Byte Werk': [ -56.632, -18.237 ],
	'AA Hacks': [ -56.17, -15.249 ],
	Geheimorganisation: [ -56.559, -7.119 ],
	'; DROP TABLE': [ -57.327, -13.623 ],
	Innovalan: [ -57.16, -6.812 ],
	Thumb2: [ -57.821, -6.987 ],
	Maschinenraum: [ -58.517, -9.756 ],
	'Ball-pit': [ -59.378, -28.345 ],
	SaturnD: [ -58.379, -22.983 ],
	MuCCC: [ -58.379, -20.918 ],
	Starship: [ -58.448, -18.984 ],
	Bio: [ -58.402, -13.799 ],
	Rollwerk: [ -59.176, -13.975 ],
	Chaospot: [ -60.565, -29.399 ],
	Netz39: [ -61.228, -26.587 ],
	C302: [ -61.037, -23.994 ],
	'c-base': [ -60.196, -16.743 ],
	'3D': [ -61.355, -20.742 ],
	'Hall 3': [ -61.27, -16.172 ],
	Copter: [ -60.93, -11.118 ],
	BlinkenArea: [ -60.196, -7.163 ],
	Darmstadt: [ -61.939, -29.268 ],
	'shack space': [ -62.755, -31.685 ],
	'Binary Kitchen': [ -62.39, -26.895 ],
	CCCFR: [ -62.083, -23.774 ],
	Mainframe: [ -62.512, -20.654 ],
	MFK: [ -62.411, -17.93 ],
	Foobar: [ -62.329, -14.546 ],
	Forth: [ -62.329, -10.898 ],
	compass: [ -63.332, -26.938 ],
	Warsaw: [ -63.392, -23.159 ],
	Warpzone: [ -63.588, -18.896 ],
	'Kölner Kreis': [ -63.253, -15.337 ],
	'DIY Audio': [ -63.214, -11.294 ],
	Flipdot: [ -63.957, -32.212 ],
	Smartcards: [ -63.879, -29.487 ],
	CONFidence: [ -64.378, -27.026 ],
	Entropolis: [ -64.225, -20.918 ],
	'Labor 23': [ -64.321, -13.359 ],
	Fail0verflow: [ -64.868, -23.027 ],
	Geraffel: [ -64.091, 13.359 ],
	'Hacker Tours': [ -64.718, 17.095 ],
	C4: [ -65.33, 15.469 ],
	c3le: [ -65.821, -2.241 ],
	Niwohlos: [ -66.601, 0.176 ],
	Magarathea: [ -66.653, 5.669 ],
	Salzburg: [ -66.302, 11.777 ],
	Chaosdorf: [ -66.302, 14.37 ],
	Subraum: [ -66.947, -2.461 ],
	Spline: [ -67.542, -1.362 ],
	Eindbazen: [ -67.357, 1.362 ],
	Aachen: [ -67.289, 3.735 ],
	'/dev/lol': [ -66.878, 10.107 ],
	Info: [ -63.115, 18.765 ],
	Food: [ -53.094, 10.986 ],
	Wardrobe: [ -50.709, 30.103 ],
	'T-Shirt Sale': [ -52.429, 36.87 ],
	Speakerregistration: [ -47.04, 54.492 ],
	'Hall 6': [ -66.018, 43.594 ],
	'Revolution #9': [ -70.787, 27.949 ],
	'c-shuttle': [ -69.473, 28.301 ],
	Exit: [ -61.606, 56.777 ],
	Entry: [ -53.645, 69.961 ],
	'Hall 1': [ 12.897, 11.602 ],
	'Hall 2': [ 21.289, 40.43 ],
	Crypotcat: [ -18.73, 45.352 ],
	'Torservers.net': [ -18.73, 45.352 ],
	'Hart Voor InternetVrijheid': [ -18.73, 45.352 ],
	Puscii: [ -18.73, 45.352 ],
	'USE OTR!': [ -18.73, 45.352 ],
	'Wikileaks-Press': [ -18.73, 45.352 ],
	'Anarchist Village': [ -18.73, 45.352 ],
	Greenhost: [ -18.73, 45.352 ],
	'Tactical Tech': [ -18.73, 45.352 ],
	'Open Knowledge Foundation': [ -18.73, 45.352 ],
	'LEAP Encryption Access Project': [ -18.73, 45.352 ],
	'GlobaLeaks Projekt + Hermes Center': [ -18.73, 45.352 ],
	Mailpile: [ -18.73, 45.352 ] };

$(function () {
	var marker;
	var Icon = L.icon({
		iconUrl: 'leaflet/images/marker-icon-red.png',
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34],
		shadowSize: [41, 41],
		shadowUrl: 'leaflet/images/marker-shadow.png'
	})

	var res = $('#result');
	var search = $('#searchtext');
	function performSearch() {
		var searchstring = search.val().toLowerCase();
		var searchresult = Object.keys(things).sort(function(a,b){
			return levDist(searchstring, a.toLowerCase())
					- levDist(searchstring, b.toLowerCase());
		});
		var html = '';
		for (var i = 0; i < Math.min(searchresult.length, 10); i++) {
			html += '<li>'+searchresult[i]+'</li>';
		}

		if (html != '') res.show();
			else res.hide();
		if (things[search]){
			addMarker(things[search]);
			$('#btnmarker').addClass('active');
			setHash();
		}
		$('#result ul').html(html);
		$('#result ul li:first').addClass('selected');
		$('#result ul li').click(function(){select($(this).text())});
		res.css({
			top: search.position().top + search.height() + 10,
			left: search.position().left
		});
	}

	function select(text){
		addMarker(things[text]);
		$('#btnmarker').addClass('active');
		setHash();
		res.hide();
	}

	$('#searchtext').keypress(function(e) {
		switch (e.keyCode) {
			case 13: // Enter
				var selected = $('#result ul li.selected').first();
				if (selected) selected.click();
			break;
			default:
				setTimeout(performSearch, 10);
		}
	});

	var map = L.map('map', {
		minZoom: 0,
		maxZoom: 6,
		zoom: 1,
		center: [0,0],
		maxBounds: [[-80,-180],[80,180]]
	});
	
	L.tileLayer('tiles/{z}/{x}/{y}.jpg', {
	    attribution: '<a href="https://events.ccc.de/congress/2013/">30C3</a> | Improve the code on <a href="https://github.com/MichaelKreil/30c3-map">GitHub</a>!',
	    noWrap: true
	}).addTo(map);

	$('#btnmarker').on('click', function (event) {
		setTimeout(function () {
			var button = $(event.currentTarget);
			if (button.hasClass('active')) {
				addMarker();
			} else {
				removeMarker();
			}
		},0);
	})

	setTimeout(getHash, 0);

	function getHash() {
		var hash = window.location.hash;
		if (hash) {
			hash = hash.match(/([\-0-9]*)_([\-0-9]*)/);
			if (hash) {
				var pos = [
					parseInt(hash[1], 10)/1000,
					parseInt(hash[2], 10)/1000
				];
				addMarker(pos);
				$('#btnmarker').addClass('active');
			}
		}
	}

	function addMarker(pos) {
		removeMarker();
		if (pos) {
			map.setView(pos, 3);
			marker = L.marker(pos, {
				icon: Icon
			});
			marker.addTo(map);
		} else {
			marker = L.marker(map.getCenter(), {
				draggable: true,
				opacity: 0.7,
				icon: Icon
			});
			marker.on('dragend', setHash);
			setHash();
			marker.addTo(map);
			$('#footer').addClass('visible');
		}
	}

	function removeMarker() {
		if (marker) {
			map.removeLayer(marker);
			marker = false;
			$('#footer').removeClass('visible');
			setHash();
		}
	}

	function setHash() {
		if (marker) {
			var pos = marker.getLatLng();
			pos = [
				(1000*pos.lat).toFixed(0),
				(1000*pos.lng).toFixed(0)
			].join('_');
			window.location.hash = pos;
			$('#url').val('http://michaelkreil.github.io/30c3-map/#'+pos);
		} else {
			window.location.hash = '';
		}
	}

	$('#url').on('click', function () {
		$('#url').select();
	})

})*/