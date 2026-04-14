import { AbsoluteFill } from 'remotion';
import type { StatScene as StatSceneData } from '../../../domain/video-schema';

export const StatScene: React.FC<{ scene: StatSceneData }> = ({ scene }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
        padding: '120px 64px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 900,
          textAlign: scene.align,
          fontFamily: 'sans-serif',
          color: scene.textColor,
        }}
      >
        <div
          style={{
            fontSize: 168,
            lineHeight: 0.9,
            fontWeight: 900,
            color: scene.accentColor,
            marginBottom: 24,
          }}
        >
          {scene.value}
        </div>
        <div
          style={{
            fontSize: 38,
            lineHeight: 1.25,
            fontWeight: 700,
          }}
        >
          {scene.label}
        </div>
      </div>
    </AbsoluteFill>
  );
};
