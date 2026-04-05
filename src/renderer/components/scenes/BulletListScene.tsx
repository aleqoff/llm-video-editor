import { AbsoluteFill } from 'remotion';
import type { BulletListScene as BulletListSceneData } from '../../../domain/video-schema';

const resolveTextAlign = (align: BulletListSceneData['align']): 'left' | 'center' => {
  return align === 'center' ? 'center' : 'left';
};

export const BulletListScene: React.FC<{ scene: BulletListSceneData }> = ({ scene }) => {
  const textAlign = resolveTextAlign(scene.align);
  const alignItems = scene.align === 'center' ? 'center' : 'flex-start';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.backgroundColor,
        justifyContent: 'center',
        alignItems,
        padding: '120px 72px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 860,
          color: scene.textColor,
          fontFamily: 'sans-serif',
          textAlign,
        }}
      >
        <div
          style={{
            fontSize: 58,
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: 40,
          }}
        >
          {scene.title}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {scene.items.map((item, index) => (
            <div
              key={`${index}-${item}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 18,
                justifyContent: scene.align === 'center' ? 'center' : 'flex-start',
              }}
            >
              <div
                style={{
                  color: scene.accentColor,
                  fontSize: 34,
                  fontWeight: 800,
                  lineHeight: 1.2,
                  minWidth: 30,
                }}
              >
                {index + 1}.
              </div>
              <div
                style={{
                  fontSize: 34,
                  lineHeight: 1.3,
                  fontWeight: 600,
                  maxWidth: 720,
                }}
              >
                {item}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
