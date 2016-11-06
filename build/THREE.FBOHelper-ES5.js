'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

;(function () {

	"use strict";

	var root = this;

	var has_require = typeof require !== 'undefined';

	var THREE = root.THREE || has_require && require('three');
	if (!THREE) throw new Error('FBOHelper requires three.js');

	"use strict";

	var layerCSS = '\n#fboh-fbos-list{\n\tall: unset;\n\tposition: fixed;\n\tleft: 0;\n\ttop: 0;\n\tz-index: 1000000;\n\twidth: 150px;\n}\n#fboh-fbos-list, #fboh-fbos-list *, #fboh-hotspot, #fboh-label, #fboh-info{\n\tbox-sizing: border-box;\n\tfont-family: \'Roboto Mono\', \'courier new\', courier, monospace;\n\tfont-size: 11px;\n\tline-height: 1.4em;\n}\n#fboh-fbos-list li{\n\tcursor: pointer;\n\tcolor: white;\n\twidth: 100%;\n\tpadding: 4px 0;\n\tborder-top: 1px solid #888;\n\tborder-bottom: 1px solid black;\n\tbackground-color: #444;\n\ttext-align: center;\n\ttext-shadow: 0 -1px black;\n}\n#fboh-fbos-list li:hover{\n\tbackground-color: rgba( 158, 253, 56, .5 );\n}\n#fboh-fbos-list li.active{\n\tbackground-color: rgba( 158, 253, 56, .5 );\n\tcolor: white;\n\ttext-shadow: 0 1px black;\n}\n#fboh-hotspot{\n\tposition: absolute;\n\tleft: 0;\n\ttop: 0;\n\tbackground-color: rgba( 158, 253, 56,.5);\n\tpointer-events: none;\n}\n#fboh-label{\n\tposition: absolute;\n\tleft: 0;\n\tbottom: 0;\n\ttransform-origin: bottom left;\n\tpointer-events: none;\n}\n#fboh-info{\n\tdisplay: none;\n\tposition: absolute;\n\tleft: 160px;\n\ttop: 10px;\n\tpointer-events: none;\n}\n.fboh-card{\n\tdisplay: block;\n\twhite-space: nowrap;\n\tcolor: black;\n\tpadding: 10px;\n\tbackground-color: white;\n\tborder: 1px solid black;\n}\n';

	var formats = {};
	formats[THREE.AlphaFormat] = 'THREE.AlphaFormat';
	formats[THREE.RGBFormat] = 'THREE.RGBFormat';
	formats[THREE.RGBAFormat] = 'THREE.RGBAFormat';
	formats[THREE.LuminanceFormat] = 'THREE.LuminanceFormat';
	formats[THREE.LuminanceAlphaFormat] = 'THREE.LuminanceAlphaFormat';
	//formats[ THREE.RGBEFormat ] = 'THREE.RGBEFormat';

	var types = {};
	types[THREE.UnsignedByteType] = 'THREE.UnsignedByteType';
	types[THREE.ByteType] = 'THREE.ByteType';
	types[THREE.ShortType] = 'THREE.ShortType';
	types[THREE.UnsignedShortType] = 'THREE.UnsignedShortType';
	types[THREE.IntType] = 'THREE.IntType';
	types[THREE.UnsignedIntType] = 'THREE.UnsignedIntType';
	types[THREE.FloatType] = 'THREE.FloatType';
	types[THREE.HalfFloatType] = 'THREE.HalfFloatType';
	types[THREE.UnsignedShort4444Type] = 'THREE.UnsignedShort4444Type';
	types[THREE.UnsignedShort5551Type] = 'THREE.UnsignedShort5551Type';
	types[THREE.UnsignedShort565Type] = 'THREE.UnsignedShort565Type';

	var FBOHelper = function () {
		function FBOHelper(renderer) {
			var _this = this;

			_classCallCheck(this, FBOHelper);

			this.renderer = renderer;
			this.autoUpdate = false;
			this.fbos = [];
			this.list = document.createElement('ul');
			this.list.setAttribute('id', 'fboh-fbos-list');
			document.body.appendChild(this.list);

			this.scene = new THREE.Scene();
			this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .000001, 1000);

			this.raycaster = new THREE.Raycaster();
			this.mouse = new THREE.Vector2();

			this.grid = document.createElement('div');
			this.grid.setAttribute('style', 'position: fixed; left: 50%; top: 50%; border: 1px solid #000000; transform: translate3d(-50%, -50%, 0 ); box-shadow: 0 0 50px black; display: none');
			this.grid.setAttribute('id', 'bfoh-grid');
			document.body.appendChild(this.grid);

			this.hotspot = document.createElement('div');
			this.hotspot.setAttribute('id', 'fboh-hotspot');
			this.grid.appendChild(this.hotspot);

			this.label = document.createElement('div');
			this.label.setAttribute('id', 'fboh-label');
			this.label.className = 'fboh-card';
			this.hotspot.appendChild(this.label);

			this.info = document.createElement('div');
			this.info.setAttribute('id', 'fboh-info');
			this.info.className = 'fboh-card';
			document.body.appendChild(this.info);

			this.currentObj = null;
			this.currentU = 0;
			this.currentV = 0;

			this.fboMap = new Map();

			this.offsetX = 0;
			this.offsetY = 0;

			this.grid.appendChild(this.hotspot);

			var head = window.document.head || window.document.getElementsByTagName('head')[0];
			var style = window.document.createElement('style');

			style.type = 'text/css';
			if (style.styleSheet) {
				style.styleSheet.cssText = layerCSS;
			} else {
				style.appendChild(document.createTextNode(layerCSS));
			}

			head.appendChild(style);

			var ss = document.createElement('link');
			ss.type = 'text/css';
			ss.rel = 'stylesheet';
			ss.href = 'https://fonts.googleapis.com/css?family=Roboto+Mono';

			head.appendChild(ss);

			this.grid.addEventListener('wheel', function (e) {

				var direction = e.deltaY < 0 ? 1 : -1;

				_this.camera.zoom += direction / 50;
				_this.camera.updateProjectionMatrix();
				_this.grid.style.transform = 'translate3d(-50%, -50%, 0 ) scale(' + _this.camera.zoom + ',' + _this.camera.zoom + ') translate3d(' + _this.offsetX + 'px,' + _this.offsetY + 'px,0) ';
				_this.label.style.transform = 'scale(' + 1 / _this.camera.zoom + ',' + 1 / _this.camera.zoom + ')';
				_this.hotspot.style.transform = 'scale(' + 1 / _this.camera.zoom + ',' + 1 / _this.camera.zoom + ')';
				_this.hotspot.style.borderWidth = 1 / _this.camera.zoom + 'px';
				_this.readPixel(_this.currentObj, _this.currentU, _this.currentV);
			});

			var dragging = false;
			var mouseStart = { x: 0, y: 0 };
			var offsetStart = { x: 0, y: 0 };

			this.grid.addEventListener('mousedown', function (e) {

				dragging = true;
				mouseStart.x = e.clientX;
				mouseStart.y = e.clientY;
				offsetStart.x = _this.offsetX;
				offsetStart.y = _this.offsetY;
			});

			this.grid.addEventListener('mouseup', function (e) {

				dragging = false;
			});

			this.grid.addEventListener('mouseout', function (e) {

				_this.label.style.display = 'none';
				dragging = false;
			});

			this.grid.addEventListener('mouseover', function (e) {

				_this.label.style.display = 'block';
			});

			this.grid.addEventListener('mousemove', function (e) {

				if (dragging) {

					_this.offsetX = offsetStart.x + (e.clientX - mouseStart.x) / _this.camera.zoom;
					_this.offsetY = offsetStart.y + (e.clientY - mouseStart.y) / _this.camera.zoom;
					_this.camera.position.x = -_this.offsetX;
					_this.camera.position.y = _this.offsetY;

					_this.grid.style.transform = 'translate3d(-50%, -50%, 0 ) scale(' + _this.camera.zoom + ',' + _this.camera.zoom + ') translate3d(' + _this.offsetX + 'px,' + _this.offsetY + 'px,0)';
				} else {

					_this.mouse.x = e.clientX / renderer.domElement.clientWidth * 2 - 1;
					_this.mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1;
					_this.raycaster.setFromCamera(_this.mouse, _this.camera);

					var intersects = _this.raycaster.intersectObject(_this.currentObj.quad, true);

					if (intersects.length > 0) {

						_this.readPixel(_this.fboMap.get(intersects[0].object), intersects[0].uv.x, intersects[0].uv.y);
						_this.label.style.display = 'block';
					} else {

						_this.label.style.display = 'none';
					}
				}
			});

			window.addEventListener('keydown', function (e) {
				if (e.keyCode === 27) {
					_this.hide();
				}
			});

			this.grid.addEventListener('keydown', function (e) {
				if (e.keyCode === 27) {
					_this.hide();
				}
			});
		}

		_createClass(FBOHelper, [{
			key: 'hide',
			value: function hide() {

				this.hideAll();
				this.info.style.display = 'none';
				this.grid.style.display = 'none';
				this.currentObj = null;
			}
		}, {
			key: 'attach',
			value: function attach(fbo, name, formatter) {
				var _this2 = this;

				var li = document.createElement('li');

				li.textContent = name;

				if (fbo.image) {
					fbo.width = fbo.image.width;
					fbo.height = fbo.image.height;
				}

				var width = 600;
				var height = fbo.height * width / fbo.width;

				var material = new THREE.MeshBasicMaterial({ map: fbo, side: THREE.DoubleSide });
				var quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1), material);
				if (!fbo.flipY) quad.rotation.x = Math.PI;
				quad.visible = false;
				quad.width = width;
				quad.height = height;
				quad.scale.set(width, height, 1.);
				this.scene.add(quad);

				var fboData = {
					width: width,
					height: height,
					name: name,
					fbo: fbo,
					flipY: fbo.flipY,
					li: li,
					visible: false,
					quad: quad,
					material: material,
					formatter: formatter
				};
				this.fbos.push(fboData);
				this.fboMap.set(quad, fboData);

				li.addEventListener('click', function (e) {
					quad.visible = !quad.visible;
					if (quad.visible) {
						_this2.hideAll();
						quad.visible = true;
						li.classList.add('active');
						_this2.info.style.display = 'block';
						_this2.grid.style.display = 'block';
						_this2.grid.style.width = fboData.width + 2 + 'px';
						_this2.grid.style.height = fboData.height + 2 + 'px';
						_this2.currentObj = fboData;
						_this2.info.innerHTML = 'Width: ' + fbo.width + ' Height: ' + fbo.height + '<br/>Format: ' + formats[fbo.texture ? fbo.texture.format : fbo.format] + ' Type: ' + types[fbo.texture ? fbo.texture.type : fbo.type];
					} else {
						_this2.info.style.display = 'none';
						li.classList.remove('active');
						_this2.grid.style.display = 'none';
						_this2.currentObj = null;
					}
				});

				this.buildList();
			}
		}, {
			key: 'detach',
			value: function detach(f) {

				var p = 0;
				var _iteratorNormalCompletion = true;
				var _didIteratorError = false;
				var _iteratorError = undefined;

				try {
					for (var _iterator = this.fbos[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
						var fbo = _step.value;

						if (fbo.fbo === f) {
							this.fbos.splice(p, 1);
						}
						p++;
					}
				} catch (err) {
					_didIteratorError = true;
					_iteratorError = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion && _iterator.return) {
							_iterator.return();
						}
					} finally {
						if (_didIteratorError) {
							throw _iteratorError;
						}
					}
				}

				this.buildList();
			}
		}, {
			key: 'refreshFBO',
			value: function refreshFBO(f) {
				var _iteratorNormalCompletion2 = true;
				var _didIteratorError2 = false;
				var _iteratorError2 = undefined;

				try {

					for (var _iterator2 = this.fbos[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
						var fbo = _step2.value;

						if (fbo.fbo === f) {
							var width = 600;
							var height = f.height * width / f.width;
							fbo.width = width;
							fbo.height = height;
							fbo.quad.width = width;
							fbo.quad.height = height;
							fbo.quad.scale.set(width, height, 1.);
						}
					}
				} catch (err) {
					_didIteratorError2 = true;
					_iteratorError2 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion2 && _iterator2.return) {
							_iterator2.return();
						}
					} finally {
						if (_didIteratorError2) {
							throw _iteratorError2;
						}
					}
				}
			}
		}, {
			key: 'hideAll',
			value: function hideAll() {

				this.fbos.forEach(function (fbo) {
					fbo.quad.visible = false;
					fbo.li.classList.remove('active');
				});
			}
		}, {
			key: 'buildList',
			value: function buildList() {

				while (this.list.firstChild) {
					this.list.removeChild(this.list.firstChild);
				}var _iteratorNormalCompletion3 = true;
				var _didIteratorError3 = false;
				var _iteratorError3 = undefined;

				try {
					for (var _iterator3 = this.fbos[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
						var fbo = _step3.value;

						this.list.appendChild(fbo.li);
					}
				} catch (err) {
					_didIteratorError3 = true;
					_iteratorError3 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion3 && _iterator3.return) {
							_iterator3.return();
						}
					} finally {
						if (_didIteratorError3) {
							throw _iteratorError3;
						}
					}
				}
			}
		}, {
			key: 'setSize',
			value: function setSize(w, h) {

				this.camera.left = w / -2;
				this.camera.right = w / 2;
				this.camera.top = h / 2;
				this.camera.bottom = h / -2;

				this.camera.updateProjectionMatrix();
			}
		}, {
			key: 'readPixel',
			value: function readPixel(obj, u, v) {

				this.currentU = u;
				this.currentV = v;

				if (this.currentObj === null) return;

				var fbo = obj.fbo;

				var x = ~~(fbo.width * u);
				var y = ~~(fbo.height * v);

				var types = {};
				types[THREE.UnsignedByteType] = Uint8Array;
				types[THREE.ByteType] = Int8Array;
				types[THREE.ShortType] = Int16Array;
				types[THREE.UnsignedShortType] = Uint16Array;
				types[THREE.IntType] = Int32Array;
				types[THREE.UnsignedIntType] = Uint32Array;
				types[THREE.FloatType] = Float32Array;
				types[THREE.HalfFloatType] = null;
				types[THREE.UnsignedShort4444Type] = Uint16Array;
				types[THREE.UnsignedShort5551Type] = Uint16Array;
				types[THREE.UnsignedShort565Type] = Uint16Array;

				var type = types[fbo.texture ? fbo.texture.type : fbo.type];
				if (type === null) {
					console.warning(fbo.texture ? fbo.texture.type : fbo.type + ' not supported');
					return;
				}

				var pixelBuffer = new type(4);

				this.renderer.readRenderTargetPixels(fbo, x, y, 1, 1, pixelBuffer);
				var posTxt = 'X : ' + x + ' Y: ' + y + ' u: ' + u + ' v: ' + v;
				var dataTxt = obj.formatter ? obj.formatter({
					x: x,
					y: y,
					u: u,
					v: v,
					r: pixelBuffer[0],
					g: pixelBuffer[1],
					b: pixelBuffer[2],
					a: pixelBuffer[3]
				}) : 'R: ' + pixelBuffer[0] + ' G: ' + pixelBuffer[1] + ' B: ' + pixelBuffer[2] + ' A: ' + pixelBuffer[3];
				this.label.innerHTML = posTxt + '<br/>' + dataTxt;

				var ox = ~~(u * fbo.width) * obj.quad.width / fbo.width;
				var oy = ~~(obj.flipY ? (1 - v) * fbo.height : v * fbo.height) * obj.quad.height / fbo.height;
				this.hotspot.style.width = obj.quad.width / fbo.width + 'px';
				this.hotspot.style.height = obj.quad.height / fbo.height + 'px';
				this.hotspot.style.transform = 'translate3d(' + ox + 'px,' + oy + 'px,0)';
				this.label.style.bottom = obj.quad.height / fbo.height + 'px';
			}
		}, {
			key: 'update',
			value: function update() {

				this.renderer.autoClear = false;
				this.renderer.render(this.scene, this.camera);
				this.renderer.autoClear = true;
				if (this.autoUpdate) this.readPixel(this.currentObj, this.currentU, this.currentV);
			}
		}]);

		return FBOHelper;
	}();

	if (typeof exports !== 'undefined') {
		if (typeof module !== 'undefined' && module.exports) {
			exports = module.exports = FBOHelper;
		}
		exports.FBOHelper = FBOHelper;
	} else {
		root.FBOHelper = FBOHelper;
	}
}).call(undefined);
