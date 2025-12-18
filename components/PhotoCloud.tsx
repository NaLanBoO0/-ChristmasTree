
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Image } from '@react-three/drei';
import * as THREE from 'three';
import { TreeState } from '../types';

interface PhotoProps {
    url: string;
    index: number;
    total: number;
    gameState: TreeState;
    isHovered: boolean;
    isLocked: boolean;
    offsetIndex: number; 
}

const PhotoItem: React.FC<PhotoProps> = ({ url, index, total, gameState, isHovered, isLocked, offsetIndex }) => {
    const meshRef = useRef<THREE.Group>(null);
    const borderRef = useRef<THREE.Mesh>(null);
    const imageRef = useRef<any>(null);
    
    const positions = useMemo(() => {
        const height = 6.0; 
        const y = -(height/2) + (index / total) * height;
        const normalizedY = (y + (height/2)) / height;
        const radius = Math.pow(1 - normalizedY, 1.4) * 2.3 + 0.35;
        const angle = (index / total) * Math.PI * 14; 
        
        return {
            tree: new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius),
            // 优化散开态坐标：减小 X 轴范围 (从 26 减至 20)，使其更居中
            scatter: new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 18,
                (Math.random() - 0.5) * 12
            )
        };
    }, [index, total]);

    // 当图片锁定（放大）时，强制优化材质属性以获得最高清晰度
    useEffect(() => {
        if (isLocked && imageRef.current && imageRef.current.material) {
            const map = imageRef.current.material.map;
            if (map) {
                map.magFilter = THREE.LinearFilter;
                map.minFilter = THREE.LinearMipmapLinearFilter;
                map.generateMipmaps = true;
                map.needsUpdate = true;
            }
        }
    }, [isLocked]);

    useFrame((state) => {
        if (!meshRef.current) return;

        let targetPos = positions.tree;
        let targetScale = 0.3;
        let targetOpacity = 1.0;

        if (gameState === TreeState.SCATTERED) {
            targetPos = positions.scatter;
            targetScale = isHovered ? 2.8 : 1.4;
        } else if (gameState === TreeState.ZOOMED) {
            if (isLocked) {
                targetPos = new THREE.Vector3(0, 0, 0);
                targetScale = 5.2; 
                targetOpacity = 1.0;
            } else {
                targetPos = new THREE.Vector3(offsetIndex * 15, 35, -25);
                targetScale = 0.001;
                targetOpacity = 0.0;
            }
        }

        meshRef.current.position.lerp(targetPos, 0.1);
        const s = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.12);
        meshRef.current.scale.set(s, s, 1);
        
        if (gameState === TreeState.ZOOMED && isLocked) {
            meshRef.current.quaternion.slerp(state.camera.quaternion, 0.12);
        } else {
            meshRef.current.lookAt(state.camera.position);
        }

        if (imageRef.current && imageRef.current.material) {
            const mat = imageRef.current.material;
            mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.15);
            mat.visible = mat.opacity > 0.01;
            
            // 持续检查并应用最高画质设置
            if (mat.map) {
                const maxAnisotropy = state.gl.capabilities.getMaxAnisotropy();
                if (mat.map.anisotropy !== maxAnisotropy) {
                    mat.map.anisotropy = maxAnisotropy;
                    mat.map.needsUpdate = true;
                }
            }
        }

        if (borderRef.current) {
            const bMat = borderRef.current.material as THREE.MeshPhysicalMaterial;
            bMat.opacity = THREE.MathUtils.lerp(bMat.opacity, targetOpacity, 0.15);
            bMat.visible = bMat.opacity > 0.01;
        }
    });

    return (
        <group ref={meshRef}>
            <Image 
                ref={imageRef}
                url={url} 
                transparent 
                side={THREE.DoubleSide} 
                toneMapped={false}
                segments={1} 
            />
            <mesh ref={borderRef} position={[0, 0, -0.005]}>
                <planeGeometry args={[1.06, 1.06]} />
                <meshPhysicalMaterial 
                    color="#FFD700" 
                    metalness={0.7} 
                    roughness={0.3} 
                    transparent
                    emissive="#FFD700"
                    emissiveIntensity={isLocked ? 0.05 : 0}
                />
            </mesh>
        </group>
    );
};

interface CloudProps {
    photos: string[];
    gameState: TreeState;
    activePhotoIdx: number;
    hoverIdx: number;
}

const PhotoCloud: React.FC<CloudProps> = ({ photos, gameState, activePhotoIdx, hoverIdx }) => {
    if (photos.length === 0) return null;

    return (
        <group>
            {photos.map((url, i) => {
                let offset = i - activePhotoIdx;
                const total = photos.length;
                if (offset > total / 2) offset -= total;
                if (offset < -total / 2) offset += total;

                return (
                    <PhotoItem 
                        key={url} 
                        url={url} 
                        index={i} 
                        total={total} 
                        gameState={gameState}
                        isHovered={i === hoverIdx}
                        isLocked={i === activePhotoIdx}
                        offsetIndex={offset}
                    />
                );
            })}
        </group>
    );
};

export default PhotoCloud;
