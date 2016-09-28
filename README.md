# THREE.FBOHelper
FrameBuffer Object inspector for three.js

# WIP

![Snapshot](https://raw.githubusercontent.com/spite/THREE.FBOHelper/master/about/snapshot.jpg "Snapshot")

# How to use

- Include THREE.FBOHelper.js. There's an ES6 build and an ES5 build transpiled with babel-cli in /build.
- Create a helper linked to a WebGLRenderer
```
var helper = new THREE.FBOHelper( renderer );
````
- Call .setSize to adjust to the renderer size (don't forget to do onResize!)
```
helper.setSize( width, height );
```
- Attach WebGLRenderTargets at discretion
```
helper.attach( fieldFBO, 'Distance Field' );
helper.attach( particleFBO, 'Particles' );
```
- Update with your animation loop
```
helper.update();
```
