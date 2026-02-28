const SYMBOLS = Object.freeze({
  1:  { icon: "\u2600\uFE0F",  label: "Klart" },
  2:  { icon: "\u26C5",        label: "L\u00E4tt molnighet" },
  3:  { icon: "\u26C5",        label: "Halvklart" },
  4:  { icon: "\u2601\uFE0F",  label: "Molnigt" },
  5:  { icon: "\u2601\uFE0F",  label: "Mycket molnigt" },
  6:  { icon: "\u2601\uFE0F",  label: "Mulet" },
  7:  { icon: "\uD83C\uDF2B\uFE0F", label: "Dimma" },
  8:  { icon: "\uD83C\uDF27\uFE0F", label: "L\u00E4tt regnskur" },
  9:  { icon: "\uD83C\uDF27\uFE0F", label: "M\u00E5ttlig regnskur" },
  10: { icon: "\uD83C\uDF27\uFE0F", label: "Kraftig regnskur" },
  11: { icon: "\u26C8\uFE0F",  label: "\u00C5skv\u00E4der" },
  12: { icon: "\uD83C\uDF28\uFE0F", label: "L\u00E4tt sn\u00F6blandat regn" },
  13: { icon: "\uD83C\uDF28\uFE0F", label: "M\u00E5ttligt sn\u00F6blandat regn" },
  14: { icon: "\uD83C\uDF28\uFE0F", label: "Kraftigt sn\u00F6blandat regn" },
  15: { icon: "\u2744\uFE0F",  label: "L\u00E4tt sn\u00F6fall" },
  16: { icon: "\u2744\uFE0F",  label: "M\u00E5ttligt sn\u00F6fall" },
  17: { icon: "\u2744\uFE0F",  label: "Kraftigt sn\u00F6fall" },
  18: { icon: "\uD83C\uDF26\uFE0F", label: "L\u00E4tt regn" },
  19: { icon: "\uD83C\uDF26\uFE0F", label: "M\u00E5ttligt regn" },
  20: { icon: "\uD83C\uDF27\uFE0F", label: "Kraftigt regn" },
  21: { icon: "\u26C8\uFE0F",  label: "\u00C5ska" },
  22: { icon: "\uD83C\uDF28\uFE0F", label: "L\u00E4tt sn\u00F6blandat regn" },
  23: { icon: "\uD83C\uDF28\uFE0F", label: "M\u00E5ttligt sn\u00F6blandat regn" },
  24: { icon: "\uD83C\uDF28\uFE0F", label: "Kraftigt sn\u00F6blandat regn" },
  25: { icon: "\uD83C\uDF28\uFE0F", label: "L\u00E4tt sn\u00F6fall" },
  26: { icon: "\uD83C\uDF28\uFE0F", label: "M\u00E5ttligt sn\u00F6fall" },
  27: { icon: "\uD83C\uDF28\uFE0F", label: "Kraftigt sn\u00F6fall" }
});

const FALLBACK = Object.freeze({ icon: "\u2753", label: "Ok\u00E4nt" });

export const getWeatherSymbol = (code) => SYMBOLS[code] ?? FALLBACK;

export const getWindDirection = (degrees) => {
  if (degrees == null) return "";
  const dirs = ["N", "NO", "\u00D6", "SO", "S", "SV", "V", "NV"];
  return dirs[Math.round(degrees / 45) % 8];
};
