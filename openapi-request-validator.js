const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const SwaggerParser = require('swagger-parser');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const chalk = require('chalk');

async function main() {
  const args = process.argv.slice(2);
  const [specPath, httpVerb, endpointPathWithOptionalQuerystrings, payloadPath] = args;

  if (!specPath || !httpVerb || !endpointPathWithOptionalQuerystrings) {
    console.log('Usage: node openapi-request-validator.js <openapi-spec> <HTTP-verb> <endpoint-path> [payload-file]');
    console.log('');
    console.log('Parameters:');
    console.log('  openapi-spec: Path to OpenAPI specification file (YAML or JSON)');
    console.log('  HTTP-verb: HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD)');
    console.log('  endpoint-path: API endpoint path with optional querystrings (e.g., /v1/orders?state=SP)');
    console.log('  payload-file: Path to JSON payload file (optional for GET/HEAD requests)');
    console.log('');
    console.log('Examples:');
    console.log('  node openapi-request-validator.js openapi.yaml POST /v1/orders payload.json');
    console.log('  node openapi-request-validator.js openapi.yaml GET /v1/orders?state=SP');
    process.exit(1);
  }

  // Validate HTTP verb
  const allowedVerbs = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];
  if (!allowedVerbs.includes(httpVerb.toUpperCase())) {
    console.log('Usage: node openapi-request-validator.js <openapi-spec> <HTTP-verb> <endpoint-path> [payload-file]');
    console.log('');
    console.log(`Error: HTTP verb must be one of: ${allowedVerbs.join(', ')}`);
    process.exit(1);
  }

  // Validate endpoint path
  if (!endpointPathWithOptionalQuerystrings.startsWith('/')) {
    console.log('Usage: node openapi-request-validator.js <openapi-spec> <HTTP-verb> <endpoint-path> [payload-file]');
    console.log('');
    console.log('Error: Endpoint path must start with /');
    process.exit(1);
  }

  // Validate endpoint path format (basic URL path validation)
  try {
    new URL(endpointPathWithOptionalQuerystrings, 'http://example.com');
  } catch (error) {
    console.log('Usage: node openapi-request-validator.js <openapi-spec> <HTTP-verb> <endpoint-path> [payload-file]');
    console.log('');
    console.log('Error: Invalid endpoint path format');
    process.exit(1);
  }

  // Validate spec file extension
  const specExtension = path.extname(specPath).toLowerCase();
  if (!['.yaml', '.yml', '.json'].includes(specExtension)) {
    console.log('Usage: node openapi-request-validator.js <openapi-spec> <HTTP-verb> <endpoint-path> [payload-file]');
    console.log('');
    console.log('Error: OpenAPI spec file must be .yaml, .yml, or .json');
    process.exit(1);
  }

  // Validate payload file extension (if provided)
  if (payloadPath && path.extname(payloadPath).toLowerCase() !== '.json') {
    console.log('Usage: node openapi-request-validator.js <openapi-spec> <HTTP-verb> <endpoint-path> [payload-file]');
    console.log('');
    console.log('Error: Payload file must be .json');
    process.exit(1);
  }

  // Parse YAML spec
  const openapiRaw = fs.readFileSync(specPath, 'utf8');
  const openapi = YAML.parse(openapiRaw);

  // Load and dereference OpenAPI (resolve $refs)
  const dereferenced = await SwaggerParser.dereference(openapi);

  // Extract path without query parameters for OpenAPI lookup
  const pathWithoutQuery = endpointPathWithOptionalQuerystrings.split('?')[0];
  const method = httpVerb.toLowerCase();

  // Find the schema for validation
  let schema = null;
  const pathSpec = dereferenced.paths[pathWithoutQuery];
  
  if (!pathSpec) {
    console.error(chalk.red(`❌ Path '${pathWithoutQuery}' not found in OpenAPI spec`));
    process.exit(1);
  }

  const methodSpec = pathSpec[method];
  if (!methodSpec) {
    console.error(chalk.red(`❌ Method '${httpVerb}' not found for path '${pathWithoutQuery}' in OpenAPI spec`));
    process.exit(1);
  }

  // Load payload if provided
  let payload = null;
  if (payloadPath) {
    payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
  }

  // Determine what to validate based on method and payload presence
  if (payload && methodSpec.requestBody) {
    // Validate request body
    const requestBody = methodSpec.requestBody;
    if (requestBody.content && requestBody.content['application/json']) {
      schema = requestBody.content['application/json'].schema;
    } else {
      console.error(chalk.red(`❌ No JSON schema found for request body of ${httpVerb} ${pathWithoutQuery}`));
      process.exit(1);
    }
  } else if (payload && !methodSpec.requestBody) {
    console.error(chalk.red(`❌ Payload provided but ${httpVerb} ${pathWithoutQuery} does not accept a request body`));
    process.exit(1);
  } else if (!payload && ['post', 'put', 'patch'].includes(method) && methodSpec.requestBody?.required) {
    console.error(chalk.red(`❌ Payload required for ${httpVerb} ${pathWithoutQuery} but not provided`));
    process.exit(1);
  } else if (!payload) {
    console.log(chalk.green(`✅ No payload validation needed for ${httpVerb} ${pathWithoutQuery}`));
    return;
  }

  // Validate
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(payload);

  if (valid) {
    console.log(chalk.green('✅ Payload is valid!'));
  } else {
    console.error(chalk.red('❌ Payload validation errors:\n'));

    validate.errors.forEach((err, i) => {
      const path = err.instancePath || '(root)';
      const message = `${chalk.yellow(`#${i + 1}`)} ${chalk.cyan(path)}: ${chalk.red(err.message)}`;

      console.log(message);

      // Contextual tips
      if (err.keyword === 'enum') {
        console.log(`   → Allowed values: ${chalk.magenta(err.params.allowedValues.join(', '))}`);
      }

      if (err.keyword === 'required') {
        console.log(`   → Missing property: ${chalk.magenta(err.params.missingProperty)}`);
      }

      if (err.keyword === 'oneOf') {
        console.log(`   → This object didn't match any of the expected schemas`);
      }

      console.log('');
    });

    process.exit(1);
  }
}

main().catch(err => {
  console.error('🚨 Unexpected error:', err);
  process.exit(1);
});
