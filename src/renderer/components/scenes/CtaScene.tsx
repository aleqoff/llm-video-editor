import type { CtaScene as CtaSceneData, VideoAsset } from '../../../domain/video-schema';
import { SceneFrame } from './SceneFrame';

export const CtaScene: React.FC<{ scene: CtaSceneData; asset?: VideoAsset }> = ({
  scene,
  asset,
}) => {
  return (
    <SceneFrame
      scene={scene}
      asset={asset}
      contentStyle={{
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: scene.media?.mode === 'side' ? 500 : 900,
          textAlign: scene.align,
          color: scene.textColor,
          fontFamily: 'Georgia, serif',
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
    </SceneFrame>
  );
};
