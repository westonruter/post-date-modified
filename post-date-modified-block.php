<?php
/**
 * Plugin Name: Post Date + Modified Block
 * Description: This depends on Gutenberg??
 * Requires at least: 6.9
 * Requires PHP: 7.2
 */

namespace PostDateModifiedBlock;

use WP_Block;
use WP_HTML_Tag_Processor;
use WP_HTML_Text_Replacement;

/**
 * Filters the content of a single block Date block to add the Modified date as well if it is different.
 *
 * This is not backwards-compatible with the Post Date block prior to block bindings. It is also only supports the
 * 'field' arg, as opposed to the 'key' arg previously implemented in Gutenberg.
 *
 * @phpstan-param array{
 *     "blockName": non-empty-string,
 *     "attrs"?: array{
 *         "displayType"?: "modified",
 *         "format"?: non-empty-string,
 *         "datetime"?: non-empty-string,
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

	if (
		// Short-circuit if nothing is being displayed.
		'' === $block_content
		||
		// Pass through Date block from 6.8 which has the "Display last modified date" setting enabled.
		( isset( $block['attrs']['displayType'] ) && 'modified' === $block['attrs']['displayType'] )
		||
		// Pass through Date block from 6.9 if it isn't for displaying the published date.
		(
			// This indicates the block is from 6.9.
			isset( $block['attrs']['datetime'] ) &&
			(
				! isset(
					$block['attrs']['metadata']['bindings']['datetime']['source'],
					$block['attrs']['metadata']['bindings']['datetime']['args']['field']
				) ||
				'core/post-data' !== $block['attrs']['metadata']['bindings']['datetime']['source'] ||
				'date' !== $block['attrs']['metadata']['bindings']['datetime']['args']['field']
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
	$published_datetime = $source->get_value( array( 'field' => 'date' ), $instance, 'datetime' );
	if ( ! $published_datetime ) {
		return $block_content;
	}
	$published_timestamp = strtotime( $published_datetime );

	// Get the modified date.
	$modified_datetime = $source->get_value( array( 'field' => 'modified' ), $instance, 'datetime' );
	if ( ! $modified_datetime ) {
		return $block_content;
	}
	$modified_timestamp = strtotime( $modified_datetime );

	$date_format = $block['attrs']['format'] ?? get_option( 'date_format' );

	// Skip appending the modified date if it would be displayed the same as the published date.
	$published_date_formatted = format_date( $published_timestamp, $date_format );
	$modified_date_formatted  = format_date( $modified_timestamp, $date_format );
	if ( $published_date_formatted === $modified_date_formatted ) {
		return $block_content;
	}

	$processor = new class( $block_content ) extends WP_HTML_Tag_Processor {
		public function append_html( string $html ): bool {
			if ( ! $this->has_bookmark( 'last_closing_tag' ) ) {
				return false;
			}
			$this->lexical_updates[] = new WP_HTML_Text_Replacement(
				$this->bookmarks['last_closing_tag']->start,
				0,
				$html
			);
			return true;
		}
	};
	while ( $processor->next_tag( array( 'tag_closers' => 'visit' ) ) ) {
		if ( $processor->is_tag_closer() ) {
			$processor->set_bookmark( 'last_closing_tag' );
		} else if ( 'TIME' === $processor->get_tag() ) {
			// Microformat classes used at <https://github.com/WordPress/wordpress-develop/blob/ebd415b045a2b1bbeb4d227e890c78a15ff8d85e/src/wp-content/themes/twentynineteen/inc/template-tags.php#L15-L18>.
			$processor->add_class( 'entry-date' );
			$processor->add_class( 'published' );
		}
	}
	$processor->seek( 'last_closing_tag' );

	// See Microformat classes used at <https://github.com/WordPress/wordpress-develop/blob/ebd415b045a2b1bbeb4d227e890c78a15ff8d85e/src/wp-content/themes/twentynineteen/inc/template-tags.php#L17>.
	$html = sprintf(
		' <span class="modified">(%s <time class="updated" datetime="%s">%s</time>)</span>',
		// TODO: The "modified" text should come from the editor.
		esc_html__( 'Modified:', 'post-date-modified-block' ),
		esc_attr( wp_date( 'c', $modified_timestamp ) ),
		esc_html( $modified_date_formatted )
	);

	$processor->append_html( $html );

	return $processor->get_updated_html();
}

add_filter(
	'render_block_core/post-date',
	__NAMESPACE__ . '\filter_block',
	10,
	3
);

/**
 * Formats date.
 *
 * @param positive-int     $timestamp Timestamp.
 * @param non-empty-string $format    Date format.
 * @return non-empty-string Formatted date.
 */
function format_date( int $timestamp, string $format ): string {
	if ( 'human-diff' === $format ) {
		return sprintf(
			/* translators: %s: human-readable time difference. */
			__( '%s ago', 'default' ),
			human_time_diff( $timestamp )
		);
	} else {
		return wp_date( $format, $timestamp );
	}
};
