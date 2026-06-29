/**
 * Generate the bundled sample model (a lounge chair) as a GLB.
 *
 * Mirrors the primitive chair from the open-source mini-configurator so the
 * block works out of the box. Meshes are named so the sample product's part
 * matchers ("frame"/"leg", "seat", "back") recolour the right pieces.
 *
 * Run: npm run make:sample
 */
import * as THREE from 'three';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// GLTFExporter expects a few browser globals; shim the minimum for Node.
if ( typeof globalThis.FileReader === 'undefined' ) {
	globalThis.FileReader = class {
		readAsArrayBuffer( blob ) {
			blob
				.arrayBuffer()
				.then( ( buf ) => {
					this.result = buf;
					this._done();
				} )
				.catch( ( err ) => this.onerror && this.onerror( err ) );
		}
		readAsDataURL( blob ) {
			blob
				.arrayBuffer()
				.then( ( buf ) => {
					this.result = `data:${ blob.type || 'application/octet-stream' };base64,${ Buffer.from( buf ).toString( 'base64' ) }`;
					this._done();
				} )
				.catch( ( err ) => this.onerror && this.onerror( err ) );
		}
		_done() {
			this.onload && this.onload( { target: this } );
			this.onloadend && this.onloadend( { target: this } );
		}
	};
}

const { GLTFExporter } = await import( 'three/addons/exporters/GLTFExporter.js' );

const __dirname = dirname( fileURLToPath( import.meta.url ) );
const outPath = resolve( __dirname, '../assets/models/lounge-chair.glb' );

const scene = new THREE.Scene();

const box = ( w, h, d, name ) => {
	const mesh = new THREE.Mesh(
		new THREE.BoxGeometry( w, h, d ),
		new THREE.MeshStandardMaterial( { color: 0xb0b0b0, roughness: 0.7 } )
	);
	mesh.name = name;
	return mesh;
};

// Four legs (frame).
[
	[ -0.42, -0.42 ],
	[ 0.42, -0.42 ],
	[ -0.42, 0.42 ],
	[ 0.42, 0.42 ],
].forEach( ( [ x, z ], i ) => {
	const leg = box( 0.09, 0.46, 0.09, `frame_leg_${ i }` );
	leg.position.set( x, 0.23, z );
	scene.add( leg );
} );

// Seat.
const seat = box( 1.02, 0.16, 1.02, 'seat' );
seat.position.set( 0, 0.54, 0 );
scene.add( seat );

// Backrest.
const back = box( 1.02, 0.9, 0.16, 'back' );
back.position.set( 0, 1.05, -0.43 );
back.rotation.x = -0.12;
scene.add( back );

mkdirSync( dirname( outPath ), { recursive: true } );

new GLTFExporter().parse(
	scene,
	( result ) => {
		writeFileSync( outPath, Buffer.from( result ) );
		// eslint-disable-next-line no-console
		console.log( 'Wrote', outPath );
	},
	( err ) => {
		// eslint-disable-next-line no-console
		console.error( 'GLTF export failed:', err );
		process.exit( 1 );
	},
	{ binary: true }
);
