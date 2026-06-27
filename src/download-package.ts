export type DownloadPackageFile = {
  name: string;
  data: Uint8Array | ArrayBuffer | string;
};

export type NoticeSourceInfo = {
  sourceName: string;
  sourceFileName?: string;
  sourceLicense: string;
  sourceLicenseFileName?: string;
  sourceLicensePackagePath?: string;
  sourceUrl?: string;
};

type ZipEntry = {
  name: string;
  nameBytes: Uint8Array;
  data: Uint8Array;
  crc: number;
  localHeaderOffset: number;
};

const textEncoder = new TextEncoder();
const ZIP_MIME_TYPE = "application/zip";

export function createDownloadPackage(files: DownloadPackageFile[]): Blob {
  const zip = createStoredZip(files);
  const buffer = zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: ZIP_MIME_TYPE });
}

export function createStoredZip(files: DownloadPackageFile[]): Uint8Array {
  const entries = files.map((file): ZipEntry => {
    const nameBytes = textEncoder.encode(file.name);
    const data = toBytes(file.data);
    return {
      name: file.name,
      nameBytes,
      data,
      crc: crc32(data),
      localHeaderOffset: 0,
    };
  });

  const localParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    entry.localHeaderOffset = offset;
    const header = new Uint8Array(30 + entry.nameBytes.length);
    const view = new DataView(header.buffer);
    writeLocalHeader(view, entry);
    header.set(entry.nameBytes, 30);
    localParts.push(header, entry.data);
    offset += header.length + entry.data.length;
  }

  const centralDirectoryOffset = offset;
  const centralParts: Uint8Array[] = [];

  for (const entry of entries) {
    const header = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(header.buffer);
    writeCentralDirectoryHeader(view, entry);
    header.set(entry.nameBytes, 46);
    centralParts.push(header);
    offset += header.length;
  }

  const centralDirectorySize = offset - centralDirectoryOffset;
  const end = new Uint8Array(22);
  writeEndOfCentralDirectory(new DataView(end.buffer), entries.length, centralDirectorySize, centralDirectoryOffset);

  return concatBytes([...localParts, ...centralParts, end]);
}

export function buildNoticeText(
  generatedFamilyName: string,
  source: NoticeSourceInfo,
  generatedStyleName?: string,
): string {
  const lines = [
    "pixelplease generated font package",
    "",
    `Generated font family: ${generatedFamilyName}`,
    generatedStyleName ? `Generated font style: ${generatedStyleName}` : undefined,
    `Generated font file: ${makeTtfFileName(generatedFamilyName, generatedStyleName)}`,
    "Generated font naming: PixelPlease + compact source code + effect recipe + short hash + style.",
    "Effect recipe format: cells-per-em-threshold-expand. The short hash covers source, effect shape, shift, and generator version.",
    "",
    `Source font: ${source.sourceName}`,
    source.sourceFileName ? `Source file: ${source.sourceFileName}` : undefined,
    `Source license: ${source.sourceLicense}`,
    source.sourceLicenseFileName ? `Source license file: ${source.sourceLicenseFileName}` : undefined,
    source.sourceLicensePackagePath
      ? `Bundled source license package path: ${source.sourceLicensePackagePath}`
      : undefined,
    source.sourceUrl ? `Source URL: ${source.sourceUrl}` : undefined,
    "",
    "This generated font is a derivative of the source font.",
    "The generated font names intentionally use compact source codes instead of verbatim source family names.",
    "Before redistributing, keep the required source license, copyright, and notice material with this package.",
    "For user-uploaded fonts, pixelplease cannot verify rights; use only fonts you are allowed to modify and export.",
    "",
  ];

  return lines.filter((line): line is string => line !== undefined).join("\n");
}

export function makePackageFileName(familyName: string, styleName?: string): string {
  return `${sanitizeFileName(joinNameParts(familyName, styleName))}.zip`;
}

export function makeTtfFileName(familyName: string, styleName?: string): string {
  return `${sanitizeFileName(joinNameParts(familyName, styleName))}.ttf`;
}

function joinNameParts(...parts: Array<string | undefined>): string {
  return parts.filter((part): part is string => Boolean(part?.trim())).join(" ");
}

function writeLocalHeader(view: DataView, entry: ZipEntry): void {
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, entry.crc, true);
  view.setUint32(18, entry.data.length, true);
  view.setUint32(22, entry.data.length, true);
  view.setUint16(26, entry.nameBytes.length, true);
  view.setUint16(28, 0, true);
}

function writeCentralDirectoryHeader(view: DataView, entry: ZipEntry): void {
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, entry.crc, true);
  view.setUint32(20, entry.data.length, true);
  view.setUint32(24, entry.data.length, true);
  view.setUint16(28, entry.nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, entry.localHeaderOffset, true);
}

function writeEndOfCentralDirectory(
  view: DataView,
  entryCount: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number,
): void {
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);
}

function toBytes(data: DownloadPackageFile["data"]): Uint8Array {
  if (typeof data === "string") {
    return textEncoder.encode(data);
  }

  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((length, part) => length + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "pixelplease-generated";
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
