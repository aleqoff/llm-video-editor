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

export const SceneFrame: React.FC<SceneFrameProps> = ({
  scene,
  asset,
  children,
  contentStyle,
}) => {
  const media = scene.media && asset ? scene.media : undefined;

  if (media?.mode === 'background' && asset) {
    return (
      <AbsoluteFill style={{ backgroundColor: scene.backgroundColor }}>
        {renderImage(asset, {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
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
    return (
      <AbsoluteFill style={{ backgroundColor: scene.backgroundColor }}>
        <div
          style={{
            position: 'absolute',
            top: 72,
            left: 72,
            right: 72,
            height: 760,
            overflow: 'hidden',
            borderRadius: 36,
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.28)',
          }}
        >
          {renderImage(asset, {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
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

    const imageBlock = (
      <div
        style={{
          position: 'relative',
          flex: '0 0 42%',
          alignSelf: 'stretch',
          overflow: 'hidden',
          borderRadius: 32,
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.24)',
        }}
      >
        {renderImage(asset, {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
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
