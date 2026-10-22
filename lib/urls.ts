export function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function isPrivateNetworkHostname(hostname: string) {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '::1' || host === '[::1]' || host.endsWith('.local') ||
    host.startsWith('127.') || host.startsWith('10.') || host.startsWith('192.168.') ||
    host.startsWith('169.254.') || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

export function safePublicHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !isPrivateNetworkHostname(url.hostname) ? url : null;
  } catch {
    return null;
  }
}
