
import React, { useEffect, useRef } from 'react';
import { HandData } from '../types';

interface Props {
  onUpdate: (data: HandData) => void;
}

const HandTracker: React.FC<Props> = ({ onUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastFrameTime = useRef<number>(0);
  
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const smoothPos = useRef({ x: 0.5, y: 0.5, z: 0.0 });
  const lerpAmount = 0.2; // 稍微提高响应速度，使推拉更跟手

  useEffect(() => {
    let isMounted = true;

    const initializeMediaPipe = async () => {
      const mpHands = (window as any).Hands;
      const mpCamera = (window as any).Camera;

      if (!mpHands || !mpCamera) {
          const handsScript = document.createElement('script');
          handsScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
          document.head.appendChild(handsScript);

          const cameraScript = document.createElement('script');
          cameraScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
          document.head.appendChild(cameraScript);

          await Promise.all([
            new Promise(resolve => { handsScript.onload = resolve; }),
            new Promise(resolve => { cameraScript.onload = resolve; })
          ]);
      }

      if (!isMounted) return;

      const HandsClass = (window as any).Hands;
      const CameraClass = (window as any).Camera;

      const hands = new HandsClass({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      handsRef.current = hands;

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      hands.onResults((results: any) => {
        if (!isMounted || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return;
        
        const landmarks = results.multiHandLandmarks[0];
        
        // 关键点平滑 - 使用第9号点（中指指根）作为定位中心，因为它最稳定
        const rawX = landmarks[9].x;
        const rawY = landmarks[9].y;
        const rawZ = landmarks[9].z;
        
        smoothPos.current.x += (rawX - smoothPos.current.x) * lerpAmount;
        smoothPos.current.y += (rawY - smoothPos.current.y) * lerpAmount;
        smoothPos.current.z += (rawZ - smoothPos.current.z) * lerpAmount;

        // 手势检测逻辑
        const palmBase = landmarks[0];
        const fingerTips = [8, 12, 16, 20];
        const fingerBases = [5, 9, 13, 17];
        
        let extendedFingers = 0;
        for(let i=0; i<4; i++) {
          const tip = landmarks[fingerTips[i]];
          const base = landmarks[fingerBases[i]];
          const dTip = Math.hypot(tip.x - palmBase.x, tip.y - palmBase.y);
          const dBase = Math.hypot(base.x - palmBase.x, base.y - palmBase.y);
          if (dTip > dBase * 1.3) extendedFingers++;
        }

        const isFist = extendedFingers <= 0;
        const isOpen = extendedFingers >= 4;
        const isPinching = Math.hypot(landmarks[8].x - landmarks[4].x, landmarks[8].y - landmarks[4].y) < 0.06;
        const rotAngle = Math.atan2(landmarks[17].y - landmarks[5].y, landmarks[17].x - landmarks[5].x);

        onUpdateRef.current({
          isFist,
          isOpen,
          isPinching,
          rotation: rotAngle,
          position: { ...smoothPos.current },
          rawLandmarks: landmarks
        });
      });

      if (videoRef.current && isMounted) {
        const camera = new CameraClass(videoRef.current, {
          onFrame: async () => {
            if (!isMounted || !handsRef.current || !videoRef.current) return;
            
            const now = performance.now();
            if (now - lastFrameTime.current < 40) return; 
            lastFrameTime.current = now;

            try {
              await handsRef.current.send({ image: videoRef.current });
            } catch (e) {
              console.warn("Hand processing skipped", e);
            }
          },
          width: 320,
          height: 240,
        });
        cameraRef.current = camera;
        camera.start();
      }
    };

    initializeMediaPipe();

    return () => {
      isMounted = false;
      if (cameraRef.current) cameraRef.current.stop();
      if (handsRef.current) handsRef.current.close();
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black/60 rounded-xl overflow-hidden">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-40" playsInline muted />
      <div className="absolute inset-0 border border-amber-500/20 pointer-events-none" />
    </div>
  );
};

export default HandTracker;
