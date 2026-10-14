export function storageConfig(env = process.env) {
  const endpoint = env.S3_ENDPOINT?.trim();
  if (endpoint) {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new Error('S3_ENDPOINT must be an HTTPS endpoint without credentials or query parameters.');
    }
  }
  if (env.S3_FORCE_PATH_STYLE && !['true', 'false'].includes(env.S3_FORCE_PATH_STYLE)) {
    throw new Error('S3_FORCE_PATH_STYLE must be true or false.');
  }
  return {
    region: (env.S3_REGION || env.AWS_REGION || 'us-east-1').trim().toLowerCase(),
    ...(endpoint ? { endpoint: endpoint.replace(/\/$/, '') } : {}),
    forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
    // Avoid optional AWS checksum extensions on compatible storage providers.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    maxAttempts: 3,
  };
}
