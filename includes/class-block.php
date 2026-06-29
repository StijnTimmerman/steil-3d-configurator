<?php
/**
 * Block registration + front-end runtime data.
 *
 * @package SteilConfigurator
 */

namespace SteilConfigurator;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the configurator block and exposes runtime config to its view script.
 */
class Block {

	/**
	 * Hook registration.
	 */
	public function register() {
		add_action( 'init', array( $this, 'register_block' ) );
	}

	/**
	 * Register the block from the build directory.
	 */
	public function register_block() {
		$dir = STEIL_CFG_DIR . 'build/configurator';
		if ( ! file_exists( $dir . '/block.json' ) ) {
			return;
		}

		register_block_type( $dir );

		// Expose REST root + nonce + strings to the view script.
		$handles = generate_block_asset_handle( 'steil/configurator', 'viewScript' );
		if ( wp_script_is( $handles, 'registered' ) ) {
			wp_localize_script(
				$handles,
				'steilCfgRuntime',
				array(
					'rest'  => esc_url_raw( rest_url( REST::NAMESPACE . '/' ) ),
					'nonce' => wp_create_nonce( 'wp_rest' ),
					'i18n'  => array(
						'finish'        => __( 'Finish', '3d-product-configurator-block' ),
						'reset'         => __( 'Reset', '3d-product-configurator-block' ),
						'requestQuote'  => __( 'Request a quote', '3d-product-configurator-block' ),
						'name'          => __( 'Name', '3d-product-configurator-block' ),
						'email'         => __( 'Email', '3d-product-configurator-block' ),
						'message'       => __( 'Message (optional)', '3d-product-configurator-block' ),
						'send'          => __( 'Send request', '3d-product-configurator-block' ),
						'cancel'        => __( 'Cancel', '3d-product-configurator-block' ),
						'sending'       => __( 'Sending…', '3d-product-configurator-block' ),
						'thanks'        => __( 'Thanks! We will get back to you soon.', '3d-product-configurator-block' ),
						'error'         => __( 'Something went wrong. Please try again.', '3d-product-configurator-block' ),
						'loading'       => __( 'Loading 3D model…', '3d-product-configurator-block' ),
						'loadError'     => __( 'The 3D model could not be loaded.', '3d-product-configurator-block' ),
						'yourSelection' => __( 'Your selection', '3d-product-configurator-block' ),
					),
				)
			);
		}
	}
}
