# OpenAPI Payload Validator

A simple command-line tool that validates JSON payloads against OpenAPI specifications. Useful for debugging validation errors and ensuring API request/response conformance.

## Features

- Validates JSON payloads against OpenAPI 3.0 schemas
- Colored output for better readability
- Detailed error messages with contextual tips
- Supports dereferenced OpenAPI specs (resolves $refs)
- Fast validation using AJV with format support

## Prerequisites

- **Node.js**: Version 20.0 or higher
- **npm**: Version 10.0 or higher (comes with Node.js 20+)

You can check your versions with:
```bash
node --version
npm --version
```

## Installation

```bash
npm install
```

## Usage

```bash
node index.js <openapi-spec> <payload-file>
```

### Parameters

- `openapi-spec`: Path to your OpenAPI specification file (YAML or JSON)
- `payload-file`: Path to the JSON payload file to validate

### Example

```bash
node index.js openapi.yaml payload.json
```

## Configuration

Currently, the tool is configured to validate against a specific schema path:
`/v1/webhooks/4mdg/product_upserted` (POST request body)

To validate against different schemas, modify the schema path in `index.js:29-30`.

## Sample Files

The repository includes sample files for testing:

- `openapi.yaml` - Example OpenAPI specification
- `payload.json` - Example payload for validation
- `kit-1.payload.json`, `kit-2.payload.json` - Additional test payloads

## Output

### Success
```
✅ Payload is valid!
```

### Validation Errors
```
❌ Payload validation errors:

#1 /productType: must be equal to one of the allowed values
   → Allowed values: kit, book, digital

#2 /payload: must have required property 'sku'
   → Missing property: sku
```

## License

MIT
