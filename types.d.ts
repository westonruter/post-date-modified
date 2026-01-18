export type WPGlobal = {
	hooks: import('@wordpress/hooks');
	blockEditor: import('@wordpress/block-editor');
	components: import('@wordpress/components');
	i18n: import('@wordpress/i18n');
	element: import('@wordpress/element');
	blocks: import('@wordpress/blocks');
	data: import('@wordpress/data');
};

export type BlocksSelect = {
	getActiveBlockVariation: (
		blockName: string,
		attributes: Object
	) => { name: string } | undefined;
};
