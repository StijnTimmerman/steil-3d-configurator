<?php
/**
 * Admin assets for the product editor.
 *
 * @package SteilConfigurator
 */

namespace SteilConfigurator;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Enqueues the product editor bundle on the CPT edit screen.
 */
class Assets {

	/**
	 * Hook registration.
	 */
	public function register() {
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin' ) );
		add_filter( 'upload_mimes', array( $this, 'allow_glb_uploads' ) );
		add_filter( 'wp_check_filetype_and_ext', array( $this, 'check_glb_filetype' ), 10, 4 );
	}

	/**
	 * Allow GLB/glTF uploads in the media library.
	 *
	 * @param array $mimes Allowed mime types.
	 * @return array
	 */
	public function allow_glb_uploads( $mimes ) {
		$mimes['glb']  = 'model/gltf-binary';
		$mimes['gltf'] = 'model/gltf+json';
		$mimes['fbx']  = 'application/octet-stream';
		return $mimes;
	}

	/**
	 * Help WordPress recognise GLB/glTF files (their bytes aren't sniffable).
	 *
	 * @param array  $data     File data (ext, type, proper_filename).
	 * @param string $file     Full path.
	 * @param string $filename File name.
	 * @param array  $mimes    Allowed mimes.
	 * @return array
	 */
	public function check_glb_filetype( $data, $file, $filename, $mimes ) {
		if ( ! empty( $data['ext'] ) && ! empty( $data['type'] ) ) {
			return $data;
		}
		$ext = strtolower( pathinfo( $filename, PATHINFO_EXTENSION ) );
		if ( 'glb' === $ext ) {
			$data['ext']  = 'glb';
			$data['type'] = 'model/gltf-binary';
		} elseif ( 'gltf' === $ext ) {
			$data['ext']  = 'gltf';
			$data['type'] = 'model/gltf+json';
		} elseif ( 'fbx' === $ext ) {
			$data['ext']  = 'fbx';
			$data['type'] = 'application/octet-stream';
		}
		return $data;
	}

	/**
	 * Load the editor on the configurator product screens only.
	 *
	 * @param string $hook Current admin page.
	 */
	public function enqueue_admin( $hook ) {
		if ( 'post.php' !== $hook && 'post-new.php' !== $hook ) {
			return;
		}
		$screen = get_current_screen();
		if ( ! $screen || Product_CPT::POST_TYPE !== $screen->post_type ) {
			return;
		}

		$asset_file = STEIL_CFG_DIR . 'build/admin/product-editor.asset.php';
		if ( ! file_exists( $asset_file ) ) {
			return;
		}
		$asset = require $asset_file;

		// The media library powers GLB selection.
		wp_enqueue_media();

		wp_enqueue_script(
			'steil-cfg-product-editor',
			STEIL_CFG_URL . 'build/admin/product-editor.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		$style = STEIL_CFG_DIR . 'build/admin/product-editor.css';
		if ( file_exists( $style ) ) {
			wp_enqueue_style(
				'steil-cfg-product-editor',
				STEIL_CFG_URL . 'build/admin/product-editor.css',
				array(),
				$asset['version']
			);
		}

		wp_localize_script(
			'steil-cfg-product-editor',
			'steilCfgAdmin',
			array(
				'pluginUrl' => STEIL_CFG_URL,
			)
		);

		wp_set_script_translations( 'steil-cfg-product-editor', '3d-product-configurator-block' );
	}
}
