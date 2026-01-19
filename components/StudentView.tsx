import React, { useState, useEffect, useRef } from 'react';
import YouTubePlayer from './YouTubePlayer';
import LyricLineDisplay from './LyricLineDisplay';
import { LessonData, Database, Student, LyricLine, Vocab } from '../types';

interface Props {
  studentId: string;
}

const StudentView: React.FC<Props> = ({ studentId }) => {
  const getCloudUrlFromParams = () => {
    const hash = window.location.hash;
    if (hash.includes('?')) {
      const params = new URLSearchParams(hash.split('?')[1]);
      const cloudParam = params.get('c');
      if (cloudParam) {
        try { return atob(decodeURIComponent(cloudParam)); } catch (e) { return null; }
      }
    }
    return localStorage.getItem('teacher_cloud_url') || '';
  };

  const [db, setDb] = useState<Database>(() => {
    const saved = localStorage.getItem('teaching_db');
    return saved ? JSON.parse(saved) : { lessons: {}, students: [] };
  });
  
  const [student, setStudent] = useState<Student | null>(null);
  const [activeLesson, setActiveLesson] = useState<LessonData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloudBaseUrl, setCloudBaseUrl] = useState(getCloudUrlFromParams());
  const [selectedVocab, setSelectedVocab] = useState<Vocab | null>(null);

  const [gameState, setGameState] = useState<'learning' | 'ordering' | 'finalChallenge' | 'completed'>('learning');
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [shuffledUnits, setShuffledUnits] = useState<string[]>([]);
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [finalGaps, setFinalGaps] = useState<{lineId: string, targetUnit: string, options: string[], userChoice: string | null}[]>([]);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | undefined>(undefined);
  const [videoPlaying, setVideoPlaying] = useState(true);

  const finalContainerRef = useRef<HTMLDivElement>(null);

  const fetchCloudData = async () => {
    if (!cloudBaseUrl) { setError("同步配置缺失。"); return; }
    setIsSyncing(true);
    const baseUrl = cloudBaseUrl.endsWith('/') ? cloudBaseUrl : cloudBaseUrl + '/';
    try {
      const response = await fetch(`${baseUrl}${studentId}.json`, { cache: 'no-store' });
      if (!response.ok) throw new Error("Fetch failed");
      const imported = await response.json();
      const newDb = { lessons: {...db.lessons, ...imported.lessons}, students: imported.students };
      setDb(newDb);
      localStorage.setItem('teaching_db', JSON.stringify(newDb));
      const foundStudent = imported.students.find((s: any) => s.id === studentId);
      if (foundStudent) setStudent(foundStudent);
    } catch (err) { setError("同步失败，请联系老师。"); } finally { setIsSyncing(false); }
  };

  useEffect(() => { if (!student) fetchCloudData(); }, [studentId, cloudBaseUrl]);

  const homeworkLines = activeLesson?.lyrics.filter(l => l.isHomework) || [];
  const currentLine = homeworkLines[currentLineIdx];

  // 严格控制视频播放范围：单句循环，增加 0.3s 的缓冲余量防止频繁跳转导致的播放器错误
  useEffect(() => {
    if (gameState !== 'completed' && currentLine && videoPlaying) {
      if (currentTime > currentLine.endTime + 0.3 || currentTime < currentLine.startTime - 0.3) {
        setSeekTarget(currentLine.startTime);
      }
    }
  }, [currentTime, currentLine, gameState, videoPlaying]);

  const getSmartUnits = (text: string, vocabs: Vocab[]) => {
    let raw = text.replace(/\s+/g, '');
    let units: string[] = [];
    let i = 0;
    while (i < raw.length) {
      let matched = false;
      const sortedVocabs = [...(vocabs || [])].sort((a,b) => b.char.length - a.char.length);
      for (let v of sortedVocabs) {
        if (raw.substring(i, i + v.char.length) === v.char) {
          units.push(v.char);
          i += v.char.length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        units.push(raw[i]);
        i++;
      }
    }
    return units;
  };

  const startOrderingGame = (line: LyricLine) => {
    const units = getSmartUnits(line.chinese, line.vocabs);
    setShuffledUnits([...units].sort(() => Math.random() - 0.5));
    setUserOrder([]);
    setGameState('ordering');
    setFeedback(null);
    setSeekTarget(line.startTime);
    setVideoPlaying(true);
  };

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const newOrder = [...userOrder];
    const draggedItem = newOrder[draggedIdx];
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedItem);
    setUserOrder(newOrder);
    setDraggedIdx(targetIdx);
  };

  const checkOrder = (line: LyricLine) => {
    const original = line.chinese.replace(/\s+/g, '');
    if (userOrder.join('') === original) {
      setFeedback({ msg: '完美排列！🎉', type: 'success' });
      setScore(s => s + 10);
      setTimeout(() => {
        const nextIdx = currentLineIdx + 1;
        if (nextIdx < homeworkLines.length) {
          setCurrentLineIdx(nextIdx);
          setGameState('learning');
          setSeekTarget(homeworkLines[nextIdx].startTime);
        } else { setupFinalChallenge(); }
      }, 1500);
    } else {
      setFeedback({ msg: `再试一次吧，语序好像不对哦`, type: 'error' });
    }
  };

  const setupFinalChallenge = () => {
    const gaps: typeof finalGaps = [];
    const distractors = ['的', '了', '不', '是', '有', '在', '我', '你', '好'];
    homeworkLines.forEach(l => {
      const units = getSmartUnits(l.chinese, l.vocabs);
      const targetUnit = units[Math.floor(Math.random() * units.length)];
      gaps.push({
        lineId: l.id,
        targetUnit: targetUnit,
        options: [targetUnit, distractors[Math.floor(Math.random()*distractors.length)]].sort(() => Math.random() - 0.5),
        userChoice: null
      });
    });
    setFinalGaps(gaps);
    setGameState('finalChallenge');
    setSeekTarget(homeworkLines[0].startTime);
    setVideoPlaying(true);
  };

  const handleFinalChoice = (index: number, choice: string) => {
    const newGaps = [...finalGaps];
    if(newGaps[index].userChoice) return;
    newGaps[index].userChoice = choice;
    setFinalGaps(newGaps);
    if (choice === newGaps[index].targetUnit) setScore(s => s + 20);
  };

  if (isSyncing) return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-600 text-white font-black text-2xl animate-pulse">
      正在同步你的专属作业...
    </div>
  );

  if (!activeLesson) {
    return (
      <div className="min-h-screen bg-slate-50 p-12 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <h1 className="text-4xl font-black mb-12 text-slate-800">你好, {student?.name || '语言达人'}! 👋</h1>
          <div className="grid gap-6">
            {student?.assignedLessons.map(id => (
              <div key={id} onClick={() => { setActiveLesson(db.lessons[id]); setGameState('learning'); setSeekTarget(db.lessons[id]?.lyrics.filter(l => l.isHomework)[0]?.startTime); }} className="bg-white p-10 rounded-[3rem] shadow-xl hover:shadow-2xl border-4 border-transparent hover:border-indigo-400 cursor-pointer transition-all flex justify-between items-center group">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{db.lessons[id]?.title || '精彩课程'}</h3>
                  <p className="text-indigo-400 font-bold mt-2 uppercase text-xs tracking-widest">点击开始复习挑战</p>
                </div>
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                   <i className="fa-solid fa-play text-2xl"></i>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-600 font-sans text-white overflow-hidden flex flex-col">
      <header className="p-8 flex justify-between items-center z-10">
         <button onClick={() => setActiveLesson(null)} className="bg-white/20 backdrop-blur-md px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-white/30 transition-all"><i className="fa-solid fa-chevron-left"></i> 返回</button>
         <div className="bg-yellow-400 text-black px-10 py-3 rounded-2xl shadow-xl flex items-center gap-6">
           <span className="font-black text-xs uppercase opacity-60">Score</span>
           <span className="text-4xl font-black leading-none">{score}</span>
         </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex flex-col items-center">
        {(gameState === 'learning' || gameState === 'ordering') && currentLine && (
          <div className="w-full max-w-5xl px-8 flex flex-col gap-10 h-full overflow-y-auto pb-20 scrollbar-hide">
            <div className="bg-black rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white/20 aspect-video w-full max-w-3xl mx-auto shrink-0 relative group">
              <YouTubePlayer 
                url={activeLesson.videoUrl} 
                playing={videoPlaying} 
                playbackRate={1} 
                onProgress={(s) => setCurrentTime(s.playedSeconds)} 
                seekTo={seekTarget} 
              />
              <div className="absolute top-6 left-6 bg-red-500 px-4 py-1.5 rounded-full font-black text-[10px] uppercase flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div> 视听锁定中
              </div>
            </div>

            <div className="bg-white text-slate-800 p-12 rounded-[4rem] shadow-2xl relative mb-12">
              {gameState === 'learning' ? (
                <>
                  <div className="absolute top-[-1.5rem] left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-12 py-4 rounded-full font-black text-sm uppercase shadow-lg tracking-widest">第一步：视听精读</div>
                  <LyricLineDisplay line={currentLine} onVocabClick={(v) => { setSelectedVocab(v); setVideoPlaying(false); }} />
                  <button onClick={() => startOrderingGame(currentLine)} className="w-full mt-12 bg-indigo-600 text-white py-8 rounded-[2.5rem] font-black text-3xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">学完了，开始句序挑战！</button>
                </>
              ) : (
                <div className="space-y-10">
                  <div className="text-center"><h2 className="text-4xl font-black mb-2">智能语序还原</h2><p className="text-slate-400 font-bold">听视频，点击下方方块或长按拖拽重排</p></div>
                  <div className="bg-slate-50 border-4 border-dashed border-slate-100 p-8 rounded-[3rem] min-h-[160px] flex flex-wrap justify-center items-center gap-4 transition-all">
                    {userOrder.map((unit, i) => (
                      <button 
                        key={i} 
                        draggable
                        onDragStart={() => handleDragStart(i)}
                        onDragOver={(e) => handleDragOver(e, i)}
                        onDragEnd={() => setDraggedIdx(null)}
                        onClick={() => { setUserOrder(userOrder.filter((_, idx) => idx !== i)); setShuffledUnits([...shuffledUnits, unit]); }} 
                        className={`px-8 py-5 bg-indigo-600 text-white rounded-3xl text-3xl font-black shadow-lg cursor-move transition-transform ${draggedIdx === i ? 'opacity-30 scale-90' : 'hover:scale-105'}`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 py-6">
                    {shuffledUnits.map((unit, i) => (
                      <button key={i} onClick={() => { setUserOrder([...userOrder, unit]); setShuffledUnits(shuffledUnits.filter((_, idx) => idx !== i)); }} className="px-6 py-4 bg-white text-slate-800 rounded-[1.5rem] text-2xl font-black border-2 border-slate-100 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all">{unit}</button>
                    ))}
                  </div>
                  {feedback && <div className={`p-8 rounded-[2rem] text-center text-2xl font-black animate-in slide-in-from-top-4 duration-300 ${feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>{feedback.msg}</div>}
                  <div className="flex gap-4">
                    <button onClick={() => { setUserOrder([]); setShuffledUnits([...getSmartUnits(currentLine.chinese, currentLine.vocabs)].sort(() => Math.random() - 0.5)); }} className="w-24 h-20 bg-slate-100 text-slate-400 rounded-[1.5rem] flex items-center justify-center text-2xl"><i className="fa-solid fa-rotate-right"></i></button>
                    <button onClick={() => checkOrder(currentLine)} disabled={shuffledUnits.length > 0} className="flex-1 py-7 bg-yellow-400 text-black rounded-[2.5rem] font-black text-3xl shadow-xl disabled:opacity-30 disabled:grayscale transition-all">提交判断</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {gameState === 'finalChallenge' && (
          <div className="w-full h-full flex flex-col items-center">
             <div className="w-full bg-indigo-700/50 backdrop-blur-md py-6 flex justify-center shrink-0 border-b border-indigo-500/30 z-20">
                <div className="bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white/20 aspect-video w-full max-w-xl">
                    <YouTubePlayer url={activeLesson.videoUrl} playing={videoPlaying} playbackRate={1} onProgress={(s) => setCurrentTime(s.playedSeconds)} seekTo={seekTarget} />
                </div>
             </div>
             <div className="flex-1 w-full overflow-y-auto px-8 py-10 space-y-8 scroll-smooth" ref={finalContainerRef}>
                <div className="max-w-4xl mx-auto bg-white p-14 rounded-[4rem] text-slate-800 shadow-2xl space-y-16">
                    <h2 className="text-4xl font-black text-center mb-6">终极：智能填空挑战</h2>
                    {finalGaps.map((gap, gIdx) => {
                      const line = homeworkLines.find(l => l.id === gap.lineId);
                      if(!line) return null;
                      const isActive = currentTime >= line.startTime && currentTime <= line.endTime;
                      return (
                        <div key={line.id} onClick={() => { setSeekTarget(line.startTime); setVideoPlaying(true); }} className={`pb-12 border-b border-slate-50 cursor-pointer p-8 rounded-[2.5rem] transition-all duration-500 ${isActive ? 'bg-indigo-50 border-indigo-200 scale-[1.02] shadow-sm' : 'opacity-40 grayscale-[0.5]'}`}>
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-12 text-5xl font-black">
                             {getSmartUnits(line.chinese, line.vocabs).map((unit, ci) => {
                               if (unit === gap.targetUnit) {
                                 return (
                                   <div key={ci} className="relative inline-flex gap-3" onClick={e => e.stopPropagation()}>
                                     {gap.userChoice ? (
                                       <span className={gap.userChoice === gap.targetUnit ? 'text-indigo-600 underline' : 'text-red-500 underline'}>{gap.userChoice}</span>
                                     ) : (
                                       <div className="flex gap-3 bg-slate-100 p-2 rounded-2xl shadow-inner">
                                         {gap.options.map(opt => <button key={opt} onClick={() => handleFinalChoice(gIdx, opt)} className="bg-white hover:bg-indigo-600 hover:text-white px-6 py-3 rounded-xl text-xl font-black transition-all shadow-sm">{opt}</button>)}
                                       </div>
                                     )}
                                   </div>
                                 );
                               }
                               return <span key={ci} className="text-slate-300 transition-colors duration-500 group-hover:text-slate-800">{unit}</span>;
                             })}
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={() => setGameState('completed')} disabled={finalGaps.some(g => !g.userChoice)} className="w-full py-10 bg-indigo-600 text-white rounded-[3rem] font-black text-4xl shadow-2xl disabled:opacity-30 transition-all hover:bg-indigo-700">完成复习，查看成就</button>
                </div>
             </div>
          </div>
        )}

        {gameState === 'completed' && (
           <div className="text-center py-20 space-y-12 animate-in zoom-in duration-700">
              <div className="w-64 h-64 bg-yellow-400 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce border-8 border-white"><i className="fa-solid fa-trophy text-[10rem] text-black"></i></div>
              <h2 className="text-8xl font-black tracking-tighter">太棒了！<br/>闯关成功</h2>
              <div className="bg-white/10 p-14 rounded-[4rem] border-4 border-white/20 inline-block">
                <p className="text-xs uppercase font-black opacity-60 mb-2">Final Achievement Score</p>
                <p className="text-[12rem] font-black leading-none">{score}</p>
              </div>
              <div className="pt-10">
                <button onClick={() => setActiveLesson(null)} className="bg-white text-indigo-600 px-20 py-8 rounded-[3rem] font-black text-4xl shadow-2xl hover:scale-105 active:scale-95 transition-all">返回课程主页</button>
              </div>
           </div>
        )}
      </main>

      {selectedVocab && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6" onClick={() => setSelectedVocab(null)}>
          <div className="bg-white text-slate-900 rounded-[4rem] p-16 max-w-xl w-full shadow-2xl text-center relative animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="text-[10rem] font-black mb-4 text-indigo-600 leading-none">{selectedVocab.char}</div>
            <div className="text-3xl font-black text-slate-300 mb-12 uppercase tracking-widest">{selectedVocab.pinyin}</div>
            <div className="bg-indigo-50 p-10 rounded-[2.5rem] border border-indigo-100">
                <p className="text-4xl text-indigo-900 font-black">{selectedVocab.explanation}</p>
            </div>
            <button onClick={() => { setSelectedVocab(null); setVideoPlaying(true); }} className="w-full mt-14 bg-indigo-600 py-7 rounded-[2.5rem] text-white font-black text-2xl shadow-xl">返回挑战</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentView;