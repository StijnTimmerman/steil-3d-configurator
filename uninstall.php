<?php
/**
 * Uninstall cleanup: remove configurator products and their meta.
 *
 * @package SteilConfigurator
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

$steil_products = get_posts(
	array(
		'post_type'      => 'steil_cfg_product',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'post_status'    => 'any',
	)
);

foreach ( $steil_products as $steil_id ) {
	wp_delete_post( $steil_id, true );
}
