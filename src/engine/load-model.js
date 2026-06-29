/**
 * Load a 3D model by URL, picking the loader from the file extension.
 * Supports glTF/GLB and FBX. Returns the root Object3D either way, so callers
 * (engine + admin introspection) don't care about the source format.
 */
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const extensionOf = ( url ) =>
	String( url )
		.split( '?' )[ 0 ]
		.split( '#' )[ 0 ]
		.split( '.' )
		.pop()
		.toLowerCase();

/**
 * @param {string} url Model URL.
 * @return {Promise<THREE.Object3D>} The loaded scene/root.
 */
export function loadModel( url ) {
	return new Promise( ( resolve, reject ) => {
		if ( ! url ) {
			reject( new Error( 'No model URL configured.' ) );
			return;
		}
		const ext = extensionOf( url );
		if ( ext === 'fbx' ) {
			new FBXLoader().load(
				url,
				( object ) => resolve( object ),
				undefined,
				( err ) => reject( err )
			);
		} else {
			new GLTFLoader().load(
				url,
				( gltf ) => resolve( gltf.scene ),
				undefined,
				( err ) => reject( err )
			);
		}
	} );
}
