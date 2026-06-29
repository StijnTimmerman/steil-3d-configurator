<?php
/**
 * Uninstall cleanup: remove configurator products and their meta.
 *
 * @package SteilConfigurator
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

$steil_cfg_products = get_posts(
	array(
		'post_type'      => 'steil_cfg_product',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'post_status'    => 'any',
	)
);

foreach ( $steil_cfg_products as $steil_cfg_id ) {
	wp_delete_post( $steil_cfg_id, true );
}
