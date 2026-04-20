export function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(Number(value));
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
