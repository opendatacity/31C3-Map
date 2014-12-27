$(function () {
	var parameters = window.location.search;
	parameters = parameters.replace(/^\?+/g, '');
	parameters = parameters.replace(/%22/g, '"');
	parameters = JSON.parse(parameters);
	console.log(parameters);
	var map = new Map();

	function Map() {
		var retina = L.Browser.retina;
		var f = 16384;
		var P = P();
		initLeafletLibs();

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
						if (entry.bbox.x0 > x0 + areaSize) return;
						if (entry.bbox.y0 > y0 + areaSize) return;
						if (entry.bbox.x1 < x0) return;
						if (entry.bbox.y1 < y0) return;

						switch (entry.type) {
							case 'label':
								var x = (entry.pPoint[0]-x0)*zoomFactor;
								var y = (entry.pPoint[1]-y0)*zoomFactor;

								ctx.fillStyle = '#000';
								ctx.font = entry.getFontStyle(zoomFactor);
								ctx.textAlign = 'center';
								ctx.textBaseline = 'middle';
								ctx.beginPath();
								ctx.fillText(entry.title, x, y);
								ctx.fill();
							break;
							default:
								console.error('Unknown Type "'+entry.label+'"');
						}

						ctx.beginPath();
						ctx.strokeStyle = '#f00';
						ctx.rect(
							(entry.bbox.x0-x0)*zoomFactor,
							(entry.bbox.y0-y0)*zoomFactor,
							(entry.bbox.x1-entry.bbox.x0)*zoomFactor,
							(entry.bbox.y1-entry.bbox.y0)*zoomFactor
						);
						ctx.stroke();
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
					var ctx = $('#tempCanvas').get(0).getContext('2d');
					layer.entries = data.entries;
					layer.entries.forEach(function (entry) {
						entry.pPoint = P.project(entry.point, 'top', 'global');
						entry.fontSize = Math.pow(2, 7-entry.depth);
						entry.getFontStyle = function (zoom) {
							return 'normal 300 '+(entry.fontSize*zoom)+'px "Helvetica Neue"'
						}
						ctx.font = entry.getFontStyle(0.6);
						var width = ctx.measureText(entry.label).width/2;
						var height = entry.fontSize*0.5;
						entry.bbox = {
							x0: entry.pPoint[0] - width,
							y0: entry.pPoint[1] - height,
							x1: entry.pPoint[0] + width,
							y1: entry.pPoint[1] + height
						}
					})
					if (layer.active) canvasTiles.redraw();
				})
			}
		}

		function initLeafletLibs() {
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
				}
			});


			L.tileLayer.canvasRetina = function (options) {
				return new L.TileLayer.CanvasRetina(options);
			};
		}

		function P() {
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
		}
	}
})