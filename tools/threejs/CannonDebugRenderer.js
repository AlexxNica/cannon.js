/* global CANNON,THREE,Detector */

/**
 * Adds Three.js primitives into the scene where all the Cannon bodies and shapes are.
 * @param {THREE.Scene} scene
 * @param {CANNON.World} world
 */
THREE.CannonDebugRenderer = function(scene, world, options){
    options = options || {};

    this.scene = scene;
    this.world = world;

    this._meshes = [];

    this._solidMaterial = new THREE.MeshNormalMaterial();
    this._wireframeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });

    this._currentMaterial = this._solidMaterial;
    this._sphereGeometry = new THREE.SphereGeometry(1);
    this._boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this._wireframe = false;
    this.wireframe = options.wireframe !== undefined ? options.wireframe : false;
};

THREE.CannonDebugRenderer.prototype = {

    tmpVec0: new CANNON.Vec3(),
    tmpQuat0: new CANNON.Vec3(),

    get wireframe () {
        return this._wireframe;
    },

    set wireframe (wireframe) {
        this._wireframe = wireframe;

        var material = this._currentMaterial = wireframe ? this._wireframeMaterial : this._solidMaterial;

        // Update all meshes with the new material
        for (var i = 0; i !== this._meshes.length; i++) {
            var mesh = this._meshes[i];
            if(mesh){
                mesh.material = material;
            }
        }
    },

    update: function(){

        var bodies = this.world.bodies;
        var meshes = this._meshes;
        var shapeWorldPosition = this.tmpVec0;
        var shapeWorldQuaternion = this.tmpQuat0;

        var meshIndex = 0;

        for (var i = 0; i !== bodies.length; i++) {
            var body = bodies[i];

            for (var j = 0; j !== body.shapes.length; j++) {
                var shape = body.shapes[j];

                this._updateMesh(meshIndex, body, shape);

                var mesh = meshes[meshIndex];

                if(mesh){

                    // Get world position
                    body.quaternion.vmult(body.shapeOffsets[j], shapeWorldPosition);
                    body.position.vadd(shapeWorldPosition, shapeWorldPosition);

                    // Get world quaternion
                    body.quaternion.mult(body.shapeOrientations[j], shapeWorldQuaternion);

                    // Copy to meshes
                    mesh.position.copy(shapeWorldPosition);
                    mesh.quaternion.copy(shapeWorldQuaternion);
                }

                meshIndex++;
            }
        }

        for(var i = meshIndex; i < meshes.length; i++){
            var mesh = meshes[i];
            if(mesh){
                this.scene.remove(mesh);
            }
        }

        meshes.length = meshIndex;
    },

    _updateMesh: function(index, body, shape){
        var mesh = this._meshes[index];
        if(!this._typeMatch(mesh, shape)){
            mesh = this._meshes[index] = this._createMesh(shape);
        }
        this._scaleMesh(mesh, shape);
    },

    _typeMatch: function(mesh, shape){
        if(!mesh){
            return false;
        }
        var geo = mesh.geometry;
        return (
            (geo instanceof THREE.SphereGeometry && shape instanceof CANNON.Sphere) ||
            (geo instanceof THREE.BoxGeometry && shape instanceof CANNON.Box)
        );
    },

    _createMesh: function(shape){
        var mesh;
        var material = this._currentMaterial;

        switch(shape.type){

        case CANNON.Shape.types.SPHERE:
            mesh = new THREE.Mesh(this._sphereGeometry, material);
            break;

        case CANNON.Shape.types.BOX:
            mesh = new THREE.Mesh(this._boxGeometry, material);
            break;
        }

        if(mesh){
            this.scene.add(mesh);
        }

        return mesh;
    },

    _scaleMesh: function(mesh, shape){
        switch(shape.type){

        case CANNON.Shape.types.SPHERE:
            var radius = shape.radius;
            mesh.scale.set(radius, radius, radius);
            break;

        case CANNON.Shape.types.BOX:
            mesh.scale.copy(shape.halfExtents);
            mesh.scale.multiplyScalar(2);
            break;

        }
    }
};