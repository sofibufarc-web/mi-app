/**
 * Punto de entrada de Remotion. Sólo registra el catálogo de composiciones;
 * el estudio (`npm run video`) y el render (`npm run video:render`) empiezan
 * a leer por acá.
 */
import { registerRoot } from "remotion";

import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
