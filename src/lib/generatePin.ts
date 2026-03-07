export function generatePin(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String((array[0] % 900000) + 100000);
}
