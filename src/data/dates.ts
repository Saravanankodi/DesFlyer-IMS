export function getCurrentMonthValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

export function getCurrentMonthLabel() {
  return new Date().toLocaleDateString("en", { month: "long", year: "numeric" });
}
