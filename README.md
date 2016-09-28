# THREE.FBOHelper
FrameBuffer Object inspector for three.js

# WIP

# How to use

- Include THREE.FBOHelper.js
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
