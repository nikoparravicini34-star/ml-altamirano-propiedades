const NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
const PHONE_REGEX = /^\+?\d+$/;

export function validateName(value: string, fieldLabel: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `El ${fieldLabel} es obligatorio`;
  if (!NAME_REGEX.test(trimmed)) return `El ${fieldLabel} solo puede contener letras`;
  return null;
}

export function validatePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'El teléfono es obligatorio';
  if (!PHONE_REGEX.test(trimmed)) return 'El teléfono solo puede contener números (opcional + al inicio)';
  if (trimmed.replace(/\D/g, '').length < 8) return 'Ingresá un número de teléfono válido';
  return null;
}
