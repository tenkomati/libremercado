export const protectedPurchaseTerms = [
  {
    title: "Cancelación",
    body:
      "Antes de que el vendedor despache o se concrete la entrega, soporte puede cancelar la operación con motivo registrado. Si el pago ya estaba protegido, se inicia reembolso al comprador y la publicación vuelve a estar disponible cuando corresponde."
  },
  {
    title: "Disputa",
    body:
      "Comprador o vendedor pueden abrir una disputa con una explicación clara. Mientras soporte revisa mensajes, evidencia y trazabilidad, los fondos quedan retenidos y ninguna parte recibe el dinero."
  },
  {
    title: "Liberación de fondos",
    body:
      "Cuando el comprador confirma la entrega o soporte valida que la operación se cumplió, los fondos pasan a estar listos para liberarse. La liberación final queda auditada y la operación se marca como cerrada."
  }
];

export function getProtectedPurchaseSummary() {
  return "El pago queda protegido durante la operación. Si algo cambia, cancelación, disputa y liberación siguen reglas visibles y auditables.";
}
