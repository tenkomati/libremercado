function padSerial(value: number | string, length = 6) {
  return String(value).padStart(length, "0");
}

export function formatPublicUserCode(serial: number | string) {
  return `USR-${padSerial(serial)}`;
}

export function formatPublicOrderNumber(serial: number | string) {
  return `OP-${padSerial(serial)}`;
}
