( ( wp ) => {
	const { addFilter } = wp.hooks;
	const { InspectorControls } = wp.blockEditor;
	const {
		PanelBody,
		TextControl,
		ToggleControl,
		Flex,
		FlexItem,
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
	 * @param {import('@wordpress/blocks').BlockConfiguration} settings Block settings.
	 * @param {string}                                         name     Block name.
	 * @return {import('@wordpress/blocks').BlockConfiguration} Modified block settings.
	 */
	const addModifiedDateTemplateAttribute = ( settings, name ) => {
		if ( name !== 'core/post-date' ) {
			return settings;
		}

		/* translators: %s is the <time> element */
		const [ defaultModifiedPrefix, defaultModifiedSuffix ] = __(
			'(Modified: %s)',
			'post-date-modified-block'
		).split( '%s' );

		return {
			...settings,
			attributes: {
				...settings.attributes,
				showModifiedDateWhenDifferent: {
					type: 'boolean',
					default: true,
				},
				modifiedPrefix: {
					type: 'string',
					default: defaultModifiedPrefix,
				},
				modifiedSuffix: {
					type: 'string',
					default: defaultModifiedSuffix,
				},
				modifiedDateOnSeparateLine: {
					type: 'boolean',
					default: false,
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
					label: __( 'Prefix', 'post-date-modified-block' ),
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
					label: __( 'Suffix', 'post-date-modified-block' ),
					value: suffix,
					onChange: onSuffixChange,
				} )
			)
		);
	};

	/**
	 * Component for the modified date settings.
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
			createElement( PrefixSuffixControls, {
				prefix: modifiedPrefix,
				suffix: modifiedSuffix,
				placeholder: __( 'Modified:', 'post-date-modified-block' ),
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
				__( 'Published Date Display', 'post-date-modified-block' )
			),

			createElement( ToggleControl, {
				__nextHasNoMarginBottom: true,
				label: __(
					'Show on separate line',
					'post-date-modified-block'
				),
				checked: modifiedDateOnSeparateLine,
				onChange: ( /** @type {boolean} */ value ) =>
					setAttributes( {
						modifiedDateOnSeparateLine: value,
					} ),
			} ),

			createElement( PrefixSuffixControls, {
				prefix: publishedPrefix,
				suffix: publishedSuffix,
				placeholder: __( 'Published:', 'post-date-modified-block' ),
				onPrefixChange: ( /** @type {string} */ value ) =>
					setAttributes( {
						publishedPrefix: value,
					} ),
				onSuffixChange: ( /** @type {string} */ value ) =>
					setAttributes( {
						publishedSuffix: value,
					} ),
			} )
		);
	};

	/**
	 * @typedef {import('@wordpress/blocks').BlockEditProps<PostDateModifiedAttributes> & { name: string }} PostDateModifiedEditProps
	 */

	/**
	 * Add Inspector Control to core/post-date block.
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
								'post-date-modified-block'
							),
						},
						createElement( ToggleControl, {
							__nextHasNoMarginBottom: true,
							label: __(
								'Show modified date when different from published date.',
								'post-date-modified-block'
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
