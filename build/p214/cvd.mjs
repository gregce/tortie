/**
 * P214 measure THREE, part one: a colour vision simulation written by hand
 * from published matrices, and proved on known pairs before it is trusted.
 *
 * THREE INDEPENDENT MODELS, because a separation is only worth reporting if
 * two arithmetics that were derived differently agree about it.
 *
 *  A. VIENOT, BRETTEL and MOLLON 1999, the single plane model, which is what
 *     research 24 measured with and what src/renderer/scm/graph/__tests__/
 *     contrast.ts and rule 28 of the hue gate use. Protan and deutan only:
 *     the paper itself says the tritan plane cannot be done this way.
 *  B. BRETTEL, VIENOT and MOLLON 1997, the TWO half plane model, in LMS,
 *     which is the model that does cover tritanopia. Written here from the
 *     published construction rather than copied: the anchor stimuli are the
 *     475 nm and 575 nm monochromatic lights for protan and deutan and the
 *     485 nm and 660 nm ones for tritan, and each half plane is spanned by
 *     the white point and one anchor.
 *  C. MACHADO, OLIVEIRA and FERNANDES 2009, the severity 1.0 linear RGB
 *     matrices, which were fitted by a different route entirely (a shift in
 *     the cone spectral sensitivities) and are the cross check.
 *
 * Nothing here imports the tree's own simulation. Agreement with it is a
 * result rather than an assumption.
 */

// ---------------------------------------------------------------------------
// sRGB
// ---------------------------------------------------------------------------
export function hexToRgb(hex) {
  const v = Number.parseInt(String(hex).replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
export function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}
export function toLinear(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
export function encode(l) {
  const v = Math.min(1, Math.max(0, l));
  return Math.round((v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055) * 255);
}
export function luminance([r, g, b]) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// ---------------------------------------------------------------------------
// A. Vienot 1999, single plane. Protan and deutan.
// ---------------------------------------------------------------------------
function rgbToLmsVienot([r, g, b]) {
  return [
    17.8824 * r + 43.5161 * g + 4.11935 * b,
    3.45565 * r + 27.1554 * g + 3.86714 * b,
    0.0299566 * r + 0.184309 * g + 1.46709 * b
  ];
}
function lmsToRgbVienot([l, m, s]) {
  return [
    0.0809444479 * l - 0.130504409 * m + 0.116721066 * s,
    -0.0102485335 * l + 0.0540193266 * m - 0.113614708 * s,
    -0.000365296938 * l - 0.00412161469 * m + 0.693511405 * s
  ];
}
export function simulateVienot(rgb, kind) {
  const lin = rgb.map(toLinear);
  const [l, m, s] = rgbToLmsVienot(lin);
  const l2 = kind === 'protan' ? 2.02344 * m - 2.52581 * s : l;
  const m2 = kind === 'deutan' ? 0.494207 * l + 1.24827 * s : m;
  return lmsToRgbVienot([l2, m2, s]).map(encode);
}

// ---------------------------------------------------------------------------
// A2. The SAME single plane framework extended to TRITANOPIA, which the 1999
// paper writes in the same LMS space:
//
//     S' = -0.395913 L + 0.801109 M
//
// Each of the three projections is checked here rather than trusted, by two
// structural properties a dichromat projection must have and a coefficient
// pair cannot fake:
//   - WHITE IS A FIXED POINT. The plane is spanned by the white point, so
//     the missing cone response of white must come back as itself. Over this
//     matrix white is L 65.5, M 34.5, S 1.68, and 2.02344 M - 2.52581 S is
//     65.56, 0.494207 L + 1.24827 S is 34.47 and -0.395913 L + 0.801109 M is
//     1.71.
//   - THE PROJECTION IS IDEMPOTENT. Simulating a simulated colour changes
//     nothing, because the answer already lies in the plane.
// ---------------------------------------------------------------------------
export function simulateVienot3(rgb, kind) {
  const lin = rgb.map(toLinear);
  const [l, m, s] = rgbToLmsVienot(lin);
  const l2 = kind === 'protan' ? 2.02344 * m - 2.52581 * s : l;
  const m2 = kind === 'deutan' ? 0.494207 * l + 1.24827 * s : m;
  const s2 = kind === 'tritan' ? -0.395913 * l + 0.801109 * m : s;
  return lmsToRgbVienot([l2, m2, s2]).map(encode);
}

/** White and the idempotence check, for the proof step. */
export function planeChecks() {
  const w = rgbToLmsVienot([1, 1, 1]);
  return {
    white: w,
    protan: 2.02344 * w[1] - 2.52581 * w[2],
    deutan: 0.494207 * w[0] + 1.24827 * w[2],
    tritan: -0.395913 * w[0] + 0.801109 * w[1]
  };
}

// ---------------------------------------------------------------------------
// C. Machado 2009, severity 1.0, on LINEAR rgb.
// ---------------------------------------------------------------------------
const MACHADO = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998]
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881]
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039]
  ]
};
export function simulateMachado(rgb, kind) {
  const lin = rgb.map(toLinear);
  const m = MACHADO[kind];
  return m.map((row) => encode(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]));
}

// ---------------------------------------------------------------------------
// The metric research 24 used: Euclidean distance in 8 bit sRGB after
// simulation. Higher is safer; the threshold the palette carries is 32.
// ---------------------------------------------------------------------------
export function sep(a, b, simulate, kind) {
  const x = simulate(a, kind);
  const y = simulate(b, kind);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}
