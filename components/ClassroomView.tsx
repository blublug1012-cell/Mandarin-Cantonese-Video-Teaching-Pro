import React, { useState, useEffect, useRef } from 'react';
import YouTubePlayer from './YouTubePlayer';
import LyricLineDisplay from './LyricLineDisplay';
import { LessonData, LyricLine, Vocab, Question } from '../types';

interface Props {
  lesson: LessonData | null;
}

const ClassroomView: React.FC<Props> = ({ lesson: initialLesson }) => {
  const [lesson, setLesson] = useState<LessonData | null>(() => {
    if (initialLesson) return initialLesson;
    const saved = localStorage.getItem('activeLesson');
    return saved ? JSON.parse(saved) : null;
  });

  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentLine, setCurrentLine] = useState<LyricLine | null>(null);
  const [selectedVocab, setSelectedVocab] = useState<Vocab | null>(null);
  const [seekTarget, setSeekTarget] = useState<number | undefined>(undefined);
  const [sidePanel, setSidePanel] = useState<'lyrics' | 'questions'>('lyrics');
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  
  // 显示控制开关
  const [showPinyin, setShowPinyin] = useState(true);
  const [showEnglish, setShowEnglish] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lesson || !lesson.lyrics) return;
    const lyrics = lesson.lyrics;
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
  }, [currentTime, lesson, currentLine?.id, activeQuestion?.id]);

  if (!lesson) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col h-screen overflow-hidden font-sans no-print">
      {/* 打印专用区域 */}
      <div className="print-section fixed inset-0 bg-white z-[999] p-10 hidden print:block overflow-visible">
        <h1 className="text-3xl font-black mb-10 text-center border-b pb-4">{lesson.title} - 课堂讲义</h1>
        <div className="space-y-12">
          {lesson.lyrics.map((l, i) => (
            <div key={l.id} className="lyric-item flex flex-col gap-2">
              <div className="flex flex-wrap gap-x-6 gap-y-4">
                {[...l.chinese].map((char, ci) => (
                  <div key={ci} className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">{l.pinyin.split(' ')[ci] || ''}</span>
                    <span className="text-3xl font-bold">{char}</span>
                  </div>
                ))}
              </div>
              {l.english && <p className="text-slate-500 italic text-sm mt-2 border-l-4 border-slate-200 pl-4">"{l.english}"</p>}
            </div>
          ))}
        </div>
      </div>

      <header className="bg-white border-b px-8 py-3 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center gap-6">
          <button onClick={() => window.location.hash = '#/teacher'} className="w-10 h-10 bg-slate-100 border rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="hidden sm:block">
            <h2 className="font-black text-slate-800 text-lg">{lesson.title}</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest bg-indigo-100 text-indigo-600">上课模式</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={handlePrint} className="w-10 h-10 md:w-auto md:px-4 md:py-2 bg-white border-2 border-slate-100 text-slate-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all" title="打印讲义">
            <i className="fa-solid fa-file-pdf"></i> <span className="hidden md:inline text-sm">打印</span>
          </button>
          <div className="flex bg-slate-100 p-1 rounded-xl border">
            <button onClick={() => setShowPinyin(!showPinyin)} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${showPinyin ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>拼</button>
            <button onClick={() => setShowEnglish(!showEnglish)} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${showEnglish ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>英</button>
          </div>
          <div className="h-6 w-[1px] bg-slate-200 hidden md:block"></div>
          <div className="hidden lg:flex bg-slate-100 p-1 rounded-xl border">
            {[0.75, 1, 1.25].map(rate => (
              <button key={rate} onClick={() => setPlaybackRate(rate)} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${playbackRate === rate ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{rate}x</button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6 flex-col lg:flex-row">
        <div className="flex-[2] flex flex-col gap-6 overflow-hidden">
          <div className="bg-black rounded-[3rem] overflow-hidden shadow-2xl relative aspect-video group border-4 border-white">
            <YouTubePlayer 
              url={lesson.videoUrl} playing={playing} playbackRate={playbackRate} 
              onProgress={(s) => setCurrentTime(s.playedSeconds)}
              seekTo={seekTarget}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <button onClick={() => setPlaying(!playing)} className="w-24 h-24 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center text-4xl shadow-2xl border-4 border-white/30 pointer-events-auto hover:scale-110 transition-all">
                  <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`}></i>
                </button>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] p-4 flex-1 flex flex-col justify-center items-center shadow-xl border border-slate-100 overflow-y-auto relative min-h-0">
            {currentLine ? (
              <LyricLineDisplay 
                line={currentLine} 
                showPinyin={showPinyin} 
                showEnglish={showEnglish} 
                onVocabClick={(v) => { setSelectedVocab(v); setPlaying(false); }} 
              />
            ) : (
              <p className="text-slate-200 font-black text-2xl italic">准备播放视频...</p>
            )}
          </div>
        </div>

        <aside className="lg:w-[420px] bg-white rounded-[3rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden min-h-0">
          <div className="p-6 border-b flex gap-3">
             <button onClick={() => setSidePanel('lyrics')} className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${sidePanel === 'lyrics' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>剧本</button>
             <button onClick={() => setSidePanel('questions')} className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${sidePanel === 'questions' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>练习</button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 scroll-smooth" ref={scrollRef}>
            {sidePanel === 'lyrics' ? (
              <div className="space-y-4">
                {(lesson.lyrics || []).map(line => (
                  <div key={line.id} id={`lyric-${line.id}`} onClick={() => { setSeekTarget(line.startTime); setPlaying(true); }} className={`p-6 rounded-[2rem] cursor-pointer border-2 transition-all ${currentLine?.id === line.id ? 'bg-indigo-50 border-indigo-200 shadow-md translate-x-2' : 'border-transparent hover:bg-slate-50'}`}>
                    <p className={`font-black text-xl ${currentLine?.id === line.id ? 'text-indigo-900' : 'text-slate-700'}`}>{line.chinese}</p>
                    {showPinyin && <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter mt-1">{line.pinyin}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {activeQuestion ? (
                  <div className="bg-yellow-50 p-8 rounded-[2.5rem] border border-yellow-100 animate-in zoom-in duration-300">
                    <h3 className="text-xl font-black text-slate-800 mb-8">{activeQuestion.question}</h3>
                    <div className="space-y-3">
                      {activeQuestion.options.map((opt, i) => (
                        <button key={i} onClick={() => { if (i === activeQuestion.correctIndex) { setPlaying(true); setActiveQuestion(null); } }} className="w-full text-left px-6 py-5 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-400 font-bold transition-all shadow-sm">
                          <span className="text-indigo-600 font-black mr-4">{String.fromCharCode(65 + i)}</span> {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-200">
                     <i className="fa-solid fa-bolt text-7xl mb-6 opacity-20"></i>
                     <p className="font-black">等待触发互动习题...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </main>

      {selectedVocab && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6" onClick={() => setSelectedVocab(null)}>
          <div className="bg-white rounded-[4rem] p-12 max-w-lg w-full shadow-2xl relative animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-9xl font-black mb-4 text-indigo-600 tracking-tighter">{selectedVocab.char}</div>
              <div className="text-2xl font-black text-slate-300 mb-10 uppercase tracking-widest">{selectedVocab.pinyin}</div>
              <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100">
                <p className="text-3xl text-indigo-900 font-black">{selectedVocab.explanation}</p>
              </div>
              <button onClick={() => { setSelectedVocab(null); setPlaying(true); }} className="w-full mt-12 bg-indigo-600 py-6 rounded-3xl text-white font-black text-xl shadow-xl hover:bg-indigo-700 transition-all">关闭窗口</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomView;