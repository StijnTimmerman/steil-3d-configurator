/**
 * Configurator product editor (admin meta box).
 *
 * Vanilla DOM UI: pick/upload a GLB, introspect its mesh/material names, define
 * parts with colour palettes, edit finishes, and serialise everything into a
 * hidden input that saves with the post (sanitised server-side).
 */
import { __ } from '@wordpress/i18n';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import './product-editor.scss';

const admin = window.steilCfgAdmin || { pluginUrl: '' };

const el = ( tag, className, text ) => {
	const node = document.createElement( tag );
	if ( className ) {
		node.className = className;
	}
	if ( text != null ) {
		node.textContent = text;
	}
	return node;
};

const resolveUrl = ( url ) => {
	if ( ! url ) {
		return '';
	}
	if ( url.indexOf( 'plugin:' ) === 0 ) {
		return admin.pluginUrl + url.slice( 7 ).replace( /^\/+/, '' );
	}
	return url;
};

function defaultFinishes() {
	return {
		matte: { label: __( 'Matte', 'steil-3d-configurator' ), roughness: 0.85, metalness: 0.0 },
		satin: { label: __( 'Satin', 'steil-3d-configurator' ), roughness: 0.45, metalness: 0.05 },
		gloss: { label: __( 'Gloss', 'steil-3d-configurator' ), roughness: 0.12, metalness: 0.1 },
	};
}

