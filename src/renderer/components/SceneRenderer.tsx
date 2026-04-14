import type { VideoAsset, VideoScene } from '../../domain/video-schema';
import { BulletListScene } from './scenes/BulletListScene';
import { CtaScene } from './scenes/CtaScene';
import { QuoteScene } from './scenes/QuoteScene';
import { StatScene } from './scenes/StatScene';
import { TitleScene } from './scenes/TitleScene';

export const SceneRenderer: React.FC<{ scene: VideoScene; assets: VideoAsset[] }> = ({
  scene,
  assets,
}) => {
  const asset = scene.media ? assets.find((item) => item.id === scene.media?.assetId) : undefined;

  switch (scene.type) {
    case 'bullet-list':
      return <BulletListScene scene={scene} asset={asset} />;
    case 'quote':
      return <QuoteScene scene={scene} asset={asset} />;
    case 'cta':
      return <CtaScene scene={scene} asset={asset} />;
    case 'stat':
      return <StatScene scene={scene} asset={asset} />;
    case 'title':
      return <TitleScene scene={scene} asset={asset} />;
    default:
      return null;
  }
};
