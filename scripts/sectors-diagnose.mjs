import env from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import {
  createSectorsClient,
  SectorsError,
} from "../src/lib/sectors/transport.ts";
import {
  companiesPageSchema,
  brokerSchema,
  normalizeDailyPrices,
} from "../src/lib/sectors/schemas.ts";
import { inspectPayload, sanitizeSample } from "../src/lib/sectors/audit.ts";
import { buildCapabilities } from "../src/lib/sectors/capabilities.ts";

// Match Next's environment precedence; never print the loader's returned object.
env.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const args = process.argv.slice(2);
const ticker = (args.find((arg) => !arg.startsWith("--")) ?? "BBCA")
  .toUpperCase()
  .replace(/\.JK$/, "");
const write = process.argv.includes("--write");
const root = new URL("../docs/sectors-audit/", import.meta.url);
const date = (offset) =>
  new Date(Date.now() + 7 * 3600000 - offset * 86400000)
    .toISOString()
    .slice(0, 10);
const generatedAt = new Date().toISOString();
const end = date(1),
  start = date(14);
const window = `start=${start}&end=${end}`;
const doc = (path) =>
  `https://docs.sectors.app/api-references/v2/indonesia/${path}`;

async function main() {
  if (
    !/^[A-Z]{4}$/.test(ticker) ||
    args.filter((arg) => !arg.startsWith("--")).length > 1 ||
    args.some((arg) => arg.startsWith("--") && arg !== "--write")
  )
    throw new SectorsError(0, "SETUP");
  console.log(
    JSON.stringify({
      ticker,
      keyPresent: Boolean(process.env.SECTORS_API_KEY),
      generatedAt,
    }),
  );
  const traces = [];
  const client = createSectorsClient({
    maxRetries: 1,
    trace: (event) => traces.push(event),
  });
  const probes = [
    {
      id: "stockUniverse",
      path: "/companies/?limit=1&offset=0&order_by=symbol",
      source: doc("screener/companies"),
      required: true,
    },
    {
      id: "universePagination",
      path: "/companies/?limit=1&offset=1&order_by=symbol",
      source: doc("screener/companies"),
    },
    {
      id: "dailyOhlcv",
      path: `/daily/${ticker}/?${window}`,
      source: doc("transaction/daily"),
    },
    {
      id: "brokerSummary",
      path: `/broker-summary/${ticker}/?${window}`,
      source: doc("brokers/broker-summary-by-symbol"),
    },
    {
      id: "historicalBrokerSummary",
      path: `/broker-summary/${ticker}/?start=${date(28)}&end=${date(15)}`,
      source: doc("brokers/broker-summary-by-symbol"),
    },
    {
      id: "foreignFlow",
      path: `/foreign-flow/${ticker}/?${window}`,
      source: doc("brokers/foreign-flow-by-symbol"),
    },
    {
      id: "ownership",
      path: `/company/shareholders-composition/${ticker}/?year=${end.slice(0, 4)}`,
      source: doc("company/shareholders-composition"),
    },
    {
      id: "corporateActions",
      path: `/company/corporate-actions/${ticker}/`,
      source: doc("company/corporate-actions"),
    },
    {
      id: "companyReport",
      path: `/company/report/${ticker}/?sections=overview,financials,ownership`,
      source: doc("report/company-report"),
    },
  ];
  const results = [];
  let minimumFailed = false,
    stopReason = null,
    firstPage = null;
  if (write) await mkdir(root, { recursive: true });
  for (const probe of probes) {
    const result = {
      capability: probe.id,
      endpoint: probe.path,
      method: "GET",
      source: probe.source,
      ticker,
      capturedAt: new Date().toISOString(),
      status: "UNVERIFIED",
      httpStatus: null,
      latencyMs: null,
      recordCount: 0,
      earliestTimestamp: null,
      latestTimestamp: null,
      fields: {},
      attempts: [],
      notes: [],
    };
    traces.length = 0;
    const started = Date.now();
    if (stopReason) {
      result.notes.push(stopReason);
      results.push(result);
      console.log(JSON.stringify(result));
      continue;
    }
    let sample;
    try {
      const response = await client.request(probe.path);
      const data = response.data;
      result.httpStatus = response.status;
      const rows = Array.isArray(data) ? data : (data?.results ?? data?.data);
      if (!data || typeof data !== "object" || "error" in data)
        throw new Error("schema");
      if (
        data.symbol &&
        data.symbol.toUpperCase().replace(/\.JK$/, "") !== ticker
      )
        throw new Error("identity");
      result.recordCount = Array.isArray(rows) ? rows.length : 1;
      Object.assign(result, inspectPayload(data));
      if (
        ["foreignFlow", "ownership"].includes(probe.id) &&
        !Array.isArray(data.data)
      )
        throw new Error("schema");
      if (
        probe.id === "corporateActions" &&
        (!data.corporate_actions || typeof data.corporate_actions !== "object")
      )
        throw new Error("schema");
      if (
        probe.id === "companyReport" &&
        (!data.overview || !data.financials || !data.ownership)
      )
        throw new Error("schema");
      result.status = result.recordCount
        ? "VERIFIED_WORKING"
        : "VERIFIED_BUT_LIMITED";
      if (!result.recordCount)
        result.notes.push("Empty response does not establish usable coverage.");
      if (probe.id === "stockUniverse" || probe.id === "universePagination") {
        const page = companiesPageSchema.parse(data);
        if (probe.id === "stockUniverse") firstPage = page;
        else if (
          !firstPage ||
          page.pagination.offset !== firstPage.pagination.next_offset ||
          page.results.some((r) =>
            firstPage.results.some((f) => f.symbol === r.symbol),
          )
        )
          throw new Error("pagination");
        result.pagination = page.pagination;
        result.status = "VERIFIED_BUT_LIMITED";
        result.notes.push(
          "Only two one-record pages sampled; full-universe completeness is not live-verified.",
        );
      }
      if (probe.id === "dailyOhlcv") {
        const normalized = normalizeDailyPrices(data, ticker);
        if (
          normalized.some(
            (r) => r.open === null || r.high === null || r.low === null,
          )
        ) {
          result.status = "VERIFIED_BUT_LIMITED";
          result.notes.push(
            "Some OHLC fields are null; do not synthesize candles.",
          );
        }
      }
      if (["brokerSummary", "historicalBrokerSummary"].includes(probe.id)) {
        const broker = brokerSchema.parse(data);
        result.recordCount = broker.data.reduce(
          (n, day) => n + day.summary.length,
          0,
        );
        if (
          !result.recordCount ||
          broker.data.some((day) =>
            day.summary.some((r) => r.bval == null || r.sval == null),
          )
        )
          result.status = "VERIFIED_BUT_LIMITED";
      }
      if (probe.id === "companyReport") {
        result.status = "VERIFIED_BUT_LIMITED";
        result.notes.push(
          "Overview, annual financials and ownership sections sampled; validate individual fields before using.",
        );
      }
      if (probe.id === "ownership")
        result.notes.push(
          "Snapshot date is period-end, not publication/availability time.",
        );
      if (probe.id === "corporateActions") {
        result.notes.push("Event dates are not source freshness timestamps.");
        result.latestTimestamp = null;
        result.earliestTimestamp = null;
      }
      sample = sanitizeSample(
        data,
        [
          process.env.SECTORS_API_KEY,
          process.env.TRADINGVIEW_SESSION,
          process.env.TRADINGVIEW_SIGNATURE,
        ].filter(Boolean),
      );
    } catch (error) {
      if (error instanceof SectorsError) {
        result.httpStatus = error.status || null;
        result.status =
          error.kind === "AUTH_OR_PLAN"
            ? "AUTH_OR_PLAN_BLOCKED"
            : error.status === 404
              ? "UNAVAILABLE"
              : "UNVERIFIED";
        result.error = { kind: error.kind, message: error.message };
        if (
          ["RATE_LIMIT", "NETWORK", "TIMEOUT", "SETUP"].includes(error.kind) ||
          (error.kind === "AUTH_OR_PLAN" && probe.required)
        )
          stopReason = `Not attempted after ${error.kind}; conserve quota / resolve setup first.`;
      } else {
        result.status = "VERIFIED_BUT_LIMITED";
        result.notes.push(
          "Response schema or pagination validation failed; not approved for ingestion.",
        );
      }
    }
    result.latencyMs = Date.now() - started;
    result.attempts = [...traces];
    if (
      probe.required &&
      (result.httpStatus !== 200 ||
        !result.recordCount ||
        result.notes.some((n) => n.includes("validation failed")))
    )
      minimumFailed = true;
    results.push(result);
    console.log(
      JSON.stringify({
        ...result,
        fields: Object.fromEntries(
          Object.entries(result.fields).map(([field, value]) => [
            field,
            `${value.nonNull}/${value.present}`,
          ]),
        ),
      }),
    );
    if (write && sample !== undefined)
      await writeFile(
        new URL(`${probe.id}.sample.json`, root),
        JSON.stringify(
          {
            purpose:
              "Schema example only; never production data. Arrays truncated to two records; nonessential text omitted.",
            metadata: {
              capability: result.capability,
              endpoint: result.endpoint,
              ticker,
              capturedAt: result.capturedAt,
              status: result.status,
              httpStatus: result.httpStatus,
              pagination:
                result.pagination ??
                "No page traversal; date windows or single response",
              notes: result.notes,
            },
            payload: sample,
          },
          null,
          2,
        ) + "\n",
      );
    if (!stopReason) await new Promise((resolve) => setTimeout(resolve, 300));
  }
  const report = {
    generatedAt,
    ticker,
    minimumEndpoint: "stockUniverse",
    exitCode: minimumFailed ? 1 : 0,
    results,
  };
  if (write)
    await writeFile(
      new URL("diagnostic.json", root),
      JSON.stringify(report, null, 2) + "\n",
    );
  if (write)
    await writeFile(
      new URL("capabilities.json", root),
      JSON.stringify(buildCapabilities(results, generatedAt, ticker), null, 2) +
        "\n",
    );
  console.log(
    JSON.stringify({
      completed: true,
      exitCode: report.exitCode,
      attempted: results.filter((r) => r.attempts.length).length,
      written: write,
    }),
  );
  process.exitCode = report.exitCode;
}
main().catch((error) => {
  console.error(
    error instanceof SectorsError
      ? error.message
      : "Diagnostic setup or output write failed; details omitted for secret safety.",
  );
  process.exitCode = 1;
});
