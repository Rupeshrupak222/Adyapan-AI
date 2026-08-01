require("dotenv").config();
const { ApifyClient } = require("apify-client");

async function main() {
  const token = process.env.APIFY_API_KEY;
  console.log("[LinkedInScraperTest] Initializing Apify client...");
  const apify = new ApifyClient({ token });

  try {
    console.log("[LinkedInScraperTest] Calling curious_coder/linkedin-jobs-scraper actor...");
    const run = await apify.actor("curious_coder/linkedin-jobs-scraper").call({
      urls: ["https://www.linkedin.com/jobs/search/?keywords=software+engineer&location=India"],
      count: 10,
    }, { waitSecs: 90 });

    console.log("[LinkedInScraperTest] Run status:", run.status);
    const { items } = await apify.dataset(run.defaultDatasetId).listItems();
    console.log("[LinkedInScraperTest] Items fetched:", items.length);
    if (items.length > 0) {
      console.log("[LinkedInScraperTest] Sample item keys:", Object.keys(items[0]));
      console.log("[LinkedInScraperTest] Sample job:", JSON.stringify(items[0], null, 2).slice(0, 1000));
    }
  } catch (err) {
    console.error("[LinkedInScraperTest] Actor execution:", err.message || err);
  }
  process.exit(0);
}

main();
