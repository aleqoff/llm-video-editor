import type { TitleScene as TitleSceneData, VideoAsset } from '../../../domain/video-schema';
import { SceneFrame } from './SceneFrame';

export const TitleScene: React.FC<{ scene: TitleSceneData; asset?: VideoAsset }> = ({
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
          maxWidth: scene.media?.mode === 'side' ? 520 : 900,
          fontSize: 80,
          color: scene.textColor,
          textAlign: scene.align,
          fontFamily: 'Georgia, serif',
          fontWeight: 'bold',
          textShadow: '0px 4px 18px rgba(0,0,0,0.35)',
        }}
      >
        {scene.text}
      </div>
    </SceneFrame>
  );
};
