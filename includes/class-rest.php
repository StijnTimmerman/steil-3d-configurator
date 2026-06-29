<?php
/**
 * REST API: product config + quote submission.
 *
 * @package SteilConfigurator
 */

namespace SteilConfigurator;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the plugin's REST routes.
 */
class REST {

	const NAMESPACE = 'steil-cfg/v1';

	/**
	 * Hook registration.
	 */
	public function register() {
		add_action( 'rest_api_init', array( $this, 'routes' ) );
	}

	/**
	 * Declare routes.
	 */
	public function routes() {
		register_rest_route(
			self::NAMESPACE,
			'/products',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'list_products' ),
				'permission_callback' => static function () {
					return current_user_can( 'edit_posts' );
				},
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/product/(?P<id>\d+)',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_product' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'id' => array(
						'validate_callback' => static function ( $param ) {
							return is_numeric( $param );
						},
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/quote',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'submit_quote' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	/**
	 * List configurator products for the editor picker.
	 *
	 * @return \WP_REST_Response
	 */
	public function list_products() {
		$posts = get_posts(
			array(
				'post_type'      => Product_CPT::POST_TYPE,
				'posts_per_page' => 100,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);
		$items = array_map(
			static function ( $post ) {
				return array(
					'id'    => $post->ID,
					'title' => get_the_title( $post ),
				);
			},
			$posts
		);
		return rest_ensure_response( $items );
	}

	/**
	 * Return a product's runtime config.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_product( $request ) {
		$config = Product_Store::get_config( (int) $request['id'] );
		if ( ! $config ) {
			return new \WP_Error( 'steil_cfg_not_found', __( 'Product not found.', 'steil-3d-configurator' ), array( 'status' => 404 ) );
		}
		return rest_ensure_response( $config );
	}

	/**
	 * Handle a quote request.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function submit_quote( $request ) {
		return ( new Quote() )->handle( $request );
	}
}
