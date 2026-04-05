import { AbsoluteFill } from 'remotion';
import type { TitleScene as TitleSceneData } from '../../../domain/video-schema';

export const TitleScene: React.FC<{ scene: TitleSceneData }> = ({ scene }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          padding: '0 40px',
          fontSize: 80,
          color: scene.textColor,
          textAlign: scene.align,
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          textShadow: '0px 4px 10px rgba(0,0,0,0.3)',
        }}
      >
        {scene.text}
      </div>
    </AbsoluteFill>
  );
};
