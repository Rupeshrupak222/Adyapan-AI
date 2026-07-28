require("dotenv").config();
const { ApifyClient } = require("apify-client");

async function main() {
  const token = process.env.APIFY_API_KEY;
  console.log("[ApifyTest] Testing token:", token ? `${token.substring(0, 12)}...` : "NONE");

  if (!token) {
    console.error("[ApifyTest] APIFY_API_KEY is not set in environment!");
    process.exit(1);
  }

  const client = new ApifyClient({ token });

  try {
    const user = await client.user().get();
    console.log("[ApifyTest] Token is VALID!");
    console.log("[ApifyTest] User:", user.username || user.id || user.email);
    console.log("[ApifyTest] Account tier:", user.plan || "free");
  } catch (err) {
    console.error("[ApifyTest] Token validation failed:", err.message || err);
  }
  process.exit(0);
}

main();
