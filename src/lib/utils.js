export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Função para capitalizar a primeira letra de cada palavra
export function capitalizeWords(text) {
  if (!text) return "";
  return text
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}