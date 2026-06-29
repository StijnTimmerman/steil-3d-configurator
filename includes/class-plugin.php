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
	}
}
