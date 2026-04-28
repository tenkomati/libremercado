import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const allowPlaceholders = process.argv.includes("--example");
const target = process.argv.find((arg) => ["api", "web", "all"].includes(arg)) ?? "all";
const fileArgIndex = process.argv.indexOf("--file");
const customFile = fileArgIndex >= 0 ? process.argv[fileArgIndex + 1] : undefined;

const files = {
  api: path.join(rootDir, "cloudrun", "api.mock.env.yaml"),
  web: path.join(rootDir, "cloudrun", "web.mock.env.yaml")
};

const placeholderTokens = [
  "<generate-a-long-random-secret>",
  "<same-jwt-secret-as-api>",
  "<optional-or-empty>",
  "<PROJECT_REF>",
  "<PASSWORD>",
  "<REGION>",
  "replace-after-web-deploy",
  "replace-with-api-cloud-run-url",
  "replace-with-web-cloud-run-url"
];

function readYamlEnv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const values = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function isPlaceholder(value) {
  return placeholderTokens.some((token) => value.includes(token));
}

function isHttpUrl(value) {
  return /^https?:\/\//.test(value);
}

function assertCondition(errors, condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function validateApi(values, errors, warnings) {
  const requiredKeys = [
    "NODE_ENV",
    "PORT",
    "DATABASE_URL",
    "JWT_SECRET",
    "APP_PUBLIC_URL",
    "EMAIL_PROVIDER",
    "PAYMENT_PROVIDER",
    "PAYMENT_WEBHOOK_SECRET"
  ];

  for (const key of requiredKeys) {
    assertCondition(errors, Boolean(values[key]), `api.mock.env.yaml: falta ${key}`);
  }

  assertCondition(errors, values.NODE_ENV === "production", "API NODE_ENV debe ser production");
  assertCondition(errors, values.PORT === "8080", "API PORT debe ser 8080 en Cloud Run");
  assertCondition(
    errors,
    values.PAYMENT_PROVIDER === "SANDBOX",
    "API PAYMENT_PROVIDER debe quedar en SANDBOX para deploy mock"
  );
  assertCondition(
    errors,
    values.EMAIL_PROVIDER === "log",
    "API EMAIL_PROVIDER debe quedar en log para deploy mock"
  );

  if (!allowPlaceholders) {
    assertCondition(
      errors,
      !isPlaceholder(values.DATABASE_URL ?? ""),
      "API DATABASE_URL sigue con placeholder"
    );
    assertCondition(
      errors,
      !isPlaceholder(values.JWT_SECRET ?? ""),
      "API JWT_SECRET sigue con placeholder"
    );
    assertCondition(
      errors,
      !isPlaceholder(values.APP_PUBLIC_URL ?? ""),
      "API APP_PUBLIC_URL sigue con placeholder"
    );
  }

  if (values.APP_PUBLIC_URL) {
    assertCondition(
      errors,
      allowPlaceholders || isHttpUrl(values.APP_PUBLIC_URL),
      "API APP_PUBLIC_URL debe ser URL pública http(s)"
    );
  }

  if (!values.GOOGLE_MAPS_API_KEY) {
    warnings.push("API GOOGLE_MAPS_API_KEY vacío: no habrá sugerencias reales de puntos intermedios");
  }
}

function validateWeb(values, errors, warnings) {
  const requiredKeys = [
    "NODE_ENV",
    "PORT",
    "NEXT_PUBLIC_API_URL",
    "APP_PUBLIC_URL",
    "AUTH_COOKIE_NAME",
    "JWT_SECRET",
    "MEDIA_STORAGE_DRIVER"
  ];

  for (const key of requiredKeys) {
    assertCondition(errors, Boolean(values[key]), `web.mock.env.yaml: falta ${key}`);
  }

  assertCondition(errors, values.NODE_ENV === "production", "WEB NODE_ENV debe ser production");
  assertCondition(errors, values.PORT === "8080", "WEB PORT debe ser 8080 en Cloud Run");
  assertCondition(
    errors,
    values.MEDIA_STORAGE_DRIVER === "local",
    "WEB MEDIA_STORAGE_DRIVER debe quedar en local para deploy mock"
  );

  if (!allowPlaceholders) {
    assertCondition(
      errors,
      !isPlaceholder(values.NEXT_PUBLIC_API_URL ?? ""),
      "WEB NEXT_PUBLIC_API_URL sigue con placeholder"
    );
    assertCondition(
      errors,
      !isPlaceholder(values.APP_PUBLIC_URL ?? ""),
      "WEB APP_PUBLIC_URL sigue con placeholder"
    );
    assertCondition(
      errors,
      !isPlaceholder(values.JWT_SECRET ?? ""),
      "WEB JWT_SECRET sigue con placeholder"
    );
  }

  if (values.NEXT_PUBLIC_API_URL) {
    assertCondition(
      errors,
      allowPlaceholders || isHttpUrl(values.NEXT_PUBLIC_API_URL),
      "WEB NEXT_PUBLIC_API_URL debe ser URL pública http(s)"
    );
  }

  if (values.APP_PUBLIC_URL) {
    assertCondition(
      errors,
      allowPlaceholders || isHttpUrl(values.APP_PUBLIC_URL),
      "WEB APP_PUBLIC_URL debe ser URL pública http(s)"
    );
  }

  if (!values.REDIS_URL) {
    warnings.push("WEB REDIS_URL vacío: rate limiting web quedará por instancia");
  }

  if (!values.MEDIA_PUBLIC_BASE_URL) {
    warnings.push("WEB MEDIA_PUBLIC_BASE_URL vacío: uploads mock quedan servidos desde la propia app");
  }
}

const selections = target === "all" ? ["api", "web"] : [target];
const errors = [];
const warnings = [];
const parsed = {};

for (const selection of selections) {
  const filePath = customFile && target !== "all" ? path.resolve(customFile) : files[selection];
  parsed[selection] = readYamlEnv(filePath);
}

if (parsed.api) {
  validateApi(parsed.api, errors, warnings);
}

if (parsed.web) {
  validateWeb(parsed.web, errors, warnings);
}

if (parsed.api && parsed.web) {
  const apiAppUrl = parsed.api.APP_PUBLIC_URL;
  const webAppUrl = parsed.web.APP_PUBLIC_URL;
  const webJwtSecret = parsed.web.JWT_SECRET;
  const apiJwtSecret = parsed.api.JWT_SECRET;

  if (!allowPlaceholders) {
    assertCondition(
      errors,
      apiAppUrl === webAppUrl,
      "APP_PUBLIC_URL debe coincidir entre API y WEB"
    );
    assertCondition(
      errors,
      apiJwtSecret === webJwtSecret,
      "JWT_SECRET debe coincidir entre API y WEB"
    );
  }
}

if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (errors.length) {
  console.error("Cloud Run mock env validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  allowPlaceholders
    ? "Cloud Run mock env templates are structurally valid."
    : "Cloud Run mock env files are ready for deploy."
);
