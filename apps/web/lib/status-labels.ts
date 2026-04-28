function fallbackLabel(value?: string | null) {
  if (!value) {
    return "Sin estado";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const listingConditionLabels: Record<string, string> = {
  NEW: "Nuevo",
  LIKE_NEW: "Como nuevo",
  VERY_GOOD: "Muy bueno",
  GOOD: "Bueno",
  FAIR: "Con detalles"
};

const kycStatusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  REQUIRES_REVIEW: "Requiere revisión"
};

const userStatusLabels: Record<string, string> = {
  ACTIVE: "Activo",
  BLOCKED: "Bloqueado",
  PENDING_REVIEW: "Pendiente de revisión"
};

const listingStatusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicada",
  RESERVED: "Reservada",
  SOLD: "Vendida",
  PAUSED: "Pausada",
  UNDER_REVIEW: "En revisión",
  REMOVED: "Removida"
};

const escrowStatusLabels: Record<string, string> = {
  FUNDS_PENDING: "Pago pendiente",
  FUNDS_HELD: "Pago recibido",
  SHIPPED: "En camino",
  DELIVERED: "Entregado",
  DISPUTED: "En disputa",
  RELEASED: "Liberado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado"
};

const escrowPaymentStatusLabels: Record<string, string> = {
  PAYMENT_PENDING: "Pago pendiente",
  PAYMENT_RECEIVED: "Pago recibido",
  PAYMENT_RELEASED: "Pago liberado",
  DISPUTED: "En disputa",
  PAYMENT_CANCELLED: "Pago cancelado",
  PAYMENT_REFUNDED: "Pago reembolsado"
};

const escrowShippingStatusLabels: Record<string, string> = {
  WAITING_DISPATCH: "Esperando despacho",
  IN_TRANSIT: "En tránsito",
  READY_FOR_PICKUP: "Para retirar",
  DELIVERED: "Entregado",
  RETURNING: "En devolución",
  WAITING_MEETING: "Esperando encuentro",
  AT_MEETING_POINT: "En punto de encuentro",
  QR_CONFIRMED: "Confirmado por QR"
};

const meetingProposalStatusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptada",
  DECLINED: "Rechazada",
  CANCELLED: "Cancelada"
};

const availabilitySlotStatusLabels: Record<string, string> = {
  OPEN: "Disponible",
  SELECTED: "Seleccionada",
  CANCELLED: "Cancelada"
};

const deliveryProposalStatusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptada",
  DECLINED: "Rechazada",
  CANCELLED: "Cancelada"
};

const insurancePolicyStatusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  ACTIVE: "Activa",
  CLAIMED: "En reclamo"
};

const insuranceClaimStatusLabels: Record<string, string> = {
  OPEN: "Abierto",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado"
};

export function getListingConditionLabel(value?: string | null) {
  return (value ? listingConditionLabels[value] : undefined) ?? fallbackLabel(value);
}

export function getKycStatusLabel(value?: string | null) {
  return (value ? kycStatusLabels[value] : undefined) ?? fallbackLabel(value);
}

export function getUserStatusLabel(value?: string | null) {
  return (value ? userStatusLabels[value] : undefined) ?? fallbackLabel(value);
}

export function getListingStatusLabel(value?: string | null) {
  return (value ? listingStatusLabels[value] : undefined) ?? fallbackLabel(value);
}

export function getMeetingProposalStatusLabel(value?: string | null) {
  return (value ? meetingProposalStatusLabels[value] : undefined) ?? fallbackLabel(value);
}

export function getEscrowStatusLabel(value?: string | null) {
  return (value ? escrowStatusLabels[value] : undefined) ?? fallbackLabel(value);
}

export function getEscrowPaymentStatusLabel(value?: string | null) {
  return (value ? escrowPaymentStatusLabels[value] : undefined) ?? fallbackLabel(value);
}

export function getEscrowShippingStatusLabel(value?: string | null) {
  return (value ? escrowShippingStatusLabels[value] : undefined) ?? fallbackLabel(value);
}

export function getAvailabilitySlotStatusLabel(value?: string | null) {
  return (value ? availabilitySlotStatusLabels[value] : undefined) ?? fallbackLabel(value);
}

export function getDeliveryProposalStatusLabel(value?: string | null) {
  return (value ? deliveryProposalStatusLabels[value] : undefined) ?? fallbackLabel(value);
}

export function getInsurancePolicyStatusLabel(value?: string | null) {
  return (value ? insurancePolicyStatusLabels[value] : undefined) ?? fallbackLabel(value);
}

export function getInsuranceClaimStatusLabel(value?: string | null) {
  return (value ? insuranceClaimStatusLabels[value] : undefined) ?? fallbackLabel(value);
}
