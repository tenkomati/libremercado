const API_BASE_URL =
  process.env.LM_SMOKE_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:3001";
const WEB_BASE_URL =
  process.env.LM_SMOKE_WEB_URL ??
  process.env.APP_PUBLIC_URL ??
  "http://127.0.0.1:3000";

const credentials = {
  admin: {
    email:
      process.env.LM_SMOKE_ADMIN_EMAIL ??
      "sofia.romero@libremercado.test",
    password:
      process.env.LM_SMOKE_ADMIN_PASSWORD ??
      "Admin12345!"
  },
  seller: {
    email:
      process.env.LM_SMOKE_SELLER_EMAIL ??
      "martin.farias@libremercado.test",
    password:
      process.env.LM_SMOKE_SELLER_PASSWORD ??
      "Seller12345!"
  },
  buyer: {
    email:
      process.env.LM_SMOKE_BUYER_EMAIL ??
      "valentina.mendez@libremercado.test",
    password:
      process.env.LM_SMOKE_BUYER_PASSWORD ??
      "Buyer12345!"
  }
};

const tinyPngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a1kAAAAASUVORK5CYII=",
  "base64"
);

const steps = [];

await run();

async function run() {
  try {
    await checkHealth();

    const admin = await login("admin", credentials.admin);
    const seller = await login("seller", credentials.seller);
    const buyer = await login("buyer", credentials.buyer);

    await verifyMe("admin", admin.token);
    await verifyMe("seller", seller.token);
    await verifyMe("buyer", buyer.token);
    await checkAdminOverview(admin.token);

    const listingImage = await uploadImage({
      route: "/api/uploads/listing-image",
      filename: "smoke-listing.png"
    });

    const listing = await createListing({
      sellerToken: seller.token,
      sellerId: seller.user.id,
      imageUrl: listingImage.url
    });

    const quote = await getInsuranceQuote({
      buyerToken: buyer.token,
      listingId: listing.id
    });

    const paymentIntent = await createCheckout({
      buyerToken: buyer.token,
      listingId: listing.id
    });

    if (paymentIntent.provider !== "SANDBOX") {
      throw new Error(
        `El smoke test espera PAYMENT_PROVIDER=SANDBOX y recibió ${paymentIntent.provider}.`
      );
    }

    const approvedPayment = await approveSandboxPayment({
      adminToken: admin.token,
      paymentIntentId: paymentIntent.id
    });

    const policy = await findPolicyForEscrow({
      adminToken: admin.token,
      escrowId: paymentIntent.escrow.id
    });

    const claimEvidence = await uploadImage({
      route: "/api/uploads/insurance-claim-image",
      filename: "smoke-claim.png"
    });

    const claimedPolicy = await openInsuranceClaim({
      buyerToken: buyer.token,
      policyId: policy.id,
      evidenceUrl: claimEvidence.url
    });

    const resolvedPolicy = await resolveInsuranceClaim({
      adminToken: admin.token,
      policyId: policy.id
    });

    const auditLogs = await getAuditLogs({
      adminToken: admin.token,
      query: policy.id
    });

    ensure(
      auditLogs.items.some((log) => log.action === "INSURANCE_CLAIM_OPENED"),
      "Se registró auditoría de apertura de reclamo."
    );
    ensure(
      auditLogs.items.some((log) => log.action === "INSURANCE_CLAIM_RESOLVED"),
      "Se registró auditoría de resolución de reclamo."
    );

    printSummary({
      listing,
      quote,
      paymentIntent: approvedPayment,
      policy: claimedPolicy,
      resolvedPolicy
    });
  } catch (error) {
    console.error(`\nSMOKE FAIL: ${getErrorMessage(error)}`);
    process.exitCode = 1;
  }
}

async function checkHealth() {
  const payload = await requestJson(`${API_BASE_URL}/health`);

  ensure(payload.status === "ok", "API responde /health.");
}

async function login(label, input) {
  const payload = await requestJson(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json"
    }
  });

  ensure(Boolean(payload.accessToken), `Login ${label} devuelve token.`);
  ensure(Boolean(payload.user?.id), `Login ${label} devuelve usuario.`);

  return {
    token: payload.accessToken,
    user: payload.user
  };
}

async function verifyMe(label, token) {
  const payload = await requestJson(`${API_BASE_URL}/auth/me`, {
    headers: authHeaders(token)
  });

  ensure(Boolean(payload.id), `Auth/me funciona para ${label}.`);
}

async function checkAdminOverview(adminToken) {
  const payload = await requestJson(`${API_BASE_URL}/admin/overview`, {
    headers: authHeaders(adminToken)
  });

  ensure(typeof payload.users?.total === "number", "Admin overview responde KPIs.");
}

async function uploadImage({ route, filename }) {
  const formData = new FormData();
  formData.set(
    "file",
    new File([tinyPngBuffer], filename, { type: "image/png" })
  );

  const payload = await requestJson(`${WEB_BASE_URL}${route}`, {
    method: "POST",
    body: formData
  });

  ensure(Boolean(payload.url), `Upload ${route} devuelve URL.`);
  return payload;
}

async function createListing({ sellerToken, sellerId, imageUrl }) {
  const unique = Date.now().toString();
  const payload = await requestJson(`${API_BASE_URL}/listings`, {
    method: "POST",
    headers: {
      ...authHeaders(sellerToken),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sellerId,
      title: `Smoke Notebook ${unique}`,
      description:
        "Publicación generada por smoke test predeploy para validar flujo seller-buyer-admin con seguro y claim.",
      category: "Computacion",
      condition: "VERY_GOOD",
      price: 250000,
      currency: "ARS",
      locationProvince: "Buenos Aires",
      locationCity: "La Plata",
      status: "PUBLISHED",
      images: [{ url: imageUrl }]
    })
  });

  ensure(payload.status === "PUBLISHED", "Seller puede crear publicación.");
  return payload;
}

