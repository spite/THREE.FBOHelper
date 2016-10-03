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
- Update with your animation loop
```js
helper.update();
```
