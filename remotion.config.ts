/**
 * Configuración del render de Remotion.
 * Ojo: esto NO se aplica cuando se renderiza desde la API de Node, sólo desde
 * la línea de comandos (que es como lo usamos acá).
 */
import { Config } from "@remotion/cli/config";

// La foto que usa la escena no es un archivo del sitio: sólo hace falta para
// renderizar. Por eso no vive en `public/` (que se sube en cada deploy) sino
// al lado del código del video. `staticFile("pintura-vertiendo.jpg")` la busca
// acá adentro.
Config.setPublicDir("remotion/publico");

// La escena es una foto con degradados encima: en JPEG los degradados suaves
// se ven "escalonados". PNG por cuadro evita eso; el mp4 final igual comprime.
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);

// x264 con perfil alto: es lo que reproduce cualquier navegador sin plugins.
Config.setCodec("h264");
// CRF más bajo = mejor calidad y más peso. 18 es "visualmente sin pérdida".
Config.setCrf(20);

// Sin audio: es un fondo de hero, va en silencio.
Config.setEnforceAudioTrack(false);
