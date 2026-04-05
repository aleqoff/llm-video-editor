import { Composition } from 'remotion';
import { normalizeVideoSpec } from '../domain/normalize-video';
import rawVideoSpec from '../../generated/latest-video.json';
import { MainVideo } from './components/MainVideo';

const videoSpec = normalizeVideoSpec(rawVideoSpec);
const totalDuration = videoSpec.scenes.reduce((acc, scene) => acc + scene.duration, 0);

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MarketingVideo"
      component={MainVideo}
      durationInFrames={totalDuration}
      fps={videoSpec.videoConfig.fps}
      width={videoSpec.videoConfig.width}
      height={videoSpec.videoConfig.height}
      defaultProps={{ videoSpec }}
    />
  );
};
