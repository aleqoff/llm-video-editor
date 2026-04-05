import { AbsoluteFill, Sequence } from 'remotion';
import type { VideoSpec } from '../../domain/video-schema';
import { Scene } from './Scene';

export const MainVideo: React.FC<{ videoSpec: VideoSpec }> = ({ videoSpec }) => {
  let currentStartFrame = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {videoSpec.scenes.map((scene, index) => {
        const startFrame = currentStartFrame;
        currentStartFrame += scene.duration;

        return (
          <Sequence
            key={`${scene.type}-${index}`}
            from={startFrame}
            durationInFrames={scene.duration}
          >
            <Scene scene={scene} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
