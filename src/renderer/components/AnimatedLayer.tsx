import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SceneLayer } from '../../domain/video-schema';

type Props = {
  layer: SceneLayer;
  sceneDuration: number;
  children: React.ReactNode;
};

const resolveEnterTransform = (
  transition: SceneLayer['enterTransition'],
  progress: number,
): string => {
  switch (transition) {
    case 'slideUp': {
      const offset = interpolate(progress, [0, 1], [56, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      return `translateY(${offset}px)`;
    }
    case 'slideLeft': {
      const offset = interpolate(progress, [0, 1], [-56, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      return `translateX(${offset}px)`;
    }
    case 'scale': {
      const scale = interpolate(progress, [0, 1], [1.06, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      return `scale(${scale})`;
    }
    default:
      return 'none';
  }
};

export const AnimatedLayer: React.FC<Props> = ({ layer, sceneDuration, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterAt = layer.enterAt ?? 0;
  const exitAt = layer.exitAt ?? sceneDuration;

  if (frame < enterAt || frame >= exitAt) {
    return null;
  }

  const localFrame = frame - enterAt;
  const layerDuration = exitAt - enterAt;
  const baseOpacity = layer.opacity ?? 1;

  // Entrance animation — only when explicitly specified
  let enterOpacity = 1;
  let transform = 'none';

  if (layer.enterTransition && layer.enterTransition !== 'none') {
    const tIn = Math.min(10, Math.floor(layerDuration * 0.3));
    const progress = Math.min(
      1,
      spring({
        frame: localFrame,
        fps,
        config: { damping: 16, stiffness: 200, mass: 0.85 },
        durationInFrames: tIn,
      }),
    );

    if (layer.enterTransition === 'fade') {
      enterOpacity = progress;
    } else {
      transform = resolveEnterTransform(layer.enterTransition, progress);
    }
  }

  // Exit animation — only when explicitly specified
  let exitOpacity = 1;

  if (layer.exitTransition && layer.exitTransition !== 'none') {
    const tOut = Math.min(7, Math.floor(layerDuration * 0.22));

    if (layer.exitTransition === 'fade') {
      exitOpacity = interpolate(frame, [exitAt - tOut, exitAt], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    } else if (layer.exitTransition === 'scale') {
      exitOpacity = interpolate(frame, [exitAt - tOut, exitAt], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    } else if (layer.exitTransition === 'slideDown') {
      exitOpacity = interpolate(frame, [exitAt - tOut, exitAt], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }
  }

  const opacity = baseOpacity * enterOpacity * exitOpacity;

  return (
    <div style={{ opacity, transform }}>
      {children}
    </div>
  );
};
