import * as THREE from 'three';

const layerCSS = `
#fboh-fbos-list{
	all: unset;
	position: fixed;
	left: 0;
	top: 0;
	z-index: 1000000;
	width: 150px;
	max-height: 100%;
	overflow-y: auto;
	list-style: none;
}
#fboh-grid{
	position: fixed;
	z-index: 1;
	display: none;
	outline: 1px solid black;
	box-shadow: 0 0 50px black;
	cursor: crosshair;
	touch-action: none;
}
#fboh-fbos-list, #fboh-grid, #fboh-info{
	user-select: none;
	-webkit-user-select: none;
}
#fboh-fbos-list, #fboh-fbos-list *, #fboh-hotspot, #fboh-label, #fboh-info, #fboh-info *{
	box-sizing: border-box;
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
	font-size: 12px;
	font-weight: 400;
	font-variant-numeric: tabular-nums;
	line-height: 1.5em;
}
#fboh-fbos-list li{
	display: block;
	margin: 0;
	cursor: pointer;
	color: white;
	width: 100%;
	padding: 4px 0;
	border-top: 1px solid #888;
	border-bottom: 1px solid black;
	background-color: #444;
	text-align: center;
	text-shadow: 0 -1px black;
}
#fboh-fbos-list li:hover{
	background-color: rgba( 158, 253, 56, .5 );
}
#fboh-fbos-list li.active{
	background-color: rgba( 158, 253, 56, .5 );
	color: white;
	text-shadow: 0 1px black;
}
#fboh-hotspot.pinned{
	outline: 2px solid white;
	box-shadow: 0 0 0 3px black;
}
#fboh-hotspot{
	position: absolute;
	left: 0;
	top: 0;
	background-color: rgba( 158, 253, 56,.5);
	pointer-events: none;
}
#fboh-label{
	position: fixed;
	z-index: 999999;
	pointer-events: none;
}
#fboh-info{
	display: none;
	position: fixed;
	z-index: 999999;
	left: 160px;
	top: 10px;
	pointer-events: none;
}
#fboh-channels{
	display: flex;
	gap: 4px;
	margin-top: 8px;
	pointer-events: auto;
}
#fboh-channels button{
	all: unset;
	cursor: pointer;
	padding: 2px 8px;
	border: 1px solid black;
	background-color: #eee;
}
#fboh-channels button.active{
	background-color: rgb( 158, 253, 56 );
}
.fboh-tag{
	display: inline-block;
	width: 1.35em;
	height: 1.35em;
	line-height: 1.35em;
	border-radius: 2px;
	text-align: center;
	vertical-align: baseline;
	font-weight: 700;
	color: white;
}
.fboh-tag-r{ background-color: #d0261c; }
.fboh-tag-g{ background-color: #1a8a1a; }
.fboh-tag-b{ background-color: #1f55d6; }
.fboh-tag-a{ background-color: #6b6b6b; }
.fboh-card{
	display: block;
	white-space: nowrap;
	color: black;
	padding: 10px;
	background-color: white;
	border: 1px solid black;
}
`;

// names of the three.js constants, for the info card
const formats = {}, types = {};

for ( const name in THREE ) {

	if ( typeof THREE[ name ] !== 'number' ) continue;
	if ( /Format$/.test( name ) && formats[ THREE[ name ] ] === undefined ) formats[ THREE[ name ] ] = 'THREE.' + name;
	if ( /Type$/.test( name ) && ! /ShadowMap|Transform/.test( name ) && types[ THREE[ name ] ] === undefined ) types[ THREE[ name ] ] = 'THREE.' + name;

}

const buffers = {
	[ THREE.UnsignedByteType ]: Uint8Array,
	[ THREE.ByteType ]: Int8Array,
	[ THREE.ShortType ]: Int16Array,
	[ THREE.UnsignedShortType ]: Uint16Array,
	[ THREE.IntType ]: Int32Array,
	[ THREE.UnsignedIntType ]: Uint32Array,
	[ THREE.FloatType ]: Float32Array,
	[ THREE.HalfFloatType ]: Uint16Array
};

