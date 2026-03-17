/**
 * Normalize text to fix common UTF-8 encoding issues (mojibake).
 */
export function normalizeText(str?: string | null): string {
  if (!str) return "";
  return fixCommonEncodingIssues(str.normalize("NFC").replace(/�/g, "").trim());
}

function fixCommonEncodingIssues(text: string): string {
  return text
    .replace(/Ã©/g, "é")
    .replace(/Ã¨/g, "è")
    .replace(/Ã /g, "à")
    .replace(/Ã¢/g, "â")
    .replace(/Ã´/g, "ô")
    .replace(/Ã®/g, "î")
    .replace(/Ã¯/g, "ï")
    .replace(/Ã¹/g, "ù")
    .replace(/Ã§/g, "ç")
    .replace(/Ãª/g, "ê")
    .replace(/Ã«/g, "ë")
    .replace(/Ã¼/g, "ü")
    .replace(/Å"/g, "œ");
}
