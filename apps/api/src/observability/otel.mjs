import { loadEnvFile } from 'node:process';
// Load the environment variables before initializing OpenTelemetry
loadEnvFile('./.env.local');
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { BatchLogRecordProcessor, ConsoleLogRecordExporter, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { logs } from "@opentelemetry/api-logs";

const isProduction = process.env.NODE_ENV === 'production';
const localUI = new Set((process.env.OTEL_LOCAL_UI || '').split(','));

console.log('loicalUI', localUI);
console.log('isProduction', isProduction)

const traceExporter = isProduction
    ? new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "https://otlp.nr-data.net:4318/v1/traces",
        headers: {
            "api-key": process.env.NEW_RELIC_LICENSE_KEY || "",
        },
    })
    : localUI.has('jaeger')
        ? new OTLPTraceExporter({ url: 'http://localhost:4318/v1/traces' })
        : undefined; //new ConsoleSpanExporter()

const logExporter = isProduction
    ? new OTLPLogExporter({
        url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || "https://otlp.nr-data.net:4318/v1/logs",
        headers: {
            "api-key": process.env.NEW_RELIC_LICENSE_KEY || "",
        },
    })
    : new ConsoleLogRecordExporter();



const logRecordProcessors = isProduction
    ? [new BatchLogRecordProcessor({ exporter: logExporter })]
    : [new SimpleLogRecordProcessor({ exporter: logExporter })]

const otelSdk = new NodeSDK({
    resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "my-nitro-app",
        [ATTR_SERVICE_VERSION]: "1.0.0",
    }),
    traceExporter,
    logRecordProcessors,
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

logs.getLogger('test').emit({
    attributes: {
        hello: "world"
    }
})