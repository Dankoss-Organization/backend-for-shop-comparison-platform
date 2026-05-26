
# Logging

This document defines the recommended structured log format, examples and a minimal `winston` configuration for production-ready JSON logs.

1) Goals

- Produce structured, machine-parseable logs (JSON) for ingestion by log pipelines (ELK/Loki/Datadog).
- Include correlation and trace identifiers for request linking.
- Avoid sensitive data in logs.

2) Recommended JSON log schema (single-line JSON)

All logs should be emitted as single-line JSON objects with the following fields when available:

- `timestamp` (ISO 8601): event time
- `level` (string): `error|warn|info|debug|trace`
- `service` (string): service name (e.g. `backend`) 
- `env` (string): environment (e.g. `development`, `staging`, `production`)
- `message` (string): human-readable message
- `correlationId` (string|null): request-scoped id shared across services
- `traceId` (string|null): distributed-trace id (optional)
- `spanId` (string|null): trace span id (optional)
- `component` (string|null): subsystem (e.g. `search`, `worker`, `db`)
- `meta` (object|null): additional structured metadata (ids, durations, filters, error details)

Example JSON log (info):

```json
{"timestamp":"2026-05-26T12:34:56.789Z","level":"info","service":"backend","env":"production","message":"Product search executed","correlationId":"req-123","traceId":"trace-abc","component":"search","meta":{"q":"apple","limit":20,"durationMs":42,"results":12}}
```

Example JSON log (error):

```json
{"timestamp":"2026-05-26T12:35:01.123Z","level":"error","service":"backend","env":"production","message":"Failed to index product","correlationId":"req-124","component":"indexer","meta":{"productId":"prod-123"},"error":{"type":"HttpError","message":"429 Too Many Requests","stack":"Error: 429\n at ..."}}
```

3) Minimal `winston` config example (JSON output)

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

4) Field guidance

- Correlation IDs: generate at HTTP entrypoint (middleware) and include for background jobs.
- Error objects: include `type`, `message`, and `stack` only in non-sensitive environments; redact in public logs.
- Meta: prefer small, structured objects (ids, counts, durations). Avoid dumping large request bodies.

5) Rotation, retention and ingestion

- In containers emit to stdout/stderr and let the platform collect logs (Docker, Kubernetes). Use a log forwarder to send JSON to ELK/Loki.
- Set retention and rotation policy in the log backend (not in-app).

6) Query examples

- Kibana / Elasticsearch: filter by `correlationId` to trace a request across services.
- Example ES query: `correlationId: "req-123" AND level: error`

7) Checklist for adding logs

- [ ] Use structured `meta` instead of free-text when adding contextual data.
- [ ] Add `correlationId` to logs emitted in request scope.
- [ ] Do not log secrets (passwords, tokens, full card numbers).
- [ ] Ensure exceptions include stack traces in staging, and minimal fields in production if required.

