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
    <div className="flex flex-col items-center py-6 px-4">
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-12 mb-10">
        {chars.map((char, i) => {
          const py = pinyins[i] || '';
          const vocab = (line.vocabs || []).find(v => v.char.includes(char));
          
          return (
            <div 
              key={i} 
              className={`flex flex-col items-center cursor-pointer transition-all duration-300 hover:-translate-y-2 ${vocab ? 'text-indigo-600 scale-110' : 'text-slate-800'}`}
              onClick={() => vocab && onVocabClick?.(vocab)}
            >
              <span className="text-sm font-black text-slate-300 mb-2 uppercase tracking-tighter" style={{ minHeight: '1.2em' }}>{py}</span>
              <span className="text-6xl font-black tracking-widest relative">
                {char}
                {vocab && <div className="absolute -bottom-2 left-0 right-0 h-1 bg-indigo-500/20 rounded-full"></div>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="max-w-2xl text-center">
        <p className="text-slate-400 text-2xl font-medium italic border-t border-slate-100 pt-6">
          "{line.english || ''}"
        </p>
      </div>
    </div>
  );
};

export default LyricLineDisplay;