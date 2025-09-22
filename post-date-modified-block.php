<?php
/**
 * Plugin Name: Post Date + Modified Block
 * Description: This depends on Gutenberg??
 */

namespace PostDateModifiedBlock;

use WP_Block;
use WP_HTML_Tag_Processor;
use WP_HTML_Text_Replacement;

/**
 * Filters the content of a single block.
 *
 * @since 5.0.0
 * @since 5.9.0 The `$instance` parameter was added.
 *
 * @phpstan-param array{
 *     "blockName": non-empty-string,
 *     "attrs"?: array{
 *         "displayType"?: "modified",
 *         "format"?: non-empty-string,
 *         "metadata"?: array{
 *             "bindings"?: array{
 *                 "datetime"?: array{
 *                      "source": non-empty-string,
 *                      "args": array
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

	// Abort if the block is empty, the necessary context and block binding are absent, or it's not for a Date block.
	// TODO: Allow for back-compat without block bindings?
	if (
		'' === $block_content ||
		! isset( $instance->context['postId'] ) ||
		! isset( $block['attrs']['metadata']['bindings']['datetime']['source'], $block['attrs']['metadata']['bindings']['datetime']['args']['key'] ) ||
		'core/post-data' !== $block['attrs']['metadata']['bindings']['datetime']['source'] ||
		'date' !== $block['attrs']['metadata']['bindings']['datetime']['args']['key']
	) {
		return $block_content;
	}

	// Abort if the block binding source is not available.
	$source = get_block_bindings_source( $block['attrs']['metadata']['bindings']['datetime']['source'] );
	if ( null === $source ) {
		return $block_content;
	}

	$modified_source_args = array_merge(
		$block['attrs']['metadata']['bindings']['datetime']['args'],
		array( 'key' => 'modified' )
	);
	$modified_datetime  = $source->get_value( $modified_source_args, $instance, 'datetime' );
	$modified_timestamp = strtotime( $modified_datetime );

	// TODO: Use the Date's binding source value instead of looking at the post ID? But would this allow for it to be backwards-compatible??
	$post_ID = $instance->context['postId'];

	// Skip appending the modified date if it is the same as the published date.
	$modified_threshold_format = 'Ymd';
	if ( get_the_modified_date( $modified_threshold_format, $post_ID ) === get_the_date( $modified_threshold_format, $post_ID ) ) {
		return $block_content;
	}

	if ( isset( $block['attrs']['format'] ) && 'human-diff' === $block['attrs']['format'] ) {
		// translators: %s: human-readable time difference.
		$formatted_date = sprintf(
			__( '%s ago', 'default' ),
			human_time_diff( $modified_timestamp )
		);
	} else {
		$format         = empty( $block['attrs']['format'] ) ? get_option( 'date_format' ) : $block['attrs']['format'];
		$formatted_date = wp_date( $format, $modified_timestamp );
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
		esc_html( $formatted_date )
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