const WIDTH = 600;

const fragmentShader = /* glsl */`

	uniform sampler2D map;
	uniform vec4 rangeMin;
	uniform vec4 rangeMax;
	uniform vec4 signedChannels;
	uniform vec4 pick;

	varying vec2 vUv;

	void main() {

		vec4 texel = texture2D( map, vUv );

		// a range is shown from black to full, a range that crosses zero by how far the value is from zero
		vec4 ranged = ( texel - rangeMin ) / ( rangeMax - rangeMin );
		vec4 around = texel / max( abs( rangeMin ), abs( rangeMax ) );

		vec3 color = mix( ranged, abs( around ), signedChannels ).rgb;

		// one channel alone: grey, or blue below zero and orange above it
		if ( dot( pick, vec4( 1.0 ) ) > 0.0 ) {

			float value = dot( around, pick );
			vec3 diverging = value > 0.0 ? value * vec3( 1.0, 0.55, 0.1 ) : - value * vec3( 0.1, 0.55, 1.0 );

			color = mix( vec3( dot( ranged, pick ) ), diverging, dot( signedChannels, pick ) );

		}

		gl_FragColor = vec4( color, 1.0 );

	}

`;

const CHANNELS = [ 'r', 'g', 'b', 'a' ];

// the channel a value comes from, as a square in its color
function tag( channel ) {

	return `<span class="fboh-tag fboh-tag-${channel}">${channel.toUpperCase()}</span>`;

}

// the range that holds all the values of a channel but the lowest and the highest 1%
function robustRange( pixels, channel, decode, min, max ) {

	const bins = 1024, histogram = new Uint32Array( bins ), total = pixels.length / 4;
	let low = min, high = max;

	// a few outliers can make the first histogram too coarse, so it is narrowed down
	for ( let pass = 0; pass < 3 && high > low; pass ++ ) {

		const scale = bins / ( high - low );
		let below = 0;

		histogram.fill( 0 );

		for ( let i = channel; i < pixels.length; i += 4 ) {

			const value = decode( pixels[ i ] );

			if ( value < low ) below ++;
			else if ( value <= high ) histogram[ Math.min( bins - 1, Math.floor( ( value - low ) * scale ) ) ] ++;

		}

		let sum = below, first = - 1, last = bins - 1;

		for ( let bin = 0; bin < bins; bin ++ ) {

			sum += histogram[ bin ];

			if ( first === - 1 && sum >= total * .01 ) first = bin;
			if ( sum >= total * .99 ) { last = bin; break; }

		}

		const width = ( high - low ) / bins;
		const narrowed = ( last + 1 - Math.max( 0, first ) ) / bins < .5;

		high = low + ( last + 1 ) * width;
		low = low + Math.max( 0, first ) * width;

		if ( ! narrowed ) break;

	}

	return [ low, high ];

}

// short enough to read, precise enough to be useful
function format( value ) {

	return Number.isInteger( value ) ? String( value ) : String( + value.toPrecision( 5 ) );

}

class FBOHelper {

	constructor( renderer ) {

		this.renderer = renderer;
		this.autoUpdate = true;
		this.keyboard = true;
		this.fbos = [];

		this.scene = new THREE.Scene();
		this.camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, - 1, 1 );

		this.currentObj = null;
		this.currentU = 0;
		this.currentV = 0;

		this.offsetX = 0;
		this.offsetY = 0;

		this.pointerX = 0;
		this.pointerY = 0;

		this.frame = 0;

		// the texel that keeps being read wherever the pointer is, as { obj, u, v }
		this.pinned = null;

		this.style = document.createElement( 'style' );
		this.style.textContent = layerCSS;
		document.head.appendChild( this.style );

		this.list = document.createElement( 'ul' );
		this.list.setAttribute( 'id', 'fboh-fbos-list' );
		document.body.appendChild( this.list );

		this.grid = document.createElement( 'div' );
		this.grid.setAttribute( 'id', 'fboh-grid' );
		document.body.appendChild( this.grid );

