/**
 * Framework-agnostic 3D configurator engine.
 *
 * Generalised from the open-source mini-configurator core (MIT, Steil Digital):
 * instead of building a fixed chair from primitives, it loads a GLB model and
 * recolours named "parts" by sharing a material across the meshes that match
 * each part. It knows nothing about WordPress or the DOM controls — the block's
 * view script builds the UI from the config and drives the scene through this API.
 *
 * createConfigurator(canvas, config) -> {
 *   ready,                       // Promise resolved once the model is in the scene
 *   setColor(partKey, name),
 *   setFinish(name),
 *   reset(),
 *   getState(),                  // { parts: {key: colourName}, finish }
 *   onChange(fn),                // subscribe; returns unsubscribe
 *   screenshot(),                // PNG data URL of the current view
 *   dispose(),
 * }
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const hexToInt = ( hex ) => parseInt( String( hex ).replace( '#', '' ), 16 ) || 0x999999;

const colourOf = ( part, name ) => {
	const swatch =
		part.palette.find( ( c ) => c.name === name ) || part.palette[ 0 ];
	return swatch ? hexToInt( swatch.hex ) : 0x999999;
};

/**
 * Decide which part (if any) a mesh belongs to.
 *
 * @param {THREE.Mesh} mesh  The mesh.
 * @param {Array}      parts Configured parts.
 * @return {Object|null} Matching part or null.
 */
function partForMesh( mesh, parts ) {
	const haystacks = [
		mesh.name,
		mesh.material && mesh.material.name,
		mesh.parent && mesh.parent.name,
	]
		.filter( Boolean )
		.map( ( s ) => s.toLowerCase() );

	for ( const part of parts ) {
		const needles =
			part.match && part.match.length ? part.match : [ part.key ];
		for ( const needle of needles ) {
			const n = String( needle ).toLowerCase();
			if ( haystacks.some( ( h ) => h.includes( n ) ) ) {
				return part;
			}
		}
	}
	return null;
}

