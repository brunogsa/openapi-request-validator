# OpenAPI Request Validator

A simple command-line tool that validates HTTP requests against OpenAPI specifications. Useful for debugging validation errors and ensuring API request/response conformance.

## Features

- Validates HTTP requests against OpenAPI 3.0 schemas
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
node openapi-request-validator.js <openapi-spec> <HTTP-verb> <endpoint-path> [payload-file]
```

### Parameters

- `openapi-spec`: Path to your OpenAPI specification file (YAML or JSON)
- `HTTP-verb`: HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD)
- `endpoint-path`: API endpoint path with optional querystrings (e.g., `/v1/orders?state=SP`)
- `payload-file`: Path to the JSON payload file (optional for GET/HEAD requests)

### Examples

```bash
# Validate POST request with payload
node openapi-request-validator.js openapi.yaml POST /v1/orders payload.json

# Validate GET request (no payload needed)
node openapi-request-validator.js openapi.yaml GET /v1/orders

# Validate POST request with query parameters
node openapi-request-validator.js openapi.yaml POST /v1/orders payload.json

# Validate GET request with query parameters
node openapi-request-validator.js openapi.yaml GET /v1/orders?state=SP&limit=10
```

## Validation Rules

- **Endpoint paths** must start with `/` and be valid HTTP paths
- **OpenAPI spec** files must have `.yaml`, `.yml`, or `.json` extensions
- **Payload files** must have `.json` extension
- **Request body validation** only occurs when both payload file is provided and the endpoint accepts a request body
- **Missing payload** validation occurs for POST/PUT/PATCH requests that require a request body

## Examples

The `examples/` folder contains sample files for testing:

- `openapi.yaml` - Simple OpenAPI 3.0 specification with users and orders endpoints
- `create-user.json` - Valid payload for creating a user
- `update-user.json` - Valid payload for updating a user
- `create-order.json` - Valid payload for creating an order
- `invalid-user.json` - Invalid payload for testing validation errors

### Running Tests

```bash
npm test
```

This runs the validator against multiple example scenarios including both valid and invalid payloads to ensure the tool works correctly.

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