		this.hotspot = document.createElement( 'div' );
		this.hotspot.setAttribute( 'id', 'fboh-hotspot' );
		this.grid.appendChild( this.hotspot );

		this.label = document.createElement( 'div' );
		this.label.setAttribute( 'id', 'fboh-label' );
		this.label.className = 'fboh-card';
		this.label.style.display = 'none';
		document.body.appendChild( this.label );

		this.info = document.createElement( 'div' );
		this.info.setAttribute( 'id', 'fboh-info' );
		this.info.className = 'fboh-card';
		document.body.appendChild( this.info );

		this.infoText = document.createElement( 'div' );
		this.info.appendChild( this.infoText );

		this.channelBar = document.createElement( 'div' );
		this.channelBar.setAttribute( 'id', 'fboh-channels' );
		this.info.appendChild( this.channelBar );

		[ 'rgb', ...CHANNELS ].forEach( channel => {

			const button = document.createElement( 'button' );
			button.type = 'button';
			button.textContent = channel.toUpperCase();
			button.dataset.channel = channel;
			button.addEventListener( 'click', () => {

				if ( this.currentObj !== null ) this.showChannel( this.currentObj, channel );

			} );
			this.channelBar.appendChild( button );

		} );

		this.listeners = new AbortController();
		const signal = this.listeners.signal;

		this.grid.addEventListener( 'wheel', e => {

			e.preventDefault();

			// proportional to the scroll, and around the point under the pointer
			const delta = e.deltaY * ( e.deltaMode === 1 ? 16 : 1 );
			const before = this.camera.zoom;
			const zoom = Math.min( 64, Math.max( .1, before * Math.exp( - delta * .0015 ) ) );

			const rect = this.renderer.domElement.getBoundingClientRect();
			const px = e.clientX - ( rect.left + rect.width / 2 );
			const py = e.clientY - ( rect.top + rect.height / 2 );

			this.offsetX += px / zoom - px / before;
			this.offsetY += py / zoom - py / before;
			this.camera.zoom = zoom;

			this.transformGrid();
			this.refresh();

		}, { signal, passive: false } );

		let dragging = false;
		const pointerStart = { x: 0, y: 0 };
		const offsetStart = { x: 0, y: 0 };

		this.grid.addEventListener( 'pointerdown', e => {

			e.preventDefault();
			this.grid.setPointerCapture( e.pointerId );

			dragging = true;
			pointerStart.x = e.clientX;
			pointerStart.y = e.clientY;
			offsetStart.x = this.offsetX;
			offsetStart.y = this.offsetY;

		}, { signal } );

		this.grid.addEventListener( 'pointerup', e => {

			// a click, not a drag: pins the texel under it, or releases it
			if ( dragging && this.currentObj !== null && Math.hypot( e.clientX - pointerStart.x, e.clientY - pointerStart.y ) < 4 ) {

				const rect = this.grid.getBoundingClientRect();
				const size = this.getSize( this.currentObj );
				const x = Math.floor( ( e.clientX - rect.left ) / rect.width * size.width );
				const y = Math.floor( ( 1 - ( e.clientY - rect.top ) / rect.height ) * size.height );
				const same = this.pinned !== null && Math.floor( this.pinned.u * size.width ) === x && Math.floor( this.pinned.v * size.height ) === y;

				if ( same ) this.unpin(); else this.pin( this.currentObj.fbo, x, y );

			}

			dragging = false;

		}, { signal } );

		this.grid.addEventListener( 'pointercancel', () => {

			dragging = false;

		}, { signal } );

		this.grid.addEventListener( 'pointerleave', () => {

			if ( this.pinned === null ) this.label.style.display = 'none';

		}, { signal } );

		this.grid.addEventListener( 'dblclick', () => this.resetView(), { signal } );

