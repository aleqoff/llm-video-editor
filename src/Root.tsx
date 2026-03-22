import { Composition } from "remotion";
import { Logo, myCompSchema2 } from "./HelloWorld/Logo";

// Each <Composition> is an entry in the sidebar!

import { MyVideo } from "./HelloWorld";
import data from './data/input.json';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyDiplomaVideo"
        component={MyVideo}
        durationInFrames={data.scenes.reduce((acc, s) => acc + s.duration, 0)}
        fps={data.videoConfig.fps}
        width={data.videoConfig.width}
        height={data.videoConfig.height}
      />
    </>
  );
};