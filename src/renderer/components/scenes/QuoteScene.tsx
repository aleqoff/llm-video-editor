import type { QuoteScene as QuoteSceneData, VideoAsset } from '../../../domain/video-schema';
import { SceneFrame } from './SceneFrame';

export const QuoteScene: React.FC<{ scene: QuoteSceneData; asset?: VideoAsset }> = ({
  scene,
  asset,
}) => {
  return (
    <SceneFrame
      scene={scene}
      asset={asset}
      contentStyle={{
        justifyContent: 'center',
        alignItems: scene.align === 'left' ? 'flex-start' : scene.align === 'right' ? 'flex-end' : 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: scene.media?.mode === 'side' ? 500 : 860,
          textAlign: scene.align,
          color: scene.textColor,
          fontFamily: 'Georgia, serif',
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
    </SceneFrame>
  );
};
