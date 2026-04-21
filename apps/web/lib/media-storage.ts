import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type StorageFolder = "kyc" | "listings";

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
  const destination = path.join(process.cwd(), "public", key);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, body);

  const publicBaseUrl = process.env.MEDIA_PUBLIC_BASE_URL?.replace(/\/$/, "");

  return {
    key,
    url: publicBaseUrl ? `${publicBaseUrl}/${key}` : `/${key}`
  };
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
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    region: process.env.S3_REGION ?? "auto",
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY")
    }
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable"
    })
  );

  return {
    key,
    url: `${publicBaseUrl}/${key}`
  };
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
