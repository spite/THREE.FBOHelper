THREE.FBOHelper = function( renderer ) {

	this.renderer = renderer;
	this.fbos = []
	this.list = document.createElement( 'ul' );
	this.list.setAttribute( 'style', 'all: initial; position: fixed; left: 0; top: 0; z-index: 1000000; width: 150px')
	document.body.appendChild( this.list );

	this.scene = new THREE.Scene();
	this.camera = new THREE.OrthographicCamera( -1, 1, 1, -1, -1000, 1000 );

	this.layer = document.createElement( 'div' );
	this.layer.setAttribute( 'style', 'position: fixed; left: 0; top: 0; right: 0; bottom: 0; display: none')
	document.body.appendChild( this.layer );

	this.layer.addEventListener( 'wheel', function( e ) {
		console.log( e );
	} );

	this.layer.addEventListener( 'mousemove', function( e ) {

		this.mouse.x = ( e.clientX / this.layer.clientWidth ) * 2 - 1;
		this.mouse.y = - ( e.clientY / this.layer.clientHeight ) * 2 + 1;
		this.raycaster.setFromCamera( this.mouse, this.camera );

		var intersects = this.raycaster.intersectObjects( this.scene.children );

		if ( intersects.length > 0 ) {

			this.readPixel( intersects[ 0 ].object, intersects[ 0 ].uv.x, intersects[ 0 ].uv.y );
			this.label.style.display = 'block';

		} else {

			this.label.style.display = 'none';

		}

	}.bind( this ) );

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

}

THREE.FBOHelper.prototype.attach = function( fbo, name ) {

	var li = document.createElement( 'li' );
	li.setAttribute( 'style', 'cursor: pointer;color: white; width: 100%; padding: 4px 0; border-top: 1px solid #888; border-bottom: 1px solid black; background-color: #444; text-align: center; text-shadow: 0 -1px black' );

	li.textContent = name;

	var width = fbo.width;
	var height = fbo.height;

	width = 600;
	height = fbo.height * width / fbo.width;

	var material = new THREE.MeshBasicMaterial( { map: fbo } );
	var quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( width, height ), material );
	quad.visible = false;
	quad.fbo = fbo;
	quad.width = width;
	quad.height = height;
	this.scene.add( quad );

	this.fbos.push( {
		name: name,
		fbo: fbo,
		li: li,
		visible: false,
		quad: quad,
		material: material
	} );

	li.addEventListener( 'click', function( e ) {
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
	}.bind( this ) );

	this.buildList();

}

THREE.FBOHelper.prototype.detach = function( fbo ) {

}

THREE.FBOHelper.prototype.hideAll = function() {

	this.fbos.forEach( function( fbo ) {
		fbo.quad.visible = false;
		fbo.li.style.backgroundColor = '#444';
	} );

}

THREE.FBOHelper.prototype.buildList = function() {

	while( this.list.firstChild ) this.list.removeChild( this.list.firstChild );

	Object.keys( this.fbos ).forEach( function( e ) {
		this.list.appendChild( this.fbos[ e ].li );
	}.bind( this ) );

}

THREE.FBOHelper.prototype.setSize = function( w, h ) {

	this.camera.left = w / - 2;
	this.camera.right = w / 2;
	this.camera.top = h / 2;
	this.camera.bottom = h / - 2;

	this.camera.updateProjectionMatrix();

}

THREE.FBOHelper.prototype.readPixel = function( obj, u, v ) {

	var fbo = obj.fbo;

	var x = ~~( fbo.width * u );
	var y = ~~( fbo.height * v );

	var pixelBuffer = new Float32Array( 4 );
	renderer.readRenderTargetPixels( fbo, x, y, 1, 1, pixelBuffer );
	this.label.innerHTML = 'X : ' + x + ' Y: ' + ( fbo.height - y ) + '<br/>R: ' + pixelBuffer[ 0 ] + ' G: ' + pixelBuffer[ 1 ] + ' B: ' + pixelBuffer[ 2 ] + ' A: ' + pixelBuffer[ 3 ];

	var ox = ~~( u * fbo.width ) * obj.width / fbo.width;
	var oy = ~~( ( 1 - v ) * fbo.height ) * obj.height / fbo.height;
	this.hotspot.style.width = ( obj.width / fbo.width ) + 'px';
	this.hotspot.style.height = ( obj.height / fbo.height ) + 'px';
	this.hotspot.style.transform = 'translate3d(' + ox + 'px, ' + oy + 'px,0)';
	this.label.style.bottom = ( obj.height / fbo.height ) + 'px';

}

THREE.FBOHelper.prototype.update = function() {

	this.renderer.autoClear = false;
	this.renderer.render( this.scene, this.camera );
	this.renderer.autoClear = true;

}
