<?php
/**
 * Plugin orchestrator.
 *
 * @package SteilConfigurator
 */

namespace SteilConfigurator;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Wires the components together.
 */
class Plugin {

	/**
	 * Boot all components.
	 */
	public function init() {
		( new Product_CPT() )->register();
		( new REST() )->register();
		( new Assets() )->register();
		( new Block() )->register();

		add_action( 'init', array( $this, 'load_textdomain' ) );
	}

	/**
	 * Load translations.
	 */
	public function load_textdomain() {
		load_plugin_textdomain( 'steil-3d-configurator', false, dirname( plugin_basename( STEIL_CFG_FILE ) ) . '/languages' );
	}
}