async function getInsuranceQuote({ buyerToken, listingId }) {
  const payload = await requestJson(`${API_BASE_URL}/insurance/get-quote`, {
    method: "POST",
    headers: {
      ...authHeaders(buyerToken),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      productId: listingId
    })
  });

  ensure(payload.eligible === true, "Cotización de seguro es elegible.");
  ensure(
    Number(payload.pricing?.premiumAmount ?? 0) > 0,
    "Cotización devuelve prima positiva."
  );

  return payload;
}

async function createCheckout({ buyerToken, listingId }) {
  const payload = await requestJson(`${API_BASE_URL}/payments/checkout`, {
    method: "POST",
    headers: {
      ...authHeaders(buyerToken),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      listingId,
      shippingProvider: "Smoke Test Delivery",
      insuranceSelected: true
    })
  });

  ensure(payload.status === "PAYMENT_PENDING", "Checkout crea payment intent pendiente.");
  ensure(payload.escrow?.id, "Checkout devuelve escrow asociado.");
  return payload;
}

async function approveSandboxPayment({ adminToken, paymentIntentId }) {
  const payload = await requestJson(
    `${API_BASE_URL}/payments/${paymentIntentId}/sandbox/approve`,
    {
      method: "POST",
      headers: authHeaders(adminToken)
    }
  );

  ensure(payload.status === "FUNDS_HELD", "Admin puede aprobar pago sandbox.");
  return payload;
}

async function findPolicyForEscrow({ adminToken, escrowId }) {
  const payload = await requestJson(
    `${API_BASE_URL}/insurance/policies?q=${encodeURIComponent(escrowId)}&pageSize=10`,
    {
      headers: authHeaders(adminToken)
    }
  );
  const policy = payload.items?.find((item) => item.escrow?.id === escrowId);

  ensure(Boolean(policy), "Se emitió póliza de seguro para el escrow.");
  ensure(policy.status === "ACTIVE", "La póliza nace activa luego del pago protegido.");

  return policy;
}

async function openInsuranceClaim({ buyerToken, policyId, evidenceUrl }) {
  const payload = await requestJson(
    `${API_BASE_URL}/insurance/policies/${policyId}/claim`,
    {
      method: "POST",
      headers: {
        ...authHeaders(buyerToken),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        reason: "robo",
        details:
          "Smoke test: apertura controlada de reclamo para validar claim beta con evidencia real.",
        contactPhone: "+5491100000000",
        evidenceUrls: evidenceUrl
      })
    }
  );

  ensure(payload.status === "CLAIMED", "Buyer puede abrir reclamo.");
  ensure(
    Array.isArray(payload.rawPayload?.claim?.evidenceUrls) &&
      payload.rawPayload.claim.evidenceUrls.length > 0,
    "El reclamo guarda evidencias."
  );

  return payload;
}

async function resolveInsuranceClaim({ adminToken, policyId }) {
  const payload = await requestJson(
    `${API_BASE_URL}/insurance/policies/${policyId}/claim/resolve`,
    {
      method: "PATCH",
      headers: {
        ...authHeaders(adminToken),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        outcome: "REJECTED",
        resolutionNotes:
          "Smoke test: resolución operativa de prueba para validar persistencia y retorno a ACTIVE."
      })
    }
  );

  ensure(
    payload.status === "ACTIVE",
    "Admin puede resolver reclamo rechazándolo y la póliza vuelve a ACTIVE."
  );
  ensure(
    payload.rawPayload?.claim?.resolution?.outcome === "REJECTED",
    "La resolución queda persistida en rawPayload."
  );

  return payload;
}

async function getAuditLogs({ adminToken, query }) {
  return requestJson(
    `${API_BASE_URL}/admin/audit-logs?q=${encodeURIComponent(query)}&pageSize=50`,
    {
      headers: authHeaders(adminToken)
    }
  );
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`
  };
}

async function requestJson(url, options) {
  let response;

  try {
    response = await fetch(url, {
      ...options,
      cache: "no-store"
    });
  } catch (error) {
    throw new Error(
      `No se pudo conectar con ${url}: ${getErrorMessage(error)}`
    );
  }
  const text = await response.text();
  const payload = text ? safeParseJson(text) : null;

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText} en ${url}: ${extractMessage(payload) ?? text}`
    );
  }

  return payload;
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractMessage(payload) {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  if (Array.isArray(payload.message)) {
    return payload.message.join(" ");
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  if (typeof payload.error === "string") {
    return payload.error;
  }

  return undefined;
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  steps.push(message);
  console.log(`PASS ${message}`);
}

function printSummary({ listing, quote, paymentIntent, policy, resolvedPolicy }) {
  console.log("\nSmoke predeploy completado.");
  console.log(`- Listing: ${listing.id} (${listing.title})`);
  console.log(`- Prima seguro: ${quote.pricing.premiumAmount}`);
  console.log(`- Payment intent: ${paymentIntent.id} -> ${paymentIntent.status}`);
  console.log(`- Policy: ${policy.id} -> ${policy.status}`);
  console.log(
    `- Resolución final: ${resolvedPolicy.rawPayload.claim.resolution.outcome} / status ${resolvedPolicy.status}`
  );
  console.log(`- Checks aprobados: ${steps.length}`);
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
