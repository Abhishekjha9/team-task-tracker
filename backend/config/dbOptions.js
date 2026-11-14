/**
 * MySQL connection options from env. Hosted MySQL (TiDB Cloud, PlanetScale, Aiven, Railway…)
 * usually requires TLS: set DB_SSL=true, and DB_SSL_CA to the provider's CA PEM if it isn't
 * signed by a public CA. Shared by the app pool and the migration runner.
 */
module.exports = function dbOptions() {
  const opts = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
  if (process.env.DB_SSL === 'true') {
    opts.ssl = { minVersion: 'TLSv1.2', rejectUnauthorized: true };
    if (process.env.DB_SSL_CA) opts.ssl.ca = process.env.DB_SSL_CA.replace(/\\n/g, '\n');
  }
  return opts;
};
