import { createHash, createHmac, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type StorageFolder = "kyc" | "listings" | "claims";

type StoreMediaInput = {
  body: Buffer;
  contentType: string;
  extension: string;
  folder: StorageFolder;
  namePrefix?: string;
};

type MediaStorageDriver = "local" | "s3";

const LOCAL_PUBLIC_ROOT = "uploads";

export async function storeMediaFile({
  body,
  contentType,
  extension,
  folder,
  namePrefix
}: StoreMediaInput) {
  const safePrefix = namePrefix ? `${sanitizeFilenamePart(namePrefix)}-` : "";
  const filename = `${Date.now()}-${safePrefix}${randomUUID()}.${extension}`;
  const key = `${LOCAL_PUBLIC_ROOT}/${folder}/${filename}`;
  const driver = getStorageDriver();

  if (driver === "s3") {
    return storeS3MediaFile({ body, contentType, key });
  }

  return storeLocalMediaFile({ body, key });
}

function getStorageDriver(): MediaStorageDriver {
  return process.env.MEDIA_STORAGE_DRIVER === "s3" ? "s3" : "local";
}

async function storeLocalMediaFile({ body, key }: { body: Buffer; key: string }) {
  const destination = path.join(resolveLocalPublicDirectory(), key);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, body);

  const publicBaseUrl = process.env.MEDIA_PUBLIC_BASE_URL?.replace(/\/$/, "");

  return {
    key,
    url: publicBaseUrl ? `${publicBaseUrl}/${key}` : `/${key}`
  };
}

export function resolveLocalPublicDirectory() {
  const configuredDirectory = process.env.MEDIA_LOCAL_PUBLIC_DIR;

  if (configuredDirectory) {
    return configuredDirectory;
  }

  const candidates = [
    path.join(process.cwd(), "apps", "web", "public"),
    path.join(process.cwd(), "public"),
    path.join(process.cwd(), "..", "public")
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

async function storeS3MediaFile({
  body,
  contentType,
  key
}: {
  body: Buffer;
  contentType: string;
  key: string;
}) {
  const bucket = requireEnv("S3_BUCKET");
  const publicBaseUrl = requireEnv("S3_PUBLIC_BASE_URL").replace(/\/$/, "");
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION ?? "auto";
  const url = buildS3ObjectUrl({
    bucket,
    endpoint,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    key,
    region
  });
  const headers = signS3PutObject({
    body,
    contentType,
    region,
    url
  });

  const response = await fetch(url, {
    body: new Uint8Array(body),
    headers,
    method: "PUT"
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `S3 upload failed with status ${response.status}: ${detail || response.statusText}`
    );
  }

  return {
    key,
    url: `${publicBaseUrl}/${key}`
  };
}

function buildS3ObjectUrl({
  bucket,
  endpoint,
  forcePathStyle,
  key,
  region
}: {
  bucket: string;
  endpoint?: string;
  forcePathStyle: boolean;
  key: string;
  region: string;
}) {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");

  if (endpoint) {
    const baseUrl = new URL(endpoint);

    if (forcePathStyle) {
      baseUrl.pathname = joinUrlPath(baseUrl.pathname, bucket, encodedKey);
      return baseUrl;
    }

    baseUrl.hostname = `${bucket}.${baseUrl.hostname}`;
    baseUrl.pathname = joinUrlPath(baseUrl.pathname, encodedKey);
    return baseUrl;
  }

  return new URL(`https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`);
}

function signS3PutObject({
  body,
  contentType,
  region,
  url
}: {
  body: Buffer;
  contentType: string;
  region: string;
  url: URL;
}) {
  const accessKeyId = requireEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("S3_SECRET_ACCESS_KEY");
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const headers = {
    "cache-control": "public, max-age=31536000, immutable",
    "content-type": contentType,
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.entries(headers)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}:${value.trim()}\n`)
    .join("");
  const canonicalRequest = [
    "PUT",
    url.pathname,
    url.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, "s3");
  const signature = hmacHex(signingKey, stringToSign);

  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
}

function joinUrlPath(...parts: string[]) {
  return `/${parts
    .flatMap((part) => part.split("/"))
    .filter(Boolean)
    .join("/")}`;
}

function sha256Hex(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest("hex");
}

function getSignatureKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string
) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  return hmac(serviceKey, "aws4_request");
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function sanitizeFilenamePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
}
