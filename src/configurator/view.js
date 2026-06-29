/**
 * Front-end: boot the engine and build the control panel for each block.
 */
import { createConfigurator } from '../engine/configurator-engine';

const runtime = window.steilCfgRuntime || { rest: '', nonce: '', i18n: {} };
const t = ( key, fallback ) =>
	( runtime.i18n && runtime.i18n[ key ] ) || fallback;

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

function buildPanel( root, data, engine ) {
	const cfg = data.config;
	const panel = root.querySelector( '.steil-cfg__panel' );
	panel.innerHTML = '';

	// One row per configurable part.
	cfg.parts.forEach( ( part ) => {
		const row = el( 'div', 'steil-cfg__row' );
		row.appendChild( el( 'span', 'steil-cfg__label', part.label ) );
		const swatches = el( 'div', 'steil-cfg__swatches' );

		part.palette.forEach( ( swatch ) => {
			const btn = el( 'button', 'steil-cfg__swatch' );
			btn.type = 'button';
			btn.style.background = swatch.hex;
			btn.title = swatch.name;
			btn.setAttribute( 'aria-label', `${ part.label }: ${ swatch.name }` );
			if ( engine.getState().parts[ part.key ] === swatch.name ) {
				btn.classList.add( 'is-active' );
			}
			btn.addEventListener( 'click', () => {
				engine.setColor( part.key, swatch.name );
				swatches
					.querySelectorAll( '.steil-cfg__swatch' )
					.forEach( ( s ) => s.classList.remove( 'is-active' ) );
				btn.classList.add( 'is-active' );
			} );
			swatches.appendChild( btn );
		} );
		row.appendChild( swatches );
		panel.appendChild( row );
	} );

	// Finish selector.
	const order = cfg.finish_order || Object.keys( cfg.finishes || {} );
	if ( data.showFinish && order.length > 1 ) {
		const row = el( 'div', 'steil-cfg__row' );
		row.appendChild( el( 'span', 'steil-cfg__label', t( 'finish', 'Finish' ) ) );
		const group = el( 'div', 'steil-cfg__finish' );
		order.forEach( ( key ) => {
			const finish = cfg.finishes[ key ];
			if ( ! finish ) {
				return;
			}
			const btn = el( 'button', 'steil-cfg__chip', finish.label || key );
			btn.type = 'button';
			if ( engine.getState().finish === key ) {
				btn.classList.add( 'is-active' );
			}
			btn.addEventListener( 'click', () => {
				engine.setFinish( key );
				group
					.querySelectorAll( '.steil-cfg__chip' )
					.forEach( ( c ) => c.classList.remove( 'is-active' ) );
				btn.classList.add( 'is-active' );
			} );
			group.appendChild( btn );
		} );
		row.appendChild( group );
		panel.appendChild( row );
	}

	// Actions: reset + quote.
	const actions = el( 'div', 'steil-cfg__actions' );
	if ( data.showReset ) {
		const reset = el( 'button', 'steil-cfg__btn steil-cfg__btn--ghost', t( 'reset', 'Reset' ) );
		reset.type = 'button';
		reset.addEventListener( 'click', () => {
			engine.reset();
			buildPanel( root, data, engine ); // refresh active states
		} );
		actions.appendChild( reset );
	}
	if ( data.enableQuote && runtime.rest ) {
		const quote = el( 'button', 'steil-cfg__btn steil-cfg__btn--primary', t( 'requestQuote', 'Request a quote' ) );
		quote.type = 'button';
		quote.addEventListener( 'click', () => openQuoteForm( root, data, engine ) );
		actions.appendChild( quote );
	}
	if ( actions.childNodes.length ) {
		panel.appendChild( actions );
	}
}

function currentSelection( data, engine ) {
	const state = engine.getState();
	const selection = {};
	data.config.parts.forEach( ( part ) => {
		selection[ part.label ] = state.parts[ part.key ];
	} );
	const finish =
		data.config.finishes &&
		data.config.finishes[ state.finish ] &&
		data.config.finishes[ state.finish ].label;
	if ( finish ) {
		selection[ t( 'finish', 'Finish' ) ] = finish;
	}
	return selection;
}

