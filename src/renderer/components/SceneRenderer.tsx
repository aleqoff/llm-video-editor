import type { VideoAsset, VideoScene } from '../../domain/video-schema';
import { CompositionScene } from './scenes/CompositionScene';

export const SceneRenderer: React.FC<{ scene: VideoScene; assets: VideoAsset[] }> = ({
  scene,
  assets,
}) => {
  const asset = scene.media ? assets.find((item) => item.id === scene.media?.assetId) : undefined;

  switch (scene.type) {
    case 'composition':
      return <CompositionScene scene={scene} asset={asset} />;
    default:
      return null;
  }
};
