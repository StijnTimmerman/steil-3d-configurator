<?php
/**
 * Quote / lead request handler.
 *
 * @package SteilConfigurator
 */

namespace SteilConfigurator;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Validates a quote submission, attaches a screenshot and emails the admin.
 */
class Quote {

	/**
	 * Handle a quote REST request.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function handle( $request ) {
		// Honeypot: bots fill hidden fields.
		if ( ! empty( $request->get_param( 'website' ) ) ) {
			return rest_ensure_response( array( 'ok' => true ) );
		}

		$email = sanitize_email( (string) $request->get_param( 'email' ) );
		if ( ! is_email( $email ) ) {
			return new \WP_Error( 'steil_cfg_bad_email', __( 'Please provide a valid email address.', 'steil-3d-configurator' ), array( 'status' => 400 ) );
		}

		$product_id = absint( $request->get_param( 'product_id' ) );
		$config     = Product_Store::get_config( $product_id );
		if ( ! $config ) {
			return new \WP_Error( 'steil_cfg_bad_product', __( 'Unknown product.', 'steil-3d-configurator' ), array( 'status' => 400 ) );
		}

		$name      = sanitize_text_field( (string) $request->get_param( 'name' ) );
		$message   = sanitize_textarea_field( (string) $request->get_param( 'message' ) );
		$selection = $this->sanitize_selection( $request->get_param( 'selection' ) );

		$attachments = array();
		$tmp_file    = $this->save_screenshot( $request->get_param( 'screenshot' ), $product_id );
		if ( $tmp_file ) {
			$attachments[] = $tmp_file;
		}

		$sent = $this->send_mail( $config, $name, $email, $message, $selection, $attachments );

		// Clean up the temporary screenshot.
		if ( $tmp_file && file_exists( $tmp_file ) ) {
			wp_delete_file( $tmp_file );
		}

		if ( ! $sent ) {
			return new \WP_Error( 'steil_cfg_mail_failed', __( 'We could not send your request. Please try again later.', 'steil-3d-configurator' ), array( 'status' => 500 ) );
		}

		/**
		 * Fires after a quote request has been emailed.
		 *
		 * @param array  $config    Product config.
		 * @param string $email     Visitor email.
		 * @param array  $selection Chosen options.
		 */
		do_action( 'steil_cfg_quote_submitted', $config, $email, $selection );

		return rest_ensure_response( array( 'ok' => true ) );
	}

	/**
	 * Sanitise the selected options map.
	 *
	 * @param mixed $selection Raw selection.
	 * @return array
	 */
	private function sanitize_selection( $selection ) {
		if ( ! is_array( $selection ) ) {
			return array();
		}
		$out = array();
		foreach ( $selection as $key => $value ) {
			$out[ sanitize_key( $key ) ] = sanitize_text_field( is_scalar( $value ) ? (string) $value : '' );
		}
		return $out;
	}

	/**
	 * Decode and store a base64 PNG screenshot to a temp file.
	 *
	 * @param mixed $data_url   Data URL string.
	 * @param int   $product_id Product ID for the filename.
	 * @return string|null Absolute path or null.
	 */
	private function save_screenshot( $data_url, $product_id ) {
		if ( ! is_string( $data_url ) || 0 !== strpos( $data_url, 'data:image/png;base64,' ) ) {
			return null;
		}
		$base64 = substr( $data_url, strlen( 'data:image/png;base64,' ) );
		$base64 = str_replace( ' ', '+', $base64 );
		$binary = base64_decode( $base64, true );
		if ( false === $binary || strlen( $binary ) > 4 * 1024 * 1024 ) {
			return null; // Invalid or too large (>4MB).
		}

		$uploads = wp_upload_dir();
		if ( ! empty( $uploads['error'] ) ) {
			return null;
		}
		$path = trailingslashit( $uploads['basedir'] ) . sprintf( 'steil-cfg-quote-%d-%s.png', $product_id, wp_generate_password( 8, false ) );

		if ( ! function_exists( 'WP_Filesystem' ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
		}
		global $wp_filesystem;
		WP_Filesystem();
		if ( ! $wp_filesystem || ! $wp_filesystem->put_contents( $path, $binary, FS_CHMOD_FILE ) ) {
			return null;
		}
		return $path;
	}

	/**
	 * Compose and send the notification email.
	 *
	 * @param array  $config      Product config.
	 * @param string $name        Visitor name.
	 * @param string $email       Visitor email.
	 * @param string $message     Visitor message.
	 * @param array  $selection   Chosen options.
	 * @param array  $attachments File paths.
	 * @return bool
	 */
	private function send_mail( $config, $name, $email, $message, $selection, $attachments ) {
		/**
		 * Filters the recipient address for quote requests.
		 *
		 * @param string $to Recipient.
		 */
		$to      = apply_filters( 'steil_cfg_quote_recipient', get_option( 'admin_email' ) );
		$product = isset( $config['title'] ) ? $config['title'] : __( 'product', 'steil-3d-configurator' );

		/* translators: %s: product name. */
		$subject = sprintf( __( 'New quote request: %s', 'steil-3d-configurator' ), $product );

		$lines   = array();
		$lines[] = sprintf( /* translators: %s: product name. */ __( 'Product: %s', 'steil-3d-configurator' ), $product );
		$lines[] = sprintf( /* translators: %s: name. */ __( 'Name: %s', 'steil-3d-configurator' ), $name ? $name : '—' );
		$lines[] = sprintf( /* translators: %s: email. */ __( 'Email: %s', 'steil-3d-configurator' ), $email );
		$lines[] = '';
		$lines[] = __( 'Chosen configuration:', 'steil-3d-configurator' );
		foreach ( $selection as $key => $value ) {
			$lines[] = sprintf( '  - %s: %s', $key, $value );
		}
		if ( $message ) {
			$lines[] = '';
			$lines[] = __( 'Message:', 'steil-3d-configurator' );
			$lines[] = $message;
		}

		$body    = implode( "\n", $lines );
		$headers = array( 'Reply-To: ' . $name . ' <' . $email . '>' );

		return wp_mail( $to, $subject, $body, $headers, $attachments );
	}
}
