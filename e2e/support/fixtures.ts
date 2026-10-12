import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { randomBytes } from 'node:crypto';

export const RUTA_FIXTURES = resolve(__dirname, '..', 'fixtures');
export const IMAGEN_GRANDE = resolve(RUTA_FIXTURES, 'imagen-grande.png');
export const DOCUMENTO_PDF = resolve(RUTA_FIXTURES, 'documento.pdf');

const ANCHO = 1200;
const ALTO = 1000;

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buffer) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloque(tipo: string, datos: Buffer): Buffer {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

function generarPng(): Buffer {
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(ANCHO, 0);
  cabecera.writeUInt32BE(ALTO, 4);
  cabecera.writeUInt8(8, 8);
  cabecera.writeUInt8(2, 9);
  const filas: Buffer[] = [];
  for (let y = 0; y < ALTO; y++) filas.push(Buffer.concat([Buffer.from([0]), randomBytes(ANCHO * 3)]));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque('IHDR', cabecera),
    bloque('IDAT', deflateSync(Buffer.concat(filas), { level: 0 })),
    bloque('IEND', Buffer.alloc(0)),
  ]);
}

function generarPdf(): Buffer {
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>',
  ];
  let pdf = '%PDF-1.4\n';
  const posiciones = objetos.map((objeto, i) => {
    const posicion = pdf.length;
    pdf += `${i + 1} 0 obj\n${objeto}\nendobj\n`;
    return posicion;
  });
  const inicioXref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += posiciones.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}

export function asegurarFixtures(): void {
  mkdirSync(RUTA_FIXTURES, { recursive: true });
  if (!existsSync(IMAGEN_GRANDE)) writeFileSync(IMAGEN_GRANDE, generarPng());
  if (!existsSync(DOCUMENTO_PDF)) writeFileSync(DOCUMENTO_PDF, generarPdf());
}
