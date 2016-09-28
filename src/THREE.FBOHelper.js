( () => {

"use strict";

class FBOHelper {

	constructor( renderer ) {

		this.renderer = renderer;
		this.fbos = []
		this.list = document.createElement( 'ul' );
		this.list.setAttribute( 'style', 'all: initial; position: fixed; left: 0; top: 0; z-index: 1000000; width: 150px' )
		document.body.appendChild( this.list );

		this.scene = new THREE.Scene();
		this.camera = new THREE.OrthographicCamera( -1, 1, 1, -1, -1000, 1000 );

		this.layer = document.createElement( 'div' );
		this.layer.setAttribute( 'style', 'position: fixed; left: 0; top: 0; right: 0; bottom: 0; display: none')
		document.body.appendChild( this.layer );

		this.layer.addEventListener( 'wheel', e => {
			this.camera.zoom += e;
		} );

		this.layer.addEventListener( 'mousemove', e => {

			this.mouse.x = ( e.clientX / this.layer.clientWidth ) * 2 - 1;
			this.mouse.y = - ( e.clientY / this.layer.clientHeight ) * 2 + 1;
			this.raycaster.setFromCamera( this.mouse, this.camera );

			const intersects = this.raycaster.intersectObjects( this.scene.children );

			if ( intersects.length > 0 ) {

				this.readPixel( this.fboMap.get( intersects[ 0 ].object ), intersects[ 0 ].uv.x, intersects[ 0 ].uv.y );
				this.label.style.display = 'block';

			} else {

				this.label.style.display = 'none';

			}

		} );

		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();

		this.grid = document.createElement( 'div' );
		this.grid.setAttribute( 'style', 'cursor: none; pointer-events: none; position: absolute; left: 50%; top: 50%; border: 1px solid #ff00ff; z-index: 9000; transform: translate3d(-50%, -50%, 0 )' );
		this.layer.appendChild( this.grid );

		this.hotspot = document.createElement( 'div' );
		this.hotspot.setAttribute( 'style', 'cursor: none; pointer-events: none; position: absolute; left: 0; top: 0; border: 1px solid #fff; background-color: rgba( 255,0,255,.5); z-index: 9000' );
		this.grid.appendChild( this.hotspot );

		this.label = document.createElement( 'div' );
		this.label.setAttribute( 'style', 'pointer-events: none; display: block; white-space: nowrap; color: black; padding: 10px; background-color: white; border: 1px solid black; z-index: 100000; position: absolute; left: 0; bottom: 0' );
		this.hotspot.appendChild( this.label );

		this.currentObj = null;
		this.currentU = 0;
		this.currentV = 0;

		this.fboMap = new Map();

	}

	attach( fbo, name, formatter ) {

		var li = document.createElement( 'li' );
		li.setAttribute( 'style', 'cursor: pointer;color: white; width: 100%; padding: 4px 0; border-top: 1px solid #888; border-bottom: 1px solid black; background-color: #444; text-align: center; text-shadow: 0 -1px black' );

		li.textContent = name;

		const width = 600;
		const height = fbo.height * width / fbo.width;

		const material = new THREE.MeshBasicMaterial( { map: fbo } );
		const quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( width, height ), material );
		quad.visible = false;
		quad.width = width;
		quad.height = height;
		this.scene.add( quad );

		var fboData = {
			name: name,
			fbo: fbo,
			li: li,
			visible: false,
			quad: quad,
			material: material,
			formatter: formatter
		};
		this.fbos.push( fboData );
		this.fboMap.set( quad, fboData );

		li.addEventListener( 'click', e => {
			quad.visible = !quad.visible;
			if( quad.visible ) {
				this.hideAll();
				quad.visible = true;
				li.style.backgroundColor = '#ff00ff';
				this.grid.style.width = ( width + 2 ) + 'px';
				this.grid.style.height = ( height + 2 ) + 'px';
				this.layer.style.display = 'block';
			} else {
				li.style.backgroundColor = '#444';
				this.layer.style.display = 'none';
			}
		} );

		this.buildList();

	}

	detach( fbo ) {

	}

	hideAll() {

		this.fbos.forEach( fbo => {
			fbo.quad.visible = false;
			fbo.li.style.backgroundColor = '#444';
		} );

	}

	buildList() {

		while( this.list.firstChild ) this.list.removeChild( this.list.firstChild );

		for( var fbo of this.fbos ) {
			this.list.appendChild( fbo.li );
		}

	}

	setSize( w, h ) {

		this.camera.left = w / - 2;
		this.camera.right = w / 2;
		this.camera.top = h / 2;
		this.camera.bottom = h / - 2;

		this.camera.updateProjectionMatrix();

	}

	readPixel( obj, u, v ) {

		this.currentObj = obj;
		this.currentU = u;
		this.currentV = v;

		if( this.currentObj === null ) return;

		const fbo = obj.fbo;

		const x = ~~( fbo.width * u );
		const y = ~~( fbo.height * v );

		const pixelBuffer = new Float32Array( 4 );
		renderer.readRenderTargetPixels( fbo, x, y, 1, 1, pixelBuffer );
		const posTxt = `X : ${x} Y: ${y}`;
		const dataTxt = obj.formatter ? obj.formatter( pixelBuffer ) : `R: ${pixelBuffer[ 0 ]} G: ${pixelBuffer[ 1 ]} B: ${pixelBuffer[ 2 ]} A: ${pixelBuffer[ 3 ]}`;
		this.label.innerHTML = `${posTxt}<br/>${dataTxt}`;

		const ox = ~~( u * fbo.width ) * obj.quad.width / fbo.width;
		const oy = ~~( ( 1 - v ) * fbo.height ) * obj.quad.height / fbo.height;
		this.hotspot.style.width = `${obj.quad.width / fbo.width}px`;
		this.hotspot.style.height = `${obj.quad.height / fbo.height}px`;
		this.hotspot.style.transform = `translate3d(${ox}px,${oy}px,0)`;
		this.label.style.bottom = ( obj.quad.height / fbo.height ) + 'px';

	}

	update() {

		this.renderer.autoClear = false;
		this.renderer.render( this.scene, this.camera );
		this.renderer.autoClear = true;
		this.readPixel( this.currentObj, this.currentU, this.currentV );

	}

}

THREE.FBOHelper = FBOHelper;

})();