		this.grid.addEventListener( 'pointermove', e => {

			if ( this.currentObj === null ) return;

			this.pointerX = e.clientX;
			this.pointerY = e.clientY;

			if ( dragging ) {

				this.offsetX = offsetStart.x + ( e.clientX - pointerStart.x ) / this.camera.zoom;
				this.offsetY = offsetStart.y + ( e.clientY - pointerStart.y ) / this.camera.zoom;
				this.transformGrid();
				this.refresh();

			} else if ( this.pinned === null ) {

				// the grid sits exactly over the quad, zoom and pan included
				const rect = this.grid.getBoundingClientRect();
				const u = ( e.clientX - rect.left ) / rect.width;
				const v = 1 - ( e.clientY - rect.top ) / rect.height;

				if ( u >= 0 && u < 1 && v >= 0 && v < 1 ) {

					this.label.style.display = 'block';
					this.readPixel( this.currentObj, u, v );

				} else {

					this.label.style.display = 'none';

				}

			}

		}, { signal } );

		window.addEventListener( 'keydown', e => {

			// only while the viewer is open, and never while typing or with a shortcut of the browser
			if ( ! this.keyboard || this.currentObj === null || e.ctrlKey || e.metaKey || e.altKey ) return;
			if ( e.target instanceof Element && e.target.closest( 'input, textarea, select, [contenteditable]' ) ) return;

			const order = [ 'rgb', ...CHANNELS ];
			const key = e.key.toLowerCase();

			if ( key === 'escape' ) this.hide();
			else if ( key === 'arrowdown' ) this.step( 1 );
			else if ( key === 'arrowup' ) this.step( - 1 );
			else if ( key === 'arrowright' ) this.showChannel( this.currentObj, order[ ( order.indexOf( this.currentObj.channel ) + 1 ) % order.length ] );
			else if ( key === 'arrowleft' ) this.showChannel( this.currentObj, order[ ( order.indexOf( this.currentObj.channel ) + order.length - 1 ) % order.length ] );
			else if ( CHANNELS.includes( key ) ) this.showChannel( this.currentObj, key );
			else if ( key === 'c' ) this.showChannel( this.currentObj, 'rgb' );
			else if ( key === '0' ) this.resetView();
			else return;

			e.preventDefault();

		}, { signal } );

