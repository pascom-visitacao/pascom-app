/**
 * PASCOM DESIGN SYSTEM — TOKENS (JS)
 * Espelha tokens.css e tokens.json. Mantenha os três em sincronia.
 * Uso: <script src="tokens.js"></script> expõe `window.PASCOM_TOKENS`.
 */
window.PASCOM_TOKENS = {
  color: {
    green:   { 50:"#f6fbf4",100:"#eaf6e6",200:"#d2ecc9",300:"#b4dfa5",400:"#8fcf78",500:"#6abf4b",600:"#5ca041",700:"#4d8236",800:"#3f632c",900:"#324823" },
    blue:    { 50:"#f0f7fb",100:"#dbedf5",200:"#b2d8ea",300:"#80bedc",400:"#409dcb",500:"#007cba",600:"#05699c",700:"#09577e",800:"#0e445f",900:"#123444" },
    amber:   { 50:"#fffbf1",100:"#fff5de",200:"#fee9b9",300:"#feda8a",400:"#fec850",500:"#fdb615",600:"#d49914",700:"#ab7c14",800:"#825f13",900:"#5e4513" },
    red:     { 50:"#fdf4f3",100:"#fbe6e4",200:"#f6c9c5",300:"#f0a59e",400:"#e8786e",500:"#e14b3d",600:"#bd4135",700:"#99382e",800:"#762e26",900:"#56251f" },
    neutral: { 50:"#faf9f9",100:"#f2f2f2",200:"#e0e0e0",300:"#c1c0c1",400:"#9c9a9b",500:"#777475",600:"#535051",700:"#393536",800:"#2c2829",900:"#231f20",950:"#151313" }
  },
  colorNames: { green: "Verde", blue: "Azul", amber: "Âmbar", red: "Vermelho", neutral: "Neutro" },
  spacing: [
    { token: "space-1",  px: 2,  rem: "0.125rem" },
    { token: "space-2",  px: 4,  rem: "0.25rem"  },
    { token: "space-3",  px: 8,  rem: "0.5rem"   },
    { token: "space-4",  px: 12, rem: "0.75rem"  },
    { token: "space-5",  px: 16, rem: "1rem"     },
    { token: "space-6",  px: 20, rem: "1.25rem"  },
    { token: "space-7",  px: 24, rem: "1.5rem"   },
    { token: "space-8",  px: 32, rem: "2rem"     },
    { token: "space-9",  px: 40, rem: "2.5rem"   },
    { token: "space-10", px: 48, rem: "3rem"     },
    { token: "space-11", px: 64, rem: "4rem"     },
    { token: "space-12", px: 80, rem: "5rem"     },
    { token: "space-13", px: 96, rem: "6rem"     }
  ],
  radius: [
    { token: "radius-none", px: 0,  label: "none" },
    { token: "radius-xs",   px: 2,  label: "xs"   },
    { token: "radius-sm",   px: 4,  label: "sm"   },
    { token: "radius-md",   px: 8,  label: "md"   },
    { token: "radius-lg",   px: 12, label: "lg"   },
    { token: "radius-xl",   px: 16, label: "xl"   },
    { token: "radius-2xl",  px: 20, label: "2xl"  },
    { token: "radius-full", px: 9999, label: "full" }
  ],
  type: [
    { token: "text-5xl", px: 64, family: "display", weight: 600, sample: "Pascom" },
    { token: "text-4xl", px: 48, family: "display", weight: 600, sample: "Pascom Brasil" },
    { token: "text-3xl", px: 40, family: "display", weight: 600, sample: "Título de seção" },
    { token: "text-2xl", px: 32, family: "display", weight: 500, sample: "Subtítulo de destaque" },
    { token: "text-xl",  px: 24, family: "body", weight: 600, sample: "Título de card" },
    { token: "text-lg",  px: 20, family: "body", weight: 600, sample: "Texto de introdução" },
    { token: "text-md",  px: 18, family: "body", weight: 400, sample: "Parágrafo de destaque" },
    { token: "text-base",px: 16, family: "body", weight: 400, sample: "Texto padrão de corpo" },
    { token: "text-sm",  px: 14, family: "body", weight: 400, sample: "Texto auxiliar / rótulos" },
    { token: "text-xs",  px: 12, family: "mono", weight: 500, sample: "LEGENDA · METADADO" }
  ]
};
