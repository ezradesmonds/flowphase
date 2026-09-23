/** Audit utilities contain no credentials and are never a production data source. */
export function inspectPayload(payload: unknown) {
  const fields: Record<
    string,
    { present: number; nonNull: number; types: string[] }
  > = {};
  const dates: string[] = [];
  const reportedYears = new Set<number>();
  const timestampsByField: Record<
    string,
    { earliest: string; latest: string }
  > = {};
  function walk(value: unknown, path: string, key = "") {
    if (Array.isArray(value)) {
      for (const row of value) walk(row, `${path}[]`);
      return;
    }
    if (value !== null && typeof value === "object") {
      for (const [childKey, child] of Object.entries(value))
        walk(child, path ? `${path}.${childKey}` : childKey, childKey);
      return;
    }
    const field = (fields[path] ??= { present: 0, nonNull: 0, types: [] });
    field.present++;
    if (value !== null && value !== undefined) field.nonNull++;
    const type = value === null ? "null" : typeof value;
    if (!field.types.includes(type)) field.types.push(type);
    if (key === "year" && /^\d{4}$/.test(String(value)))
      reportedYears.add(Number(value));
    if (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}(?:$|[T ])/.test(value) &&
      !["start", "end"].includes(key)
    ) {
      const previous = timestampsByField[path];
      timestampsByField[path] = {
        earliest:
          previous && previous.earliest < value ? previous.earliest : value,
        latest: previous && previous.latest > value ? previous.latest : value,
      };
    }
    if (
      ["date", "latest_close_date", "updated_at", "updated_on"].includes(key) &&
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}(?:$|[T ])/.test(value)
    )
      dates.push(value);
  }
  walk(payload, "");
  dates.sort();
  return {
    fields,
    reportedYears: [...reportedYears].sort(),
    timestampsByField,
    earliestTimestamp: dates[0] ?? null,
    latestTimestamp: dates.at(-1) ?? null,
  };
}

/** Bounded schema sample, not a reusable price feed. All unneeded text is omitted. */
export function sanitizeSample(
  payload: unknown,
  secrets: string[] = [],
): unknown {
  function clean(value: unknown, key = "", depth = 0): unknown {
    if (depth > 9) return "[DEPTH LIMIT]";
    if (Array.isArray(value))
      return value.slice(0, 2).map((v) => clean(v, key, depth + 1));
    if (value !== null && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value)
          .filter(
            ([name]) =>
              !/token|auth|secret|key|signature|account|email|phone|address|holder_name|shareholder_name/i.test(
                name,
              ) && !secrets.some((s) => s && name.includes(s)),
          )
          .slice(0, 100)
          .map(([name, child]) => [name, clean(child, name, depth + 1)]),
      );
    if (typeof value === "string") {
      if (secrets.some((secret) => secret && value.includes(secret)))
        return "[REDACTED]";
      if (
        /^\d{4}-\d{2}-\d{2}$/.test(value) ||
        [
          "symbol",
          "broker_code",
          "sector",
          "sub_sector",
          "industry",
          "sub_industry",
        ].includes(key)
      )
        return value.slice(0, 100);
      return "[TEXT OMITTED]";
    }
    return value;
  }
  return clean(payload);
}
