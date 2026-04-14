import type { StatScene as StatSceneData, VideoAsset } from '../../../domain/video-schema';
import { SceneFrame } from './SceneFrame';

export const StatScene: React.FC<{ scene: StatSceneData; asset?: VideoAsset }> = ({
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
          fontFamily: 'Georgia, serif',
          color: scene.textColor,
        }}
      >
        <div
          style={{
            fontSize: 168,
            lineHeight: 0.9,
            fontWeight: 900,
            color: scene.accentColor,
            marginBottom: 24,
          }}
        >
          {scene.value}
        </div>
        <div
          style={{
            fontSize: 38,
            lineHeight: 1.25,
            fontWeight: 700,
          }}
        >
          {scene.label}
        </div>
      </div>
    </SceneFrame>
  );
};
