import { AbsoluteFill } from 'remotion';
import type { QuoteScene as QuoteSceneData } from '../../../domain/video-schema';

export const QuoteScene: React.FC<{ scene: QuoteSceneData }> = ({ scene }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.backgroundColor,
        justifyContent: 'center',
        alignItems: scene.align === 'left' ? 'flex-start' : scene.align === 'right' ? 'flex-end' : 'center',
        padding: '120px 72px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 860,
          textAlign: scene.align,
          color: scene.textColor,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 140,
            lineHeight: 0.8,
            fontWeight: 900,
            color: scene.accentColor,
            marginBottom: 20,
          }}
        >
          "
        </div>
        <div
          style={{
            fontSize: 52,
            lineHeight: 1.25,
            fontWeight: 700,
            marginBottom: 28,
          }}
        >
          {scene.quote}
        </div>
        <div
          style={{
            fontSize: 28,
            lineHeight: 1.3,
            fontWeight: 700,
            color: scene.accentColor,
          }}
        >
          {scene.author}
        </div>
      </div>
    </AbsoluteFill>
  );
};
