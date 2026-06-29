/**
 * Extend the default @wordpress/scripts webpack config with the admin
 * product-editor entry (the block entries are detected automatically).
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

const baseEntry =
	typeof defaultConfig.entry === 'function'
		? defaultConfig.entry()
		: defaultConfig.entry;

module.exports = {
	...defaultConfig,
	entry: {
		...baseEntry,
		'admin/product-editor': './src/admin/product-editor.js',
	},
};