function openQuoteForm( root, data, engine ) {
	const existing = root.querySelector( '.steil-cfg__quote' );
	if ( existing ) {
		existing.remove();
		return;
	}

	const form = el( 'form', 'steil-cfg__quote' );

	const summary = el( 'div', 'steil-cfg__summary' );
	summary.appendChild( el( 'strong', null, t( 'yourSelection', 'Your selection' ) ) );
	const selection = currentSelection( data, engine );
	Object.keys( selection ).forEach( ( key ) => {
		summary.appendChild( el( 'span', 'steil-cfg__summary-item', `${ key }: ${ selection[ key ] }` ) );
	} );
	form.appendChild( summary );

	const nameInput = el( 'input', 'steil-cfg__input' );
	nameInput.type = 'text';
	nameInput.name = 'name';
	nameInput.placeholder = t( 'name', 'Name' );
	nameInput.required = true;

	const emailInput = el( 'input', 'steil-cfg__input' );
	emailInput.type = 'email';
	emailInput.name = 'email';
	emailInput.placeholder = t( 'email', 'Email' );
	emailInput.required = true;

	const messageInput = el( 'textarea', 'steil-cfg__input' );
	messageInput.name = 'message';
	messageInput.placeholder = t( 'message', 'Message (optional)' );
	messageInput.rows = 3;

	// Honeypot (hidden from humans).
	const honey = el( 'input' );
	honey.type = 'text';
	honey.name = 'website';
	honey.tabIndex = -1;
	honey.autocomplete = 'off';
	honey.style.position = 'absolute';
	honey.style.left = '-9999px';
	honey.setAttribute( 'aria-hidden', 'true' );

	const submit = el( 'button', 'steil-cfg__btn steil-cfg__btn--primary', t( 'send', 'Send request' ) );
	submit.type = 'submit';

	const status = el( 'p', 'steil-cfg__status' );

	form.append( nameInput, emailInput, messageInput, honey, submit, status );

	form.addEventListener( 'submit', async ( e ) => {
		e.preventDefault();
		submit.disabled = true;
		status.textContent = t( 'sending', 'Sending…' );

		let screenshot = '';
		try {
			screenshot = engine.screenshot();
		} catch ( err ) {
			screenshot = '';
		}

		try {
			const res = await fetch( runtime.rest + 'quote', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': runtime.nonce,
				},
				body: JSON.stringify( {
					product_id: data.product,
					name: nameInput.value,
					email: emailInput.value,
					message: messageInput.value,
					website: honey.value,
					selection: currentSelection( data, engine ),
					screenshot,
				} ),
			} );
			if ( ! res.ok ) {
				throw new Error( 'bad status' );
			}
			form.innerHTML = '';
			form.appendChild( el( 'p', 'steil-cfg__status is-ok', t( 'thanks', 'Thanks! We will get back to you soon.' ) ) );
		} catch ( err ) {
			submit.disabled = false;
			status.textContent = t( 'error', 'Something went wrong. Please try again.' );
		}
	} );

	root.querySelector( '.steil-cfg__panel' ).appendChild( form );
}

function initBlock( root ) {
	const dataNode = root.querySelector( '.steil-cfg__data' );
	const canvas = root.querySelector( '.steil-cfg__canvas' );
	const loading = root.querySelector( '.steil-cfg__loading' );
	if ( ! dataNode || ! canvas ) {
		return;
	}

	let data;
	try {
		data = JSON.parse( dataNode.textContent );
	} catch ( err ) {
		return;
	}
	const cfg = data.config;

	const engine = createConfigurator( canvas, {
		modelUrl: cfg.model_url,
		parts: cfg.parts,
		finishes: cfg.finishes,
		defaultFinish: cfg.default_finish,
		background: cfg.background,
	} );

	engine.ready
		.then( () => {
			if ( loading ) {
				loading.remove();
			}
			buildPanel( root, data, engine );
		} )
		.catch( () => {
			if ( loading ) {
				loading.textContent = t( 'loadError', 'The 3D model could not be loaded.' );
				loading.classList.add( 'is-error' );
			}
		} );
}

function boot() {
	document.querySelectorAll( '.steil-cfg' ).forEach( initBlock );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', boot );
} else {
	boot();
}
