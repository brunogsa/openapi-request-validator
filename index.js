const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const SwaggerParser = require('swagger-parser');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const chalk = require('chalk');

async function main() {
  const [,, specPath, payloadPath] = process.argv;

  if (!specPath || !payloadPath) {
    console.error('Usage: node validate.js <openapi.yaml> <payload.json>');
    process.exit(1);
  }

  // Parse YAML spec
  const openapiRaw = fs.readFileSync(specPath, 'utf8');
  const openapi = YAML.parse(openapiRaw);

  // Load and dereference OpenAPI (resolve $refs)
  const dereferenced = await SwaggerParser.dereference(openapi);

  // Load payload
  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

  // 🔧 Manually pick the schema you want to validate against:
  // Here we assume POST /v1/webhooks/4mdg/product_upserted
  const schema = dereferenced.paths['/v1/webhooks/4mdg/product_upserted']
    .post.requestBody.content['application/json'].schema;

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
