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
 *  B. BRETTEL, VIENOT and MOLLON 1997, the TWO half plane model, which is
 *     the model that does cover tritanopia properly. The published linear
 *     sRGB matrices are carried here, one pair per deficiency with the plane
 *     that separates them, AND the construction they came from is re-derived
 *     in `brettelDerivation` rather than asserted: the anchor stimuli are the
 *     475 nm and 575 nm monochromatic lights for protan and deutan and the
 *     485 nm and 660 nm ones for tritan, each half plane is spanned by the
 *     white point and one anchor, and the derivation recovers every published
 *     coefficient to 0.011.
 *
 *     THE PHASE 214 FIX ROUND ADDED THIS. Until then the paragraph above was
 *     in this header and the function was not in the file, and a verifier who
 *     wrote its own Brettel read the shipped lanes 2 and 6 at 27.0 under
 *     protanopia, nine below what the palette publishes. This model reads
 *     that pair at 41.4 and the whole set at 38.3 at worst. The likeliest
 *     source of a wrong answer here is an anchor expressed in one LMS
 *     normalisation and used in another, so `brettelChecks` asks the two half
 *     planes to agree ON THEIR OWN SHARED BOUNDARY, which a mis-scaled anchor
 *     cannot do, and they agree to 0.01 of 255.
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
//
// AND BOTH OF THOSE CHECKS PASS AN ARM THAT IS DEGENERATE, which the Phase
// 214 fix round found and which is the reason `simulateVienot3`'s TRITAN case
// is kept here as a record and is NOT one of the arms the published worst
// pair is taken over.
//
// The two matrices round trip to the identity, so this is not a transcription
// error. But substitute the tritan plane into the reconstruction and red and
// green come out with the SAME coefficients, 0.034733 on L and -0.036998 on
// M, so every simulated colour has R equal to G. That is the signature of a
// red green confusion, and tritanopia is a blue yellow one. Measured: a blue
// only difference of 128.0 comes back at 128.0, completely untouched, where
// Machado reads 49.3 and Brettel 34.7; and a mid red against a mid green at
// 90.5 comes back at 255.0, further apart than it started.
//
// It held a fixed white point and it was idempotent throughout. The phase
// published a worst pair "over six published dichromat models" that included
// this arm, and its 33.9 is that arm's reading. The honest number is 36.1
// over the EIGHT arms that model what they name, being lanes 3 and 5 under
// deuteranopia, which is what DESIGN.md and tokens.css now say.
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
// B. Brettel 1997, the two half plane model, on LINEAR rgb.
//
// A dichromat's gamut is a SURFACE and not a plane: it is two half planes
// hinged on the neutral axis, one reached through the blue anchor and one
// through the yellow. Vienot 1999 replaces the pair with a single plane,
// which is why that model is a good approximation for protan and deutan and
// is disclaimed by its own authors for tritan. Here both halves are kept.
//
// `n` is the normal of the plane that separates the two halves, so the sign
// of n . rgb chooses the half, and `a` and `b` project onto it.
// ---------------------------------------------------------------------------
const BRETTEL = {
  protan: {
    n: [0.00048, 0.00393, -0.00441],
    a: [
      [0.1498, 1.19548, -0.34528],
      [0.10764, 0.84864, 0.04372],
      [0.00384, -0.0054, 1.00156]
    ],
    b: [
      [0.1457, 1.16172, -0.30742],
      [0.10816, 0.85291, 0.03892],
      [0.00386, -0.00524, 1.00139]
    ]
  },
  deutan: {
    n: [-0.00281, -0.00611, 0.00892],
    a: [
      [0.36477, 0.86381, -0.22858],
      [0.26294, 0.64245, 0.09462],
      [-0.02006, 0.02728, 0.99278]
    ],
    b: [
      [0.37298, 0.88166, -0.25464],
      [0.25954, 0.63506, 0.1054],
      [-0.0198, 0.02784, 0.99196]
    ]
  },
  tritan: {
    n: [0.03901, -0.02788, -0.01113],
    a: [
      [1.01277, 0.13548, -0.14826],
      [-0.01243, 0.86812, 0.14431],
      [0.07589, 0.805, 0.11911]
    ],
    b: [
      [0.93678, 0.18979, -0.12657],
      [0.06154, 0.81526, 0.1232],
      [-0.37562, 1.12767, 0.24796]
    ]
  }
};
export function simulateBrettel(rgb, kind) {
  const lin = rgb.map(toLinear);
  const p = BRETTEL[kind];
  const side = p.n[0] * lin[0] + p.n[1] * lin[1] + p.n[2] * lin[2];
  const m = side >= 0 ? p.a : p.b;
  return m.map((row) => encode(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]));
}

