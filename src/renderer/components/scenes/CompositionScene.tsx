import type { CSSProperties } from 'react';
import type {
  CompositionScene as CompositionSceneData,
  SceneBlock,
  VideoAsset,
} from '../../../domain/video-schema';
import { SceneFrame } from './SceneFrame';

const resolveTextAlign = (align: CompositionSceneData['align']): CSSProperties['textAlign'] => {
  return align;
};

const getHeadingSize = (size: 'sm' | 'md' | 'lg' | 'xl' | undefined): number => {
  switch (size) {
    case 'sm':
      return 34;
    case 'md':
      return 48;
    case 'xl':
      return 88;
    default:
      return 66;
  }
};

const BlockRenderer: React.FC<{ block: SceneBlock; scene: CompositionSceneData }> = ({
  block,
  scene,
}) => {
  const align = block.align ?? scene.align;
  const textAlign = resolveTextAlign(align);
  const color = block.color ?? scene.textColor;
  const accentColor = block.accentColor ?? scene.accentColor;

  switch (block.kind) {
    case 'heading':
      return (
        <div
          style={{
            fontSize: getHeadingSize(block.size),
            lineHeight: block.size === 'xl' ? 0.95 : 1.05,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color,
            textAlign,
          }}
        >
          {block.text}
        </div>
      );
    case 'body':
      return (
        <div
          style={{
            fontSize: 30,
            lineHeight: 1.35,
            fontWeight: 500,
            color,
            textAlign,
            opacity: 0.92,
          }}
        >
          {block.text}
        </div>
      );
    case 'list':
      return (
        <div style={{ width: '100%', color, textAlign }}>
          {block.title ? (
            <div
              style={{
                fontSize: 40,
                fontWeight: 700,
                lineHeight: 1.15,
                marginBottom: 24,
              }}
            >
              {block.title}
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            {block.items.map((item, index) => (
              <div
                key={`${index}-${item}`}
                style={{
                  display: 'flex',
                  gap: 16,
                  justifyContent: align === 'center' ? 'center' : 'flex-start',
                }}
              >
                <div
                  style={{
                    minWidth: 28,
                    color: accentColor,
                    fontSize: 28,
                    fontWeight: 800,
                    lineHeight: 1.2,
                  }}
                >
                  {index + 1}
                </div>
                <div
                  style={{
                    fontSize: 30,
                    lineHeight: 1.3,
                    fontWeight: 600,
                    maxWidth: 680,
                  }}
                >
                  {item}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'stat':
      return (
        <div style={{ textAlign, color }}>
          <div
            style={{
              fontSize: 156,
              lineHeight: 0.9,
              fontWeight: 900,
              color: accentColor,
              marginBottom: 18,
            }}
          >
            {block.value}
          </div>
          <div
            style={{
              fontSize: 34,
              lineHeight: 1.25,
              fontWeight: 600,
              maxWidth: 760,
            }}
          >
            {block.label}
          </div>
        </div>
      );
    case 'quote':
      return (
        <div style={{ textAlign, color }}>
          <div
            style={{
              fontSize: 120,
              lineHeight: 0.8,
              fontWeight: 800,
              color: accentColor,
              marginBottom: 6,
            }}
          >
            "
          </div>
          <div
            style={{
              fontSize: 44,
              lineHeight: 1.2,
              fontWeight: 700,
              marginBottom: block.author ? 22 : 0,
            }}
          >
            {block.text}
          </div>
          {block.author ? (
            <div
              style={{
                fontSize: 24,
                lineHeight: 1.25,
                fontWeight: 700,
                color: accentColor,
              }}
            >
              {block.author}
            </div>
          ) : null}
        </div>
      );
    case 'cta':
      return (
        <div style={{ textAlign, color }}>
          <div
            style={{
              fontSize: 46,
              lineHeight: 1.1,
              fontWeight: 800,
              marginBottom: 22,
            }}
          >
            {block.title}
          </div>
          <div
            style={{
              display: 'inline-block',
              padding: '18px 26px',
              borderRadius: 24,
              backgroundColor: accentColor,
              color: '#08111F',
              fontSize: 28,
              lineHeight: 1.2,
              fontWeight: 900,
            }}
          >
            {block.action}
          </div>
        </div>
      );
    case 'badge':
      return (
        <div
          style={{
            display: 'inline-block',
            alignSelf: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
            padding: '10px 14px',
            borderRadius: 999,
            backgroundColor: accentColor,
            color: '#08111F',
            fontSize: 18,
            fontWeight: 800,
            lineHeight: 1,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {block.text}
        </div>
      );
    case 'divider':
      return (
        <div
          style={{
            width: 120,
            height: 4,
            borderRadius: 999,
            backgroundColor: accentColor,
            alignSelf: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
          }}
        />
      );
    default:
      return null;
  }
};

export const CompositionScene: React.FC<{
  scene: CompositionSceneData;
  asset?: VideoAsset;
}> = ({ scene, asset }) => {
  const justifyContent = scene.align === 'center' ? 'center' : 'flex-start';
  const alignItems =
    scene.align === 'center' ? 'center' : scene.align === 'right' ? 'flex-end' : 'flex-start';

  return (
    <SceneFrame
      scene={scene}
      asset={asset}
      contentStyle={{
        justifyContent,
        alignItems,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: scene.media?.mode === 'side' ? 520 : 900,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          fontFamily: 'Georgia, serif',
        }}
      >
        {scene.blocks.map((block, index) => (
          <BlockRenderer key={`${block.kind}-${index}`} block={block} scene={scene} />
        ))}
      </div>
    </SceneFrame>
  );
};
