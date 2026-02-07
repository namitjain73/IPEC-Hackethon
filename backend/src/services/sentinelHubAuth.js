const axios = require('axios');

const SENTINEL_HUB_TOKEN = process.env.SENTINEL_HUB_TOKEN;
const SENTINEL_HUB_CLIENT_ID = process.env.SENTINEL_HUB_CLIENT_ID;
const SENTINEL_HUB_CLIENT_SECRET = process.env.SENTINEL_HUB_CLIENT_SECRET;
const SENTINEL_HUB_API_KEY = process.env.SENTINEL_HUB_API_KEY;

const OAUTH_URL = 'https://services.sentinel-hub.com/oauth/token';

let cachedToken = null;
let tokenExpiresAt = 0;

async function fetchOAuthToken() {
  if (!SENTINEL_HUB_CLIENT_ID || !SENTINEL_HUB_CLIENT_SECRET) {
    if (SENTINEL_HUB_API_KEY) {
      throw new Error('SENTINEL_HUB_API_KEY is not supported for this request. Set SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET instead.');
    }

    throw new Error('Missing Sentinel Hub credentials. Set SENTINEL_HUB_TOKEN or SENTINEL_HUB_CLIENT_ID/SENTINEL_HUB_CLIENT_SECRET.');
  }

  const response = await axios.post(
    OAUTH_URL,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: SENTINEL_HUB_CLIENT_ID,
      client_secret: SENTINEL_HUB_CLIENT_SECRET,
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const accessToken = response.data?.access_token;
  const expiresIn = response.data?.expires_in || 0;

  if (!accessToken) {
    throw new Error('Sentinel Hub OAuth response did not include an access_token.');
  }

  cachedToken = accessToken;
  tokenExpiresAt = Date.now() + Math.max(0, expiresIn - 60) * 1000;

  return accessToken;
}

async function getSentinelHubAuthHeader() {
  if (SENTINEL_HUB_TOKEN) {
    return { Authorization: `Bearer ${SENTINEL_HUB_TOKEN}` };
  }

  if (cachedToken && Date.now() < tokenExpiresAt) {
    return { Authorization: `Bearer ${cachedToken}` };
  }

  const token = await fetchOAuthToken();
  return { Authorization: `Bearer ${token}` };
}

module.exports = {
  getSentinelHubAuthHeader,
};
