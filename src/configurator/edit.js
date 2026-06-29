/**
 * Block editor UI.
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	Notice,
	Spinner,
} from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

export default function Edit( { attributes, setAttributes } ) {
	const { productId, height, showFinish, showReset, enableQuote, controlsPosition } =
		attributes;
	const [ products, setProducts ] = useState( null );

	useEffect( () => {
		apiFetch( { path: 'steil-cfg/v1/products' } )
			.then( ( items ) => setProducts( items || [] ) )
			.catch( () => setProducts( [] ) );
	}, [] );

	const blockProps = useBlockProps( {
		className: 'steil-cfg-editor-card',
		style: { minHeight: height },
	} );

	const selected =
		products && products.find( ( p ) => p.id === productId );

	const productOptions = [
		{ value: 0, label: __( 'Select a product…', '3d-product-configurator-block' ) },
		...( products || [] ).map( ( p ) => ( {
			value: p.id,
			label: p.title,
		} ) ),
	];

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Product', '3d-product-configurator-block' ) }>
					{ null === products ? (
						<Spinner />
					) : (
						<SelectControl
							label={ __( 'Configurator product', '3d-product-configurator-block' ) }
							value={ productId }
							options={ productOptions }
							onChange={ ( value ) =>
								setAttributes( { productId: parseInt( value, 10 ) } )
							}
							__nextHasNoMarginBottom
						/>
					) }
					{ products && products.length === 0 && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'No configurator products yet. Create one under "3D Configurator".',
								'3d-product-configurator-block'
							) }
						</Notice>
					) }
				</PanelBody>
				<PanelBody title={ __( 'Layout', '3d-product-configurator-block' ) }>
					<RangeControl
						label={ __( 'Height (px)', '3d-product-configurator-block' ) }
						value={ height }
						min={ 320 }
						max={ 900 }
						onChange={ ( value ) => setAttributes( { height: value } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Controls position', '3d-product-configurator-block' ) }
						value={ controlsPosition }
						options={ [
							{ value: 'side', label: __( 'Side', '3d-product-configurator-block' ) },
							{ value: 'bottom', label: __( 'Bottom', '3d-product-configurator-block' ) },
						] }
						onChange={ ( value ) =>
							setAttributes( { controlsPosition: value } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show finish selector', '3d-product-configurator-block' ) }
						checked={ showFinish }
						onChange={ ( value ) => setAttributes( { showFinish: value } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show reset button', '3d-product-configurator-block' ) }
						checked={ showReset }
						onChange={ ( value ) => setAttributes( { showReset: value } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Enable quote request', '3d-product-configurator-block' ) }
						checked={ enableQuote }
						onChange={ ( value ) => setAttributes( { enableQuote: value } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="steil-cfg-editor-inner">
					<span className="steil-cfg-editor-icon dashicons dashicons-art" />
					<strong>{ __( '3D Product Configurator', '3d-product-configurator-block' ) }</strong>
					{ selected ? (
						<p>
							{ __( 'Product:', '3d-product-configurator-block' ) }{ ' ' }
							<em>{ selected.title }</em>
						</p>
					) : (
						<p>
							{ __(
								'Choose a configurator product in the block settings.',
								'3d-product-configurator-block'
							) }
						</p>
					) }
					<p className="steil-cfg-editor-hint">
						{ __(
							'The interactive 3D preview appears on the published page.',
							'3d-product-configurator-block'
						) }
					</p>
				</div>
			</div>
		</>
	);
}
