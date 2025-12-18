
import React, { useRef, useEffect, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { TreeState, HandData } from '../types';
import Particles from './Particles';
import PhotoCloud from './PhotoCloud';
import gsap from 'gsap';

interface Props {
  gameState: TreeState;
  handData: HandData | null;
  photos: string[];
  activePhotoIdx: number;
  hoverIdx: number;
}

const Experience: React.FC<Props> = ({ gameState, handData, photos, activePhotoIdx, hoverIdx }) => {
  const { camera, gl } = useThree();
  const sceneRef = useRef<THREE.Group>(null);
  const orbitGroupRef = useRef<THREE.Group>(null);
  
  // 用于散开态的平移和缩放增量
  const scatterOffset = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    gl.setClearColor(0x000000, 1);
  }, [gl]);

  useFrame((state, delta) => {
    if (handData && orbitGroupRef.current) {
      if (gameState === TreeState.SCATTERED) {
        // 1. 左右/上下移动：映射手部 X, Y 到场景位置
        // 调整映射系数，使移动范围更适中且居中
        const targetX = (handData.position.x - 0.5) * -35; 
        const targetY = (handData.position.y - 0.5) * 25;
        
        // 2. 靠近/远离：映射手部 Z 到深度缩放
        // MediaPipe 的 Z 通常在 -0.2 (近) 到 0.1 (远) 之间
        // 用户要求：靠近放大，远离缩小。
        // 因为 Z 越小越近，所以 (handData.position.z + 0.05) * -80 
        // 当 z = -0.2 时，值为 (-0.15) * -80 = 12 (靠近相机，放大)
        // 当 z = 0.1 时，值为 (0.15) * -80 = -12 (远离相机，缩小)
        const targetZ = (handData.position.z + 0.05) * -80; 

        scatterOffset.current.x = THREE.MathUtils.lerp(scatterOffset.current.x, targetX, 0.1);
        scatterOffset.current.y = THREE.MathUtils.lerp(scatterOffset.current.y, targetY, 0.1);
        scatterOffset.current.z = THREE.MathUtils.lerp(scatterOffset.current.z, targetZ, 0.1);

        orbitGroupRef.current.position.x = scatterOffset.current.x;
        orbitGroupRef.current.position.y = scatterOffset.current.y;
        orbitGroupRef.current.position.z = scatterOffset.current.z;

        // 旋转保持微弱，增加灵动感
        const targetRotX = (handData.position.y - 0.5) * 0.15;
        const targetRotY = (handData.position.x - 0.5) * -0.3;
        orbitGroupRef.current.rotation.x = THREE.MathUtils.lerp(orbitGroupRef.current.rotation.x, targetRotX, 0.05);
        orbitGroupRef.current.rotation.y = THREE.MathUtils.lerp(orbitGroupRef.current.rotation.y, targetRotY, 0.05);

      } else {
        // 非散开态：重置偏移，平滑回到中心
        scatterOffset.current.x = THREE.MathUtils.lerp(scatterOffset.current.x, 0, 0.1);
        scatterOffset.current.y = THREE.MathUtils.lerp(scatterOffset.current.y, 0, 0.1);
        scatterOffset.current.z = THREE.MathUtils.lerp(scatterOffset.current.z, 0, 0.1);
        
        orbitGroupRef.current.position.set(scatterOffset.current.x, scatterOffset.current.y, scatterOffset.current.z);
        orbitGroupRef.current.rotation.x = THREE.MathUtils.lerp(orbitGroupRef.current.rotation.x, 0, 0.05);
        orbitGroupRef.current.rotation.y = THREE.MathUtils.lerp(orbitGroupRef.current.rotation.y, 0, 0.05);
      }
    }
    
    // 合拢态自转
    if (gameState === TreeState.FOLDED && sceneRef.current) {
        sceneRef.current.rotation.y += delta * 0.15;
    } else if (sceneRef.current) {
        sceneRef.current.rotation.y = THREE.MathUtils.lerp(sceneRef.current.rotation.y, 0, 0.05);
    }
  });

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (gameState === TreeState.ZOOMED) {
        gsap.to(camera.position, { x: 0, y: 0, z: 8, duration: 1.5, ease: "power3.inOut" });
        gsap.to(camera, { fov: 45, duration: 1.5, onUpdate: () => camera.updateProjectionMatrix() });
      } else if (gameState === TreeState.FOLDED) {
        gsap.to(camera.position, { x: 0, y: 1.0, z: 14, duration: 2.5, ease: "expo.inOut" });
        gsap.to(camera, { fov: 35, duration: 2.5, onUpdate: () => camera.updateProjectionMatrix() });
      } else {
        // 散开态相机位置
        gsap.to(camera.position, { x: 0, y: 0, z: 20, duration: 2.5, ease: "expo.inOut" });
        gsap.to(camera, { fov: 40, duration: 2.5, onUpdate: () => camera.updateProjectionMatrix() });
      }
    });
    return () => ctx.revert();
  }, [gameState, camera]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1, 14]} />
      <Environment preset="night" />
      
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <ambientLight intensity={0.1} />
      <spotLight position={[10, 20, 10]} intensity={1.5} angle={0.5} penumbra={1} color="#FFD700" />
      <spotLight position={[-10, -10, 5]} intensity={0.8} angle={0.5} penumbra={1} color="#FF4444" />
      <pointLight position={[0, 2, 0]} intensity={1.0} color="#FFFFFF" />

      <group ref={orbitGroupRef}>
        <group ref={sceneRef}>
            <Particles gameState={gameState} />
            <Suspense fallback={null}>
              <PhotoCloud 
                  photos={photos} 
                  gameState={gameState} 
                  activePhotoIdx={activePhotoIdx}
                  hoverIdx={hoverIdx}
              />
            </Suspense>
        </group>
      </group>
    </>
  );
};

export default Experience;
