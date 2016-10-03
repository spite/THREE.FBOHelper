# THREE.FBOHelper
FrameBuffer Object inspector for three.js

# WIP

![Snapshot](https://raw.githubusercontent.com/spite/THREE.FBOHelper/master/about/snapshot1.jpg "Snapshot")
![Snapshot](https://raw.githubusercontent.com/spite/THREE.FBOHelper/master/about/snapshot2.jpg "Snapshot")

# How to use

- Include THREE.FBOHelper.js. There's an ES6 build and an ES5 build transpiled with babel-cli in /build.
- Create a helper linked to a WebGLRenderer
```js
var helper = new THREE.FBOHelper( renderer );
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
