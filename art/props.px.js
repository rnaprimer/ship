// Peekatribe ship props, drawn with pxl (see README "Art"). Top-down 3/4 view,
// light from the top-left. Built PNGs are committed to scripts/art/sprites/
// and stamped into the maps by scripts/build-ship-assets.ts.
//
//   node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/props.px.js --out art/out
//   node scripts/sync-sprites.ts
pal({
  k: "#1c0f08",
  // wood, dark -> light
  W: "#3e2210", w: "#6e4020", v: "#9a6232", V: "#c88a4c", u: "#e2ab6c",
  // iron
  i: "#33333c", I: "#5c5c68", j: "#9696a4",
  // gold / brass
  g: "#8a5e1c", G: "#d29a3a", y: "#f6d27a",
  // red cloth
  r: "#5e1614", R: "#9b2b26", s: "#c8443a",
  // bone / parchment
  b: "#a8885c", B: "#d8c08c", c: "#f4e6c0",
  // leaves
  l: "#255a24", L: "#3f8a3a", m: "#7cc45a",
  // fruit
  o: "#c8642a", O: "#f0a040", a: "#a82a24",
  // water / glass
  q: "#1f6f93", Q: "#2fa6c8", x: "#8fe0f0",
  n: "#24482c", N: "#4f9a5a", p: "#4a2464", P: "#9a5ad6", t: "#223e78", T: "#4f8ad6",
  // flame
  f: "#b8381f", F: "#f08a30", h: "#ffd36b", H: "#fff4c8",
  // parrot blue
  e: "#2a6ad0", E: "#5aa8f0",
})
ramps("kWwvVu", "kiIj", "kgGy", "krRs", "kbBc", "klLm", "koO", "kqQx", "knN", "kpP", "ktT", "kfFhH", "keE")

// ------------------------------------------------------------------- barrels
// Upright barrel: lid on top, staves, two iron hoops. 14x18 before outline.
const barrel = (c, top) => {
  // body
  c.rect(1, 5, 12, 12, "w")
  c.rect(0, 7, 14, 8, "w")
  for (const x of [3, 6, 9]) c.vline(x, 5, 12, "W")
  c.rect(1, 6, 3, 10, "v"); c.vline(1, 7, 8, "V")
  c.rect(11, 6, 2, 10, "W")
  // hoops
  for (const y of [7, 13]) { c.hline(0, y, 14, "i"); c.hline(1, y, 5, "I"); c.px(2, y, "j") }
  // lid
  c.ellipse(6, 4, 6, 3, top === "water" ? "W" : "v")
  if (top === "water") { c.ellipse(6, 4, 5, 2, "Q"); c.hline(3, 3, 3, "x") }
  else if (top === "open") { c.ellipse(6, 4, 5, 2, "W"); c.hline(4, 4, 4, "k") }
  else { c.ellipse(6, 4, 5, 2, "V"); c.hline(2, 4, 9, "v"); c.hline(3, 2, 6, "u"); c.px(9, 5, "W") }
  c.hline(1, 17, 12, "W")
}
sprite("barrel", { w: 14, h: 18, outline: "k" }, (c) => barrel(c, "lid"))
sprite("barrel_water", { w: 14, h: 18, outline: "k" }, (c) => barrel(c, "water"))
sprite("barrel_open", { w: 14, h: 18, outline: "k" }, (c) => barrel(c, "open"))

// Keg on a stand with a brass tap (for bars and galleys): lies on its side.
sprite("keg", { w: 28, h: 20, outline: "k" }, (c) => {
  // stand
  c.rect(3, 15, 3, 5, "W"); c.rect(22, 15, 3, 5, "W"); c.hline(2, 15, 24, "w")
  // body (lying barrel)
  c.ellipse(14, 9, 13, 7, "w")
  for (const y of [5, 9, 13]) c.hline(2, y, 24, "W")
  c.ellipse(13, 6, 10, 3, "v"); c.hline(5, 4, 12, "V")
  for (const x of [6, 21]) { c.vline(x, 3, 13, "i"); c.vline(x - 1, 4, 5, "I") }
  // end cap on the right with tap
  c.ellipse(24, 9, 3, 6, "v"); c.ellipse(24, 9, 2, 5, "V")
  c.rect(25, 9, 3, 2, "G"); c.px(27, 11, "g"); c.px(25, 9, "y")
})

