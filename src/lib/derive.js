export function derive(floors, temps, comfort) {
  const allRooms = []
  floors.forEach((f) => f.rooms.forEach((r) => allRooms.push({ r, f })))
  const okCount = allRooms.filter((x) => {
    const y = temps.get(x.r.id)
    return y && y.t >= comfort - 0.5
  }).length
  const total = allRooms.length
  const allOk = okCount === total && total > 0
  const coldRooms = allRooms
    .map((x) => ({ ...x, inf: temps.get(x.r.id) }))
    .filter((x) => x.inf && x.inf.t < comfort - 0.5)
    .map((x) => ({
      name: x.r.name,
      floorName: '· ' + x.f.name,
      tempStr: x.inf.t.toFixed(1) + '°',
      needStr: '+' + Math.max(0.1, ((comfort - x.inf.t) * x.inf.G) / 1000).toFixed(1) + ' kW',
    }))
  const totalKw = allRooms.reduce((s, x) => s + (x.r.sources || []).reduce((a, b) => a + b.power, 0), 0)
  return { okCount, total, allOk, coldRooms, totalKw }
}
