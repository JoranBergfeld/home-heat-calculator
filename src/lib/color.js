export function tempColor(t, a = 1, dark = false) {
  const f = Math.min(1, Math.max(0, (t - 10) / 18))
  const hue = (245 - f * 220).toFixed(0)
  return 'oklch(' + (dark ? 0.5 : 0.73) + ' 0.13 ' + hue + ' / ' + a + ')'
}
