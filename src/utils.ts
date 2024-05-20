import {API_PATH} from "./config";
import {HonoEnv} from "./types";

export async function sanitizePathSearch(domain: string, str: string) {
  // Assuming you have a symmetric key stored as a string
  const symmetricKeyString = "yourSymmetricKey";
  // Convert the symmetric key string to a CryptoKey
  // Note: This is a placeholder conversion. Real-world scenarios require secure handling of keys.
  const keyMaterial = new TextEncoder().encode(symmetricKeyString); // Simplified conversion for demonstration
  const key = await crypto.subtle.importKey(
    "raw", // Format of the key
    keyMaterial,
    {name: "AES-GCM"}, // Algorithm to use the key with
    false, // Extractable flag
    ["encrypt"] // Allowed operations
  );
  // Now you can use the key for encryption
  const plaintext = new TextEncoder().encode(str);
  const encrypted = await crypto.subtle.encrypt(
    {name: "AES-GCM", iv: new Uint8Array(12)}, // Initialization vector (IV) is also needed
    key,
    plaintext
  );
  let newEnc = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  newEnc = newEnc.replace("/", "");

  return `${domain}/${newEnc}`;
}

type ServeRequestConfig = {
  request: Request,
  ctx: ExecutionContext,
  cacheDuration?: number,
  revalidate: boolean,
  env: HonoEnv["Bindings"],
}

/**
 * Serve a request from cache or fetch it from the origin and cache it for future use.
 * @param config - Configuration object for the request. Contains the request object,
 * execution context, cache duration, and revalidate flag.
 * @returns - The response object for the request.
 */
export async function serveRequest(config: ServeRequestConfig) {
  let { request, ctx, revalidate, cacheDuration = 600, env } = config;
  const originalUrl = request.url;
  const url = new URL(request.url);
  const pathSeach = `${url.pathname}${url.search}`;
  // Construct the cache key from the cache URL
  const endpoint = `${env.API_PATH}${pathSeach}`;
  request = new Request(endpoint);
  const cache = caches.default;
  let response = await cache.match(request);

  if (!response || revalidate) {
    console.log("[[[[fetch fresh]]]]")
    // @ts-ignore
    response = await fetch(request);
    response = new Response(response.body, response);
    response.headers.delete("link");
    response.headers.delete("date");
    response.headers.set("Cache-Control", `s-maxage=${cacheDuration}`);
    response.headers.set("link", `<${originalUrl}>; rel="${originalUrl}"`);
    response.headers.append("X-Cache-State", `Hit,${cacheDuration}s`);
    response.headers.append("X-Fetched-At", `${new Date().toISOString()}`);
    ctx.waitUntil(cache.put(request, response.clone()));
  } else {
    console.log(`Cache hit for: <<<<<<${request.url}>>>>>>.`);
  }
  return response;
}
