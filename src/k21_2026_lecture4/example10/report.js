export function completionRate(completed, total) {
  return completed / total;
}

export function formatRate(rate) {
  return Math.round(rate) + "%";
}
