<?php
/**
 * Post Date Block: Published & Modified Plugin for WordPress
 *
 * @package   PostDateModified
 * @author    Weston Ruter
 * @license   GPL-2.0-or-later
 * @copyright Copyleft 2025, Weston Ruter
 *
 * @wordpress-plugin
 * Plugin Name: Post Date Block: Published & Modified
 * Plugin URI: https://github.com/westonruter/post-date-modified
 * Description: Appends the modified date to the Post Date block when different from the published date. See <a href="https://github.com/WordPress/gutenberg/issues/53099">gutenberg#53099</a>.
 * Requires at least: 6.9
 * Requires PHP: 7.4
 * Version: 1.0.0
 * Author: Weston Ruter
 * Author URI: https://weston.ruter.net/
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 * Update URI: https://github.com/westonruter/post-date-modified
 * GitHub Plugin URI: https://github.com/westonruter/post-date-modified
 * Primary Branch: main
 */

namespace PostDateModified;

use WP_Block;
use WP_HTML_Tag_Processor;
use WP_HTML_Text_Replacement;
use WP_Block_Bindings_Source;
use WP_HTML_Span;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // @codeCoverageIgnore
}

/**
 * Plugin version.
 *
 * @var string
 */
const VERSION = '1.0.0';

/**
 * Filters the content of a single block Date block to add the Modified date as well if it is different.
 *
 * @phpstan-param array{
 *     "blockName": non-empty-string,
 *     "attrs"?: array{
 *         "displayType"?: "modified",
 *         "format"?: non-empty-string,
 *         "datetime"?: non-empty-string,
 *         "showModifiedDateWhenDifferent"?: bool,
 *         "modifiedDateTemplate"?: string,
 *         "modifiedDateOnSeparateLine"?: bool,
 *         "publishDatePrefix"?: string,
 *         "metadata"?: array{
 *             "bindings"?: array{
 *                 "datetime"?: array{
 *                      "source": non-empty-string,
 *                      "args": array{
 *                          "field"?: string
 *                      }
 *                 }
 *             }
 *         }
 *     },
 * } $block
 *
 * @param string|mixed $block_content The block content.
 * @param array        $block         The full block, including name and attributes.
 * @param WP_Block     $instance      The block instance.
 */
