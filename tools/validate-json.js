#!/usr/bin/env node

/* eslint-disable no-console */
/* eslint-disable @wordpress/no-setting-ds-tokens, @wordpress/no-unknown-ds-tokens */

/**
 * Internal dependencies
 */
const fs = require( 'fs' );
const path = require( 'path' );

/**
 * External dependencies
 */
const Ajv7 = require( 'ajv' ).default;
const Ajv4 = require( 'ajv-draft-04' ).default;
const addFormats = require( 'ajv-formats' ).default;
const fg = require( 'fast-glob' );

/**
 * @typedef {import('ajv').default} Ajv
 */

const schemaCache = new Map();

/**
 * @template {Ajv} T
 * @typedef {{ new (options: Object): T }} AjvConstructorType
 */

/**
 * Creates an Ajv instance.
 *
 * @template {Ajv} T
 * @param {AjvConstructorType<T>} AjvConstructor Ajv constructor.
 * @return {T} Ajv instance.
 */
function createAjv( AjvConstructor ) {
	const ajv = new AjvConstructor( {
		allErrors: true,
		strict: false,
		loadSchema: fetchSchema,
	} );

	addFormats( ajv );

	ajv.removeKeyword( 'deprecated' );
	ajv.addKeyword( {
		keyword: 'deprecated',
		validate: ( /** @type {string|boolean} */ deprecation ) =>
			! deprecation,
		error: {
			/**
			 * @param {Object}        cxt
			 * @param {string|Object} [cxt.schema]
			 */
			message: ( cxt ) => {
				return cxt.schema && typeof cxt.schema === 'string'
					? `is deprecated: ${ cxt.schema }`
					: 'is deprecated';
			},
		},
	} );

	return ajv;
}

const ajv7 = createAjv( Ajv7 );
const ajv4 = createAjv( Ajv4 );

/**
 * Fetches a JSON schema from a URL.
 *
 * @param {string} schemaUrl URL of the JSON schema.
 * @return {Promise<any>} The JSON schema object.
 */
async function fetchSchema( schemaUrl ) {
	if ( schemaCache.has( schemaUrl ) ) {
		return schemaCache.get( schemaUrl );
	}

	const response = await fetch( schemaUrl );
	if ( ! response.ok ) {
		throw new Error(
			`Failed to fetch schema from ${ schemaUrl }: ${ response.statusText }`
		);
	}
	const schema = await response.json();
	schemaCache.set( schemaUrl, schema );

	return schema;
}

/**
 * Fetches a JSON schema and determines its draft version.
 *
 * @param {string} schemaUrl URL of the JSON schema.
 * @return {Promise<'draft-04'|'default'>} The draft version ('draft-04' or 'default').
 */
async function getSchemaDraft( schemaUrl ) {
	const schema = await fetchSchema( schemaUrl );
	const draft = typeof schema.$schema === 'string' ? schema.$schema : '';
	// Default to 'default' (modern Ajv) for other cases.
	return draft.includes( 'draft-04' ) ? 'draft-04' : 'default';
}

/**
 * Validates a JSON file against its schema.
 *
 * @param {string} filePath Path to the JSON file.
 * @return {Promise<boolean>} Whether the file is valid.
 */
async function validateFile( filePath ) {
	const absolutePath = path.resolve( process.cwd(), filePath );
	if ( ! fs.existsSync( absolutePath ) ) {
		console.error( `File not found: ${ filePath }` );
		return false;
	}

	const content = fs.readFileSync( absolutePath, 'utf8' );

	const maxBlueprintSizeKB = 1000; // See <https://github.com/WordPress/wordpress.org/blob/e76f2913139cd2c7d9fd26895dda58685d16aa81/wordpress.org/public_html/wp-content/plugins/plugin-directory/cli/class-import.php#L809>.
	if (
		filePath === '.wordpress-org/blueprints/blueprint.json' &&
		content.length > maxBlueprintSizeKB * 1024
	) {
		console.error(
			`Error: ${ filePath } is too large (${ content.length } bytes). Max allowed is ${ maxBlueprintSizeKB } KB.`
		);
		return false;
	}

	let data;
	try {
		data = JSON.parse( content );
	} catch ( error ) {
		if ( error instanceof Error ) {
			console.error(
				`Error parsing JSON in ${ filePath }: ${ error.message }`
			);
		}
		return false;
	}

	if ( data.$schema ) {
		console.log(
			`Validating ${ filePath } against schema: ${ data.$schema }`
		);
		try {
			const draft = await getSchemaDraft( data.$schema );
			const ajvInstance = draft === 'draft-04' ? ajv4 : ajv7;
			const validate = await ajvInstance.compileAsync( {
				$ref: data.$schema,
			} );
			const valid = validate( data );

			if ( ! valid ) {
				console.error( `Validation failed for ${ filePath }:` );
				if ( validate.errors ) {
					validate.errors.forEach( ( error ) => {
						console.error(
							`- ${ error.instancePath } ${ error.message }`
						);
					} );
				}
				return false;
			}
		} catch ( error ) {
			if ( error instanceof Error ) {
				console.error(
					`Error validating ${ filePath }: ${ error.message }`
				);
			}
			return false;
		}
	}

	return true;
}

const args = process.argv.slice( 2 );
const patterns = args.length > 0 ? args : [ '**/*.json' ];

( async () => {
	const files = await fg( patterns, {
		dot: true,
		ignore: [
			'node_modules/**',
			'vendor/**',
			'build/**',
			'plugins/*/build/**',
		],
	} );

	if ( files.length === 0 && args.length > 0 ) {
		console.error( 'No JSON files found matching the provided patterns.' );
		process.exit( 1 );
	}

	let hasError = false;
	for ( const file of files ) {
		const isValid = await validateFile( file );
		if ( ! isValid ) {
			hasError = true;
		}
	}

	if ( hasError ) {
		process.exit( 1 );
	}
} )();
