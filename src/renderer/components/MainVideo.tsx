import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { VideoSpec } from '../../domain/video-schema';
import { SceneRenderer } from './SceneRenderer';

// Frames dedicated to enter / exit animation per scene.
// Clamped per-scene so short clips never have overlapping transitions.
const TRANSITION_IN = 10;
const TRANSITION_OUT = 7;

type TransitionKind = 'slideUp' | 'scale' | 'slideLeft';

// Cycle through variants so consecutive scenes feel different.
const TRANSITION_CYCLE: TransitionKind[] = ['slideUp', 'scale', 'slideLeft'];

const AnimatedScene: React.FC<{
  children: React.ReactNode;
  duration: number;
  transition: TransitionKind;
}> = ({ children, duration, transition }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp so transitions never exceed 30 % / 22 % of scene duration
  const tIn = Math.min(TRANSITION_IN, Math.floor(duration * 0.3));
  const tOut = Math.min(TRANSITION_OUT, Math.floor(duration * 0.22));

  // Spring-based entrance — feels snappy without being jarring
  const enter = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 200, mass: 0.85 },
    durationInFrames: tIn,
  });

  // Linear fade-out at the tail of the scene
  const exitOpacity = interpolate(
    frame,
    [duration - tOut, duration],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const enterClamped = Math.min(1, enter);
  const opacity = enterClamped * exitOpacity;

  let transform: string;

  if (transition === 'slideUp') {
    const offset = interpolate(enterClamped, [0, 1], [56, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    transform = `translateY(${offset}px)`;
  } else if (transition === 'scale') {
    const scale = interpolate(enterClamped, [0, 1], [1.06, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    transform = `scale(${scale})`;
  } else {
    // slideLeft
    const offset = interpolate(enterClamped, [0, 1], [-56, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    transform = `translateX(${offset}px)`;
  }

  return (
    <AbsoluteFill style={{ opacity, transform }}>
      {children}
    </AbsoluteFill>
  );
};

export const MainVideo: React.FC<{ videoSpec: VideoSpec }> = ({ videoSpec }) => {
  let currentStartFrame = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {videoSpec.scenes.map((scene, index) => {
        const startFrame = currentStartFrame;
        currentStartFrame += scene.duration;

        const transition = TRANSITION_CYCLE[index % TRANSITION_CYCLE.length];

        return (
          <Sequence
            key={`${scene.type}-${index}`}
            from={startFrame}
            durationInFrames={scene.duration}
          >
            <AnimatedScene duration={scene.duration} transition={transition}>
              <SceneRenderer scene={scene} assets={videoSpec.assets} />
            </AnimatedScene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
