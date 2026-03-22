import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate } from 'remotion';
import data from "./data/input.json"; // Импортируем твой DSL

export const MyVideo = () => {
  const frame = useCurrentFrame();
  
  // Логика переключения сцен на основе данных из JSON
  let currentStartFrame = 0;
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
      {data.scenes.map((scene, index) => {
        const start = currentStartFrame;
        const end = start + scene.duration;
        currentStartFrame = end; // Сдвигаем начало следующей сцены

        // Показываем текст только в нужный промежуток времени
        if (frame >= start && frame < end) {

          const opacity = interpolate(
            frame,
            [start, start + 15], 
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          
          return (
            <div
              key={index}
              style={{
                opacity: opacity, // Применяем прозрачность
                color: scene.color,
                fontSize: 80,
                textAlign: 'center',
                fontFamily: 'sans-serif',
                padding: '0 40px'
              }}
            >
              {scene.text}
            </div>
          );
        }
        return null;
      })}
    </AbsoluteFill>
  );
};