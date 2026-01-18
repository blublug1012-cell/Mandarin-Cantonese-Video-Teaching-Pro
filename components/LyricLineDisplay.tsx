import React from 'react';
import { LyricLine, Vocab } from '../types';

interface Props {
  line: LyricLine;
  onVocabClick?: (vocab: Vocab) => void;
}

const LyricLineDisplay: React.FC<Props> = ({ line, onVocabClick }) => {
  if (!line) return null;
  const chars = Array.from((line.chinese || '').replace(/\s/g, ''));
  const pinyins = (line.pinyin || '').split(/\s+/).filter(p => p.length > 0);

  return (
    <div className="flex flex-col items-center w-full max-w-full overflow-hidden py-4 px-2">
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-10 mb-8 w-full">
        {chars.map((char, i) => {
          const py = pinyins[i] || '';
          const vocab = (line.vocabs || []).find(v => v.char.includes(char));
          
          return (
            <div 
              key={i} 
              className={`flex flex-col items-center cursor-pointer transition-all duration-300 hover:-translate-y-2 ${vocab ? 'text-indigo-600 scale-105' : 'text-slate-800'}`}
              onClick={() => vocab && onVocabClick?.(vocab)}
            >
              <span className="text-xs font-black text-slate-300 mb-1 uppercase tracking-tighter h-4 overflow-visible">{py}</span>
              <span className="text-5xl font-black tracking-normal relative leading-tight">
                {char}
                {vocab && <div className="absolute -bottom-1 left-0 right-0 h-1 bg-indigo-500/30 rounded-full"></div>}
              </span>
            </div>
          );
        })}
      </div>
      {line.english && (
        <div className="max-w-xl text-center">
          <p className="text-slate-400 text-lg font-medium italic border-t border-slate-50 pt-4">
            "{line.english}"
          </p>
        </div>
      )}
    </div>
  );
};

export default LyricLineDisplay;