function filter_block( $block_content, array $block, WP_Block $instance ): string {
	if ( ! is_string( $block_content ) ) {
		$block_content = '';
	}

	$date_format = $block['attrs']['format'] ?? get_option( 'date_format' );

	// Short-circuit if not the right context.
	if (
		// Nothing is being displayed.
		'' === $block_content
		||
		// Date format is invalid.
		( ! is_string( $date_format ) || '' === $date_format )
		||
		// Pass through Date block from 6.8 which has the "Display last modified date" setting enabled.
		( 'modified' === ( $block['attrs']['displayType'] ?? null ) )
		||
		false === ( $block['attrs']['showModifiedDateWhenDifferent'] ?? false )
		||
		// Pass through Date block from 6.9 if it isn't for displaying the published date.
		(
			// This indicates the block is from 6.9.
			isset( $block['attrs']['datetime'] )
			&&
			// Look at bindings to see if connected to published date.
			(
				'core/post-data' !== ( $block['attrs']['metadata']['bindings']['datetime']['source'] ?? null )
				||
				'date' !== (
					$block['attrs']['metadata']['bindings']['datetime']['args']['field'] ??
					$block['attrs']['metadata']['bindings']['datetime']['args']['key'] ??
					null
				)
			)
		)
	) {
		return $block_content;
	}

	// Abort if the block binding source is not available.
	$source = get_block_bindings_source( 'core/post-data' );
	if ( null === $source ) {
		return $block_content;
	}

	// Get the published date.
	$published_timestamp = get_timestamp( $source, 'date', $instance );
	$modified_timestamp  = get_timestamp( $source, 'modified', $instance );
	if ( null === $published_timestamp || null === $modified_timestamp ) {
		return $block_content;
	}

	// Skip appending the modified date if it would be displayed the same as the published date.
	$published_date_formatted = format_date( $published_timestamp, $date_format );
	$modified_date_formatted  = format_date( $modified_timestamp, $date_format );
	if ( $published_date_formatted === $modified_date_formatted ) {
		return $block_content;
	}

	// Obtain the template for rendering the modified date.
	$modified_prefix  = $block['attrs']['modifiedPrefix'] ?? '';
	$modified_suffix  = $block['attrs']['modifiedSuffix'] ?? '';
	$published_prefix = $block['attrs']['publishedPrefix'] ?? '';
	$published_suffix = $block['attrs']['publishedSuffix'] ?? '';

	// Render the modified date after the published date.
	$html = '';
	if ( is_string( $published_suffix ) && '' !== $published_suffix ) {
		$html .= esc_html( $published_suffix );
	}
	if ( $block['attrs']['modifiedDateOnSeparateLine'] ?? true ) {
		$html .= '<br>';
	} else {
		$html .= ' ';
	}
	$html .= '<span class="modified">';
	if ( is_string( $modified_prefix ) ) {
		$html .= $modified_prefix;
	}
	// See Microformat classes used at <https://github.com/WordPress/wordpress-develop/blob/ebd415b045a2b1bbeb4d227e890c78a15ff8d85e/src/wp-content/themes/twentynineteen/inc/template-tags.php#L17>.
	$html .= sprintf(
		'<time class="updated" datetime="%s">%s</time>',
		esc_attr( (string) wp_date( 'c', $modified_timestamp ) ),
		esc_html( $modified_date_formatted )
	);
	if ( is_string( $modified_suffix ) ) {
		$html .= $modified_suffix;
	}
	$html .= '</span>';

	// Append the modified date to the end of the Date block's wrapper element.
	$processor = new class( $block_content ) extends WP_HTML_Tag_Processor {

		/**
		 * Gets the span for the current token.
		 *
		 * @return WP_HTML_Span Current token span.
		 */
		private function get_span(): WP_HTML_Span {
			// Note: This call will never fail according to the usage of this class, given it is always called after ::next_tag() is true.
			$this->set_bookmark( 'here' );
			return $this->bookmarks['here'];
		}

		/**
		 * Inserts text before the current token.
		 *
		 * @param string $text Text to insert.
		 */
		public function insert_before( string $text ): void {
			$this->lexical_updates[] = new WP_HTML_Text_Replacement( $this->get_span()->start, 0, $text );
		}

		/**
		 * Inserts text after the current token.
		 *
		 * @param string $text Text to insert.
		 */
		public function insert_after( string $text ): void {
			$span = $this->get_span();

			$this->lexical_updates[] = new WP_HTML_Text_Replacement( $span->start + $span->length, 0, $text );
		}
	};
	while ( $processor->next_tag( array( 'tag_closers' => 'visit' ) ) ) {
		if ( ! $processor->has_bookmark( 'first_opening_tag' ) && ! $processor->is_tag_closer() ) {
			// Abort if the modified date was already added, which can currently happen with `gutenberg_block_bindings_render_block()`.
			if ( $processor->has_class( 'post-date-modified' ) ) {
				return $block_content;
			}
			$processor->add_class( 'post-date-modified' );

			$processor->set_bookmark( 'first_opening_tag' );
		} elseif ( $processor->is_tag_closer() ) {
			$processor->set_bookmark( 'last_closing_tag' );
		} elseif ( 'TIME' === $processor->get_tag() ) {
			// Microformat classes used at <https://github.com/WordPress/wordpress-develop/blob/ebd415b045a2b1bbeb4d227e890c78a15ff8d85e/src/wp-content/themes/twentynineteen/inc/template-tags.php#L15-L18>.
			$processor->add_class( 'entry-date' );
			$processor->add_class( 'published' );
		}
	}

	// Add the published prefix.
	if ( is_string( $published_prefix ) && '' !== $published_prefix && $processor->seek( 'first_opening_tag' ) ) {
		$processor->insert_after( esc_html( $published_prefix ) );
		// TODO: Also add a published SPAN.created wrapper?
	}

	// Add the modified date.
	if ( $processor->seek( 'last_closing_tag' ) ) {
		$processor->insert_before( $html );
	}

	return $processor->get_updated_html();
}

add_filter(
	'render_block_core/post-date',
	__NAMESPACE__ . '\filter_block',
	10,
	3
);

add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\enqueue_editor_assets' );

/**
 * Enqueues block editor assets.
 */
function enqueue_editor_assets(): void {
	$handle = 'post-date-modified-block-editor';

	wp_enqueue_script(
		$handle,
		plugins_url( 'edit.js', __FILE__ ),
		array( 'wp-hooks', 'wp-block-editor', 'wp-components', 'wp-i18n', 'wp-element', 'wp-blocks', 'wp-data' ),
		VERSION,
		true
	);

	wp_set_script_translations( $handle, 'post-date-modified' );
}

/**
 * Gets timestamp.
 *
 * @param WP_Block_Bindings_Source $source   Block bindings source.
 * @param string                   $field    Binding field.
 * @param WP_Block                 $instance Block instance.
 * @return positive-int|null Timestamp or null on failure.
 */
function get_timestamp( WP_Block_Bindings_Source $source, string $field, WP_Block $instance ): ?int {
	$datetime = $source->get_value( array( 'field' => $field ), $instance, 'datetime' );
	if ( ! is_string( $datetime ) || '' === $datetime ) {
		return null;
	}
	$timestamp = strtotime( $datetime );
	if ( false === $timestamp || $timestamp < 1 ) {
		return null;
	}
	return $timestamp;
}

/**
 * Formats date.
 *
 * @param positive-int     $timestamp Timestamp.
 * @param non-empty-string $format    Date format.
 * @return string Formatted date (and will be non-empty-string).
 */
function format_date( int $timestamp, string $format ): string {
	if ( 'human-diff' === $format ) {
		return sprintf(
			/* translators: %s: human-readable time difference. */
			__( '%s ago', 'default' ), // phpcs:ignore WordPress.WP.I18n.TextDomainMismatch -- Reusing core string.
			human_time_diff( $timestamp )
		);
	} else {
		return (string) wp_date( $format, $timestamp );
	}
}
