import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import type { VideoAsset, VideoScene } from '../../../domain/video-schema';

type SceneFrameProps = {
  scene: VideoScene;
  asset?: VideoAsset;
  children: ReactNode;
  contentStyle?: CSSProperties;
};

const resolveAssetSrc = (src: string): string => {
  if (/^(https?:)?\/\//.test(src)) {
    return src;
  }

  return staticFile(src.replace(/^\/+/, ''));
};

const renderImage = (asset: VideoAsset, style: CSSProperties) => {
  return <Img src={resolveAssetSrc(asset.src)} alt={asset.alt} style={style} />;
};

const getAssetAspectRatio = (asset: VideoAsset): number => {
  return asset.width / Math.max(asset.height, 1);
};

const getObjectPosition = (focalPoint: 'center' | 'top' | 'bottom' | undefined): string => {
  switch (focalPoint) {
    case 'top':
      return 'center top';
    case 'bottom':
      return 'center bottom';
    default:
      return 'center center';
  }
};

// Near-square images (logos, icons, headshots) look better with contain to avoid cropping.
// Only clearly portrait or landscape images benefit from cover.
const getObjectFit = (ratio: number): 'cover' | 'contain' =>
  ratio >= 0.75 && ratio <= 1.35 ? 'contain' : 'cover';

export const SceneFrame: React.FC<SceneFrameProps> = ({
  scene,
  asset,
  children,
  contentStyle,
}) => {
  const media = scene.media && asset ? scene.media : undefined;

  if (media?.mode === 'background' && asset) {
    const aspectRatio = getAssetAspectRatio(asset);

    return (
      <AbsoluteFill style={{ backgroundColor: scene.backgroundColor }}>
        {renderImage(asset, {
          width: '100%',
          height: '100%',
          objectFit: getObjectFit(aspectRatio),
          objectPosition: getObjectFit(aspectRatio) === 'contain' ? 'center center' : getObjectPosition(aspectRatio < 0.8 ? 'top' : 'center'),
        })}
        <AbsoluteFill
          style={{
            backgroundColor: media.overlayColor,
            opacity: media.overlayOpacity,
          }}
        />
        <AbsoluteFill
          style={{
            padding: '120px 72px',
            zIndex: 2,
            ...contentStyle,
          }}
        >
          {children}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  if (media?.mode === 'frame' && asset) {
    const aspectRatio = getAssetAspectRatio(asset);

    return (
      <AbsoluteFill style={{ backgroundColor: scene.backgroundColor }}>
        <div
          style={{
            position: 'absolute',
            top: 72,
            left: 72,
            right: 72,
            height: aspectRatio < 0.9 ? 920 : 760,
            overflow: 'hidden',
            borderRadius: 36,
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.28)',
          }}
        >
          {renderImage(asset, {
            width: '100%',
            height: '100%',
            objectFit: getObjectFit(aspectRatio),
            objectPosition: getObjectFit(aspectRatio) === 'contain' ? 'center center' : getObjectPosition('top'),
            backgroundColor: '#050B14',
          })}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: media.overlayColor,
              opacity: media.overlayOpacity,
            }}
          />
        </div>
        <AbsoluteFill
          style={{
            padding: '900px 72px 96px',
            ...(aspectRatio < 0.9 ? { padding: '1060px 72px 96px' } : null),
            zIndex: 2,
            ...contentStyle,
          }}
        >
          {children}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  if (media?.mode === 'side' && asset) {
    const imageFirst = media.position === 'left';
    const aspectRatio = getAssetAspectRatio(asset);

    const imageBlock = (
      <div
        style={{
          position: 'relative',
          flex: aspectRatio < 0.85 ? '0 0 38%' : '0 0 44%',
          alignSelf: 'stretch',
          overflow: 'hidden',
          borderRadius: 32,
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.24)',
        }}
      >
        {renderImage(asset, {
          width: '100%',
          height: '100%',
          objectFit: getObjectFit(aspectRatio),
          objectPosition: getObjectFit(aspectRatio) === 'contain' ? 'center center' : getObjectPosition('top'),
          backgroundColor: '#050B14',
        })}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: media.overlayColor,
            opacity: media.overlayOpacity,
          }}
        />
      </div>
    );

    return (
      <AbsoluteFill style={{ backgroundColor: scene.backgroundColor, padding: '72px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: imageFirst ? 'row' : 'row-reverse',
            gap: 32,
            width: '100%',
            height: '100%',
            alignItems: 'stretch',
          }}
        >
          {imageBlock}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              ...contentStyle,
            }}
          >
            {children}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.backgroundColor,
        padding: '120px 72px',
        ...contentStyle,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