// ------------------------------------------------------------------- crates
const crate = (c, fill) => {
  // 3/4 box: top face then front face
  c.rect(0, 0, 15, 5, "V")
  c.rect(0, 5, 15, 11, "v")
  c.hline(0, 5, 15, "w")
  for (const y of [9, 13]) c.hline(0, y, 15, "w")
  c.vline(0, 0, 16, "u"); c.vline(14, 0, 16, "W"); c.rect(13, 5, 2, 11, "w")
  c.line(1, 6, 13, 15, "w")
  for (const [x, y] of [[1, 6], [13, 6], [1, 15], [13, 15]]) c.px(x, y, "i")
  if (fill === "oranges" || fill === "apples") {
    const [hi, lo] = fill === "oranges" ? ["O", "o"] : ["s", "a"]
    c.rect(1, 1, 13, 4, "W")
    for (const [x, y] of [[2, 1], [5, 0], [8, 1], [11, 0], [3, 3], [7, 3], [10, 3]]) {
      c.rect(x, y, 3, 3, lo); c.px(x, y, hi); c.px(x + 1, y, hi)
    }
    if (fill === "apples") c.px(6, 0, "L")
  } else {
    c.rect(2, 1, 11, 3, "v"); c.hline(2, 2, 11, "w")
  }
}
sprite("crate", { w: 15, h: 16, outline: "k" }, (c) => crate(c, "lid"))
sprite("crate_oranges", { w: 15, h: 16, outline: "k" }, (c) => crate(c, "oranges"))
sprite("crate_apples", { w: 15, h: 16, outline: "k" }, (c) => crate(c, "apples"))

sprite("sack", { w: 13, h: 14, outline: "k" }, `
  ....bb.......
  ...bBBb......
  ....bb.......
  ..bBBBBb.....
  .bBccBBBb....
  bBcccBBBbb...
  bBccBBBBBb...
  bBBBBBBBbb...
  bBBBBBBbbb...
  bBBBBBbbbb...
  .bBBBbbbb....
  ..bbbbbb.....`, (c) => { c.recolor({ b: "b" }) })

// ------------------------------------------------------------------- light
anim("flame", { w: 7, h: 10, frames: 6, fps: 10 }, (c) => {
  const k = c.phase * Math.PI * 2, sway = Math.round(Math.sin(k) * 1.1)
  c.poly([0, 10, 3 + sway, Math.round(1 + Math.sin(k * 2)), 7, 10], "f")
  c.poly([1, 10, 3 + sway, Math.round(3 + Math.cos(k * 2)), 6, 10], "F")
  c.poly([2, 10, 3, Math.round(6 + Math.sin(k)), 5, 10], "h")
  c.px(3, 9, "H")
})
anim("flame_small", { w: 3, h: 5, frames: 4, fps: 8 }, (c) => {
  const s = c.frame % 2
  c.px(1, 4, "F"); c.px(1, 3, "h"); c.px(1 - s + (c.frame > 1 ? 1 : 0), 2, "F"); c.px(1, 1 + s, "f")
})

sprite("torch", { w: 9, h: 16, outline: "k" },
  rect(3, 7, 3, 9, "w"), vline(3, 8, 7, "v"), rect(1, 6, 7, 2, "g"), hline(1, 6, 7, "G"),
  rect(2, 4, 5, 2, "W"))

sprite("candelabra", { w: 13, h: 16, outline: "k" }, (c) => {
  c.rect(4, 13, 5, 3, "g"); c.hline(4, 13, 5, "G")
  c.vline(6, 6, 8, "G")
  c.hline(1, 8, 11, "G"); c.hline(1, 9, 11, "g")
  for (const x of [1, 6, 11]) { c.rect(x - 1, 3, 2, 5, "c"); c.vline(x, 3, 5, "B") }
})

sprite("brazier", { w: 16, h: 14, outline: "k" }, (c) => {
  c.ellipse(8, 4, 7, 3, "i"); c.ellipse(8, 4, 6, 2, "W"); c.ellipse(8, 4, 4, 1, "f")
  c.poly([2, 5, 14, 5, 11, 10, 5, 10], "I"); c.hline(3, 6, 10, "j")
  c.line(5, 10, 3, 13, "i"); c.line(10, 10, 12, 13, "i"); c.vline(8, 10, 4, "i")
})

