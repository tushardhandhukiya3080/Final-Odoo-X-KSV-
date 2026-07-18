// Indian number-plate parsing. Shared by the client OCR scan and server-side
// validation. NOTE: this validates FORMAT + our own records — it is not an RTO
// ownership check. A real VAHAN/Parivahan API would slot into verifyWithRto().

// Normalised (no separators, uppercase) full-string validators.
const STD = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,4}$/; // GJ01AB1234, MH12DE1433, DL7CAB1234
const BH = /^\d{2}BH\d{4}[A-Z]{1,2}$/; // 22BH1234AA (Bharat series)

// Loose scanners that tolerate spaces/dashes inside noisy OCR text.
const STD_SCAN = /[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{1,3}[\s-]?\d{3,4}/g;
const BH_SCAN = /\d{2}[\s-]?BH[\s-]?\d{4}[\s-]?[A-Z]{1,2}/g;

export function normalizePlate(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidPlate(s: string): boolean {
  const n = normalizePlate(s);
  return STD.test(n) || BH.test(n);
}

// Pull the first plausible plate out of raw OCR text (or return null).
export function extractPlate(ocrText: string): string | null {
  const t = ocrText.toUpperCase();
  for (const re of [BH_SCAN, STD_SCAN]) {
    const matches = t.match(re);
    if (matches) {
      for (const m of matches) {
        const n = normalizePlate(m);
        if (isValidPlate(n)) return n;
      }
    }
  }
  return null;
}

// ponytail: quick self-check — `node --import tsx src/lib/plate.ts`
if (process.argv[1] && process.argv[1].endsWith("plate.ts")) {
  console.assert(isValidPlate("GJ01AB1234"), "std");
  console.assert(isValidPlate("MH 12 DE 1433"), "std spaced");
  console.assert(isValidPlate("22BH1234AA"), "bh");
  console.assert(!isValidPlate("HELLO123"), "junk rejected");
  console.assert(extractPlate("blah\nIND  GJ 01 AB 1234  \nxyz") === "GJ01AB1234", "extract std");
  console.assert(extractPlate("22 BH 1234 AA") === "22BH1234AA", "extract bh");
  console.assert(extractPlate("no plate here") === null, "no match");
  console.log("plate.ts self-check ok");
}
