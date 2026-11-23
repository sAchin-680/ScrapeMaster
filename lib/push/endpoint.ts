/**
 * Push subscriptions carry an endpoint URL that the server later POSTs to, so
 * an unchecked endpoint would let anyone make the server call any address
 * (SSRF). Only the browser vendors' push services are accepted.
 */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/, // Chrome, Edge on Android, Opera, Samsung Internet
  /^updates\.push\.services\.mozilla\.com$/, // Firefox
  /^web\.push\.apple\.com$/, // Safari
  /^[a-z0-9-]+\.push\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/, // Edge on Windows
];

export function isAllowedPushEndpoint(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === 'https:' &&
    !url.port &&
    !url.username &&
    PUSH_HOSTS.some((host) => host.test(url.hostname))
  );
}
