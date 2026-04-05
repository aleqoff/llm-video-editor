import { AbsoluteFill } from 'remotion';
import type { VideoScene } from '../../domain/video-schema';

export const Scene: React.FC<{ scene: VideoScene }> = ({ scene }) => {
  if (scene.type !== 'title') {
    return null;
  }

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