// ------------------------------------------------------------------- shelves & bottles
const bottle = (c, x, colors, tall) => {
  const [dark, light] = colors
  c.rect(x, 14 - tall, 3, tall, dark); c.vline(x, 15 - tall, tall - 2, light)
  c.px(x + 1, 13 - tall, dark); c.px(x + 1, 12 - tall, "b")
  if (tall > 6) c.rect(x, 10 - Math.floor(tall / 3), 3, 2, "B")
}
sprite("bottle_shelf", { w: 30, h: 16, outline: "k" }, (c) => {
  c.rect(0, 14, 30, 2, "v"); c.hline(0, 14, 30, "V"); c.rect(1, 16, 2, 0, "W")
  const sets = [["n", "N"], ["W", "v"], ["p", "P"], ["n", "N"], ["t", "T"], ["r", "s"], ["W", "V"], ["n", "N"]]
  sets.forEach((col, i) => bottle(c, 1 + i * 3.6 | 0, col, 6 + ((i * 5) % 4)))
})

sprite("potions", { w: 16, h: 12, outline: "k" }, (c) => {
  const flask = (x, base, hi, r) => {
    c.circ(x, 8, r, base); c.px(x - 1, 7, hi); c.rect(x - 1, 8 - r - 3, 2, 3, "B"); c.px(x - 1, 8 - r - 4, "w")
  }
  flask(3, "R", "s", 3); flask(9, "t", "T", 2); flask(13, "N", "m", 2)
})

sprite("tankards", { w: 16, h: 9, outline: "k" }, (c) => {
  for (const x of [0, 6, 11]) {
    c.rect(x, 2, 4, 6, "I"); c.vline(x, 3, 4, "j"); c.rect(x, 1, 4, 2, "c")
    c.px(x + 4, 4, "I"); c.px(x + 4, 6, "I")
  }
})

// ------------------------------------------------------------------- treasure & bones
sprite("_skull", { w: 7, h: 7 }, `
  .bBBb..
  bBccBb.
  BkcBkb.
  BkBBkb.
  bBBBBb.
  .bkbk..
  .bbbb..`)
sprite("skull_pile", { w: 24, h: 18, outline: "k" },
  stamp("_skull", 1, 10), stamp("_skull", 8, 11), stamp("_skull", 15, 10),
  stamp("_skull", 4, 5), stamp("_skull", 12, 5), stamp("_skull", 8, 0))

sprite("chest_gold", { w: 22, h: 17, outline: "k" }, (c) => {
  // lid (rounded) then body
  c.rect(1, 2, 20, 6, "w"); c.hline(2, 1, 18, "v"); c.hline(1, 2, 20, "V")
  c.rect(0, 8, 22, 9, "v"); c.hline(0, 8, 22, "W")
  for (const x of [0, 6, 15, 21]) { c.vline(x, 1, 16, "g"); }
  c.vline(6, 1, 16, "G"); c.vline(15, 1, 16, "G")
  c.hline(0, 16, 22, "g")
  c.rect(9, 7, 4, 5, "G"); c.px(10, 8, "y"); c.px(10, 10, "k")
  c.vline(1, 9, 6, "V")
})

sprite("coins", { w: 12, h: 6, outline: "k" }, `
  ...yG..yG...
  .yGGgyGGg...
  yGGgGGgGGgy.
  GGgGGgGgGGg.
  .gg.ggg.gg..`)

// ------------------------------------------------------------------- the parrot companion
anim("parrot", { w: 12, h: 12, frames: 4, fps: 6, outline: "k" }, (c) => {
  const up = c.frame % 2
  // body
  c.ellipse(6, 7 - up, 3, 4, "R"); c.px(5, 5 - up, "s"); c.px(5, 6 - up, "s")
  // head + beak + eye
  c.circ(6, 3 - up, 2, "R"); c.px(8, 3 - up, "y"); c.px(9, 4 - up, "g"); c.px(6, 2 - up, "k")
  // wings flap
  if (c.frame < 2) { c.rect(2, 6 - up, 2, 4, "e"); c.rect(9, 6 - up, 2, 4, "e"); c.vline(2, 7 - up, 2, "E") }
  else { c.line(1, 4, 3, 7, "e"); c.line(11, 4, 9, 7, "e"); c.px(1, 4, "E"); c.px(11, 4, "E") }
  // tail
  c.vline(6, 11 - up, 1, "e"); c.px(5, 11 - up, "y")
})
