/**
 * Redimensiona y comprime una imagen en el navegador (canvas) antes de
 * subirla. Las fotos de lugares se ven como miniatura en la lista y como
 * fondo en el detalle: no hace falta conservar la resolución original de
 * cámara/celular (varios MB) para eso.
 *
 * Si algo falla (navegador sin soporte, imagen corrupta, etc.) devuelve el
 * archivo original sin comprimir en vez de lanzar un error, para no romper
 * el flujo de subida.
 */
export async function comprimirImagen(
  archivo: File,
  ladoMaximoPx = 1600,
  calidad = 0.82
): Promise<File> {
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, ladoMaximoPx / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const contexto = canvas.getContext('2d');
    if (!contexto) return archivo;

    contexto.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', calidad)
    );
    if (!blob) return archivo;

    // Si la "compresión" resultó más pesada que el original (pasa con
    // imágenes ya muy comprimidas o muy pequeñas), no vale la pena usarla.
    if (blob.size >= archivo.size) return archivo;

    const nombre = archivo.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], nombre, { type: 'image/jpeg' });
  } catch {
    return archivo;
  }
}
