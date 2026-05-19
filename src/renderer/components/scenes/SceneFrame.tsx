import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, Video, staticFile, useVideoConfig } from 'remotion';
import type { ImageVideoAsset, SceneMedia, VideoScene } from '../../../domain/video-schema';

type SceneFrameProps = {
  scene: VideoScene;
  asset?: ImageVideoAsset;
  children: ReactNode;
  contentStyle?: CSSProperties;
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

const resolveFocalPoint = (
  mediaFocalPoint: SceneMedia['focalPoint'],
  aspectRatio: number,
): 'center' | 'top' | 'bottom' => {
  if (mediaFocalPoint) return mediaFocalPoint;
  return aspectRatio < 0.8 ? 'top' : 'center';
};

const renderMedia = (
  asset: ImageVideoAsset,
  style: CSSProperties,
  trimStartFrames: number,
): ReactNode => {
  if (asset.type === 'video') {
    return (
      <Video
        src={resolveAssetSrc(asset.src)}
        startFrom={trimStartFrames}
        style={style}
        muted={!asset.hasAudio}
      />
    );
  }

  return <Img src={resolveAssetSrc(asset.src)} alt={asset.alt} style={style} />;
};

export const SceneFrame: React.FC<SceneFrameProps> = ({
  scene,
  asset,
  children,
  contentStyle,
}) => {
  const { fps } = useVideoConfig();
  const media = scene.media && asset ? scene.media : undefined;
  const trimStartFrames = media?.trimStart ? Math.round(media.trimStart * fps) : 0;

  if (media?.mode === 'background' && asset) {
    const aspectRatio = getAssetAspectRatio(asset);
    const objectFit = getObjectFit(aspectRatio);
    const focalPoint = resolveFocalPoint(media.focalPoint, aspectRatio);

    return (
      <AbsoluteFill style={{ backgroundColor: scene.backgroundColor }}>
        {renderMedia(asset, {
          width: '100%',
          height: '100%',
          objectFit,
          objectPosition: objectFit === 'contain' ? 'center center' : getObjectPosition(focalPoint),
        }, trimStartFrames)}
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
    const objectFit = getObjectFit(aspectRatio);
    const isPortrait = aspectRatio < 0.9;

    return (
      <AbsoluteFill style={{ backgroundColor: scene.backgroundColor }}>
        <div
          style={{
            position: 'absolute',
            top: 72,
            left: 72,
            right: 72,
            height: isPortrait ? 920 : 760,
            overflow: 'hidden',
            borderRadius: 36,
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.28)',
          }}
        >
          {renderMedia(asset, {
            width: '100%',
            height: '100%',
            objectFit,
            objectPosition: objectFit === 'contain' ? 'center center' : getObjectPosition(media.focalPoint ?? 'top'),
            backgroundColor: '#050B14',
          }, trimStartFrames)}
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
            padding: isPortrait ? '1060px 72px 96px' : '900px 72px 96px',
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
    const objectFit = getObjectFit(aspectRatio);

    const mediaBlock = (
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
        {renderMedia(asset, {
          width: '100%',
          height: '100%',
          objectFit,
          objectPosition: objectFit === 'contain' ? 'center center' : getObjectPosition(media.focalPoint ?? 'top'),
          backgroundColor: '#050B14',
        }, trimStartFrames)}
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
          {mediaBlock}
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
