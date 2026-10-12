import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { COI_FIELD_MAP } from './coiFieldMap';
import { wrapText } from './wrapText';
import { sanitizeTextForPDF } from './sanitizeText';

// ---------------------------------------------------------------------------
// Additional Insured sentence
// TODO: Confirm exact wording with the insurance agency before shipping —
// this language has legal/insurance implications.
// ---------------------------------------------------------------------------
const buildAdditionalInsuredSentence = (holderName: string) =>
  `${holderName} is included as Additional Insured with respect to General Liability ` +
  `and Automobile Liability as required by written contract.`;

// ---------------------------------------------------------------------------
// Error type — distinguishes user-input overflow from server bugs
// ---------------------------------------------------------------------------
export class COIGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'COIGenerationError';
  }
}

// ---------------------------------------------------------------------------
// Date formatter: YYYY-MM-DD → MM/DD/YYYY  (ACORD 25 standard format)
// Handles both ISO dates and already-formatted strings gracefully.
// ---------------------------------------------------------------------------
export function formatDateForCOI(dateStr: string): string {
  if (!dateStr) return '';

  // Already in MM/DD/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;

  // ISO format: YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${month}/${day}/${year}`;
  }

  // Fall back to original string if unrecognised
  return dateStr;
}

// ---------------------------------------------------------------------------
// Internal: draw multi-line wrapped text block onto a page
// ---------------------------------------------------------------------------
function drawWrappedBlock(
  page: PDFPage,
  lines: string[],
  field: { x: number; y: number; lineHeight: number; size: number; maxLines?: number },
  font: PDFFont,
  fieldName: string
): void {
  const effectiveLines = field.maxLines ? lines.slice(0, field.maxLines) : lines;

  if (field.maxLines && lines.length > field.maxLines) {
    throw new COIGenerationError(
      `"${fieldName}" is too long to fit on the certificate ` +
      `(${lines.length} lines of text, maximum is ${field.maxLines}). ` +
      `Please shorten it.`
    );
  }

  effectiveLines.forEach((line, i) => {
    const safeLine = sanitizeTextForPDF(line, font);
    if (!safeLine) return;
    try {
      page.drawText(safeLine, {
        x: field.x,
        y: field.y - i * field.lineHeight,
        size: field.size,
        font,
        color: rgb(0, 0, 0),
      });
    } catch (err) {
      console.warn(`Failed to draw line in ${fieldName}:`, err);
    }
  });
}

// ---------------------------------------------------------------------------
// Main generation function
// ---------------------------------------------------------------------------
export interface GenerateCOIOptions {
  /** Raw bytes of the admin-uploaded ACORD 25 template PDF */
  templateBytes: Uint8Array;

  /** Certificate date — accepts YYYY-MM-DD or MM/DD/YYYY */
  certificateDate: string;

  /** Certificate holder organisation name */
  certificateHolderName: string;

  /** Certificate holder address (street, city, state, ZIP) */
  certificateHolderAddress: string;

  /** Whether the certificate holder is an Additional Insured */
  additionalInsured: boolean;

  /**
   * Full content of the Description of Operations box.
   * If additionalInsured is true, the AI sentence is automatically
   * appended to whatever the client typed here.
   */
  descriptionOfOperations: string;
}

export async function generateCOI(options: GenerateCOIOptions): Promise<Uint8Array> {
  const {
    templateBytes,
    certificateDate,
    certificateHolderName,
    certificateHolderAddress,
    additionalInsured,
    descriptionOfOperations,
  } = options;

  // Load a copy — never mutate the original template bytes
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[COI_FIELD_MAP.page];

  if (!page) {
    throw new COIGenerationError(
      'The template PDF is missing the expected page. Please re-upload the template.'
    );
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Sanitize all inputs to strip non-encodable characters (BOM, zero-width spaces, etc.)
  const cleanHolderName = sanitizeTextForPDF(certificateHolderName ?? '', font);
  const cleanHolderAddress = sanitizeTextForPDF(certificateHolderAddress ?? '', font);
  const cleanOps = sanitizeTextForPDF(descriptionOfOperations ?? '', font);
  const cleanDate = sanitizeTextForPDF(certificateDate ?? '', font);

  // -------------------------------------------------------------------------
  // ERASURE ZONES: Clear out existing text in pre-filled templates
  // Draws white rectangles over the fields before we stamp new data.
  // -------------------------------------------------------------------------
  // Erase the date value (but not the "DATE" label above it)
  page.drawRectangle({ x: 520, y: 745, width: 60, height: 10, color: rgb(1, 1, 1) });

  // Erase the entire Description of Operations box contents
  page.drawRectangle({ x: 22, y: 145, width: 555, height: 72, color: rgb(1, 1, 1) });

  // Erase the Certificate Holder box contents
  page.drawRectangle({ x: 28, y: 55, width: 270, height: 75, color: rgb(1, 1, 1) });

  // -------------------------------------------------------------------------
  // FIELD 1: Certificate Date
  // -------------------------------------------------------------------------
  const formattedDate = formatDateForCOI(cleanDate);
  page.drawText(sanitizeTextForPDF(formattedDate, font), {
    x: COI_FIELD_MAP.date.x,
    y: COI_FIELD_MAP.date.y,
    size: COI_FIELD_MAP.date.size,
    font,
    color: rgb(0, 0, 0),
  });

  // -------------------------------------------------------------------------
  // FIELD 2: Certificate Holder Name + Address
  // -------------------------------------------------------------------------
  const holderText = `${cleanHolderName}\n${cleanHolderAddress}`;
  const holderLines = wrapText(
    holderText,
    COI_FIELD_MAP.certificateHolder.maxWidth,
    font,
    COI_FIELD_MAP.certificateHolder.size
  );
  drawWrappedBlock(
    page,
    holderLines,
    { ...COI_FIELD_MAP.certificateHolder, maxLines: undefined }, // no hard cap on holder
    font,
    'Certificate Holder'
  );

  // -------------------------------------------------------------------------
  // FIELD 3: Description of Operations (full box, client editable)
  // -------------------------------------------------------------------------
  let opsText = cleanOps;

  if (additionalInsured) {
    const aiSentence = buildAdditionalInsuredSentence(cleanHolderName);
    // Append the AI sentence on a new line after client content
    opsText = opsText
      ? `${opsText.trimEnd()}\n${aiSentence}`
      : aiSentence;
  }

  if (opsText.trim()) {
    const opsLines = wrapText(
      opsText,
      COI_FIELD_MAP.descriptionOfOperations.maxWidth,
      font,
      COI_FIELD_MAP.descriptionOfOperations.size
    );
    drawWrappedBlock(
      page,
      opsLines,
      COI_FIELD_MAP.descriptionOfOperations,
      font,
      'Description of Operations'
    );
  }

  // -------------------------------------------------------------------------
  // FIELD 4: Additional Insured — X marks on GL and Auto rows
  // -------------------------------------------------------------------------
  if (additionalInsured) {
    // General Liability checkbox
    page.drawText('X', {
      x: COI_FIELD_MAP.additionalInsuredGL.x,
      y: COI_FIELD_MAP.additionalInsuredGL.y,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });

    // Auto Liability checkbox
    page.drawText('X', {
      x: COI_FIELD_MAP.additionalInsuredAuto.x,
      y: COI_FIELD_MAP.additionalInsuredAuto.y,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });
  }

  return pdfDoc.save();
}
