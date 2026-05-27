
# Logging

This document defines the recommended structured log format, concrete examples, and a minimal `winston` configuration for production-ready JSON logs.

## Goals

- Produce structured, machine-parseable logs for ingestion by ELK, Loki, Datadog, or similar pipelines.
- Include correlation and trace identifiers for request linking.
- Avoid sensitive data in logs.

## JSON Log Contract

All logs should be emitted as single-line JSON objects. The standard fields are:

- `timestamp` (ISO 8601): event time.
- `level` (`error|warn|info|debug|trace`): severity of the event.
- `service` (string): service name, for example `backend`.
- `env` (string): environment, for example `development`, `staging`, `production`.
- `message` (string): human-readable summary.
- `correlationId` (string|null): request-scoped id shared across services.
- `traceId` (string|null): distributed trace id.
- `spanId` (string|null): trace span id.
- `component` (string|null): subsystem, for example `search`, `worker`, `db`.
- `meta` (object|null): structured metadata such as ids, counts, durations, or filters.
- `error` (object|null): structured error details when a failure occurs.

## Template

Use this shape as the default contract for request, worker, and error events:

```json
{
	"timestamp": "ISO-8601 timestamp",
	"level": "error|warn|info|debug|trace",
	"service": "backend",
	"env": "development|staging|production",
	"message": "Human-readable summary",
	"correlationId": "request-scoped id",
	"traceId": "distributed trace id (optional)",
	"spanId": "trace span id (optional)",
	"component": "search|worker|db|queue",
	"meta": {
		"durationMs": 42,
		"entityId": "prod-123",
		"count": 12
	},
	"error": {
		"type": "HttpError",
		"message": "429 Too Many Requests",
		"stack": "Error: 429..."
	}
}
```

## Examples

### Info event

```json
{
	"timestamp": "2026-05-26T12:34:56.789Z",
	"level": "info",
	"service": "backend",
	"env": "production",
	"message": "Cart total recalculated",
	"correlationId": "req-123",
	"component": "cart",
	"meta": { "cartId": "cart-45", "items": 3, "durationMs": 18 }
}
```

### Warn event

```json
{
	"timestamp": "2026-05-26T12:35:12.004Z",
	"level": "warn",
	"service": "backend",
	"env": "production",
	"message": "Search returned partial results",
	"correlationId": "req-124",
	"component": "search",
	"meta": { "q": "milk", "fallbackUsed": true, "durationMs": 91 }
}
```

### Error event

```json
{
	"timestamp": "2026-05-26T12:35:01.123Z",
	"level": "error",
	"service": "backend",
	"env": "production",
	"message": "Failed to index product",
	"correlationId": "req-125",
	"traceId": "trace-xyz",
	"component": "indexer",
	"meta": { "productId": "prod-123", "attempt": 2 },
	"error": {
		"type": "HttpError",
		"message": "429 Too Many Requests",
		"stack": "Error: 429\n at ..."
	}
}
```

## Minimal `winston` Config

```js
const { createLogger, transports, format } = require('winston');

const logger = createLogger({
	level: process.env.LOG_LEVEL || 'info',
	format: format.combine(
		format.timestamp(),
		format.errors({ stack: true }),
		format.printf(({ timestamp, level, message, ...rest }) =>
			JSON.stringify(Object.assign({ timestamp, level, message }, rest))
		)
	),
	transports: [new transports.Console()],
});

module.exports = logger;
```

## Field Guidance

- Generate `correlationId` at the HTTP entrypoint and pass it through background jobs.
- Keep `meta` small and structured; avoid logging full request bodies.
- Include `error.type`, `error.message`, and `error.stack` only where it is safe to do so.
- In containers, emit to stdout/stderr and let the platform collect logs.

## Query Examples

- Kibana / Elasticsearch: filter by `correlationId` to trace a request across services.
- Example ES query: `correlationId: "req-123" AND level: error`

## Checklist

- [ ] Use structured `meta` instead of free text for contextual data.
- [ ] Add `correlationId` to request-scoped log entries.
- [ ] Do not log secrets, tokens, or full card numbers.
- [ ] Keep error output minimal in production and detailed in staging when needed.

