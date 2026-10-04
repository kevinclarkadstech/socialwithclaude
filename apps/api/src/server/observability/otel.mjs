import { NodeSDK } from '@opentelemetry/sdk-node'
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
// import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
// import { PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';

const isProduction = process.env.NODE_ENV === 'production' && !!process.env.NEW_RELIC_LICENSE_KEY

const traceExporter = isProduction
    ? new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "https://otlp.nr-data.net:4318/v1/traces",
        headers: {
            "api-key": process.env.NEW_RELIC_LICENSE_KEY || "",
        },
    })
    : process.env.OTEL_LOCAL_UI === 'jaeger'
        ? new OTLPTraceExporter({ url: 'http://localhost:4318/v1/traces' })
        : undefined; //new ConsoleSpanExporter()

// const metricReader = new PeriodicExportingMetricReader({
//     exporter: isProduction
//         ? new OTLPMetricExporter({
//             url: 'https://otlp.nr-data.net:4318/v1/metrics',
//             headers: { 'api-key': process.env.NEW_RELIC_LICENSE_KEY! },
//         })
//         : new ConsoleMetricExporter(), // prints to stdout locally — no collector needed
//     exportIntervalMillis: 15000,
// })

const otelSdk = new NodeSDK({
    resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "my-nitro-app",
        [ATTR_SERVICE_VERSION]: "1.0.0",
    }),
    traceExporter,
    // metricReader,
    logRecordProcessors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
    instrumentations: [getNodeAutoInstrumentations(
        {
            "@opentelemetry/instrumentation-fs": { enabled: false },
            "@opentelemetry/instrumentation-pino": { enabled: false, }
        }
    )],
})

process.once('SIGTERM', () => {
    otelSdk.shutdown()
        .then(() => console.log('OTel SDK terminated'))
        .catch((error) => console.log('Error terminating OTel SDK', error))
        .finally(() => process.exit(0));
});

otelSdk.start();