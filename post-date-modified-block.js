( ( wp ) => {
	const { addFilter } = wp.hooks;
	const { InspectorControls } = wp.blockEditor;
	const { PanelBody, TextControl, ToggleControl } = wp.components;
	const { __, sprintf } = wp.i18n;
	const { createElement, Fragment } = wp.element;
	const { store: blocksStore } = wp.blocks;
	const { useSelect } = wp.data;

	/**
	 * Add modifiedDateTemplate attribute to core/post-date block.
	 *
	 * @param {Object} settings Block settings.
	 * @param {string} name     Block name.
	 * @return {Object} Modified block settings.
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
					default: true
				},
				modifiedDateTemplate: {
					type: 'string',
					default: window.postDateModifiedBlockDefaultTemplate || '',
				},
				modifiedDateOnSeparateLine: {
					type: 'boolean',
					default: false,
				},
				publishDatePrefix: {
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
	 * @param {Function} BlockEdit Original BlockEdit component.
	 * @return {Function} Wrapped BlockEdit component.
	 */
	const withModifiedDateTemplateControl = ( BlockEdit ) => {
		return ( props ) => {
			const { name, attributes, setAttributes } = props;

			const activeBlockVariationName = useSelect(
				( select ) =>
					select( blocksStore ).getActiveBlockVariation(
						name,
						attributes
					)?.name,
				[ name, attributes ]
			);

			// Only show the control if it is the core/post-date block and the 'post-date' variation is active.
			if ( name !== 'core/post-date' || activeBlockVariationName !== 'post-date' ) {
				return createElement( BlockEdit, props );
			}

			const { showModifiedDateWhenDifferent, modifiedDateTemplate, modifiedDateOnSeparateLine, publishDatePrefix } = attributes;

			const panelElements = [];
			if ( showModifiedDateWhenDifferent ) {
				panelElements.push(
					createElement( TextControl, {
						__next40pxDefaultSize: true,
						__nextHasNoMarginBottom: true,
						label: __( 'Template', 'post-date-modified-block' ),
						value: modifiedDateTemplate,
						onChange: ( value ) => setAttributes( { modifiedDateTemplate: value } ),
						help: sprintf(
							/* translators: %s is %%date%% */
							__( 'Template for displaying modified date when it differs from the published date. The date in the format above is displayed where %s appears.', 'post-date-modified-block' ),
							'%%date%%'
						),
					} ),
					createElement( ToggleControl, {
						__nextHasNoMarginBottom: true,
						label: __( 'Show on separate line', 'post-date-modified-block' ),
						checked: modifiedDateOnSeparateLine,
						onChange: ( value ) => setAttributes( { modifiedDateOnSeparateLine: value } ),
					} ),
					createElement( TextControl, {
						__next40pxDefaultSize: true,
						__nextHasNoMarginBottom: true,
						label: __( 'Publish date prefix', 'post-date-modified-block' ),
						value: publishDatePrefix,
						onChange: ( value ) => setAttributes( { publishDatePrefix: value } ),
						help: __( 'Label to prefix to the published date when the modified date is displayed.', 'post-date-modified-block' ),
					} )
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
						{ title: __( 'With Modified Date', 'post-date-modified-block' ) },
						// TODO: Add validity to show a warning when the string lacks '%%date%%';
						createElement( ToggleControl, {
							__nextHasNoMarginBottom: true,
							label: __( 'Show modified date when different from publish date.', 'post-date-modified-block' ),
							checked: showModifiedDateWhenDifferent,
							onChange: ( value ) => setAttributes( { showModifiedDateWhenDifferent: value } ),
						} ),
						...panelElements
					),
				),
			);
		};
	};

	addFilter(
		'editor.BlockEdit',
		'post-date-modified-block/with-inspector-control',
		withModifiedDateTemplateControl
	);
} )( window.wp );
