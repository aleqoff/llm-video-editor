import type { VideoScene } from '../../domain/video-schema';
import { BulletListScene } from './scenes/BulletListScene';
import { CtaScene } from './scenes/CtaScene';
import { QuoteScene } from './scenes/QuoteScene';
import { StatScene } from './scenes/StatScene';
import { TitleScene } from './scenes/TitleScene';

export const SceneRenderer: React.FC<{ scene: VideoScene }> = ({ scene }) => {
  switch (scene.type) {
    case 'bullet-list':
      return <BulletListScene scene={scene} />;
    case 'quote':
      return <QuoteScene scene={scene} />;
    case 'cta':
      return <CtaScene scene={scene} />;
    case 'stat':
      return <StatScene scene={scene} />;
    case 'title':
      return <TitleScene scene={scene} />;
    default:
      return null;
  }
};
