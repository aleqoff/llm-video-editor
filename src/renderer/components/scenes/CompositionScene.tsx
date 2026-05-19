import type { CSSProperties } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import type {
  CompositionScene as CompositionSceneData,
  ImageVideoAsset,
  SceneLayer,
  SubtitleLayer,
} from '../../../domain/video-schema';
import { AnimatedLayer } from '../AnimatedLayer';
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

const resolveAssetSrc = (src: string): string => {
  if (/^(https?:)?\/\//.test(src)) {
    return src;
  }

  return staticFile(src.replace(/^\/+/, ''));
};

const getAssetAspectRatio = (asset: ImageVideoAsset): number => {
  return asset.width / Math.max(asset.height, 1);
};

const getObjectFit = (ratio: number): 'cover' | 'contain' =>
  ratio >= 0.75 && ratio <= 1.35 ? 'contain' : 'cover';

const BlockRenderer: React.FC<{
  block: SceneLayer;
  scene: CompositionSceneData;
  assetsById: Map<string, ImageVideoAsset>;
}> = ({ block, scene, assetsById }) => {
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
    case 'image': {
      const asset = assetsById.get(block.assetId);

      if (!asset) {
        return null;
      }

      const aspectRatio = getAssetAspectRatio(asset);
      const isPortrait = aspectRatio < 0.65;
      const isNearSquare = aspectRatio >= 0.75 && aspectRatio <= 1.35;
      const fit = block.display === 'strip' ? 'cover' : getObjectFit(aspectRatio);
      const height =
        block.display === 'strip'
          ? 210
          : block.display === 'stack'
            ? 280
            : isPortrait
              ? 440
              : isNearSquare
                ? 360
                : 300;

      return (
        <div
          style={{
            width: block.display === 'strip' ? '100%' : isPortrait ? '58%' : isNearSquare ? '62%' : '100%',
            alignSelf: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height,
              overflow: 'hidden',
              borderRadius: 28,
              backgroundColor: '#050B14',
              boxShadow: '0 20px 55px rgba(0, 0, 0, 0.22)',
            }}
          >
            <Img
              src={resolveAssetSrc(asset.src)}
              alt={asset.alt}
              style={{
                width: '100%',
                height: '100%',
                objectFit: fit,
                objectPosition:
                  block.focalPoint === 'top'
                    ? 'center top'
                    : block.focalPoint === 'bottom'
                      ? 'center bottom'
                      : 'center center',
                backgroundColor: '#050B14',
              }}
            />
          </div>
          {block.caption ? (
            <div
              style={{
                marginTop: 10,
                fontSize: 18,
                lineHeight: 1.25,
                color,
                textAlign,
                opacity: 0.8,
              }}
            >
              {block.caption}
            </div>
          ) : null}
        </div>
      );
    }
    // subtitle is handled separately as an AbsoluteFill overlay
    default:
      return null;
  }
};

const SUBTITLE_FONT_SIZE: Record<'sm' | 'md' | 'lg', number> = { sm: 26, md: 36, lg: 50 };

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
};

const SubtitleRenderer: React.FC<{
  layer: SubtitleLayer;
  sceneTextColor: string;
}> = ({ layer, sceneTextColor }) => {
  const fontSize = SUBTITLE_FONT_SIZE[layer.fontSize ?? 'md'];
  const bgColor = layer.background ?? '#000000';
  const bgOpacity = layer.backgroundOpacity ?? 0.72;
  const [r, g, b] = hexToRgb(bgColor);
  const textShadow = layer.outline
    ? `0 0 4px ${layer.outline}, 0 0 4px ${layer.outline}, 0 0 4px ${layer.outline}`
    : undefined;

  return (
    <div
      style={{
        padding: '10px 20px',
        borderRadius: 10,
        backgroundColor: `rgba(${r},${g},${b},${bgOpacity})`,
        backdropFilter: bgOpacity > 0 ? 'blur(4px)' : undefined,
        color: layer.color ?? sceneTextColor,
        fontSize,
        fontWeight: 800,
        lineHeight: 1.2,
        textAlign: 'center',
        maxWidth: 900,
        textShadow,
      }}
    >
      {layer.text}
    </div>
  );
};

export const CompositionScene: React.FC<{
  scene: CompositionSceneData;
  asset?: ImageVideoAsset;
  assets: ImageVideoAsset[];
}> = ({ scene, asset, assets }) => {
  const justifyContent = scene.align === 'center' ? 'center' : 'flex-start';
  const alignItems =
    scene.align === 'center' ? 'center' : scene.align === 'right' ? 'flex-end' : 'flex-start';
  const assetsById = new Map(assets.map((item) => [item.id, item]));

  const regularLayers = scene.layers.filter((l) => l.kind !== 'subtitle');
  const subtitleLayers = scene.layers.filter((l) => l.kind === 'subtitle');

  return (
    <>
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
          {regularLayers.map((layer, index) => (
            <AnimatedLayer
              key={`${layer.kind}-${index}`}
              layer={layer}
              sceneDuration={scene.duration}
            >
              <BlockRenderer block={layer} scene={scene} assetsById={assetsById} />
            </AnimatedLayer>
          ))}
        </div>
      </SceneFrame>

      {subtitleLayers.length > 0 && (() => {
        const byPosition = {
          top: subtitleLayers.filter((l) => l.kind === 'subtitle' && l.position === 'top'),
          middle: subtitleLayers.filter((l) => l.kind === 'subtitle' && l.position === 'middle'),
          bottom: subtitleLayers.filter((l) => l.kind === 'subtitle' && (!l.position || l.position === 'bottom')),
        };
        const positionStyles: Record<string, CSSProperties> = {
          top: { justifyContent: 'flex-start', padding: '100px 72px 0' },
          middle: { justifyContent: 'center', padding: '0 72px' },
          bottom: { justifyContent: 'flex-end', padding: '0 72px 100px' },
        };
        return (
          <>
            {(['top', 'middle', 'bottom'] as const).map((pos) =>
              byPosition[pos].length > 0 ? (
                <AbsoluteFill
                  key={pos}
                  style={{
                    ...positionStyles[pos],
                    alignItems: 'center',
                    flexDirection: 'column',
                    gap: 8,
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                >
                  {byPosition[pos].map((layer, index) =>
                    layer.kind === 'subtitle' ? (
                      <AnimatedLayer
                        key={`subtitle-${pos}-${index}`}
                        layer={layer}
                        sceneDuration={scene.duration}
                      >
                        <SubtitleRenderer layer={layer} sceneTextColor={scene.textColor} />
                      </AnimatedLayer>
                    ) : null,
                  )}
                </AbsoluteFill>
              ) : null,
            )}
          </>
        );
      })()}
    </>
  );
};
