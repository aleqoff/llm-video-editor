import type { ImageVideoAsset, VideoAsset, VideoScene } from '../../domain/video-schema';
import { CompositionScene } from './scenes/CompositionScene';

export const SceneRenderer: React.FC<{ scene: VideoScene; assets: VideoAsset[] }> = ({
  scene,
  assets,
}) => {
  const mediaAssets = assets.filter((a): a is ImageVideoAsset => a.type !== 'audio');
  const asset = scene.media
    ? mediaAssets.find((item) => item.id === scene.media?.assetId)
    : undefined;

  switch (scene.type) {
    case 'composition':
      return <CompositionScene scene={scene} asset={asset} assets={mediaAssets} />;
    default:
      return null;
  }
};
