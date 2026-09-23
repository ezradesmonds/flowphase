const API_URL = "http://127.0.0.1:3000/api/intelligence";
const STOCKS_URL = "http://127.0.0.1:3000/api/stocks";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const limit = process.argv[2] ? parseInt(process.argv[2], 10) : 50;
  console.log(`Fetching stock list to preload up to ${limit} stocks...`);
  
  const universeRes = await fetch(STOCKS_URL);
  if (!universeRes.ok) {
    console.error("Failed to fetch stocks universe:", universeRes.statusText);
    process.exit(1);
  }
  const universe = await universeRes.json();
  const stocks = universe.stocks.slice(0, limit);
  console.log(`Found ${universe.stocks.length} total stocks. Preloading first ${stocks.length}...`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    process.stdout.write(`[${i + 1}/${stocks.length}] Analyzing ${stock.ticker} (${stock.companyName})... `);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: stock.ticker }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`OK! Phase: ${data.phase}, Broker: ${data.brokerAvailable ? "YES" : "NO"}`);
        success++;
      } else {
        console.log(`FAILED (${res.status}): ${res.statusText}`);
        failed++;
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      failed++;
    }

    // Gentle pacing to respect rate limits
    await sleep(700);
  }

  console.log(`\nFinished! Success: ${success}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
