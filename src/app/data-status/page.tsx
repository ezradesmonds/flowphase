import { VERSION } from "@/lib/intelligence/extended/model";
export default function Page() {
  return (
    <section className="panel research-module">
      <h1>Data Status</h1>
      <p>Calculation version: {VERSION}</p>
      <table>
        <thead>
          <tr>
            <th>Capability</th>
            <th>Status</th>
            <th>Limitation</th>
          </tr>
        </thead>
        <tbody>
          {[
            [
              "Broker summary / lot / value",
              "Verified daily",
              "Bounded acquired history",
            ],
            [
              "Buy/sell frequency",
              "Verified daily aggregate",
              "No chronological execution order",
            ],
            [
              "Ownership categories & count",
              "Verified monthly",
              "Publication date unknown",
            ],
            [
              "Major shareholders",
              "Provider reported",
              "Official UBO and identity graph unverified",
            ],
            [
              "Sector taxonomy",
              "Verified company data",
              "Analysed subset is not full market",
            ],
            [
              "Foreign investor flow",
              "Verified separate endpoint",
              "Not inferred from broker affiliation",
            ],
            [
              "Tick / same-second / split execution",
              "Unavailable",
              "No verified endpoint",
            ],
            [
              "Order events / cancellation",
              "Unavailable",
              "No verified endpoint",
            ],
            ["Narrative", "Unavailable", "No verified endpoint"],
            [
              "Broker legal affiliation",
              "Unconfigured",
              "Requires official source and effective dates",
            ],
          ].map((r) => (
            <tr key={r[0]}>
              {r.map((c) => (
                <td key={c}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