		const size = renderer.getSize( new THREE.Vector2() );
		this.setSize( size.x, size.y );
		this.placeGrid();

	}

	// keeps the viewer over the canvas, wherever it is in the page and whatever its size
	placeGrid() {

		const rect = this.renderer.domElement.getBoundingClientRect();

		if ( rect.width === 0 || rect.height === 0 ) return;

		if ( rect.width !== this.width || rect.height !== this.height ) this.setSize( rect.width, rect.height );

		const obj = this.currentObj;

		if ( obj === null ) return;

		const zoom = this.camera.zoom;
		const width = obj.width * zoom;
		const height = obj.height * zoom;

		this.grid.style.width = width + 'px';
		this.grid.style.height = height + 'px';
		this.grid.style.left = ( rect.left + rect.width / 2 + this.offsetX * zoom - width / 2 ) + 'px';
		this.grid.style.top = ( rect.top + rect.height / 2 + this.offsetY * zoom - height / 2 ) + 'px';

	}

	transformGrid() {

		this.camera.position.x = - this.offsetX;
		this.camera.position.y = this.offsetY;
		this.camera.updateProjectionMatrix();

		this.placeGrid();

	}

	resetView() {

		this.offsetX = 0;
		this.offsetY = 0;
		this.camera.zoom = 1;
		this.transformGrid();
		this.refresh();

	}

	// opens the next target of the list, or the previous one
	step( direction ) {

		const count = this.fbos.length;

		if ( count === 0 ) return;

		const index = this.currentObj === null ? ( direction > 0 ? - 1 : 0 ) : this.fbos.indexOf( this.currentObj );

		this.open( this.fbos[ ( index + direction + count ) % count ] );

	}

	// opens the viewer on a target
	show( f ) {

		const fboData = this.fbos.find( fbo => fbo.fbo === f );

		if ( fboData ) this.open( fboData );

	}

	open( fboData ) {

		if ( this.currentObj === fboData ) return;

		this.unpin();
		this.hideAll();
		fboData.quad.visible = true;
		fboData.li.classList.add( 'active' );
		this.currentObj = fboData;
		this.refreshFBO( fboData.fbo );

		// nothing is under the pointer yet in this target
		this.label.style.display = 'none';
		this.hotspot.style.width = this.hotspot.style.height = 0;

		this.measure( fboData.fbo );
		this.info.style.display = 'block';
		this.grid.style.display = 'block';

	}

	// reads again whatever the label is showing
	refresh() {

		if ( this.pinned !== null ) this.readPixel( this.pinned.obj, this.pinned.u, this.pinned.v );
		else this.readPixel( this.currentObj, this.currentU, this.currentV );

	}

	// keeps reading one texel of a target, wherever the pointer goes
	pin( f, x, y ) {

		const obj = this.currentObj !== null && this.currentObj.fbo === f ? this.currentObj : this.fbos.find( fbo => fbo.fbo === f );

		if ( ! obj ) return;

		const size = this.getSize( obj );

		this.pinned = { obj, u: ( x + .5 ) / size.width, v: ( y + .5 ) / size.height };
		this.hotspot.classList.add( 'pinned' );

		if ( this.currentObj === obj ) {

			this.label.style.display = 'block';
			this.refresh();

		}

	}

	unpin() {

		this.pinned = null;
		this.hotspot.classList.remove( 'pinned' );
		this.label.style.display = 'none';

	}

	hide() {

		this.unpin();
		this.hideAll();
		this.label.style.display = 'none';
		this.info.style.display = 'none';
		this.grid.style.display = 'none';
		this.currentObj = null;

	}

	attach( fbo, name, options = {} ) {

		if ( typeof options === 'function' ) options = { formatter: options };

		const texture = fbo.isTexture ? fbo : fbo.texture;

		if ( fbo.isWebGLCubeRenderTarget || texture.isCubeTexture || texture.isData3DTexture || texture.isDataArrayTexture ) {

			throw new Error( 'THREE.FBOHelper: only 2D textures and render targets can be attached' );

		}

		const li = document.createElement( 'li' );
		li.textContent = name;

		// shows the values as they are stored, with no tone mapping or color conversion, mapped from the range to 0..1
		const material = new THREE.ShaderMaterial( {
			uniforms: {
				map: { value: texture },
				rangeMin: { value: new THREE.Vector4( 0, 0, 0, 0 ) },
				rangeMax: { value: new THREE.Vector4( 1, 1, 1, 1 ) },
				signedChannels: { value: new THREE.Vector4( 0, 0, 0, 0 ) },
				pick: { value: new THREE.Vector4( 0, 0, 0, 0 ) }
			},
			vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
			fragmentShader,
			depthTest: false,
			depthWrite: false
		} );

		const quad = new THREE.Mesh( new THREE.PlaneGeometry( 1, 1 ), material );
		quad.visible = false;
		this.scene.add( quad );

		const fboData = {
			name, fbo, texture, li, quad, material,
			formatter: options.formatter,
			channels: options.channels || {},
			range: options.range,
			signed: options.signed,
			outliers: options.outliers === true,
			channel: 'rgb',
			stats: null,
			width: 0, height: 0
		};
		this.fbos.push( fboData );
		this.refreshFBO( fbo );
		this.applyRange( fboData );
		if ( options.channel ) this.showChannel( fboData, options.channel );

		li.addEventListener( 'click', () => {

			if ( this.currentObj === fboData ) this.hide(); else this.open( fboData );

		} );

		this.buildList();

	}

	detach( f ) {

		const fboData = this.fbos.find( fbo => fbo.fbo === f );

		if ( ! fboData ) return;

		if ( this.currentObj === fboData ) this.hide();
		if ( this.pinned !== null && this.pinned.obj === fboData ) this.unpin();

		this.fbos.splice( this.fbos.indexOf( fboData ), 1 );
		this.scene.remove( fboData.quad );
		fboData.quad.geometry.dispose();
		fboData.material.dispose();

		this.buildList();

	}

	// the range of a channel as [ min, max ]: given, measured, or 0..1
	getRange( fboData, channel ) {

		const range = fboData.range;
		const i = CHANNELS.indexOf( channel );

		// an automatic range leaves the outliers out, unless the target asks for them
		const stats = fboData.stats;
		const measured = ! stats ? [ 0, 1 ] : fboData.outliers ? [ stats.min[ i ], stats.max[ i ] ] : [ stats.low[ i ], stats.high[ i ] ];

		if ( range === 'auto' ) return measured;
		if ( Array.isArray( range ) ) return range;
		if ( range && range[ channel ] === 'auto' ) return measured;
		if ( range && range[ channel ] ) return range[ channel ];

		return [ 0, 1 ];

	}

	applyRange( fboData ) {

		const uniforms = fboData.material.uniforms;

		CHANNELS.forEach( ( channel, i ) => {

			const [ min, max ] = this.getRange( fboData, channel );
			uniforms.rangeMin.value.setComponent( i, min );
			uniforms.rangeMax.value.setComponent( i, max > min ? max : min + 1 );
			uniforms.signedChannels.value.setComponent( i, this.isSigned( fboData, channel ) ? 1 : 0 );

		} );

	}

	// values on both sides of zero are shown by sign, unless the target says otherwise
	isSigned( fboData, channel ) {

		if ( fboData.signed !== undefined ) return fboData.signed === true || ( !! fboData.signed && fboData.signed[ channel ] === true );

		const [ min, max ] = this.getRange( fboData, channel );

		return min < 0 && max > 0;

	}

	// which channel the picture shows: 'rgb', 'r', 'g', 'b' or 'a'
	setChannel( f, channel ) {

		for ( const fboData of this.fbos ) {

			if ( fboData.fbo === f ) this.showChannel( fboData, channel );

		}

	}

	showChannel( fboData, channel ) {

		fboData.channel = channel;

		const i = CHANNELS.indexOf( channel );
		fboData.material.uniforms.pick.value.set( i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0, i === 3 ? 1 : 0 );

		if ( this.currentObj === fboData ) this.updateInfo();

	}

	updateInfo() {

		const current = this.currentObj;

		if ( current === null ) return;

		const size = this.getSize( current );
		const stats = current.stats;
		// "[R] position x", or just "[R]" for a channel without a name
		const name = channel => current.channels[ channel ] ? `${tag( channel )} ${current.channels[ channel ]}` : tag( channel );
		const colon = channel => current.channels[ channel ] ? ':' : '';

		let html = `Width: ${size.width} Height: ${size.height}<br/>Format: ${formats[ current.texture.format ]} Type: ${types[ current.texture.type ]}`;

		if ( stats ) {

			CHANNELS.forEach( ( channel, i ) => {

				html += `<br/>${name( channel )}${colon( channel )} ${format( stats.min[ i ] )} to ${format( stats.max[ i ] )}`;

			} );

		}

		const shown = current.channel === 'rgb' ? CHANNELS.slice( 0, 3 ) : [ current.channel ];

		html += '<br/><br/>Showing:' + shown.map( channel => {

			const [ min, max ] = this.getRange( current, channel );

			return '<br/>' + ( this.isSigned( current, channel ) ?
				`${name( channel )} by sign, up to ${format( Math.max( Math.abs( min ), Math.abs( max ) ) )}` :
				`${name( channel )} from ${format( min )} to ${format( max )}` );

		} ).join( '' );

		if ( current.channel !== 'rgb' && this.isSigned( current, current.channel ) ) html += '<br/>Blue is below zero, orange above';

		this.infoText.innerHTML = html;

		for ( const button of this.channelBar.children ) {

			button.classList.toggle( 'active', button.dataset.channel === current.channel );
			button.title = button.dataset.channel === 'rgb' ? 'the first three channels as a color' : ( current.channels[ button.dataset.channel ] || button.dataset.channel.toUpperCase() );

		}

	}

	// reads the whole render target and finds the smallest and largest value of each channel
	measure( f ) {

		// the same target can be attached more than once, with a different reading of it
		const entries = this.fbos.filter( fbo => fbo.fbo === f );
		const fboData = entries[ 0 ];

		if ( ! fboData ) return null;

		const size = this.getSize( fboData );
		const Buffer = buffers[ fboData.texture.type ];

		let stats = null;

		if ( ! f.isTexture && Buffer !== undefined ) {

			const pixels = new Buffer( size.width * size.height * 4 );
			this.renderer.readRenderTargetPixels( f, 0, 0, size.width, size.height, pixels );

			const decode = fboData.texture.type === THREE.HalfFloatType ? THREE.DataUtils.fromHalfFloat : value => value;
			const min = [ Infinity, Infinity, Infinity, Infinity ];
			const max = [ - Infinity, - Infinity, - Infinity, - Infinity ];

			for ( let i = 0; i < pixels.length; i ++ ) {

				const value = decode( pixels[ i ] );

				// leaves NaN and infinities out
				if ( value - value !== 0 ) continue;

				if ( value < min[ i & 3 ] ) min[ i & 3 ] = value;
				if ( value > max[ i & 3 ] ) max[ i & 3 ] = value;

			}

			const low = [], high = [];

			CHANNELS.forEach( ( channel, i ) => {

				if ( ! ( max[ i ] >= min[ i ] ) ) min[ i ] = max[ i ] = 0;

				[ low[ i ], high[ i ] ] = robustRange( pixels, i, decode, min[ i ], max[ i ] );

			} );

			stats = { min, max, low, high };

		}

		for ( const entry of entries ) {

			entry.stats = stats;
			this.applyRange( entry );

		}

		if ( this.currentObj !== null && this.currentObj.fbo === f ) this.updateInfo();

		return stats;

	}

	getSize( fboData ) {

		const image = fboData.fbo.isTexture ? fboData.texture.image : fboData.fbo;

		// a texture that hasn't loaded yet has no image
		if ( ! image ) return { width: 1, height: 1 };

		return { width: image.videoWidth || image.width || 1, height: image.videoHeight || image.height || 1 };

	}

	refreshFBO( f ) {

		for ( const fbo of this.fbos ) {

			if ( fbo.fbo !== f ) continue;

			const size = this.getSize( fbo );
			fbo.width = WIDTH;
			fbo.height = size.height * WIDTH / size.width;
			fbo.quad.scale.set( fbo.width, fbo.height, 1 );

			if ( this.currentObj === fbo ) this.placeGrid();

		}

	}

	hideAll() {

		this.fbos.forEach( fbo => {

			fbo.quad.visible = false;
			fbo.li.classList.remove( 'active' );

		} );

	}

	buildList() {

		while ( this.list.firstChild ) this.list.removeChild( this.list.firstChild );

		for ( const fbo of this.fbos ) {

			this.list.appendChild( fbo.li );

		}

	}

	setSize( w, h ) {

		this.width = w;
		this.height = h;

		this.camera.left = w / - 2;
		this.camera.right = w / 2;
		this.camera.top = h / 2;
		this.camera.bottom = h / - 2;

		this.camera.updateProjectionMatrix();

	}

	readPixel( obj, u, v ) {

		this.currentU = u;
		this.currentV = v;

		if ( this.currentObj === null || obj === null ) return;

		const size = this.getSize( obj );
		const x = Math.min( size.width - 1, Math.floor( size.width * u ) );
		const y = Math.min( size.height - 1, Math.floor( size.height * v ) );

		const posTxt = `X : ${x} Y: ${y} u: ${u.toFixed( 3 )} v: ${v.toFixed( 3 )}`;
		let dataTxt;

		const Buffer = buffers[ obj.texture.type ];

		if ( obj.fbo.isTexture ) {

			dataTxt = 'Only render targets can be read';

		} else if ( Buffer === undefined ) {

			dataTxt = types[ obj.texture.type ] + ' can not be read';

		} else {

			const pixelBuffer = new Buffer( 4 );
			this.renderer.readRenderTargetPixels( obj.fbo, x, y, 1, 1, pixelBuffer );

			const pixel = obj.texture.type === THREE.HalfFloatType ? Array.from( pixelBuffer, THREE.DataUtils.fromHalfFloat ) : pixelBuffer;

			const named = Object.keys( obj.channels ).length > 0;

			if ( obj.formatter ) {

				dataTxt = obj.formatter( { x, y, u, v, r: pixel[ 0 ], g: pixel[ 1 ], b: pixel[ 2 ], a: pixel[ 3 ] } );

			} else if ( named ) {

				// one line per channel that has a name
				dataTxt = CHANNELS.filter( channel => obj.channels[ channel ] ).map( channel => `${tag( channel )} ${obj.channels[ channel ]}: ${format( pixel[ CHANNELS.indexOf( channel ) ] )}` ).join( '<br/>' );

			} else {

				dataTxt = CHANNELS.map( ( channel, i ) => `${tag( channel )} ${format( pixel[ i ] )}` ).join( ' ' );

			}

		}

		const pinned = this.pinned !== null && this.pinned.obj === obj;

		this.label.innerHTML = `${posTxt}<br/>${dataTxt}` + ( pinned ? '<br/>Pinned, click it again to release' : '' );

		const zoom = this.camera.zoom;
		const texelWidth = obj.width * zoom / size.width;
		const texelHeight = obj.height * zoom / size.height;

		this.hotspot.style.width = `${texelWidth}px`;
		this.hotspot.style.height = `${texelHeight}px`;
		this.hotspot.style.transform = `translate3d(${x * texelWidth}px,${( size.height - 1 - y ) * texelHeight}px,0)`;

		// next to the pointer, or to the texel when it is pinned: above and to the right unless that would leave the window
		let anchorX = this.pointerX, anchorY = this.pointerY;

		if ( pinned ) {

			const rect = this.hotspot.getBoundingClientRect();
			anchorX = rect.right;
			anchorY = rect.top;

		}

		const width = this.label.offsetWidth, height = this.label.offsetHeight;
		let left = anchorX + 12, top = anchorY - height - 12;

		if ( left + width > window.innerWidth ) left = anchorX - width - 12;
		if ( top < 0 ) top = anchorY + 12;

		this.label.style.left = Math.max( 0, left ) + 'px';
		this.label.style.top = Math.max( 0, top ) + 'px';

	}

	update() {

		if ( this.currentObj === null ) return;

		this.placeGrid();

		const renderer = this.renderer;
		const renderTarget = renderer.getRenderTarget();
		const cubeFace = renderer.getActiveCubeFace();
		const mipmapLevel = renderer.getActiveMipmapLevel();
		const autoClear = renderer.autoClear;

		renderer.autoClear = false;
		renderer.setRenderTarget( null );
		renderer.render( this.scene, this.camera );
		renderer.setRenderTarget( renderTarget, cubeFace, mipmapLevel );
		renderer.autoClear = autoClear;

		// the label follows the contents of the target, without having to move the pointer
		if ( this.pinned !== null || ( this.autoUpdate && this.label.style.display === 'block' ) ) this.refresh();

		// an automatic range follows the contents, as long as reading them all is cheap
		const size = this.getSize( this.currentObj );

		const range = this.currentObj.range;
		const automatic = range === 'auto' || ( !! range && ! Array.isArray( range ) && CHANNELS.some( channel => range[ channel ] === 'auto' ) );

		if ( automatic && size.width * size.height <= 1048576 && ++ this.frame % 30 === 0 ) this.measure( this.currentObj.fbo );

	}

	dispose() {

		this.listeners.abort();

		this.fbos.slice().forEach( fbo => this.detach( fbo.fbo ) );

		this.list.remove();
		this.grid.remove();
		this.label.remove();
		this.info.remove();
		this.style.remove();

	}

}

export { FBOHelper };