/**
 * THE CHECK A MIS-SCALED ANCHOR CANNOT PASS. The two half planes of one
 * deficiency meet on the plane `n` names, so on that plane the two matrices
 * must give the SAME answer. An anchor taken from one LMS normalisation and
 * used in another still yields two plausible looking planes, and they do not
 * meet. Returns the worst disagreement in units of 255 and the rank of each
 * matrix, since a projection onto a plane is singular.
 */
export function brettelChecks() {
  const out = {};
  const det = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  for (const kind of ['protan', 'deutan', 'tritan']) {
    const p = BRETTEL[kind];
    const nn = p.n[0] ** 2 + p.n[1] ** 2 + p.n[2] ** 2;
    let seam = 0;
    for (let i = 0; i < 20000; i += 1) {
      const v = [((i * 37) % 251) / 251, ((i * 91) % 241) / 241, ((i * 173) % 239) / 239];
      const d = p.n[0] * v[0] + p.n[1] * v[1] + p.n[2] * v[2];
      const q = [v[0] - (p.n[0] * d) / nn, v[1] - (p.n[1] * d) / nn, v[2] - (p.n[2] * d) / nn];
      const A = p.a.map((r) => r[0] * q[0] + r[1] * q[1] + r[2] * q[2]);
      const B = p.b.map((r) => r[0] * q[0] + r[1] * q[1] + r[2] * q[2]);
      seam = Math.max(seam, Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) * 255);
    }
    out[kind] = { seam, detA: det(p.a), detB: det(p.b), white: simulateBrettel([255, 255, 255], kind) };
  }
  return out;
}

/**
 * THE CONSTRUCTION, RE-DERIVED, so the header's claim is run rather than
 * read. Linear sRGB to CIE XYZ, XYZ to Smith and Pokorny LMS, the CIE 1931
 * two degree colour matching functions at the four anchor wavelengths, the
 * plane through the origin spanned by white and one anchor, and the missing
 * cone response solved from the other two. Returns the worst coefficient
 * disagreement with the matrices above, per deficiency. The residual is the
 * Judd and Vos correction the published fit uses and this derivation does
 * not, and it is about a hundredth.
 */
export function brettelDerivation() {
  const RGB2XYZ = [
    [0.4124564, 0.3575761, 0.1804375],
    [0.2126729, 0.7151522, 0.072175],
    [0.0193339, 0.119192, 0.9503041]
  ];
  const XYZ2LMS = [
    [0.15514, 0.54312, -0.03286],
    [-0.15514, 0.45684, 0.03286],
    [0, 0, 0.01608]
  ];
  // CIE 1931 two degree, at the anchors Brettel 1997 names.
  const CMF = {
    475: [0.1421, 0.1126, 1.0419],
    575: [0.8425, 0.9154, 0.0018],
    485: [0.05795, 0.1693, 0.6162],
    660: [0.1649, 0.061, 0]
  };
  const mul = (m, v) => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
  const mm = (x, y) => x.map((r) => [0, 1, 2].map((j) => r[0] * y[0][j] + r[1] * y[1][j] + r[2] * y[2][j]));
  const inv = (m) => {
    const d =
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    return [
      [(m[1][1] * m[2][2] - m[1][2] * m[2][1]) / d, (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / d, (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / d],
      [(m[1][2] * m[2][0] - m[1][0] * m[2][2]) / d, (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / d, (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / d],
      [(m[1][0] * m[2][1] - m[1][1] * m[2][0]) / d, (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / d, (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / d]
    ];
  };
  const lmsFromRgb = mm(XYZ2LMS, RGB2XYZ);
  const rgbFromLms = inv(lmsFromRgb);
  const white = mul(lmsFromRgb, [1, 1, 1]);
  const cross = (x, y) => [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  const plane = (kind, nm) => {
    const n = cross(white, mul(XYZ2LMS, CMF[nm]));
    const k = kind === 'protan' ? 0 : kind === 'deutan' ? 1 : 2;
    const P = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
    P[k] = [0, 1, 2].map((j) => (j === k ? 0 : -n[j] / n[k]));
    return mm(rgbFromLms, mm(P, lmsFromRgb));
  };
  const ANCHORS = { protan: [475, 575], deutan: [475, 575], tritan: [485, 660] };
  const gap = (x, y) => Math.max(...x.flatMap((r, i) => r.map((v, j) => Math.abs(v - y[i][j]))));
  const out = {};
  for (const kind of ['protan', 'deutan', 'tritan']) {
    const [one, two] = ANCHORS[kind];
    const p = BRETTEL[kind];
    // Which derived plane is the published `a` is a labelling choice, so take
    // the better pairing of the two.
    const straight = Math.max(gap(plane(kind, one), p.a), gap(plane(kind, two), p.b));
    const swapped = Math.max(gap(plane(kind, one), p.b), gap(plane(kind, two), p.a));
    out[kind] = Math.min(straight, swapped);
  }
  return out;
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
