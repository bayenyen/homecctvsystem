const DEFAULT_CLIENT_URL = 'http://localhost:5173';

const parseOrigins = () => {
  const values = [
    process.env.CLIENT_URL,
    process.env.CLIENT_URLS
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return values.length > 0 ? values : [DEFAULT_CLIENT_URL];
};

const getAllowedOrigins = () => parseOrigins();

module.exports = { getAllowedOrigins };
