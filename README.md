# THREE.FBOHelper
FrameBuffer Object inspector for three.js

####Check out a demo here: [Goth GPU Physics](https://www.clicktorelease.com/code/THREE.FBOHelper/#512)
<a href="https://www.clicktorelease.com/code/THREE.FBOHelper/" ><img src="https://raw.githubusercontent.com/spite/THREE.FBOHelper/master/about/demo.jpg" alt="Demo"/></a>
# Screenshots

<table>
<tr>
<td><img src="https://raw.githubusercontent.com/spite/THREE.FBOHelper/master/about/snapshot1.jpg" alt="Snapshot"/>Position buffer</td>
<td><img src="https://raw.githubusercontent.com/spite/THREE.FBOHelper/master/about/snapshot2.jpg" alt="Snapshot"/>Motion blur buffer</td>
</tr>
<tr>
<td><img src="https://raw.githubusercontent.com/spite/THREE.FBOHelper/master/about/snapshot3.jpg" alt="Snapshot"/>Shadow map buffer</td>
<td><img src="https://raw.githubusercontent.com/spite/THREE.FBOHelper/master/about/snapshot4.jpg" alt="Snapshot"/>Position buffer</td>
</tr>
</table>

# How to use

- Include THREE.FBOHelper.js. There's an ES6 build and an ES5 build transpiled with babel-cli in /build.
- Create a helper linked to a WebGLRenderer
```js
var helper = new FBOHelper( renderer );
```
or use npm to install the package:
```
npm i three.fbo-helper
```
and include it in your code (remember to include three.js too)
```js
var THREE = require( 'three' );
var FBOHelper = require( 'three.fbo-helper' );
```
- Call .setSize to adjust to the renderer size (don't forget to do onResize!)
```js
helper.setSize( width, height );
```
- Attach WebGLRenderTargets at discretion
```js
helper.attach( fieldFBO, 'Distance Field' );
helper.attach( particleFBO, 'Particles' );
```
```attach()``` admits a third parameters, ```formatter```, a function that will receive an object with the values of the current point ```x```, ```y```, ```u```, ```v```, ```r```, ```g```, ```b```, and ```a```. You can return a custom string in case you want to show a different caption in the label. Otherwise, it will show all the values. 
Example:
```js
helper.attach( buffer, 'Particles', function( d ) {
  return `Position: (${d.x}, ${d.y}, ${d.z}) | Life: ${d.a}`;
} );
```
- Update with your animation loop
```js
helper.update();
```
- If for any reason you resize the FBO, call:
```js
helper.refreshFBO( fbo );
````

- Call ```.detach``` to remove any fbo previously attached
```js
helper.deatch( fbo );
````

Once the helper is working, you can select FBOs to inspect, and drag the viewer around and use the scroll/mousewheel to zoom in and out.

#### License ####

MIT licensed

Copyright (C) 2016 Jaume Sanchez Elias, http://www.clicktorelease.com

