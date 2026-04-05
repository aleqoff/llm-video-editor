import type { VideoScene } from '../../domain/video-schema';
import { BulletListScene } from './scenes/BulletListScene';
import { TitleScene } from './scenes/TitleScene';

export const SceneRenderer: React.FC<{ scene: VideoScene }> = ({ scene }) => {
  switch (scene.type) {
    case 'bullet-list':
      return <BulletListScene scene={scene} />;
    case 'title':
      return <TitleScene scene={scene} />;
    default:
      return null;
  }
};