export function createConfigurator( canvas, config ) {
	const parts = Array.isArray( config.parts ) ? config.parts : [];
	const finishes = config.finishes || {};
	const finishKeys = Object.keys( finishes );
	const defaultFinish =
		config.defaultFinish && finishes[ config.defaultFinish ]
			? config.defaultFinish
			: finishKeys[ 0 ] || 'matte';

	const state = { parts: {}, finish: defaultFinish };
	parts.forEach( ( p ) => {
		state.parts[ p.key ] =
			p.default || ( p.palette[ 0 ] && p.palette[ 0 ].name ) || '';
	} );

	const listeners = new Set();
	const emit = () => listeners.forEach( ( fn ) => fn( getState() ) );
	const getState = () => ( {
		parts: { ...state.parts },
		finish: state.finish,
	} );

	const renderer = new THREE.WebGLRenderer( {
		canvas,
		antialias: true,
		alpha: config.background === 'transparent',
		preserveDrawingBuffer: true,
	} );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.05;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	const scene = new THREE.Scene();
	if ( config.background && config.background !== 'transparent' ) {
		scene.background = new THREE.Color( hexToInt( config.background ) );
	}

	const pmrem = new THREE.PMREMGenerator( renderer );
	const envRT = pmrem.fromScene( new RoomEnvironment(), 0.04 );
	scene.environment = envRT.texture;

	const camera = new THREE.PerspectiveCamera( 40, 1, 0.01, 1000 );
	camera.position.set( 2, 1.5, 2.6 );

	const controls = new OrbitControls( camera, canvas );
	controls.enableDamping = true;
	controls.enablePan = false;

	scene.add( new THREE.HemisphereLight( 0xffffff, 0x9a9aa5, 0.35 ) );
	const key = new THREE.DirectionalLight( 0xffffff, 2.1 );
	key.position.set( 3, 5, 2 );
	key.castShadow = true;
	key.shadow.mapSize.set( 2048, 2048 );
	key.shadow.bias = -0.0004;
	scene.add( key );

	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry( 200, 200 ),
		new THREE.ShadowMaterial( { opacity: 0.22 } )
	);
	ground.rotation.x = -Math.PI / 2;
	ground.receiveShadow = true;
	scene.add( ground );

	// One shared material per part; meshes of a part point at it so a single
	// colour/finish change updates every mesh.
	const partMaterials = {};
	const makeMaterial = ( part, source ) => {
		const mat = new THREE.MeshStandardMaterial( {
			color: colourOf( part, state.parts[ part.key ] ),
			envMapIntensity: 0.7,
		} );
		if ( source ) {
			// Preserve texture detail from the model where present.
			[ 'map', 'normalMap', 'roughnessMap', 'aoMap' ].forEach( ( k ) => {
				if ( source[ k ] ) {
					mat[ k ] = source[ k ];
				}
			} );
		}
		Object.assign( mat, finishPreset( state.finish ) );
		return mat;
	};

	function finishPreset( name ) {
		const f = finishes[ name ] || {};
		return {
			roughness: typeof f.roughness === 'number' ? f.roughness : 0.6,
			metalness: typeof f.metalness === 'number' ? f.metalness : 0.0,
		};
	}

	function frameModel( object ) {
		const box = new THREE.Box3().setFromObject( object );
		const size = box.getSize( new THREE.Vector3() );
		const center = box.getCenter( new THREE.Vector3() );

		// Drop the model onto the ground and centre it horizontally.
		object.position.x -= center.x;
		object.position.z -= center.z;
		object.position.y -= box.min.y;

		const radius = Math.max( size.x, size.y, size.z ) * 0.5 || 1;
		const dist = radius / Math.sin( ( camera.fov * Math.PI ) / 360 );

		controls.target.set( 0, size.y * 0.5, 0 );
		camera.position.set( dist * 0.7, size.y * 0.65 + radius * 0.4, dist * 0.95 );
		controls.minDistance = radius * 0.9;
		controls.maxDistance = dist * 3;
		controls.maxPolarAngle = Math.PI / 2 - 0.03;
		controls.update();
	}

	let model = null;
	let raf = 0;

	const resize = () => {
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		if ( w && h && ( canvas.width !== w || canvas.height !== h ) ) {
			renderer.setSize( w, h, false );
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		}
	};

	const tick = () => {
		raf = requestAnimationFrame( tick );
		resize();
		controls.update();
		renderer.render( scene, camera );
	};

	const loader = new GLTFLoader();
	const ready = new Promise( ( resolve, reject ) => {
		if ( ! config.modelUrl ) {
			reject( new Error( 'No model URL configured.' ) );
			return;
		}
		loader.load(
			config.modelUrl,
			( gltf ) => {
				model = gltf.scene;
				model.traverse( ( node ) => {
					if ( ! node.isMesh ) {
						return;
					}
					node.castShadow = true;
					node.receiveShadow = true;
					const part = partForMesh( node, parts );
					if ( part ) {
						if ( ! partMaterials[ part.key ] ) {
							partMaterials[ part.key ] = makeMaterial(
								part,
								node.material
							);
						}
						node.material = partMaterials[ part.key ];
					}
				} );
				scene.add( model );
				frameModel( model );
				tick();
				resolve( api );
			},
			undefined,
			( err ) => reject( err )
		);
	} );

	window.addEventListener( 'resize', resize );

	const api = {
		ready,
		setColor( partKey, name ) {
			const part = parts.find( ( p ) => p.key === partKey );
			if ( ! part || ! partMaterials[ partKey ] ) {
				return;
			}
			state.parts[ partKey ] = name;
			partMaterials[ partKey ].color.setHex( colourOf( part, name ) );
			emit();
		},
		setFinish( name ) {
			if ( ! finishes[ name ] ) {
				return;
			}
			state.finish = name;
			Object.values( partMaterials ).forEach( ( mat ) =>
				Object.assign( mat, finishPreset( name ) )
			);
			emit();
		},
		reset() {
			parts.forEach( ( p ) =>
				this.setColor(
					p.key,
					p.default || ( p.palette[ 0 ] && p.palette[ 0 ].name )
				)
			);
			this.setFinish( defaultFinish );
		},
		getState,
		onChange( fn ) {
			listeners.add( fn );
			return () => listeners.delete( fn );
		},
		screenshot() {
			renderer.render( scene, camera );
			return renderer.domElement.toDataURL( 'image/png' );
		},
		dispose() {
			cancelAnimationFrame( raf );
			window.removeEventListener( 'resize', resize );
			controls.dispose();
			envRT.dispose();
			pmrem.dispose();
			renderer.dispose();
			listeners.clear();
		},
	};

	return api;
}
