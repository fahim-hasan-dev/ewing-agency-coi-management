import { PDFFont } from 'pdf-lib';

/**
 * Common replacements for typography and special characters
 * to ensure compatibility with standard PDF fonts (WinAnsi / Windows-1252).
 */
const CHAR_REPLACEMENTS: Record<string, string> = {
  '\u00A0': ' ', // Non-breaking space
  '\u202F': ' ', // Narrow no-break space
  '\u2009': ' ', // Thin space
  '\u2002': ' ', // En space
  '\u2003': ' ', // Em space
  '\u2004': ' ', // Three-per-em space
  '\u2005': ' ', // Four-per-em space
  '\u2006': ' ', // Six-per-em space
  '\u2007': ' ', // Figure space
  '\u2008': ' ', // Punctuation space
  '\t': '    ',   // Tab to 4 spaces
  '‘': "'",
  '’': "'",
  '‚': "'",
  '‛': "'",
  '“': '"',
  '”': '"',
  '„': '"',
  '‟': '"',
  '–': '-',      // En dash
  '—': '-',      // Em dash
  '―': '-',      // Horizontal bar
  '−': '-',      // Minus sign
  '…': '...',    // Horizontal ellipsis
  '•': '*',      // Bullet
  '·': '*',      // Middle dot
  '™': 'TM',
  '©': '(C)',
  '®': '(R)',
};

/**
 * Sanitizes input text for PDF generation by removing invisible/zero-width
 * characters (like BOM 0xFEFF), normalizing newlines (CRLF/CR -> LF),
 * converting unsupported typographic Unicode symbols to WinAnsi equivalents,
 * and filtering characters that the font cannot encode.
 */
export function sanitizeTextForPDF(text: string | null | undefined, font?: PDFFont): string {
  if (!text) return '';

  // 1. Normalize line endings (CRLF and CR -> LF)
  let clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Remove BOM and zero-width / non-printing characters
  // \uFEFF: Zero-width no-break space (Byte Order Mark)
  // \u200B-\u200D: Zero-width space, non-joiner, joiner
  // \u2060: Word joiner
  // \uFE0E-\uFE0F: Variation selectors
  // \u00AD: Soft hyphen
  clean = clean.replace(/[\uFEFF\u200B-\u200D\u2060\uFE0E\uFE0F\u00AD]/g, '');

  // 3. Map common typographic unicode characters to ASCII/WinAnsi equivalents
  clean = clean.replace(
    /[\u00A0\u202F\u2009\u2002\u2003\u2004\u2005\u2006\u2007\u2008\t‘’‚‛“”„‟–—―−…•·™©®]/g,
    (match) => CHAR_REPLACEMENTS[match] ?? match
  );

  // 4. If a font is provided, filter/replace any characters not supported by its encoding
  if (font && typeof font.getCharacterSet === 'function') {
    const supported = new Set(font.getCharacterSet());
    let result = '';

    for (const char of clean) {
      if (char === '\n') {
        result += '\n';
        continue;
      }

      const code = char.codePointAt(0);
      if (code !== undefined && supported.has(code)) {
        result += char;
      } else {
        // Attempt decomposition (e.g. accented characters or full-width forms)
        const normalized = char.normalize('NFKD');
        let normChars = '';
        for (const nChar of normalized) {
          const nCode = nChar.codePointAt(0);
          if (nCode !== undefined && supported.has(nCode)) {
            normChars += nChar;
          }
        }

        if (normChars) {
          result += normChars;
        } else if (/\s/.test(char)) {
          result += ' ';
        }
        // Omit characters that cannot be encoded rather than crashing pdf-lib
      }
    }
    return result;
  }

  return clean;
}
