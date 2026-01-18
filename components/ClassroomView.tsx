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
  const [duration, setDuration] = useState(0);
  const [currentLine, setCurrentLine] = useState<LyricLine | null>(null);
  const [selectedVocab, setSelectedVocab] = useState<Vocab | null>(null);
  const [seekTarget, setSeekTarget] = useState<number | undefined>(undefined);
  const [sidePanel, setSidePanel] = useState<'lyrics' | 'questions'>('lyrics');
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);

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

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white p-12 rounded-[3rem] shadow-xl text-center">
           <i className="fa-solid fa-spinner fa-spin text-indigo-600 text-5xl mb-6"></i>
           <h2 className="text-2xl font-black">正在载入课程...</h2>
           <button onClick={() => window.location.hash = '#/teacher'} className="mt-8 text-indigo-600 font-bold">返回编辑台</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col h-screen overflow-hidden font-sans no-print">
      <header className="bg-white border-b px-8 py-3 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center gap-6">
          <button onClick={() => window.location.hash = '#/teacher'} className="w-10 h-10 bg-slate-100 border rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{lesson.title}</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest bg-indigo-100 text-indigo-600">上课模式</span>
            </div>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border">
          {[0.5, 0.75, 1, 1.25, 1.5].map(rate => (
            <button key={rate} onClick={() => setPlaybackRate(rate)} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${playbackRate === rate ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{rate}x</button>
          ))}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        <div className="flex-[2] flex flex-col gap-6 overflow-hidden">
          {/* 视频区域 */}
          <div className="bg-black rounded-[2.5rem] overflow-hidden shadow-2xl relative aspect-video group">
            <YouTubePlayer 
              url={lesson.videoUrl} playing={playing} playbackRate={playbackRate} 
              onProgress={(s) => setCurrentTime(s.playedSeconds)}
              onDuration={(d) => setDuration(d)}
              seekTo={seekTarget}
            />
            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 to-transparent pt-16 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center items-center">
                <button onClick={() => setPlaying(!playing)} className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center text-3xl shadow-2xl hover:scale-110 active:scale-95 transition-all">
                  <i className={`fa-solid ${playing ? 'fa-pause pl-0' : 'fa-play pl-1'}`}></i>
                </button>
            </div>
          </div>

          {/* 文本显示区域 - 优化此处避免显示不全 */}
          <div className="bg-white rounded-[3rem] p-8 flex-1 flex flex-col justify-center items-center shadow-xl border border-slate-100 overflow-y-auto relative min-h-0">
            <div className="absolute top-4 text-[9px] font-black tracking-[0.2em] text-indigo-200 uppercase">Current Segment</div>
            {currentLine ? (
              <LyricLineDisplay line={currentLine} onVocabClick={(v) => { setSelectedVocab(v); setPlaying(false); }} />
            ) : (
              <div className="flex flex-col items-center gap-4 animate-pulse">
                <i className="fa-solid fa-compact-disc text-slate-100 text-6xl"></i>
                <p className="text-slate-200 font-black italic">Ready to play...</p>
              </div>
            )}
          </div>
        </div>

        <aside className="w-[420px] bg-white rounded-[3rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b flex gap-3">
             <button onClick={() => setSidePanel('lyrics')} className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${sidePanel === 'lyrics' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>剧本</button>
             <button onClick={() => setSidePanel('questions')} className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${sidePanel === 'questions' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>互动习题</button>
          </div>
          <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
            {sidePanel === 'lyrics' ? (
              <div className="space-y-4">
                {(lesson.lyrics || []).map(line => (
                  <div key={line.id} id={`lyric-${line.id}`} onClick={() => { setSeekTarget(line.startTime); setPlaying(true); }} className={`p-6 rounded-[2rem] cursor-pointer border-2 transition-all hover:-translate-y-1 ${currentLine?.id === line.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}>
                    <p className={`font-black text-xl mb-1 ${currentLine?.id === line.id ? 'text-indigo-900' : 'text-slate-700'}`}>{line.chinese}</p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">{line.pinyin}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {activeQuestion ? (
                  <div className="bg-yellow-50 p-8 rounded-[2.5rem] border border-yellow-100 animate-in fade-in zoom-in duration-300">
                    <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-white mb-6 shadow-md"><i className="fa-solid fa-question"></i></div>
                    <h3 className="text-xl font-black text-slate-800 mb-8">{activeQuestion.question}</h3>
                    <div className="space-y-3">
                      {activeQuestion.options.map((opt, i) => (
                        <button key={i} onClick={() => { if (i === activeQuestion.correctIndex) { setPlaying(true); setActiveQuestion(null); } else { alert("不对哦，再试一次！"); } }} className="w-full text-left px-6 py-5 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-400 font-bold transition-all shadow-sm">
                          <span className="text-indigo-600 font-black mr-4">{String.fromCharCode(65 + i)}</span> {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20">
                     <i className="fa-solid fa-bolt text-slate-100 text-7xl mb-6"></i>
                     <p className="text-slate-300 font-bold px-10">互动习题将在视频播放到老师设定的时间点时自动弹出</p>
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
            <button onClick={() => setSelectedVocab(null)} className="absolute top-10 right-10 text-slate-300 hover:text-red-500"><i className="fa-solid fa-times text-2xl"></i></button>
            <div className="text-center">
              <div className="text-9xl font-black mb-4 text-indigo-600 tracking-tighter">{selectedVocab.char}</div>
              <div className="text-2xl font-black text-slate-300 mb-10 uppercase tracking-widest">{selectedVocab.pinyin}</div>
              <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100">
                <p className="text-3xl text-indigo-900 font-black">{selectedVocab.explanation}</p>
              </div>
              <button onClick={() => { setSelectedVocab(null); setPlaying(true); }} className="w-full mt-12 bg-indigo-600 py-6 rounded-3xl text-white font-black text-xl shadow-xl hover:bg-indigo-700 transition-all">继续播放</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomView;