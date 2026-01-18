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
	 * @param {any}    settings Block settings.
	 * @param {string} name     Block name.
	 * @return {Object} Modified block settings.
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
	 * Add Inspector Control to core/post-date block.
	 *
	 * @param {import('react').ComponentType} BlockEdit Original BlockEdit component.
	 * @return {Function} Wrapped BlockEdit component.
	 */
	const withModifiedDateTemplateControl = ( BlockEdit ) => {
		return ( /** @type {any} */ props ) => {
			const { name, attributes, setAttributes } = props;

			const activeBlockVariationName = useSelect(
				( /** @type {any} */ select ) => {
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

			const {
				showModifiedDateWhenDifferent,
				modifiedPrefix,
				modifiedSuffix,
				modifiedDateOnSeparateLine,
				publishedPrefix,
				publishedSuffix,
			} = attributes;

			const panelElements = [];
			if ( showModifiedDateWhenDifferent ) {
				panelElements.push(
					createElement(
						Flex,
						null,
						createElement(
							FlexItem,
							null,
							createElement( TextControl, {
								__next40pxDefaultSize: true,
								__nextHasNoMarginBottom: true,
								label: __(
									'Prefix',
									'post-date-modified-block'
								),
								value: modifiedPrefix,
								placeholder: __(
									'Modified:',
									'post-date-modified-block'
								),
								onChange: ( /** @type {string} */ value ) =>
									setAttributes( { modifiedPrefix: value } ),
							} )
						),
						createElement(
							FlexItem,
							null,
							createElement( TextControl, {
								__next40pxDefaultSize: true,
								__nextHasNoMarginBottom: true,
								label: __(
									'Suffix',
									'post-date-modified-block'
								),
								value: modifiedSuffix,
								onChange: ( /** @type {string} */ value ) =>
									setAttributes( { modifiedSuffix: value } ),
							} )
						)
					),

					createElement( Divider, null ),

					createElement(
						Heading,
						null,
						__(
							'Published Date Display',
							'post-date-modified-block'
						)
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

					createElement(
						Flex,
						null,
						createElement(
							FlexItem,
							null,
							createElement( TextControl, {
								__next40pxDefaultSize: true,
								__nextHasNoMarginBottom: true,
								label: __(
									'Prefix',
									'post-date-modified-block'
								),
								value: publishedPrefix,
								placeholder: __(
									'Published:',
									'post-date-modified-block'
								),
								onChange: ( /** @type {string} */ value ) =>
									setAttributes( { publishedPrefix: value } ),
							} )
						),
						createElement(
							FlexItem,
							null,
							createElement( TextControl, {
								__next40pxDefaultSize: true,
								__nextHasNoMarginBottom: true,
								label: __(
									'Suffix',
									'post-date-modified-block'
								),
								value: publishedSuffix,
								onChange: ( /** @type {string} */ value ) =>
									setAttributes( { publishedSuffix: value } ),
							} )
						)
					)
				);
			}

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
						...panelElements
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
