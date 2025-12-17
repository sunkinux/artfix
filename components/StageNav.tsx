import React from 'react';
import { ProcessingStage } from '../types';

interface StageNavProps {
  currentStage: ProcessingStage;
  setStage: (stage: ProcessingStage) => void;
  canNavigate: (stage: ProcessingStage) => boolean;
}

export const StageNav: React.FC<StageNavProps> = ({ currentStage, setStage, canNavigate }) => {
  const stages: { id: ProcessingStage; label: string }[] = [
    { id: 'upload', label: '1. 上传图片' },
    { id: 'restore', label: '2. AI 修复' },
    { id: 'matte', label: '3. 去除背景' },
    { id: 'export', label: '4. 保存导出' },
  ];

  return (
    <div className="flex items-center justify-center space-x-2 mb-8 overflow-x-auto py-2">
      {stages.map((stage, idx) => {
        const isActive = currentStage === stage.id;
        const enabled = canNavigate(stage.id);
        
        return (
          <React.Fragment key={stage.id}>
             <button
              onClick={() => enabled && setStage(stage.id)}
              disabled={!enabled}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${isActive 
                  ? 'bg-indigo-600 text-white' 
                  : enabled 
                    ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' 
                    : 'bg-slate-900 text-slate-600 cursor-not-allowed'}
              `}
            >
              {stage.label}
            </button>
            {idx < stages.length - 1 && (
              <div className="w-8 h-0.5 bg-slate-800 hidden sm:block" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};