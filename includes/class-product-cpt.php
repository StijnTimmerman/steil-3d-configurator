<?php
/**
 * Configurator product Custom Post Type + editor meta box.
 *
 * @package SteilConfigurator
 */

namespace SteilConfigurator;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the "Configurator product" CPT and its editor.
 */
class Product_CPT {

	const POST_TYPE = 'steil_cfg_product';
	const META_KEY  = '_steil_cfg_config';
	const NONCE     = 'steil_cfg_save';

	/**
	 * Hook everything up.
	 */
	public function register() {
		add_action( 'init', array( $this, 'register_post_type' ) );
		add_action( 'add_meta_boxes', array( $this, 'add_meta_box' ) );
		add_action( 'save_post_' . self::POST_TYPE, array( $this, 'save' ), 10, 2 );
	}

	/**
	 * Register the post type.
	 */
	public function register_post_type() {
		register_post_type(
			self::POST_TYPE,
			array(
				'labels'       => array(
					'name'          => __( 'Configurator products', 'steil-3d-configurator' ),
					'singular_name' => __( 'Configurator product', 'steil-3d-configurator' ),
					'add_new_item'  => __( 'Add configurator product', 'steil-3d-configurator' ),
					'edit_item'     => __( 'Edit configurator product', 'steil-3d-configurator' ),
					'menu_name'     => __( '3D Configurator', 'steil-3d-configurator' ),
				),
				'public'       => false,
				'show_ui'      => true,
				'show_in_rest' => false,
				'menu_icon'    => 'dashicons-art',
				'supports'     => array( 'title' ),
			)
		);
	}

	/**
	 * Add the product editor meta box.
	 */
	public function add_meta_box() {
		add_meta_box(
			'steil_cfg_editor',
			__( 'Product configuration', 'steil-3d-configurator' ),
			array( $this, 'render_meta_box' ),
			self::POST_TYPE,
			'normal',
			'high'
		);
	}

	/**
	 * Render the editor mount point. The UI is built by src/admin/product-editor.js.
	 *
	 * @param \WP_Post $post Current post.
	 */
	public function render_meta_box( $post ) {
		wp_nonce_field( self::NONCE, self::NONCE );
		$config = get_post_meta( $post->ID, self::META_KEY, true );
		if ( ! is_array( $config ) ) {
			$config = Product_Store::default_config();
		}
		printf(
			'<div id="steil-cfg-product-editor" data-config="%s" data-model-url="%s"></div>',
			esc_attr( wp_json_encode( $config ) ),
			esc_attr( Product_Store::resolve_model_url( $config ) )
		);
		echo '<input type="hidden" name="steil_cfg_config_json" id="steil-cfg-config-json" value="" />';
		echo '<noscript><p>' . esc_html__( 'JavaScript is required to edit the configurator product.', 'steil-3d-configurator' ) . '</p></noscript>';
	}

	/**
	 * Persist the configuration on save.
	 *
	 * @param int      $post_id Post ID.
	 * @param \WP_Post $post    Post object.
	 */
	public function save( $post_id, $post ) {
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( ! isset( $_POST[ self::NONCE ] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST[ self::NONCE ] ) ), self::NONCE ) ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		if ( empty( $_POST['steil_cfg_config_json'] ) ) {
			return;
		}

		$raw     = wp_unslash( $_POST['steil_cfg_config_json'] ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.MissingUnslash, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- JSON sanitised below.
		$decoded = json_decode( $raw, true );
		if ( ! is_array( $decoded ) ) {
			return;
		}

		update_post_meta( $post_id, self::META_KEY, Product_Store::sanitize_config( $decoded ) );
	}

	/**
	 * On activation, seed a sample product so the block works out of the box.
	 */
	public static function activate() {
		$existing = get_posts(
			array(
				'post_type'      => self::POST_TYPE,
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'post_status'    => 'any',
			)
		);
		if ( ! empty( $existing ) ) {
			return;
		}

		$post_id = wp_insert_post(
			array(
				'post_type'   => self::POST_TYPE,
				'post_title'  => __( 'Lounge chair (sample)', 'steil-3d-configurator' ),
				'post_status' => 'publish',
			)
		);

		if ( $post_id && ! is_wp_error( $post_id ) ) {
			update_post_meta( $post_id, self::META_KEY, Product_Store::sample_config() );
		}
	}
}