function init() {
	const mount = document.getElementById( 'steil-cfg-product-editor' );
	const hidden = document.getElementById( 'steil-cfg-config-json' );
	if ( ! mount || ! hidden ) {
		return;
	}

	let state;
	try {
		state = JSON.parse( mount.dataset.config || '{}' );
	} catch ( e ) {
		state = {};
	}
	state.parts = Array.isArray( state.parts ) ? state.parts : [];
	state.finishes =
		state.finishes && Object.keys( state.finishes ).length
			? state.finishes
			: defaultFinishes();
	state.finish_order =
		state.finish_order && state.finish_order.length
			? state.finish_order
			: Object.keys( state.finishes );
	state.default_finish = state.default_finish || state.finish_order[ 0 ];
	state.background = state.background || 'transparent';
	state.model_id = state.model_id || 0;
	state.model_url = state.model_url || '';

	let detectedNames = [];

	const sync = () => {
		hidden.value = JSON.stringify( state );
	};

	const render = () => {
		mount.innerHTML = '';
		mount.appendChild( renderModelSection() );
		mount.appendChild( renderDetected() );
		mount.appendChild( renderParts() );
		mount.appendChild( renderFinishes() );
		mount.appendChild( renderBackground() );
		sync();
	};

	// --- model section ---
	function renderModelSection() {
		const box = el( 'div', 'steil-pe__section' );
		box.appendChild( el( 'h3', null, __( '3D model (GLB)', 'steil-3d-configurator' ) ) );

		const current = resolveUrl( mount.dataset.modelUrl || state.model_url );
		const label = el(
			'p',
			'steil-pe__muted',
			current
				? __( 'A model is set. Choose another to replace it.', 'steil-3d-configurator' )
				: __( 'No model selected yet.', 'steil-3d-configurator' )
		);
		box.appendChild( label );

		const pick = el( 'button', 'button', __( 'Select / upload GLB', 'steil-3d-configurator' ) );
		pick.type = 'button';
		pick.addEventListener( 'click', ( e ) => {
			e.preventDefault();
			openMedia();
		} );
		box.appendChild( pick );

		if ( current ) {
			const inspect = el( 'button', 'button', __( 'Detect parts from model', 'steil-3d-configurator' ) );
			inspect.type = 'button';
			inspect.style.marginLeft = '8px';
			inspect.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				introspect( current, inspect );
			} );
			box.appendChild( inspect );
		}
		return box;
	}

	function openMedia() {
		if ( ! window.wp || ! window.wp.media ) {
			return;
		}
		const frame = window.wp.media( {
			title: __( 'Select or upload a GLB model', 'steil-3d-configurator' ),
			button: { text: __( 'Use this model', 'steil-3d-configurator' ) },
			multiple: false,
		} );
		frame.on( 'select', () => {
			const att = frame.state().get( 'selection' ).first().toJSON();
			state.model_id = att.id;
			state.model_url = att.url;
			mount.dataset.modelUrl = att.url;
			render();
			introspect( att.url );
		} );
		frame.open();
	}

	// --- introspection ---
	function introspect( url, btn ) {
		if ( btn ) {
			btn.disabled = true;
			btn.textContent = __( 'Loading…', 'steil-3d-configurator' );
		}
		new GLTFLoader().load(
			resolveUrl( url ),
			( gltf ) => {
				const names = new Set();
				gltf.scene.traverse( ( node ) => {
					if ( node.isMesh ) {
						if ( node.name ) {
							names.add( node.name );
						}
						if ( node.material && node.material.name ) {
							names.add( node.material.name );
						}
					}
				} );
				detectedNames = Array.from( names );
				render();
			},
			undefined,
			() => {
				detectedNames = [];
				render();
				window.alert( __( 'Could not read the model. Is it a valid GLB/glTF file?', 'steil-3d-configurator' ) );
			}
		);
	}

	function renderDetected() {
		const box = el( 'div', 'steil-pe__section' );
		if ( ! detectedNames.length ) {
			return box;
		}
		box.appendChild( el( 'h4', null, __( 'Detected in model', 'steil-3d-configurator' ) ) );
		const list = el( 'div', 'steil-pe__tags' );
		detectedNames.forEach( ( n ) => list.appendChild( el( 'code', 'steil-pe__tag', n ) ) );
		box.appendChild( list );
		box.appendChild(
			el(
				'p',
				'steil-pe__muted',
				__( 'Use these names in a part’s "match" field so its meshes get recoloured.', 'steil-3d-configurator' )
			)
		);
		return box;
	}

	// --- parts ---
	function renderParts() {
		const box = el( 'div', 'steil-pe__section' );
		box.appendChild( el( 'h3', null, __( 'Configurable parts', 'steil-3d-configurator' ) ) );

		state.parts.forEach( ( part, index ) => {
			box.appendChild( renderPart( part, index ) );
		} );

		const add = el( 'button', 'button', __( '+ Add part', 'steil-3d-configurator' ) );
		add.type = 'button';
		add.addEventListener( 'click', ( e ) => {
			e.preventDefault();
			state.parts.push( {
				key: 'part' + ( state.parts.length + 1 ),
				label: __( 'New part', 'steil-3d-configurator' ),
				match: [],
				palette: [ { name: 'Default', hex: '#999999' } ],
				default: 'Default',
			} );
			render();
		} );
		box.appendChild( add );
		return box;
	}

	function renderPart( part, index ) {
		const card = el( 'div', 'steil-pe__card' );

		const head = el( 'div', 'steil-pe__row' );
		head.appendChild( field( __( 'Key', 'steil-3d-configurator' ), part.key, ( v ) => { part.key = v; sync(); } ) );
		head.appendChild( field( __( 'Label', 'steil-3d-configurator' ), part.label, ( v ) => { part.label = v; sync(); } ) );
		head.appendChild(
			field(
				__( 'Match (comma separated)', 'steil-3d-configurator' ),
				( part.match || [] ).join( ', ' ),
				( v ) => { part.match = v.split( ',' ).map( ( s ) => s.trim() ).filter( Boolean ); sync(); }
			)
		);
		const del = el( 'button', 'button-link-delete', __( 'Remove', 'steil-3d-configurator' ) );
		del.type = 'button';
		del.addEventListener( 'click', ( e ) => {
			e.preventDefault();
			state.parts.splice( index, 1 );
			render();
		} );
		head.appendChild( del );
		card.appendChild( head );

		// Palette.
		const pal = el( 'div', 'steil-pe__palette' );
		( part.palette || [] ).forEach( ( swatch, si ) => {
			const item = el( 'div', 'steil-pe__swatch-edit' );
			const color = el( 'input' );
			color.type = 'color';
			color.value = swatch.hex;
			color.addEventListener( 'input', () => { swatch.hex = color.value; sync(); } );
			const name = el( 'input', 'steil-pe__swatch-name' );
			name.type = 'text';
			name.value = swatch.name;
			name.placeholder = __( 'Name', 'steil-3d-configurator' );
			name.addEventListener( 'input', () => { swatch.name = name.value; sync(); } );
			const rm = el( 'button', 'button-link-delete', '×' );
			rm.type = 'button';
			rm.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				part.palette.splice( si, 1 );
				render();
			} );
			item.append( color, name, rm );
			pal.appendChild( item );
		} );
		const addColor = el( 'button', 'button', __( '+ Colour', 'steil-3d-configurator' ) );
		addColor.type = 'button';
		addColor.addEventListener( 'click', ( e ) => {
			e.preventDefault();
			part.palette = part.palette || [];
			part.palette.push( { name: 'Colour ' + ( part.palette.length + 1 ), hex: '#cccccc' } );
			render();
		} );
		pal.appendChild( addColor );
		card.appendChild( pal );

		// Default selector.
		const def = el( 'label', 'steil-pe__default' );
		def.appendChild( el( 'span', null, __( 'Default colour:', 'steil-3d-configurator' ) ) );
		const sel = el( 'select' );
		( part.palette || [] ).forEach( ( s ) => {
			const opt = el( 'option', null, s.name );
			opt.value = s.name;
			if ( s.name === part.default ) {
				opt.selected = true;
			}
			sel.appendChild( opt );
		} );
		sel.addEventListener( 'change', () => { part.default = sel.value; sync(); } );
		def.appendChild( sel );
		card.appendChild( def );

		return card;
	}

	// --- finishes ---
	function renderFinishes() {
		const box = el( 'div', 'steil-pe__section' );
		box.appendChild( el( 'h3', null, __( 'Finishes', 'steil-3d-configurator' ) ) );
		Object.keys( state.finishes ).forEach( ( key ) => {
			const f = state.finishes[ key ];
			const row = el( 'div', 'steil-pe__row' );
			row.appendChild( el( 'code', 'steil-pe__tag', key ) );
			row.appendChild( field( __( 'Label', 'steil-3d-configurator' ), f.label, ( v ) => { f.label = v; sync(); } ) );
			row.appendChild( numField( __( 'Roughness', 'steil-3d-configurator' ), f.roughness, ( v ) => { f.roughness = v; sync(); } ) );
			row.appendChild( numField( __( 'Metalness', 'steil-3d-configurator' ), f.metalness, ( v ) => { f.metalness = v; sync(); } ) );
			box.appendChild( row );
		} );

		const def = el( 'label', 'steil-pe__default' );
		def.appendChild( el( 'span', null, __( 'Default finish:', 'steil-3d-configurator' ) ) );
		const sel = el( 'select' );
		state.finish_order.forEach( ( key ) => {
			const opt = el( 'option', null, key );
			opt.value = key;
			if ( key === state.default_finish ) {
				opt.selected = true;
			}
			sel.appendChild( opt );
		} );
		sel.addEventListener( 'change', () => { state.default_finish = sel.value; sync(); } );
		def.appendChild( sel );
		box.appendChild( def );
		return box;
	}

	// --- background ---
	function renderBackground() {
		const box = el( 'div', 'steil-pe__section' );
		box.appendChild( el( 'h3', null, __( 'Background', 'steil-3d-configurator' ) ) );
		const row = el( 'div', 'steil-pe__row' );

		const transparent = el( 'label' );
		const cb = el( 'input' );
		cb.type = 'checkbox';
		cb.checked = state.background === 'transparent';
		transparent.append( cb, document.createTextNode( ' ' + __( 'Transparent', 'steil-3d-configurator' ) ) );

		const color = el( 'input' );
		color.type = 'color';
		color.value = state.background === 'transparent' ? '#f2f2f2' : state.background;
		color.disabled = cb.checked;
		color.addEventListener( 'input', () => { state.background = color.value; sync(); } );

		cb.addEventListener( 'change', () => {
			if ( cb.checked ) {
				state.background = 'transparent';
				color.disabled = true;
			} else {
				state.background = color.value;
				color.disabled = false;
			}
			sync();
		} );

		row.append( transparent, color );
		box.appendChild( row );
		return box;
	}

	// --- small field helpers ---
	function field( labelText, value, onInput ) {
		const wrap = el( 'label', 'steil-pe__field' );
		wrap.appendChild( el( 'span', null, labelText ) );
		const input = el( 'input' );
		input.type = 'text';
		input.value = value || '';
		input.addEventListener( 'input', () => onInput( input.value ) );
		wrap.appendChild( input );
		return wrap;
	}

	function numField( labelText, value, onInput ) {
		const wrap = el( 'label', 'steil-pe__field steil-pe__field--num' );
		wrap.appendChild( el( 'span', null, labelText ) );
		const input = el( 'input' );
		input.type = 'number';
		input.step = '0.05';
		input.min = '0';
		input.max = '1';
		input.value = value;
		input.addEventListener( 'input', () => onInput( parseFloat( input.value ) ) );
		wrap.appendChild( input );
		return wrap;
	}

	render();
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
