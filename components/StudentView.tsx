
import React, { useState, useEffect, useRef } from 'react';
import YouTubePlayer from './YouTubePlayer';
import LyricLineDisplay from './LyricLineDisplay';
import { LessonData, LyricLine, Vocab } from '../types';

interface Props {
  studentId: string;
}

const StudentView: React.FC<Props> = ({ studentId }) => {
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [hwLines, setHwLines] = useState<LyricLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // App state
  const [appMode, setAppMode] = useState<'learning' | 'finalChallenge' | 'completed'>('learning');
  const [step, setStep] = useState(0); 
  const [subStep, setSubStep] = useState<'watch' | 'reorder' | 'feedback'>('watch');
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentGuess, setCurrentGuess] = useState<string[]>([]);
  const [shuffledChars, setShuffledChars] = useState<string[]>([]);

  // Cloze game state
  const [clozeResults, setClozeResults] = useState<{[key: string]: { correct: boolean, choice: string } }>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let data: LessonData;
        try {
          const res = await fetch(`./data/${studentId}_homework.json`);
          if (!res.ok) throw new Error();
          data = await res.json();
        } catch {
          const local = localStorage.getItem('currentLesson');
          if (!local) throw new Error("无法加载作业数据，请联系老师。");
          data = JSON.parse(local);
        }
        setLesson(data);
        const homeworkLines = data.lyrics.filter(l => l.isHomework);
        setHwLines(homeworkLines.length > 0 ? homeworkLines : data.lyrics);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId]);

  useEffect(() => {
    if (hwLines[step] && appMode === 'learning') {
      const chars = Array.from(hwLines[step].chinese.replace(/\s/g, ''));
      setShuffledChars([...chars].sort(() => Math.random() - 0.5));
      setCurrentGuess([]);
    }
  }, [step, hwLines, appMode]);

  // Real-time scroll for final challenge
  useEffect(() => {
    if (appMode === 'finalChallenge' && scrollContainerRef.current) {
      const activeLine = hwLines.find(l => currentTime >= l.startTime && currentTime <= l.endTime);
      if (activeLine) {
        const el = document.getElementById(`cloze-${activeLine.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentTime, appMode, hwLines]);

  if (loading) return <div className="p-20 text-center"><div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="font-black text-indigo-600 text-xl">正在同步你的专属练习...</p></div>;
  if (error || !lesson) return (
    <div className="p-20 text-center">
      <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-4 border-red-50 max-w-lg mx-auto">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-500 mb-6"></i>
        <h2 className="text-2xl font-black text-slate-800 mb-2">作业不可用</h2>
        <p className="text-slate-500 mb-8">{error}</p>
        <button onClick={() => window.location.hash = ''} className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-bold">返回首页</button>
      </div>
    </div>
  );

  const currentLine = hwLines[step];

  const handleReorderSubmit = () => {
    const target = currentLine.chinese.replace(/\s/g, '');
    const guess = currentGuess.join('');
    if (guess === target) {
      setScore(s => s + 100);
      setSubStep('feedback');
    } else {
      alert("顺序不正确，再尝试一下！");
      setCurrentGuess([]);
    }
  };

  const handleNextStep = () => {
    if (step < hwLines.length - 1) {
      setStep(s => s + 1);
      setSubStep('watch');
    } else {
      setAppMode('finalChallenge');
      setPlaying(true);
    }
  };

  const handleClozeChoice = (lineId: string, vocab: Vocab, choice: string) => {
    const isCorrect = choice === vocab.char;
    setClozeResults(prev => ({
      ...prev,
      [`${lineId}-${vocab.char}`]: { correct: isCorrect, choice }
    }));
    if (isCorrect) setScore(s => s + 50);
  };

  const submitHomework = () => {
    setAppMode('completed');
  };

  if (appMode === 'completed') {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6">
        <div className="bg-white p-16 rounded-[4rem] shadow-2xl text-center max-w-2xl w-full animate-in zoom-in duration-500">
           <div className="w-32 h-32 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-10 text-6xl shadow-inner"><i className="fa-solid fa-award"></i></div>
           <h1 className="text-5xl font-black text-slate-800 mb-4">太棒了！</h1>
           <p className="text-2xl font-bold text-slate-400 mb-10">你已成功提交作业</p>
           <div className="bg-slate-50 rounded-[3rem] p-10 inline-block mb-12 border-4 border-white shadow-xl">
              <span className="text-xs font-black text-indigo-300 uppercase tracking-widest block mb-4">FINAL PERFORMANCE SCORE</span>
              <span className="text-8xl font-black text-indigo-600">{score}</span>
           </div>
           <div><button onClick={() => window.location.hash = ''} className="text-slate-300 font-black hover:text-indigo-600 hover:underline">返回首页</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 min-h-screen flex flex-col font-sans p-6 md:p-12 overflow-hidden">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col gap-8">
        
        <header className="flex justify-between items-center bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-white shadow-sm">
          <div className="flex items-center gap-6">
             <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 rotate-3">
               <i className="fa-solid fa-puzzle-piece text-3xl"></i>
             </div>
             <div>
               <h1 className="text-2xl font-black text-slate-800 tracking-tight">{lesson.title}</h1>
               <div className="flex items-center gap-3 mt-1">
                  <div className="h-2.5 w-40 bg-white rounded-full overflow-hidden shadow-inner border border-amber-100">
                     <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-700" style={{ width: `${appMode === 'finalChallenge' ? 100 : ((step + 1) / hwLines.length) * 100}%` }}></div>
                  </div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                    {appMode === 'learning' ? `正在挑战第 ${step+1} 句` : '终极字幕挑战'}
                  </span>
               </div>
             </div>
          </div>
          <div className="bg-white px-10 py-4 rounded-[2rem] shadow-xl border-2 border-amber-200 flex flex-col items-center">
             <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-1">SCORE</span>
             <span className="text-3xl font-black text-slate-800 leading-none">{score}</span>
          </div>
        </header>

        {appMode === 'learning' ? (
          <div className="flex-1 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom duration-500">
            <div className="bg-white rounded-[4rem] p-12 shadow-2xl shadow-amber-200/40 border border-white flex flex-col gap-10">
              <div className="max-w-2xl mx-auto w-full rounded-[2.5rem] overflow-hidden border-8 border-slate-50 shadow-2xl">
                <YouTubePlayer url={lesson.videoUrl} playing={playing} playbackRate={1} onProgress={() => {}} />
              </div>
              <div className="py-8 border-y border-slate-50">
                <LyricLineDisplay line={currentLine} />
              </div>
              {subStep === 'watch' && (
                <div className="flex justify-center pt-2">
                  <button 
                    onClick={() => { setSubStep('reorder'); setPlaying(false); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-16 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-4 group"
                  >
                    <i className="fa-solid fa-wand-magic group-hover:rotate-12 transition-transform"></i>
                    我学会了，挑战！
                  </button>
                </div>
              )}
            </div>

            {subStep === 'reorder' && (
              <div className="bg-white rounded-[4rem] p-12 shadow-2xl border border-white animate-in zoom-in duration-500">
                <h3 className="text-center font-black text-slate-300 uppercase tracking-[0.4em] mb-12 text-sm">点击文字按顺序排列句子</h3>
                
                <div className="flex flex-wrap justify-center gap-4 min-h-[140px] p-10 bg-indigo-50/30 rounded-[3rem] border-4 border-dashed border-indigo-100 mb-12 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-5 pointer-events-none flex flex-wrap justify-around items-center text-8xl font-black">
                     <span>A</span><span>B</span><span>C</span>
                  </div>
                  {currentGuess.map((char, i) => (
                    <button 
                      key={i} 
                      onClick={() => setCurrentGuess(currentGuess.filter((_, idx) => idx !== i))}
                      className="w-20 h-20 bg-indigo-600 text-white text-5xl font-black rounded-[1.5rem] shadow-xl flex items-center justify-center animate-in zoom-in duration-200 hover:bg-red-500"
                    >
                      {char}
                    </button>
                  ))}
                  {currentGuess.length === 0 && <p className="text-indigo-200 font-black self-center italic text-xl">从下方选择文字...</p>}
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                  {shuffledChars.map((char, i) => {
                    const countInTarget = shuffledChars.filter(x => x === char).length;
                    const countInGuess = currentGuess.filter(x => x === char).length;
                    const available = countInTarget > countInGuess;
                    
                    return (
                      <button 
                        key={i}
                        disabled={!available}
                        onClick={() => setCurrentGuess([...currentGuess, char])}
                        className={`w-20 h-20 text-5xl font-black rounded-[1.5rem] transition-all active:scale-90 shadow-md ${available ? 'bg-white border-2 border-slate-100 text-slate-800 hover:border-indigo-400 hover:text-indigo-600 hover:-translate-y-1' : 'bg-slate-50 text-slate-200 cursor-not-allowed opacity-20'}`}
                      >
                        {char}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-16 flex justify-center">
                   <button 
                    onClick={handleReorderSubmit}
                    disabled={currentGuess.length !== currentLine.chinese.replace(/\s/g, '').length}
                    className={`px-20 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl transition-all ${currentGuess.length === currentLine.chinese.replace(/\s/g, '').length ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 hover:-translate-y-1' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                   >
                     提交此句答案
                   </button>
                </div>
              </div>
            )}

            {subStep === 'feedback' && (
              <div className="fixed inset-0 bg-indigo-600/98 z-50 flex items-center justify-center p-6 backdrop-blur-md">
                <div className="text-center animate-in zoom-in duration-500">
                  <div className="w-48 h-48 bg-white/10 text-white rounded-[4rem] flex items-center justify-center mx-auto mb-10 text-9xl animate-bounce shadow-inner border border-white/20"><i className="fa-solid fa-crown text-amber-300"></i></div>
                  <h2 className="text-7xl font-black text-white mb-6 tracking-tight">完美！正确！</h2>
                  <p className="text-2xl font-bold text-indigo-100 mb-16 opacity-80">恭喜获得 100 积分大礼包！</p>
                  <button 
                    onClick={handleNextStep}
                    className="bg-white text-indigo-600 px-24 py-8 rounded-[3rem] font-black text-3xl shadow-2xl transition-all hover:scale-110 active:scale-95 hover:shadow-white/20"
                  >
                    {step < hwLines.length - 1 ? '继续挑战' : '开始终极关卡'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-8 animate-in fade-in duration-1000 overflow-hidden">
             <div className="bg-white rounded-[4rem] p-12 shadow-2xl border border-white flex flex-col h-full overflow-hidden">
                <div className="max-w-2xl mx-auto mb-10 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-100 shrink-0">
                   <YouTubePlayer url={lesson.videoUrl} playing={playing} playbackRate={1} onProgress={(s) => setCurrentTime(s.playedSeconds)} />
                </div>
                
                <div className="flex-1 overflow-y-auto px-6 space-y-12 scroll-smooth" ref={scrollContainerRef}>
                  <div className="h-40"></div> {/* Top Spacer */}
                  {hwLines.map((line) => {
                    const isActive = currentTime >= line.startTime && currentTime <= line.endTime;
                    return (
                      <div 
                        key={line.id} 
                        id={`cloze-${line.id}`}
                        className={`p-10 rounded-[3rem] transition-all duration-500 border-4 ${isActive ? 'bg-indigo-600 scale-105 shadow-2xl border-indigo-300' : 'bg-slate-50 opacity-40 grayscale border-transparent'}`}
                      >
                         <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-6">
                            {Array.from(line.chinese).map((char, cIdx) => {
                               const targetVocab = line.vocabs.find(v => v.char.includes(char));
                               if (targetVocab && targetVocab.char[0] === char) {
                                 const result = clozeResults[`${line.id}-${targetVocab.char}`];
                                 if (!result) {
                                   const pool = lesson.lyrics.flatMap(l => l.vocabs).filter(v => v.char !== targetVocab.char);
                                   const distractor = pool.length > 0 ? pool[Math.floor(Math.random()*pool.length)].char : '老师';
                                   const options = [targetVocab.char, distractor].sort(() => Math.random() - 0.5);
                                   return (
                                     <div key={cIdx} className="flex gap-2 bg-white/20 p-2 rounded-3xl animate-pulse">
                                        {options.map(opt => (
                                          <button 
                                            key={opt}
                                            onClick={() => handleClozeChoice(line.id, targetVocab, opt)}
                                            className="bg-white px-5 py-3 rounded-2xl text-indigo-600 font-black hover:bg-amber-400 hover:text-white transition-all text-xl shadow-md"
                                          >
                                            {opt}
                                          </button>
                                        ))}
                                     </div>
                                   );
                                 }
                                 return (
                                   <span key={cIdx} className={`text-5xl font-black px-4 py-2 rounded-2xl shadow-inner ${result.correct ? 'text-blue-300 bg-white/10' : 'text-red-400 bg-white/10 underline decoration-red-500 decoration-4 underline-offset-8'}`}>
                                     {targetVocab.char}
                                   </span>
                                 );
                               }
                               const isPartProcessed = line.vocabs.some(v => v.char.length > 1 && v.char.includes(char) && v.char[0] !== char);
                               if (isPartProcessed) return null;
                               return <span key={cIdx} className={`text-5xl font-black ${isActive ? 'text-white' : 'text-slate-800'}`}>{char}</span>;
                            })}
                         </div>
                         <p className={`text-center mt-6 italic font-bold text-xl ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>{line.english}</p>
                      </div>
                    );
                  })}
                  <div className="h-60"></div> {/* Bottom Spacer */}
                </div>

                <div className="mt-10 shrink-0 flex justify-center border-t border-slate-50 pt-10">
                   <button 
                    onClick={submitHomework}
                    className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-24 py-7 rounded-[3rem] font-black text-3xl shadow-2xl hover:scale-105 transition-all active:scale-95 flex items-center gap-4"
                   >
                     <i className="fa-solid fa-check-double"></i>
                     完成全部关卡并提交
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentView;
