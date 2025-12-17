import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { AppState, ProcessedImage, ProcessingStage, MattingSettings } from './types';
import { restoreArtwork } from './services/geminiService';
import { removeBackground } from './utils/imageProcessing';
import { Button } from './components/Button';
import { StageNav } from './components/StageNav';
import { ComparisonViewer } from './components/ComparisonViewer';

export default function App() {
  const [images, setImages] = useState<ProcessedImage>({
    original: null,
    restored: null,
    transparent: null
  });
  
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [stage, setStage] = useState<ProcessingStage>('upload');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // API Key State
  const [isKeySelected, setIsKeySelected] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  // Matting Controls
  const [mattingSettings, setMattingSettings] = useState<MattingSettings>({
    threshold: 240, // High threshold by default for white paper
    smoothing: 20,
    mode: 'luminance'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for API Key on mount
  useEffect(() => {
    async function checkKey() {
      try {
        if (window.aistudio) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setIsKeySelected(hasKey);
        }
      } catch (e) {
        console.error("Failed to check API key status", e);
      } finally {
        setIsCheckingKey(false);
      }
    }
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // Assume success to avoid race condition
        setIsKeySelected(true);
        setErrorMsg(null);
      } catch (e) {
        console.error("Key selection failed", e);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImages({
          original: evt.target?.result as string,
          restored: null,
          transparent: null
        });
        setStage('restore');
        setAppState(AppState.IDLE);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRestore = async () => {
    if (!images.original) return;
    setAppState(AppState.PROCESSING_RESTORE);
    setErrorMsg(null);

    try {
      const restoredBase64 = await restoreArtwork(images.original);
      setImages(prev => ({ ...prev, restored: restoredBase64 }));
      setAppState(AppState.SUCCESS);
      setStage('matte'); // Move to next stage automatically
    } catch (err: any) {
      console.error(err);
      const msg = err.message || '';
      
      // Handle Permission/Auth errors
      if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('not found')) {
         setAppState(AppState.ERROR);
         setErrorMsg("访问被拒绝。请选择适用于 Gemini 3 Pro 的付费 API 密钥。");
         setIsKeySelected(false); // Force re-selection
         return;
      }

      setAppState(AppState.ERROR);
      setErrorMsg(msg || "AI 修复失败。");
    }
  };

  const handleMatting = async () => {
    const source = images.restored || images.original;
    if (!source) return;

    setAppState(AppState.PROCESSING_MATTING);
    try {
      const transparentBase64 = await removeBackground(source, mattingSettings);
      setImages(prev => ({ ...prev, transparent: transparentBase64 }));
      setAppState(AppState.SUCCESS);
      setStage('export');
    } catch (err: any) {
      setAppState(AppState.ERROR);
      setErrorMsg("背景去除失败。");
    }
  };

  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canNavigate = (targetStage: ProcessingStage) => {
    if (targetStage === 'upload') return true;
    if (targetStage === 'restore') return !!images.original;
    if (targetStage === 'matte') return !!images.restored || !!images.original;
    if (targetStage === 'export') return !!images.transparent || !!images.restored;
    return false;
  };

  // Loading Screen
  if (isCheckingKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>正在初始化...</p>
      </div>
    );
  }

  // API Key Selection Screen
  if (!isKeySelected) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
             <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.536 19.464a2 2 0 01-2.828 0l-1.414-1.414a2 2 0 010-2.828l.707-.707m2.828 0a5 5 0 0015.364-6.364l-1.586 1.586a2 2 0 01-2.828 0l-1.414 1.414a2 2 0 010 2.828l.707.707L6 17.586a2 2 0 01-2.828 0l-1.414-1.414a2 2 0 010-2.828l.707-.707 1.414-1.414z" />
              </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">连接 Gemini API</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            ArtFix 使用高清 **Gemini 3 Pro** 模型进行专业修复。这需要 Google Cloud 的付费 API 密钥。
          </p>
          
          <Button onClick={handleSelectKey} className="w-full mb-4 py-3 text-lg" variant="primary">
            选择 API 密钥
          </Button>
          
          <div className="text-xs text-slate-500">
            需要帮助？查看 <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">计费文档</a>。
          </div>
          
          {errorMsg && (
            <div className="mt-6 p-3 bg-red-900/30 border border-red-800 text-red-300 rounded text-sm">
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center">
      {/* Header */}
      <header className="w-full bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">ArtFix <span className="text-indigo-400">艺术修复</span></h1>
              <p className="text-xs text-slate-400">AI 智能修复 & 背景去除</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsKeySelected(false)} 
              className="hidden md:block text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              切换 API 密钥
            </button>
            <div className="hidden md:block">
              <Button 
                variant="secondary" 
                onClick={() => fileInputRef.current?.click()}
                className="text-sm"
              >
                新建项目
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col">
        
        <StageNav currentStage={stage} setStage={setStage} canNavigate={canNavigate} />

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 text-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-300 hover:text-white ml-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col md:flex-row gap-8">
          
          {/* Main Visualization Area */}
          <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[400px]">
            
            {stage === 'upload' && !images.original && (
              <div 
                className="text-center cursor-pointer p-12 border-2 border-dashed border-slate-700 rounded-xl hover:border-indigo-500 hover:bg-slate-800/50 transition-all w-full h-full flex flex-col items-center justify-center group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 bg-slate-800 group-hover:bg-slate-700 transition-colors rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-white mb-2">上传艺术作品</h3>
                <p className="text-slate-400 max-w-xs mx-auto mb-4">点击选择绘画、书法或手稿照片。</p>
                <Button variant="secondary" className="pointer-events-none">选择文件</Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            )}

            {stage === 'restore' && images.original && (
              <div className="w-full h-full flex flex-col">
                {appState === AppState.PROCESSING_RESTORE ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                     <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                     <p className="text-indigo-300 font-medium animate-pulse">Gemini AI 正在修复您的作品...</p>
                     <p className="text-slate-500 text-sm">正在校正透视、光影和褶皱</p>
                  </div>
                ) : images.restored ? (
                   <ComparisonViewer 
                      beforeImage={images.original} 
                      afterImage={images.restored} 
                      labelBefore="原图"
                      labelAfter="修复后"
                   />
                ) : (
                  <img src={images.original} alt="Original" className="max-h-[600px] object-contain rounded-lg shadow-2xl" />
                )}
              </div>
            )}

            {stage === 'matte' && (
              <div className="w-full h-full flex flex-col">
                 {appState === AppState.PROCESSING_MATTING ? (
                   <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                     <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                     <p className="text-emerald-300 font-medium animate-pulse">正在提取墨迹/颜料...</p>
                  </div>
                 ) : images.transparent ? (
                   <div className="relative w-full h-[500px] bg-checkerboard rounded-xl overflow-hidden border-2 border-slate-700">
                     <img src={images.transparent} className="w-full h-full object-contain" alt="Transparent Result" />
                   </div>
                 ) : (
                   <img 
                    src={images.restored || images.original || ''} 
                    alt="Ready to Matte" 
                    className="max-h-[600px] object-contain rounded-lg shadow-2xl" 
                   />
                 )}
              </div>
            )}

            {stage === 'export' && images.transparent && (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="relative max-w-full max-h-[500px] bg-checkerboard rounded-xl overflow-hidden border-4 border-indigo-900 shadow-2xl p-8">
                  <img src={images.transparent} className="max-h-[400px] object-contain" alt="Final" />
                </div>
                <div className="mt-8 text-center space-y-2">
                  <h3 className="text-2xl font-bold text-white">处理完成！</h3>
                  <p className="text-slate-400">您的作品已完成修复和去背处理。</p>
                </div>
              </div>
            )}

          </div>

          {/* Controls Sidebar */}
          {images.original && (
            <div className="w-full md:w-80 flex flex-col gap-6">
              
              {/* Restoration Controls */}
              <div className={`p-6 rounded-xl border transition-all ${stage === 'restore' ? 'bg-slate-800 border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'bg-slate-900 border-slate-800 opacity-50 grayscale'}`}>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <span className="bg-indigo-900 text-indigo-300 text-xs px-2 py-1 rounded mr-2">AI</span>
                  智能修复
                </h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  使用 Gemini 3 Pro 模型校正透视、修复光影不均及纸张褶皱。
                </p>
                <Button 
                  onClick={handleRestore} 
                  isLoading={appState === AppState.PROCESSING_RESTORE}
                  disabled={stage !== 'restore'}
                  className="w-full"
                  variant="primary"
                >
                  {images.restored ? '重新修复' : '一键自动修复'}
                </Button>
              </div>

              {/* Matting Controls */}
              <div className={`p-6 rounded-xl border transition-all ${stage === 'matte' ? 'bg-slate-800 border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'bg-slate-900 border-slate-800 opacity-50'}`}>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <span className="bg-emerald-900 text-emerald-300 text-xs px-2 py-1 rounded mr-2">工具</span>
                  背景去除
                </h3>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 block">阈值 (Threshold)</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="255" 
                      value={mattingSettings.threshold}
                      onChange={(e) => setMattingSettings(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                      disabled={stage !== 'matte'}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>更多细节</span>
                      <span>背景更干净</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 block">边缘平滑 (Smoothing)</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={mattingSettings.smoothing}
                      onChange={(e) => setMattingSettings(prev => ({ ...prev, smoothing: Number(e.target.value) }))}
                      disabled={stage !== 'matte'}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                   <div className="flex gap-2">
                     <button
                       onClick={() => setMattingSettings(p => ({...p, mode: 'luminance'}))}
                       disabled={stage !== 'matte'}
                       className={`flex-1 py-2 text-xs rounded border ${mattingSettings.mode === 'luminance' ? 'bg-emerald-900/50 border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-400'}`}
                     >
                       书法 (墨迹)
                     </button>
                     <button
                       onClick={() => setMattingSettings(p => ({...p, mode: 'color'}))}
                       disabled={stage !== 'matte'}
                       className={`flex-1 py-2 text-xs rounded border ${mattingSettings.mode === 'color' ? 'bg-emerald-900/50 border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-400'}`}
                     >
                       绘画 (彩色)
                     </button>
                   </div>
                </div>

                <Button 
                  onClick={handleMatting} 
                  isLoading={appState === AppState.PROCESSING_MATTING}
                  disabled={stage !== 'matte'}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500 shadow-emerald-500/30"
                >
                  去除背景
                </Button>
              </div>

              {/* Actions */}
              {stage === 'export' && (
                <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 space-y-3">
                  <h3 className="text-lg font-semibold text-white mb-2">导出</h3>
                  <Button 
                    onClick={() => images.transparent && downloadImage(images.transparent, 'artfix-transparent.png')} 
                    className="w-full"
                    variant="primary"
                  >
                    下载 PNG (透明背景)
                  </Button>
                  <Button 
                    onClick={() => images.restored && downloadImage(images.restored, 'artfix-restored.jpg')} 
                    className="w-full"
                    variant="secondary"
                  >
                    下载修复后的图片 (白底)
                  </Button>
                  <Button 
                     onClick={() => {
                       setImages({ original: null, restored: null, transparent: null });
                       setStage('upload');
                       setAppState(AppState.IDLE);
                       if (fileInputRef.current) fileInputRef.current.value = '';
                     }}
                     className="w-full"
                     variant="ghost"
                  >
                    重新开始
                  </Button>
                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}