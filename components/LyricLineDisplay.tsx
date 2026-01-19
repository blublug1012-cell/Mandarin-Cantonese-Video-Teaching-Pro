import React from 'react';
import { LyricLine, Vocab } from '../types';

interface Props {
  line: LyricLine;
  showPinyin?: boolean;
  showEnglish?: boolean;
  onVocabClick?: (vocab: Vocab) => void;
}

const LyricLineDisplay: React.FC<Props> = ({ line, showPinyin = true, showEnglish = true, onVocabClick }) => {
  if (!line) return null;

  // 辅助函数：根据词汇表将句子切分为字或词组
  const getUnits = () => {
    const chinese = line.chinese.replace(/\s+/g, '');
    const vocabs = line.vocabs || [];
    let result: { text: string; pinyin: string; isVocab: boolean }[] = [];
    let currentIndex = 0;

    // 简单匹配算法：按顺序查找词汇
    const pinyins = line.pinyin.split(/\s+/).filter(p => p.length > 0);
    
    // 如果没有配置拼音，回退到普通字符处理
    if (pinyins.length === 0) {
      return Array.from(chinese).map(c => ({ text: c, pinyin: '', isVocab: false }));
    }

    Array.from(chinese).forEach((char, i) => {
      result.push({ text: char, pinyin: pinyins[i] || '', isVocab: vocabs.some(v => v.char.includes(char)) });
    });

    return result;
  };

  const units = getUnits();

  return (
    <div className="flex flex-col items-center w-full max-w-full overflow-hidden py-6 px-4">
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-12 mb-10 w-full">
        {units.map((unit, i) => (
          <div 
            key={i} 
            className={`flex flex-col items-center transition-all duration-300 ${unit.isVocab ? 'text-indigo-600 scale-110 cursor-pointer' : 'text-slate-800'}`}
            onClick={() => {
              if (unit.isVocab) {
                const found = line.vocabs.find(v => v.char.includes(unit.text));
                if (found) onVocabClick?.(found);
              }
            }}
          >
            <span className={`text-sm font-black text-slate-300 mb-2 uppercase tracking-tighter transition-opacity duration-300 ${showPinyin ? 'opacity-100' : 'opacity-0'}`}>
              {unit.pinyin}
            </span>
            <span className="text-6xl font-black tracking-normal relative leading-[1.1]">
              {unit.text}
              {unit.isVocab && <div className="absolute -bottom-2 left-0 right-0 h-1.5 bg-indigo-500/30 rounded-full"></div>}
            </span>
          </div>
        ))}
      </div>
      {showEnglish && line.english && (
        <div className="max-w-2xl text-center animate-in fade-in slide-in-from-top-2 duration-500">
          <p className="text-slate-400 text-xl font-bold italic border-t border-slate-100 pt-6">
            "{line.english}"
          </p>
        </div>
      )}
    </div>
  );
};

export default LyricLineDisplay;