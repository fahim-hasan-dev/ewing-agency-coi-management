import { PDFFont } from 'pdf-lib';
import { sanitizeTextForPDF } from './sanitizeText';

/**
 * Wraps text into lines that fit within maxWidth, respecting explicit newlines.
 *
 * @param text      - Raw text (may contain \n for paragraph breaks)
 * @param maxWidth  - Maximum line width in PDF points
 * @param font      - Embedded PDF font (used to measure character widths)
 * @param size      - Font size in points
 * @returns         - Array of strings, each fitting within maxWidth
 */
export function wrapText(
  text: string,
  maxWidth: number,
  font: PDFFont,
  size: number
): string[] {
  const cleanText = sanitizeTextForPDF(text, font);
  const lines: string[] = [];

  // Preserve explicit newlines as paragraph breaks
  cleanText.split('\n').forEach((paragraph) => {
    if (paragraph.trim() === '') {
      lines.push(''); // blank separator line
      return;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      let testWidth = 0;
      try {
        testWidth = font.widthOfTextAtSize(testLine, size);
      } catch {
        testWidth = testLine.length * (size * 0.55);
      }

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) lines.push(currentLine);
  });

  return lines;
}
