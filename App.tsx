
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import HandTracker from './components/HandTracker';
import Experience from './components/Experience';
import { TreeState, HandData } from './types';
import { Upload, Hand, Sparkles, Move } from 'lucide-react';

const App: React.FC = () => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [gameState, setGameState] = useState<TreeState>(TreeState.FOLDED);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const [handData, setHandData] = useState<HandData | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  const lastHandPos = useRef({ x: 0, y: 0 });
  const pinchStartX = useRef<number | null>(null);
  const isPinchingRef = useRef(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPhotos = Array.from(files).map((file: File) => URL.createObjectURL(file));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const onHandUpdate = useCallback((data: HandData) => {
    // 1. 位置更新节流：只有移动超过一定像素才更新状态
    const dist = Math.hypot(data.position.x - lastHandPos.current.x, data.position.y - lastHandPos.current.y);
    const hasMovedSignificantly = dist > 0.005;

    // 2. 状态变化检查
    const newState = (() => {
      if (data.isFist) return TreeState.FOLDED;
      if (data.isPinching) return TreeState.ZOOMED;
      if (data.isOpen) return TreeState.SCATTERED;
      return gameState;
    })();

    const stateChanged = newState !== gameState;

    if (hasMovedSignificantly || stateChanged) {
      lastHandPos.current = { x: data.position.x, y: data.position.y };
      setHandData(data);
      
      if (stateChanged) setGameState(newState);

      // 处理悬停逻辑
      if (newState === TreeState.SCATTERED) {
        const total = photos.length > 0 ? photos.length : 8;
        const idx = Math.floor((1 - data.position.x) * total);
        const clampedIdx = Math.max(0, Math.min(idx, total - 1));
        if (clampedIdx !== hoverIdx) setHoverIdx(clampedIdx);
      }

      // 处理捏合后的照片切换
      if (data.isPinching && newState === TreeState.ZOOMED) {
        if (!isPinchingRef.current) {
          pinchStartX.current = data.position.x;
          isPinchingRef.current = true;
          if (hoverIdx !== -1) setActivePhotoIdx(hoverIdx);
        } else if (pinchStartX.current !== null) {
          const deltaX = data.position.x - pinchStartX.current;
          if (Math.abs(deltaX) > 0.18) {
            const total = photos.length > 0 ? photos.length : 8;
            setActivePhotoIdx(prev => deltaX > 0 ? (prev + 1) % total : (prev - 1 + total) % total);
            pinchStartX.current = data.position.x;
          }
        }
      } else {
        isPinchingRef.current = false;
        pinchStartX.current = null;
      }
    }
  }, [gameState, photos.length, hoverIdx]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div className="absolute top-8 left-8 z-[45] pointer-events-none">
        <h2 className="gold-text text-5xl md:text-6xl tracking-wider select-none">张布拉的圣诞树</h2>
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 2, 12], fov: 40 }}
        gl={{ antialias: false, powerPreference: "high-performance" }} // 关闭抗锯齿以换取帧率
      >
        <color attach="background" args={['#000000']} />
        <Experience 
          gameState={gameState} 
          handData={handData} 
          photos={photos}
          activePhotoIdx={activePhotoIdx}
          hoverIdx={hoverIdx}
        />
        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.9} mipmapBlur intensity={1.2} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>

      <div className="absolute top-4 right-4 w-48 h-36 rounded-xl overflow-hidden border border-amber-500/20 shadow-2xl bg-black/80 z-50">
        <HandTracker onUpdate={onHandUpdate} />
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-4">
        <div className="flex gap-4 p-4 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/5">
          <label className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-full cursor-pointer transition-all text-xs font-bold uppercase tracking-[0.2em]">
            <Upload size={14} />
            导入照片
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
          <div className="h-10 w-[1px] bg-white/5" />
          <div className="flex items-center gap-6 px-4 text-[10px] tracking-widest text-white/50 uppercase">
             <span>{gameState === TreeState.ZOOMED ? `记忆片段 ${activePhotoIdx + 1}` : '照片画廊'}</span>
          </div>
        </div>
      </div>

      {showInstructions && (
        <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-10 bg-[#0a0a0a] border border-amber-900/30 rounded-[40px] shadow-[0_0_100px_rgba(180,83,9,0.1)]">
            <h1 className="text-4xl font-serif text-amber-500 mb-2 tracking-[0.3em] uppercase gold-text">Memoria Tree</h1>
            <div className="h-[1px] w-20 bg-amber-900/50 mx-auto mb-6" />
            <div className="grid grid-cols-2 gap-8 text-[12px] mb-12 tracking-[0.15em] text-neutral-400">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 text-red-500"><Hand size={20} /></div>
                    <span className="font-bold text-amber-200">握拳：合拢</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 text-green-500"><Sparkles size={20} /></div>
                    <span className="font-bold text-amber-200">张开：散开</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 text-blue-500"><Move size={20} /></div>
                    <span className="font-bold text-amber-200">移动：旋转</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 text-amber-500"><Hand size={20} /></div>
                    <span className="font-bold text-amber-200">捏合：抓取</span>
                </div>
            </div>
            <button 
                onClick={() => setShowInstructions(false)} 
                className="w-full py-5 border border-amber-800/50 hover:border-amber-500 text-amber-500 rounded-2xl font-bold uppercase tracking-[0.4em] transition-all"
            >
                开始体验
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
