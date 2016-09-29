'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {

	"use strict";

	var layerCSS = '\n*{\n\tbox-sizing: border-box;\n\tpadding: 0;\n\tmargin: 0;\n}\nbody{\n\tpointer-events: none;\n\tfont-family: \'courier new\', courier, monospace;\n\tfont-size: 11px;\n}\n#grid{\n\tcursor: none;\n\tposition: absolute;\n\tleft: 50%;\n\ttop: 50%;\n\tborder: 1px solid #ff00ff;\n\ttransform: translate3d(-50%, -50%, 0 )\n}\n#hotspot{\n\tcursor: none;\n\tposition: absolute;\n\tleft: 0;\n\ttop: 0;\n\tborder: 1px solid #fff;\n\tbackground-color: rgba( 255,0,255,.5);\n}\n#label{\n\tdisplay: block;\n\twhite-space: nowrap;\n\tcolor: black;\n\tpadding: 10px;\n\tbackground-color: white;\n\tborder: 1px solid black;\n\tposition: absolute;\n\tleft: 0;\n\tbottom: 0;\n\ttransform-origin: bottom left;\n}\n';

	var FBOHelper = function () {
		function FBOHelper(renderer) {
			var _this = this;

			_classCallCheck(this, FBOHelper);

			this.renderer = renderer;
			this.fbos = [];
			this.list = document.createElement('ul');
			this.list.setAttribute('style', 'all: initial; position: fixed; left: 0; top: 0; z-index: 1000000; width: 150px');
			document.body.appendChild(this.list);

			this.scene = new THREE.Scene();
			this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);

			this.layer = document.createElement('iframe');
			this.layer.setAttribute('style', 'position: fixed; left: 0; top: 0; right: 0; bottom: 0; width: 100%; height: 100%; display: none; outline: none; border: none;');
			document.body.appendChild(this.layer);

			this.raycaster = new THREE.Raycaster();
			this.mouse = new THREE.Vector2();

			this.grid = document.createElement('div');
			this.grid.setAttribute('id', 'grid');

			this.hotspot = document.createElement('div');
			this.hotspot.setAttribute('id', 'hotspot');
			this.grid.appendChild(this.hotspot);

			this.label = document.createElement('div');
			this.label.setAttribute('id', 'label');
			this.hotspot.appendChild(this.label);

			this.currentObj = null;
			this.currentU = 0;
			this.currentV = 0;

			this.fboMap = new Map();

			this.layer.onload = function () {

				_this.layer.contentWindow.document.body.appendChild(_this.grid);

				var head = _this.layer.contentWindow.document.head || _this.layer.contentWindow.document.getElementsByTagName('head')[0];
				var style = _this.layer.contentWindow.document.createElement('style');

				style.type = 'text/css';
				if (style.styleSheet) {
					style.styleSheet.cssText = layerCSS;
				} else {
					style.appendChild(document.createTextNode(layerCSS));
				}

				head.appendChild(style);

				_this.layer.contentWindow.addEventListener('wheel', function (e) {

					_this.camera.zoom -= e.deltaY / 100;
					_this.camera.updateProjectionMatrix();
					_this.grid.style.transform = 'translate3d(-50%, -50%, 0 ) scale(' + _this.camera.zoom + ',' + _this.camera.zoom + ')';
					_this.label.style.transform = 'scale(' + 1 / _this.camera.zoom + ',' + 1 / _this.camera.zoom + ')';
					_this.hotspot.style.transform = 'scale(' + 1 / _this.camera.zoom + ',' + 1 / _this.camera.zoom + ')';
					_this.hotspot.style.borderWidth = 1 / _this.camera.zoom + 'px';
					_this.readPixel(_this.currentObj, _this.currentU, _this.currentV);
				});

				_this.layer.contentWindow.addEventListener('mousemove', function (e) {

					_this.mouse.x = e.clientX / _this.layer.clientWidth * 2 - 1;
					_this.mouse.y = -(e.clientY / _this.layer.clientHeight) * 2 + 1;
					_this.raycaster.setFromCamera(_this.mouse, _this.camera);

					var intersects = _this.raycaster.intersectObject(_this.currentObj.quad, true);

					if (intersects.length > 0) {

						_this.readPixel(_this.fboMap.get(intersects[0].object), intersects[0].uv.x, intersects[0].uv.y);
						_this.label.style.display = 'block';
					} else {

						_this.label.style.display = 'none';
					}
				});
			};
			this.layer.setAttribute('src', 'about:blank');
		}

		_createClass(FBOHelper, [{
			key: 'attach',
			value: function attach(fbo, name, formatter) {
				var _this2 = this;

				var li = document.createElement('li');
				li.setAttribute('style', 'cursor: pointer;color: white; width: 100%; padding: 4px 0; border-top: 1px solid #888; border-bottom: 1px solid black; background-color: #444; text-align: center; text-shadow: 0 -1px black');

				li.textContent = name;

				var width = 600;
				var height = fbo.height * width / fbo.width;

				var material = new THREE.MeshBasicMaterial({ map: fbo, side: THREE.BackSide });
				var quad = new THREE.Mesh(new THREE.BoxBufferGeometry(width, height, .0001), material);
				quad.rotation.x = Math.PI;
				quad.visible = false;
				quad.width = width;
				quad.height = height;
				this.scene.add(quad);

				var fboData = {
					name: name,
					fbo: fbo,
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
						li.style.backgroundColor = '#ff00ff';
						_this2.grid.style.width = width + 2 + 'px';
						_this2.grid.style.height = height + 2 + 'px';
						_this2.layer.style.display = 'block';
						_this2.currentObj = fboData;
					} else {
						li.style.backgroundColor = '#444';
						_this2.layer.style.display = 'none';
						_this2.currentObj = null;
					}
				});

				this.buildList();
			}
		}, {
			key: 'detach',
			value: function detach(fbo) {}
		}, {
			key: 'hideAll',
			value: function hideAll() {

				this.fbos.forEach(function (fbo) {
					fbo.quad.visible = false;
					fbo.li.style.backgroundColor = '#444';
				});
			}
		}, {
			key: 'buildList',
			value: function buildList() {

				while (this.list.firstChild) {
					this.list.removeChild(this.list.firstChild);
				}var _iteratorNormalCompletion = true;
				var _didIteratorError = false;
				var _iteratorError = undefined;

				try {
					for (var _iterator = this.fbos[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
						var fbo = _step.value;

						this.list.appendChild(fbo.li);
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

				var pixelBuffer = new Float32Array(4);
				renderer.readRenderTargetPixels(fbo, x, y, 1, 1, pixelBuffer);
				var posTxt = 'X : ' + x + ' Y: ' + y + ' u: ' + u + ' v: ' + v;
				var dataTxt = obj.formatter ? obj.formatter(pixelBuffer) : 'R: ' + pixelBuffer[0] + ' G: ' + pixelBuffer[1] + ' B: ' + pixelBuffer[2] + ' A: ' + pixelBuffer[3];
				this.label.innerHTML = posTxt + '<br/>' + dataTxt;

				var ox = ~~(u * fbo.width) * obj.quad.width / fbo.width;
				var oy = ~~(v * fbo.height) * obj.quad.height / fbo.height;
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
				//this.readPixel( this.currentObj, this.currentU, this.currentV );
			}
		}]);

		return FBOHelper;
	}();

	THREE.FBOHelper = FBOHelper;
})();
