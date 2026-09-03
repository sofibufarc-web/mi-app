import React from "react";
import { Composition } from "remotion";

import { HeroPintura } from "./hero-pintura/escena";

/** Duración del loop. Seis segundos alcanzan para ver caer la pintura y que
 *  salgan tres tandas de ondas, sin que el archivo se vaya de peso. */
const SEGUNDOS = 6;
const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="HeroPintura"
      component={HeroPintura}
      durationInFrames={SEGUNDOS * FPS}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ guias: false }}
    />
    {/* La misma escena con las siluetas medidas dibujadas en rojo. Se usa para
        comprobar que los recortes caen sobre la pintura y no al lado. */}
    <Composition
      id="HeroPinturaGuias"
      component={HeroPintura}
      durationInFrames={SEGUNDOS * FPS}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ guias: true }}
    />
  </>
);
