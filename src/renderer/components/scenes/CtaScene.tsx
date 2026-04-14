import { AbsoluteFill } from 'remotion';
import type { CtaScene as CtaSceneData } from '../../../domain/video-schema';

export const CtaScene: React.FC<{ scene: CtaSceneData }> = ({ scene }) => {
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
          color: scene.textColor,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 58,
            lineHeight: 1.15,
            fontWeight: 900,
            marginBottom: 30,
          }}
        >
          {scene.title}
        </div>
        <div
          style={{
            display: 'inline-block',
            padding: '20px 28px',
            borderRadius: 24,
            backgroundColor: scene.accentColor,
            color: '#020617',
            fontSize: 34,
            lineHeight: 1.25,
            fontWeight: 900,
          }}
        >
          {scene.action}
        </div>
      </div>
    </AbsoluteFill>
  );
};
