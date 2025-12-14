/**
 * AWS Secrets Manager Integration
 * Fetches and caches database credentials from AWS Secrets Manager
 */

const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require('@aws-sdk/client-secrets-manager');

// Cache credentials in memory (persists across warm Lambda invocations)
let cachedCredentials = null;
let secretsClient = null;

/**
 * Get AWS Secrets Manager client (lazy initialization)
 */
function getSecretsClient() {
  if (!secretsClient) {
    secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }
  return secretsClient;
}

/**
 * Fetch database credentials from AWS Secrets Manager
 * @param {string} secretName - Name of the secret in Secrets Manager
 * @returns {Promise<Object>} Database connection config: { host, port, database, username, password }
 */
async function getDatabaseCredentials(secretName) {
  // Return cached credentials if available
  if (cachedCredentials) {
    return cachedCredentials;
  }

  if (!secretName) {
    throw new Error('DB_SECRET_NAME environment variable is not set');
  }

  try {
    const client = getSecretsClient();
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const response = await client.send(command);

    // Parse the secret (assuming JSON format)
    let secret;
    if (response.SecretString) {
      secret = JSON.parse(response.SecretString);
    } else {
      // Handle binary secrets (decode from base64)
      const buff = Buffer.from(response.SecretBinary, 'base64');
      secret = JSON.parse(buff.toString('utf-8'));
    }

    // Validate required fields
    const requiredFields = ['host', 'port', 'database', 'username', 'password'];
    const missingFields = requiredFields.filter((field) => !secret[field]);

    if (missingFields.length > 0) {
      throw new Error(
        `Secret is missing required fields: ${missingFields.join(', ')}`
      );
    }

    // Cache credentials for this execution context
    cachedCredentials = {
      host: secret.host,
      port: secret.port || 5432,
      database: secret.database,
      user: secret.username,
      password: secret.password,
    };

    return cachedCredentials;
  } catch (error) {
    console.error(
      'Error fetching database credentials from Secrets Manager:',
      error
    );
    throw new Error(
      `Failed to retrieve database credentials: ${error.message}`
    );
  }
}

module.exports = { getDatabaseCredentials };
