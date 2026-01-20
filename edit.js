( ( wp ) => {
	const { addFilter } = wp.hooks;
	const { InspectorControls } = wp.blockEditor;
	const {
		PanelBody,
		TextControl,
		ToggleControl,
		Flex,
		FlexItem,
		Notice,
		PanelRow,
		__experimentalDivider: Divider,
		__experimentalHeading: Heading,
	} = wp.components;
	const { __ } = wp.i18n;
	const { createElement, Fragment } = wp.element;
	const { store: blocksStore } = wp.blocks;
	const { useSelect } = wp.data;

	/**
	 * Add modifiedDateTemplate attribute to core/post-date block.
	 *
	 * @since 1.0.0
	 *
	 * @param {import('@wordpress/blocks').BlockConfiguration} settings Block settings.
	 * @param {string}                                         name     Block name.
	 * @return {import('@wordpress/blocks').BlockConfiguration} Modified block settings.
	 */
	const addModifiedDateTemplateAttribute = ( settings, name ) => {
		if ( name !== 'core/post-date' ) {
			return settings;
		}

		return {
			...settings,
			attributes: {
				...settings.attributes,
				showModifiedDateWhenDifferent: {
					type: 'boolean',
					default: false,
				},
				modifiedPrefix: {
					type: 'string',
					default: '',
				},
				modifiedSuffix: {
					type: 'string',
					default: '',
				},
				modifiedDateOnSeparateLine: {
					type: 'boolean',
					default: true,
				},
				publishedPrefix: {
					type: 'string',
					default: '',
				},
				publishedSuffix: {
					type: 'string',
					default: '',
				},
			},
		};
	};

	addFilter(
		'blocks.registerBlockType',
		'post-date-modified-block/add-attribute',
		addModifiedDateTemplateAttribute
	);

	/**
	 * @typedef {Object} PostDateModifiedAttributes
	 * @property {boolean} showModifiedDateWhenDifferent Show modified date when different from published date.
	 * @property {string}  modifiedPrefix                Modified date prefix.
	 * @property {string}  modifiedSuffix                Modified date suffix.
	 * @property {boolean} modifiedDateOnSeparateLine    Show on separate line.
	 * @property {string}  publishedPrefix               Published date prefix.
	 * @property {string}  publishedSuffix               Published date suffix.
	 */

	/**
	 * Component for the prefix and suffix controls.
	 *
	 * @since 1.0.0
	 *
	 * @param {Object}                  props                Component props.
	 * @param {string}                  props.prefix         Prefix value.
	 * @param {string}                  props.suffix         Suffix value.
	 * @param {string}                  [props.placeholder]  Prefix placeholder.
	 * @param {(value: string) => void} props.onPrefixChange Callback for prefix change.
	 * @param {(value: string) => void} props.onSuffixChange Callback for suffix change.
	 * @return {import('react').ReactElement} The component.
	 */
	const PrefixSuffixControls = ( {
		prefix,
		suffix,
		placeholder,
		onPrefixChange,
		onSuffixChange,
	} ) => {
		return createElement(
			Flex,
			null,
			createElement(
				FlexItem,
				null,
				createElement( TextControl, {
					__next40pxDefaultSize: true,
					__nextHasNoMarginBottom: true,
					label: __( 'Prefix', 'post-date-modified' ),
					value: prefix,
					placeholder,
					onChange: onPrefixChange,
				} )
			),
			createElement(
				FlexItem,
				null,
				createElement( TextControl, {
					__next40pxDefaultSize: true,
					__nextHasNoMarginBottom: true,
					label: __( 'Suffix', 'post-date-modified' ),
					value: suffix,
					onChange: onSuffixChange,
				} )
			)
		);
	};

	/**
	 * Component for the modified date settings.
	 *
	 * @since 1.0.0
	 *
	 * @param {Object}                                               props               Component props.
	 * @param {PostDateModifiedAttributes}                           props.attributes    Block attributes.
	 * @param {(attrs: Partial<PostDateModifiedAttributes>) => void} props.setAttributes Callback to set attributes.
	 * @return {import('react').ReactElement} The component.
	 */
	const ModifiedDateSettings = ( { attributes, setAttributes } ) => {
		const {
			modifiedPrefix,
			modifiedSuffix,
			modifiedDateOnSeparateLine,
			publishedPrefix,
			publishedSuffix,
		} = attributes;

		return createElement(
			Fragment,
			null,

			createElement( ToggleControl, {
				__nextHasNoMarginBottom: true,
				label: __( 'Show on separate line', 'post-date-modified' ),
				checked: modifiedDateOnSeparateLine,
				onChange: ( /** @type {boolean} */ value ) =>
					setAttributes( {
						modifiedDateOnSeparateLine: value,
					} ),
			} ),

			createElement( PrefixSuffixControls, {
				prefix: modifiedPrefix,
				suffix: modifiedSuffix,
				placeholder: __( 'Modified:', 'post-date-modified' ),
				onPrefixChange: ( /** @type {string} */ value ) =>
					setAttributes( {
						modifiedPrefix: value,
					} ),
				onSuffixChange: ( /** @type {string} */ value ) =>
					setAttributes( {
						modifiedSuffix: value,
					} ),
			} ),

			createElement( Divider, null ),

			createElement(
				Heading,
				null,
				__( 'Published Date Display', 'post-date-modified' )
			),

			createElement( PrefixSuffixControls, {
				prefix: publishedPrefix,
				suffix: publishedSuffix,
				placeholder: __( 'Published:', 'post-date-modified' ),
				onPrefixChange: ( /** @type {string} */ value ) =>
					setAttributes( {
						publishedPrefix: value,
					} ),
				onSuffixChange: ( /** @type {string} */ value ) =>
					setAttributes( {
						publishedSuffix: value,
					} ),
			} ),

			createElement(
				PanelRow,
				null,
				createElement(
					Notice,
					{ status: 'info', isDismissible: false },
					__(
						'Editor preview is not currently implemented. View saved changes on frontend.',
						'post-date-modified'
					)
				)
			)
		);
	};

	/**
	 * @typedef {import('@wordpress/blocks').BlockEditProps<PostDateModifiedAttributes> & { name: string }} PostDateModifiedEditProps
	 */

	/**
	 * Add Inspector Control to core/post-date block.
	 *
	 * @since 1.0.0
	 *
	 * @param {import('react').ComponentType<PostDateModifiedEditProps>} BlockEdit Original BlockEdit component.
	 * @return {import('react').ComponentType<PostDateModifiedEditProps>} Wrapped BlockEdit component.
	 */
	const withModifiedDateTemplateControl = ( BlockEdit ) => {
		return ( /** @type {PostDateModifiedEditProps} */ props ) => {
			const { name, attributes, setAttributes } = props;

			const activeBlockVariationName = useSelect(
				(
					/** @type {import('@wordpress/data').SelectFunction} */ select
				) => {
					const { getActiveBlockVariation } =
						/** @type {import("./types").BlocksSelect} */ (
							select( blocksStore )
						);
					return getActiveBlockVariation( name, attributes )?.name;
				},
				[ name, attributes ]
			);

			// Only show the control if it is the core/post-date block and the 'post-date' variation is active.
			if (
				name !== 'core/post-date' ||
				activeBlockVariationName !== 'post-date'
			) {
				return createElement( BlockEdit, props );
			}

			const { showModifiedDateWhenDifferent } =
				/** @type {PostDateModifiedAttributes} */ attributes;

			return createElement(
				Fragment,
				null,
				createElement( BlockEdit, props ),
				createElement(
					InspectorControls,
					null,
					createElement(
						PanelBody,
						{
							title: __(
								'With Modified Date',
								'post-date-modified'
							),
						},
						createElement( ToggleControl, {
							__nextHasNoMarginBottom: true,
							label: __(
								'Show modified date when different from published date.',
								'post-date-modified'
							),
							checked: showModifiedDateWhenDifferent,
							onChange: ( /** @type {boolean} */ value ) =>
								setAttributes( {
									showModifiedDateWhenDifferent: value,
								} ),
						} ),
						showModifiedDateWhenDifferent &&
							createElement( ModifiedDateSettings, {
								attributes,
								setAttributes,
							} )
					)
				)
			);
		};
	};

	addFilter(
		'editor.BlockEdit',
		'post-date-modified-block/with-inspector-control',
		withModifiedDateTemplateControl
	);
} )( window.wp );
