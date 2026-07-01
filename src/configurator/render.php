<?php
/**
 * Server render for the configurator block.
 *
 * @package SteilConfigurator
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner content.
 * @var WP_Block $block      Block instance.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$steil_cfg_product_id = isset( $attributes['productId'] ) ? (int) $attributes['productId'] : 0;

// Fall back to the first available product when none is chosen.
if ( $steil_cfg_product_id <= 0 ) {
	$steil_cfg_first = get_posts(
		array(
			'post_type'      => \SteilConfigurator\Product_CPT::POST_TYPE,
			'posts_per_page' => 1,
			'fields'         => 'ids',
		)
	);
	$steil_cfg_product_id = ! empty( $steil_cfg_first ) ? (int) $steil_cfg_first[0] : 0;
}

$steil_cfg_config = $steil_cfg_product_id ? \SteilConfigurator\Product_Store::get_config( $steil_cfg_product_id ) : null;

if ( ! $steil_cfg_config || empty( $steil_cfg_config['parts'] ) || empty( $steil_cfg_config['model_url'] ) ) {
	if ( current_user_can( 'edit_posts' ) ) {
		echo '<div ' . get_block_wrapper_attributes() . '><p class="steil-cfg__notice">' // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			. esc_html__( 'Configurator: select a configured product with a model and parts.', 'steil-3d-configurator' )
			. '</p></div>';
	}
	return;
}

$steil_cfg_height   = isset( $attributes['height'] ) ? max( 240, (int) $attributes['height'] ) : 520;
$steil_cfg_position = ( isset( $attributes['controlsPosition'] ) && 'bottom' === $attributes['controlsPosition'] ) ? 'bottom' : 'side';

$steil_cfg_data = array(
	'product'     => $steil_cfg_product_id,
	'config'      => $steil_cfg_config,
	'showFinish'  => ! empty( $attributes['showFinish'] ),
	'showReset'   => ! empty( $attributes['showReset'] ),
	'enableQuote' => ! empty( $attributes['enableQuote'] ),
);

$steil_cfg_wrapper = get_block_wrapper_attributes(
	array(
		'class'         => 'steil-cfg steil-cfg--' . $steil_cfg_position,
		'data-position' => $steil_cfg_position,
	)
);
?>
<div <?php echo $steil_cfg_wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<div class="steil-cfg__stage" style="height:<?php echo esc_attr( $steil_cfg_height ); ?>px">
		<canvas class="steil-cfg__canvas" aria-label="<?php echo esc_attr( $steil_cfg_config['title'] ); ?>"></canvas>
		<div class="steil-cfg__loading"><?php echo esc_html__( 'Loading 3D model…', 'steil-3d-configurator' ); ?></div>
	</div>
	<div class="steil-cfg__panel" aria-live="polite"></div>
	<script type="application/json" class="steil-cfg__data">
		<?php echo wp_json_encode( $steil_cfg_data ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	</script>
</div>
