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

//	return '<pre>' . var_export($block, true) . '</pre>';

	// Abort if the block is empty or the necessary context and block binding are absent.
	if (
		'' === $block_content ||
		! isset( $instance->context['postId'] ) ||
		! isset( $block['attrs']['metadata']['bindings']['datetime']['source'], $block['attrs']['metadata']['bindings']['datetime']['args']['key'] ) ||
		'core/post-data' !== $block['attrs']['metadata']['bindings']['datetime']['source'] ||
		'date' !== $block['attrs']['metadata']['bindings']['datetime']['args']['key']
	) {
		return $block_content;
	}

	// Abort if this block is not for the Publish Date (e.g. it's for the Modified Date).
	$source = get_block_bindings_source( $block['attrs']['metadata']['bindings']['datetime']['source'] );
//	$source_args = $block['attrs']['metadata']['bindings']['datetime']['args'];
//	if ( ! isset( $source_args['key'] ) || 'date' !== $source_args['key'] ) {
//		return $block_content;
//	}

	$modified_source_args = array_merge(
		$block['attrs']['metadata']['bindings']['datetime']['args'],
		array( 'key' => 'modified' )
	);
	$modified_datetime  = $source->get_value( $modified_source_args, $instance, 'datetime' );
	$modified_timestamp = strtotime( $modified_datetime );

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

	// TODO: The "modified" text should come from the editor and/or be translatable.
	// TODO: Injecting the markup should be handled better, with the HTML API.


	$processor = new class( $block_content ) extends WP_HTML_Tag_Processor {
		public function append_html( string $html ): bool {
			if ( ! $this->has_bookmark( 'last_closing_tag' ) ) {
				return false;
			}
			$start = $this->bookmarks['last_closing_tag']->start;

			$this->lexical_updates[] = new WP_HTML_Text_Replacement(
				$start,
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
		' (%s <time class="updated" datetime="%s">%s</time>)',
		esc_html__( 'Modified:', 'post-date-modified-block' ),
		esc_attr( wp_date( 'c', $modified_timestamp ) ),
		esc_html( $formatted_date )
	);

	$processor->append_html( $html );

	//$block_content = str_replace( '</div>', ' (Modified: ' . $formatted_date . ')</div>', $block_content );
	$block_content = $processor->get_updated_html();


	return $block_content;
}

add_filter(
	'render_block_core/post-date',
	__NAMESPACE__ . '\filter_block',
	10,
	3
);
