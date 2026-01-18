import React, { useState, useEffect, useRef } from 'react';
import YouTubePlayer from './YouTubePlayer';
import LyricLineDisplay from './LyricLineDisplay';
import { LessonData, LyricLine, Vocab, Question } from '../types';

interface Props {
  lesson: LessonData | null;
}

const ClassroomView: React.FC<Props> = ({ lesson }) => {
  // 如果没有数据，显示提示而不是报错
  if (!lesson || !lesson.lyrics) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-10">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center">
          <i className="fa-solid fa-circle-exclamation text-indigo-500 text-5xl mb-4"></i>
          <h2 className="text-2xl font-black text-slate-800 mb-2">未找到课程数据</h2>
          <p className="text-slate-400 mb-6">请返回编辑台并点击“保存课程”后再进入上课模式。</p>
          <button 
            onClick={() => window.location.hash = '#/teacher'}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold"
          >
            返回编辑台
          </button>
        </div>
      </div>
    );
  }

  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentLine, setCurrentLine] = useState<LyricLine | null>(null);
  const [selectedVocab, setSelectedVocab] = useState<Vocab | null>(null);
  const [seekTarget, setSeekTarget] = useState<number | undefined>(undefined);
  const [sidePanel, setSidePanel] = useState<'lyrics' | 'questions'>('lyrics');
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lyrics = lesson.lyrics || [];
    const active = lyrics.find(l => currentTime >= l.startTime && currentTime <= l.endTime);
    if (active && active.id !== currentLine?.id) {
      setCurrentLine(active);
      const activeEl = document.getElementById(`lyric-${active.id}`);
      if (activeEl && scrollRef.current) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    const questions = lesson.questions || [];
    const triggeredQ = questions.find(q => Math.floor(currentTime) === q.timestamp);
    if (triggeredQ && triggeredQ.id !== activeQuestion?.id) {
      setActiveQuestion(triggeredQ);
      setSidePanel('questions');
      setPlaying(false);
    }
  }, [currentTime, lesson.lyrics, lesson.questions]);

  const handleNext = () => {
    const idx = lesson.lyrics.findIndex(l => l.id === currentLine?.id);
    if (idx < lesson.lyrics.length - 1) {
      setSeekTarget(lesson.lyrics[idx + 1].startTime);
      setTimeout(() => setSeekTarget(undefined), 100);
    }
  };

  const handlePrev = () => {
    const idx = lesson.lyrics.findIndex(l => l.id === currentLine?.id);
    if (idx > 0) {
      setSeekTarget(lesson.lyrics[idx - 1].startTime);
      setTimeout(() => setSeekTarget(undefined), 100);
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col h-screen overflow-hidden font-sans no-print">
      <header className="bg-white border-b px-8 py-3 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => window.location.hash = '#/teacher'}
            className="w-10 h-10 bg-slate-50 border rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h2 className="font-bold text-slate-800 text-lg leading-tight">{lesson.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest ${lesson.language === 'Mandarin' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                {lesson.language === 'Mandarin' ? '普通话' : '粤语'}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">上课模式</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[0.5, 0.75, 1, 1.25, 1.5].map(rate => (
              <button 
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${playbackRate === rate ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        <div className="flex-[2] flex flex-col gap-6 overflow-hidden">
          <div className="bg-black rounded-3xl overflow-hidden shadow-2xl relative aspect-video group">
            <YouTubePlayer 
              url={lesson.videoUrl} 
              playing={playing} 
              playbackRate={playbackRate} 
              onProgress={(s) => {
                setCurrentTime(s.playedSeconds);
              }}
              onReady={(p) => setDuration(p.getDuration())}
              seekTo={seekTarget}
            />
            
            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent pt-12 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="relative h-2 bg-white/20 rounded-full mb-6 cursor-pointer overflow-visible" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                setSeekTarget(percent * duration);
                setTimeout(() => setSeekTarget(undefined), 100);
              }}>
                <div className="absolute h-full bg-indigo-500 rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                {lesson.questions.map(q => (
                  <div 
                    key={q.id}
                    className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full cursor-pointer hover:scale-125 transition-transform shadow-lg z-10 ${Math.floor(currentTime) === q.timestamp ? 'ring-4 ring-yellow-400/50 scale-125' : ''}`}
                    style={{ left: `${(q.timestamp / duration) * 100}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSeekTarget(q.timestamp);
                      setTimeout(() => setSeekTarget(undefined), 100);
                    }}
                  />
                ))}
              </div>
              
              <div className="flex items-center justify-center gap-8 text-white">
                <button onClick={handlePrev} className="text-2xl hover:text-indigo-400 transition-colors"><i className="fa-solid fa-backward-step"></i></button>
                <button onClick={() => setPlaying(!playing)} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center text-3xl shadow-xl hover:scale-110 active:scale-95 transition-all">
                  <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`}></i>
                </button>
                <button onClick={handleNext} className="text-2xl hover:text-indigo-400 transition-colors"><i className="fa-solid fa-forward-step"></i></button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-10 flex-1 flex flex-col justify-center items-center shadow-xl shadow-slate-200/50 relative border border-slate-100 overflow-hidden">
             <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-black tracking-[0.2em] text-indigo-200 uppercase">当前播放台词</div>
            {currentLine ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
                <LyricLineDisplay 
                  line={currentLine} 
                  onVocabClick={(v) => { setSelectedVocab(v); setPlaying(false); }} 
                />
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <i className="fa-solid fa-microphone text-slate-200 text-2xl"></i>
                </div>
                <p className="text-slate-300 font-bold italic">准备开始学习...</p>
              </div>
            )}
          </div>
        </div>

        <aside className="w-[400px] bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b flex gap-2">
             <button 
              onClick={() => setSidePanel('lyrics')}
              className={`flex-1 py-3 rounded-2xl text-sm font-black transition-all ${sidePanel === 'lyrics' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
             >
               完整剧本
             </button>
             <button 
              onClick={() => setSidePanel('questions')}
              className={`flex-1 py-3 rounded-2xl text-sm font-black transition-all ${sidePanel === 'questions' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
             >
               互动习题 ({lesson.questions.length})
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
            {sidePanel === 'lyrics' ? (
              <div className="space-y-4">
                {lesson.lyrics.map(line => (
                  <div 
                    key={line.id} 
                    id={`lyric-${line.id}`}
                    onClick={() => { setSeekTarget(line.startTime); setTimeout(() => setSeekTarget(undefined), 100); }}
                    className={`p-5 rounded-[1.5rem] cursor-pointer border-2 transition-all ${currentLine?.id === line.id ? 'bg-indigo-50 border-indigo-200 shadow-sm translate-x-1' : 'border-transparent hover:bg-slate-50 text-slate-500'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                       <span className="text-[10px] font-mono bg-white px-2 py-1 rounded-lg text-indigo-400 border border-indigo-100 font-bold">
                         {Math.floor(line.startTime / 60)}:{(Math.floor(line.startTime % 60)).toString().padStart(2, '0')}
                       </span>
                       <p className={`font-black text-lg transition-colors ${currentLine?.id === line.id ? 'text-indigo-900' : 'text-slate-700'}`}>{line.chinese}</p>
                    </div>
                    <p className="text-xs italic leading-relaxed opacity-60 font-medium pl-14">{line.english}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {activeQuestion ? (
                  <div className="bg-yellow-50 p-6 rounded-3xl border border-yellow-100 animate-in zoom-in duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="bg-yellow-400 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">互动问答</div>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-6">{activeQuestion.question}</h3>
                    <div className="space-y-3">
                      {activeQuestion.options.map((opt, i) => (
                        <button 
                          key={i}
                          onClick={() => {
                            if (i === activeQuestion.correctIndex) {
                              alert("正确！继续观看视频吧。");
                              setPlaying(true);
                              setActiveQuestion(null);
                            } else {
                              alert("不太对哦，再想想！");
                            }
                          }}
                          className="w-full text-left px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-400 hover:text-indigo-600 transition-all font-bold text-slate-600 shadow-sm"
                        >
                          <span className="mr-3 text-slate-300 font-black">{String.fromCharCode(65 + i)}.</span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {lesson.questions.map((q, idx) => (
                      <div 
                        key={q.id}
                        onClick={() => { setSeekTarget(q.timestamp); setTimeout(() => setSeekTarget(undefined), 100); }}
                        className="p-5 bg-white border rounded-3xl cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all flex items-center gap-4"
                      >
                         <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-bold">{idx + 1}</div>
                         <div className="flex-1">
                           <p className="font-bold text-slate-700 line-clamp-1">{q.question}</p>
                           <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">视频位置: {q.timestamp}秒</p>
                         </div>
                         <i className="fa-solid fa-chevron-right text-slate-300"></i>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </main>

      {selectedVocab && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6" onClick={() => setSelectedVocab(null)}>
          <div className="bg-white rounded-[3rem] p-12 max-w-lg w-full shadow-2xl relative animate-in zoom-in duration-300 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <i className="fa-solid fa-language text-[12rem]"></i>
            </div>
            <button onClick={() => setSelectedVocab(null)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center">
              <i className="fa-solid fa-times text-xl"></i>
            </button>
            <div className="relative">
              <div className="text-8xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-blue-500 text-center">{selectedVocab.char}</div>
              <div className="text-2xl font-black text-slate-300 mb-10 tracking-[0.2em] text-center uppercase">{selectedVocab.pinyin}</div>
              <div className="space-y-6">
                <div className="h-px bg-slate-100"></div>
                <div>
                   <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-4">词义解释 Definition</h4>
                   <p className="text-3xl text-slate-700 leading-tight font-black">{selectedVocab.explanation}</p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedVocab(null); setPlaying(true); }} 
                className="w-full mt-12 bg-indigo-600 hover:bg-indigo-700 py-5 rounded-[1.5rem] text-white font-black text-lg shadow-xl shadow-indigo-100 transition-all hover:-translate-y-1 active:scale-95"
              >
                学习完毕 继续视频
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomView;