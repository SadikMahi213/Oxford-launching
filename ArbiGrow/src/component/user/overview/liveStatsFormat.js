export function fmtLiveOnline(v) {
  return Math.round(v).toLocaleString("en-US")
}

export function fmtTasks(v) {
  return Math.round(v).toLocaleString("en-US")
}

export function fmtEarnings(v) {
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
