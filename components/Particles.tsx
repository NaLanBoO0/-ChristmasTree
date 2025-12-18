
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types';

interface Props {
  gameState: TreeState;
}

// 粒子总数 500
const COUNT = 500; 

const Particles: React.FC<Props> = ({ gameState }) => {
  const goldMesh = useRef<THREE.InstancedMesh>(null);
  const redMesh = useRef<THREE.InstancedMesh>(null);
  const greenMesh = useRef<THREE.InstancedMesh>(null);
  const glowMesh = useRef<THREE.InstancedMesh>(null);
  const candyMesh = useRef<THREE.InstancedMesh>(null);
  const topperRef = useRef<THREE.Mesh>(null);

  const treeHeight = 9.0; 

  const particleData = useMemo(() => {
    const data = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); 

    for (let i = 0; i < COUNT; i++) {
      // t 从 0 到 1
      const t = i / COUNT;
      
      /**
       * 密度优化逻辑：
       * 使用指数 2.0 使 t 在接近 1 (顶部) 时变化更快，在接近 0 (底部) 时变化更慢。
       * 这会导致底部的 y 坐标更密集，顶部的 y 坐标更稀疏。
       */
      const distributionFactor = Math.pow(t, 2.0); 
      
      const y = (distributionFactor - 0.5) * treeHeight;
      // 半径随高度线性减小，但在 distributionFactor 的作用下，顶部半径缩小极快，进一步降低顶部视觉密度
      const radiusBase = (1 - distributionFactor) * 2.8 + 0.1;
      
      // 引入噪声偏移，打破规律性
      const angleNoise = (Math.random() - 0.5) * 0.8;
      const radiusNoise = (Math.random() - 0.5) * 0.5;
      const angle = i * goldenAngle + angleNoise;
      const r = radiusBase + radiusNoise;
      
      const treePos = new THREE.Vector3(
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r
      );
      
      // 散开态位置
      const scatterPos = new THREE.Vector3(
        (Math.random() - 0.5) * 45,
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 25
      );

      const baseRotation = new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      // 基础缩放比例：维持饱满感
      const scale = 0.09 + Math.random() * 0.07;
      
      data.push({ treePos, scatterPos, scale, baseRotation });
    }
    return data;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentPositions = useRef(particleData.map(d => d.treePos.clone()));

  useFrame((state, delta) => {
    const meshes = [goldMesh.current, redMesh.current, greenMesh.current, glowMesh.current, candyMesh.current];
    if (meshes.some(m => !m)) return;

    const lerpSpeed = gameState === TreeState.FOLDED ? 0.08 : 0.04;

    for (let i = 0; i < COUNT; i++) {
      const d = particleData[i];
      const target = gameState === TreeState.FOLDED ? d.treePos : d.scatterPos;
      const p = currentPositions.current[i];
      
      p.lerp(target, lerpSpeed);
      if (p.distanceToSquared(target) < 0.0001) p.copy(target);
      
      dummy.position.copy(p);
      
      const meshIndex = i % 5;
      
      let finalScale = d.scale;
      // 保持发光点(Index 3)极小，像萤火虫
      if (meshIndex === 3) finalScale *= 0.45; 
      // 糖果棒比例
      if (meshIndex === 4) finalScale *= 1.1; 

      if (gameState !== TreeState.FOLDED) {
          dummy.rotation.x += delta * (0.2 + (i % 3) * 0.1);
          dummy.rotation.y += delta * 0.2;
          const pulse = 1 + Math.sin(state.clock.elapsedTime * 4 + i) * 0.2;
          dummy.scale.setScalar(finalScale * pulse);
      } else {
          dummy.rotation.copy(d.baseRotation);
          dummy.scale.setScalar(finalScale);
      }

      dummy.updateMatrix();
      const instanceIndex = Math.floor(i / 5);
      meshes[meshIndex]?.setMatrixAt(instanceIndex, dummy.matrix);
    }
    
    meshes.forEach(m => { if (m) m.instanceMatrix.needsUpdate = true; });

    if (topperRef.current) {
        const topperTargetPos = gameState === TreeState.FOLDED 
            ? new THREE.Vector3(0, treeHeight * 0.5 + 0.4, 0) 
            : new THREE.Vector3(0, 60, 0); 
        
        topperRef.current.position.lerp(topperTargetPos, 0.1);
        topperRef.current.scale.setScalar(gameState === TreeState.FOLDED ? 0.75 : 0.001);
        topperRef.current.rotation.y += delta * 1.0;
    }
  });

  const ballGeo = useMemo(() => new THREE.SphereGeometry(1, 12, 12), []);
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1.1, 1.1, 1.1), []);

  return (
    <group>
      {/* 顶饰：改为醒目的红色，赋予红宝石质感 */}
      <mesh ref={topperRef}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshPhysicalMaterial 
            color="#FF0000" 
            metalness={0.9} 
            roughness={0.1} 
            emissive="#FF0000"
            emissiveIntensity={4.5} 
            clearcoat={1.0}
        />
      </mesh>

      {/* 金属金球 (Sphere) */}
      <instancedMesh ref={goldMesh} args={[ballGeo, undefined, Math.floor(COUNT / 5)]}>
        <meshPhysicalMaterial 
            color="#FFD700" 
            metalness={1} 
            roughness={0.05} 
            clearcoat={1.0}
            emissive="#FFA500"
            emissiveIntensity={0.25}
        />
      </instancedMesh>

      {/* 圣诞红立方体 (Box) */}
      <instancedMesh ref={redMesh} args={[boxGeo, undefined, Math.floor(COUNT / 5)]}>
        <meshPhysicalMaterial 
            color="#E00000" 
            metalness={0.8} 
            roughness={0.1} 
            clearcoat={1.0}
            emissive="#800000"
            emissiveIntensity={0.2}
        />
      </instancedMesh>

      {/* 哑光绿立方体 (Box) */}
      <instancedMesh ref={greenMesh} args={[boxGeo, undefined, Math.floor(COUNT / 5)]}>
        <meshPhysicalMaterial 
            color="#0A5D15" 
            roughness={0.4} 
            metalness={0.6}
            clearcoat={0.8}
            emissive="#032506"
            emissiveIntensity={0.25}
        />
      </instancedMesh>

      {/* 高亮发光星尘 (Sphere) */}
      <instancedMesh ref={glowMesh} args={[ballGeo, undefined, Math.floor(COUNT / 5)]}>
        <meshStandardMaterial 
            color="#FFFFFF" 
            emissive="#FFF7AD" 
            emissiveIntensity={2.0} 
        />
      </instancedMesh>

      {/* 糖果棒 (Cylinder) */}
      <instancedMesh ref={candyMesh} args={[undefined, undefined, Math.floor(COUNT / 5)]}>
        <cylinderGeometry args={[0.07, 0.07, 0.5, 8]} />
        <meshPhysicalMaterial 
            color="#FFFFFF" 
            emissive="#FF0000" 
            emissiveIntensity={0.4} 
            roughness={0.2}
        />
      </instancedMesh>
    </group>
  );
};

export default Particles;
