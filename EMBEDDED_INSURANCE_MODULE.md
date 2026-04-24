# Embedded Insurance - Base Inicial

## Objetivo

Agregar un micro-seguro opcional en checkout para operaciones de alto valor.

En este repo, el equivalente de `orders` es `EscrowTransaction`, por eso la
integración se apoya sobre esa entidad en vez de crear una orden paralela.

## Qué quedó implementado

- Esquema Prisma y migración SQL para:
  - `insurance_providers`
  - `insurance_policies`
  - campos `is_insured` e `insurance_fee` en `EscrowTransaction`
- Script SQL listo para Supabase en:
  - `/Users/matiassanchez/Desktop/REPOS/libremercado/supabase/sql/20260423_embedded_insurance.sql`
- Módulo Nest `InsuranceModule`
- Endpoint de cotización:
  - `POST /insurance/get-quote`
- Webhook de póliza:
  - `POST /insurance/webhooks/:providerName`
- Service pattern:
  - `BaseInsuranceProvider`
  - `GenericInsurtechProvider`
- Integración con checkout:
  - `CreateCheckoutDto.insuranceSelected`
  - si el usuario elige seguro, se calcula prima y se guarda en escrow
  - el `PaymentIntent.amount` pasa a incluir `insurance_fee`
  - cuando el pago queda `FUNDS_HELD`, se emite la póliza automáticamente
- Validación de seguridad:
  - el seguro solo se emite si el comprador tiene identidad verificada
  - en este proyecto equivale a `buyer.kycStatus === APPROVED`

## Archivos principales

- `/Users/matiassanchez/Desktop/REPOS/libremercado/apps/api/src/modules/insurance/insurance.module.ts`
- `/Users/matiassanchez/Desktop/REPOS/libremercado/apps/api/src/modules/insurance/insurance.controller.ts`
- `/Users/matiassanchez/Desktop/REPOS/libremercado/apps/api/src/modules/insurance/insurance.service.ts`
- `/Users/matiassanchez/Desktop/REPOS/libremercado/apps/api/src/modules/insurance/providers/base-insurance-provider.ts`
- `/Users/matiassanchez/Desktop/REPOS/libremercado/apps/api/src/modules/insurance/providers/generic-insurtech.provider.ts`
- `/Users/matiassanchez/Desktop/REPOS/libremercado/apps/api/src/modules/insurance/dto/get-insurance-quote.dto.ts`
- `/Users/matiassanchez/Desktop/REPOS/libremercado/apps/api/src/modules/insurance/dto/insurance-policy-webhook.dto.ts`
- `/Users/matiassanchez/Desktop/REPOS/libremercado/apps/api/src/modules/payments/payments.service.ts`
- `/Users/matiassanchez/Desktop/REPOS/libremercado/apps/api/src/modules/payments/dto/create-checkout.dto.ts`

## Modelos de entrada/salida

### Request quote

```json
{
  "productId": "cmabc123",
  "price": 1850000
}
```

### Response quote

```json
{
  "productId": "cmabc123",
  "productTitle": "MacBook Air M2 13 pulgadas 16 GB RAM",
  "category": "Computacion",
  "eligible": true,
  "requiresIdentityVerified": false,
  "provider": {
    "id": "cmprov123",
    "name": "GenericInsurtech"
  },
  "pricing": {
    "productPrice": "1850000",
    "ratePercentage": "1.5",
    "premiumAmount": "27750",
    "coverageAmount": "1850000",
    "totalWithInsurance": "1877750"
  },
  "reason": null
}
```

### Checkout con seguro

```json
{
  "listingId": "cmabc123",
  "shippingProvider": "Entrega protegida libremercado",
  "insuranceSelected": true
}
```

### Webhook de póliza

```json
{
  "eventId": "evt_ins_001",
  "externalPolicyId": "policy_cmorder123",
  "orderId": "cmorder123",
  "status": "CLAIMED",
  "policyUrl": "https://api.generic-insurtech.example/policies/policy_cmorder123",
  "rawPayload": {
    "claim_reason": "robo"
  }
}
```

## Variables de entorno

- `INSURANCE_PROVIDER_ENDPOINT_API`
- `INSURANCE_PROVIDER_API_KEY`
- `INSURANCE_MIN_AMOUNT_ARS`
- `INSURANCE_PREMIUM_PERCENTAGE`
- `INSURANCE_ELIGIBLE_CATEGORIES`

## Pendientes recomendados

- Conectar provider real de seguros.
- Mover `api_key` fuera de lectura directa en consola admin si después se expone UI.
- Agregar checkbox y resumen visual del micro-seguro en frontend checkout.
- Mostrar póliza activa y URL en `/account`.
- Agregar tests de quote, emisión y webhook de póliza.
