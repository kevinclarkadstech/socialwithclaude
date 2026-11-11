import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
// Locally, load .env.local before initializing OpenTelemetry. In production the environment is set
// by the platform and there's no file (loading a missing one throws, so the API wouldn't start).
if (process.env.NODE_ENV !== 'production' && existsSync('./.env.local')) {
    loadEnvFile('./.env.local');
}
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { BatchLogRecordProcessor, ConsoleLogRecordExporter, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace';

const isProduction = process.env.NODE_ENV === 'production';
const localUI = new Set((process.env.OTEL_LOCAL_UI || '').split(','));

/**
 * Where to send a signal (TRACES or LOGS): the standard OTLP variables, e.g.
 * OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS, or the per-signal
 * OTEL_EXPORTER_OTLP_TRACES_ENDPOINT / _HEADERS. Any OTLP backend works (Sentry,
 * Grafana, a collector); the exporters read these variables themselves.
 */
const hasOtlpEndpoint = (signal) =>
    Boolean(process.env[`OTEL_EXPORTER_OTLP_${signal}_ENDPOINT`] || process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

// Traces: to the configured OTLP endpoint; else locally to Jaeger from docker-compose when
// OTEL_LOCAL_UI includes "jaeger" (UI at http://localhost:16686); else nowhere. (With no span
// processors given, the SDK would default to OTLP at localhost:4318, so "nowhere" is an empty list.)
const traceExporter = hasOtlpEndpoint('TRACES')
    ? new OTLPTraceExporter()
    : !isProduction && localUI.has('jaeger')
        ? new OTLPTraceExporter({ url: 'http://localhost:4318/v1/traces' })
        : null;
const spanProcessors = traceExporter ? [new BatchSpanProcessor({ exporter: traceExporter })] : [];

// OTel logs: to the configured OTLP endpoint; else to the console locally; else nowhere.
const logRecordProcessors = hasOtlpEndpoint('LOGS')
    ? [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })]
    : isProduction
        ? []
        : [new SimpleLogRecordProcessor({ exporter: new ConsoleLogRecordExporter() })];

const otelSdk = new NodeSDK({
    resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "my-nitro-app",
        [ATTR_SERVICE_VERSION]: "1.0.0",
    }),
    spanProcessors,
    // No metrics yet. Without this the SDK sets up a default OTLP metrics exporter to localhost:4318,
    // which has nothing to send to and holds up shutdown by several seconds trying.
    metricReaders: [],
    logRecordProcessors,
    instrumentations: [getNodeAutoInstrumentations(
        {
            "@opentelemetry/instrumentation-fs": { enabled: false },
            "@opentelemetry/instrumentation-pino": { enabled: false, }
        }
    )],
})

// Flush on shutdown, but don't exit: the server's own SIGTERM handling closes connections and then exits.
process.once('SIGTERM', () => {
    otelSdk.shutdown()
        .then(() => console.log('OTel SDK terminated'))
        .catch((error) => console.log('Error terminating OTel SDK', error));
});

otelSdk.start();