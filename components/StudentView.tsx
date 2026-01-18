import React, { useState, useEffect, useRef } from 'react';
import YouTubePlayer from './YouTubePlayer';
import LyricLineDisplay from './LyricLineDisplay';
import { LessonData, Database, Student, LyricLine } from '../types';

interface Props {
  studentId: string;
}

const StudentView: React.FC<Props> = ({ studentId }) => {
  // 从 URL 参数解析云端地址
  const getCloudUrlFromParams = () => {
    const hash = window.location.hash;
    if (hash.includes('?')) {
      const params = new URLSearchParams(hash.split('?')[1]);
      const cloudParam = params.get('c');
      if (cloudParam) {
        try {
          return atob(decodeURIComponent(cloudParam));
        } catch (e) {
          return null;
        }
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

  // 游戏逻辑相关状态
  const [gameState, setGameState] = useState<'learning' | 'ordering' | 'finalChallenge' | 'completed'>('learning');
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [shuffledChars, setShuffledChars] = useState<string[]>([]);
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [finalGaps, setFinalGaps] = useState<{lineId: string, vocabChar: string, options: string[], userChoice: string | null}[]>([]);

  const fetchCloudData = async () => {
    if (!cloudBaseUrl) {
      setError("链接中缺少同步配置信息，请联系老师重新发送链接。");
      return;
    }
    setIsSyncing(true);
    setError(null);
    const baseUrl = cloudBaseUrl.endsWith('/') ? cloudBaseUrl : cloudBaseUrl + '/';
    try {
      const response = await fetch(`${baseUrl}${studentId}.json`, { cache: 'no-store' });
      if (!response.ok) throw new Error("Fetch failed");
      const imported = await response.json();
      
      const newDb = { 
        lessons: {...db.lessons, ...imported.lessons}, 
        students: imported.students // 以云端为准
      };
      setDb(newDb);
      localStorage.setItem('teaching_db', JSON.stringify(newDb));
      localStorage.setItem('teacher_cloud_url', cloudBaseUrl); // 持久化保存
      
      const foundStudent = imported.students.find((s: any) => s.id === studentId);
      if (foundStudent) setStudent(foundStudent);
      else throw new Error("Student not found in JSON");
      
    } catch (err) { 
      setError("同步云端数据失败。请检查 GitHub Pages 是否已部署，且文件已上传。");
    } finally { 
      setIsSyncing(false); 
    }
  };

  useEffect(() => {
    // 如果没有学生信息或者需要强制同步，则执行
    if (!student) {
      fetchCloudData();
    }
  }, [studentId, cloudBaseUrl]);

  // 排序挑战初始化
  const startOrderingGame = (line: LyricLine) => {
    const chars = Array.from(line.chinese.replace(/\s+/g, ''));
    setShuffledChars([...chars].sort(() => Math.random() - 0.5));
    setUserOrder([]);
    setGameState('ordering');
    setFeedback(null);
  };

  // 验证排序结果
  const checkOrder = (line: LyricLine) => {
    const original = line.chinese.replace(/\s+/g, '');
    const user = userOrder.join('');
    if (user === original) {
      setFeedback({ msg: '真棒！顺序完全正确 ✨', type: 'success' });
      setScore(s => s + 10);
      setTimeout(() => {
        const nextIdx = currentLineIdx + 1;
        const homeworkLines = activeLesson?.lyrics.filter(l => l.isHomework) || [];
        if (nextIdx < homeworkLines.length) {
          setCurrentLineIdx(nextIdx);
          setGameState('learning');
        } else {
          setupFinalChallenge();
        }
      }, 1500);
    } else {
      setFeedback({ msg: `不对哦，正确顺序是：${original}`, type: 'error' });
      setTimeout(() => {
        setUserOrder([]);
        setShuffledChars([...original.split('')].sort(() => Math.random() - 0.5));
        setFeedback(null);
      }, 2500);
    }
  };

  // 设置终极填空大挑战
  const setupFinalChallenge = () => {
    const homeworkLines = activeLesson?.lyrics.filter(l => l.isHomework) || [];
    const gaps: typeof finalGaps = [];
    homeworkLines.forEach(l => {
      if (l.vocabs.length > 0) {
        // 每句随机选一个重点词作为空格
        const v = l.vocabs[Math.floor(Math.random() * l.vocabs.length)];
        const distractors = ['的', '了', '不', '是', '有', '在', '我', '你'];
        const randomDistractor = distractors[Math.floor(Math.random()*distractors.length)];
        gaps.push({
          lineId: l.id,
          vocabChar: v.char,
          options: [v.char, randomDistractor].sort(() => Math.random() - 0.5),
          userChoice: null
        });
      }
    });
    setFinalGaps(gaps);
    setGameState('finalChallenge');
  };

  const handleFinalChoice = (idx: number, choice: string) => {
    const newGaps = [...finalGaps];
    if (newGaps[idx].userChoice) return; // 不可修改
    newGaps[idx].userChoice = choice;
    setFinalGaps(newGaps);
    if (choice === newGaps[idx].vocabChar) setScore(s => s + 5);
  };

  if (isSyncing) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-600 text-white p-6">
       <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
       <p className="font-black text-xl animate-pulse">正在同步您的个人作业库...</p>
    </div>
  );

  if (!activeLesson) {
    return (
      <div className="min-h-screen bg-slate-50 p-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <div>
               <h1 className="text-4xl font-black text-slate-900 leading-tight">你好, {student?.name || '同学'}! 👋</h1>
               <p className="text-slate-400 font-bold mt-2">在这里复习您的所有已指派课程</p>
            </div>
            <button onClick={fetchCloudData} className="bg-white border-2 border-indigo-100 text-indigo-600 px-6 py-3 rounded-2xl font-black text-sm shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-2">
              <i className="fa-solid fa-sync"></i> 手动刷新同步
            </button>
          </div>
          {error && (
            <div className="bg-red-50 text-red-600 p-8 rounded-3xl mb-12 font-bold border-2 border-red-100 flex items-start gap-4">
               <i className="fa-solid fa-circle-exclamation text-2xl mt-1"></i>
               <div>
                  <p className="text-lg">同步失败</p>
                  <p className="text-sm opacity-80 mt-1">{error}</p>
               </div>
            </div>
          )}
          
          {student?.assignedLessons.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
               <i className="fa-solid fa-inbox text-slate-100 text-8xl mb-6"></i>
               <p className="text-slate-300 font-black text-xl">目前还没有指派任何课程哦</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-8">
              {student?.assignedLessons.map(id => (
                <div key={id} onClick={() => {
                  if(!db.lessons[id]) { alert("该课程内容还未指派或未同步。"); return; }
                  setActiveLesson(db.lessons[id]);
                  setCurrentLineIdx(0);
                  setGameState('learning');
                  setScore(0);
                }} className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200 border-4 border-transparent hover:border-indigo-400 cursor-pointer transition-all hover:-translate-y-2 group">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <i className="fa-solid fa-play text-xl"></i>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 leading-tight">{db.lessons[id]?.title || '未命名的课程'}</h3>
                  <div className="flex items-center gap-2 mt-4">
                     <span className="text-indigo-400 font-black uppercase tracking-widest text-[10px]">点击进入复习练习</span>
                     <i className="fa-solid fa-arrow-right text-indigo-200 group-hover:translate-x-2 transition-transform"></i>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const homeworkLines = activeLesson.lyrics.filter(l => l.isHomework);
  const currentLine = homeworkLines[currentLineIdx];

  return (
    <div className="min-h-screen bg-indigo-600 p-8 font-sans text-white overflow-x-hidden">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-12">
           <button onClick={() => setActiveLesson(null)} className="bg-white/10 hover:bg-white/20 px-8 py-3 rounded-2xl font-black transition-all flex items-center gap-2">
             <i className="fa-solid fa-chevron-left"></i> 返回列表
           </button>
           <div className="text-right">
             <p className="text-indigo-200 font-black uppercase tracking-widest text-[10px] mb-1">当前积分 SCORE</p>
             <p className="text-5xl font-black tabular-nums">{score}</p>
           </div>
        </header>

        {gameState === 'learning' && currentLine && (
          <div className="space-y-12 animate-in fade-in zoom-in duration-500">
            <div className="bg-black rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white/10 aspect-video max-w-3xl mx-auto">
              <YouTubePlayer url={activeLesson.videoUrl} playing={true} playbackRate={1} onProgress={() => {}} seekTo={currentLine.startTime} />
            </div>
            <div className="bg-white text-slate-800 p-12 rounded-[4rem] shadow-2xl relative">
              <div className="absolute top-[-1.5rem] left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-10 py-3 rounded-full font-black shadow-xl text-sm uppercase tracking-widest">第一步：仔细听、跟着读</div>
              <LyricLineDisplay line={currentLine} />
              <button 
                onClick={() => startOrderingGame(currentLine)}
                className="w-full mt-12 bg-indigo-600 text-white py-7 rounded-[2rem] font-black text-2xl shadow-xl hover:scale-105 active:scale-95 transition-all shadow-indigo-900/20"
              >
                学完了，开始句序挑战！
              </button>
            </div>
          </div>
        )}

        {gameState === 'ordering' && currentLine && (
          <div className="space-y-12 animate-in slide-in-from-right duration-500">
             <div className="text-center">
               <h2 className="text-5xl font-black mb-4">挑战：语序还原</h2>
               <p className="text-indigo-200 text-xl font-bold italic opacity-80">点击下方汉字，拼出刚才学过的那句话</p>
             </div>

             <div className="bg-white/10 border-4 border-dashed border-white/20 p-12 rounded-[4rem] min-h-[200px] flex flex-wrap justify-center items-center gap-4">
                {userOrder.length === 0 && <p className="text-indigo-200 font-black text-2xl opacity-20 italic">点击字块填入这里...</p>}
                {userOrder.map((c, i) => (
                  <button key={i} onClick={() => {
                    setUserOrder(userOrder.filter((_, idx) => idx !== i));
                    setShuffledChars([...shuffledChars, c]);
                  }} className="w-20 h-24 bg-white text-indigo-900 rounded-2xl text-5xl font-black shadow-xl flex items-center justify-center animate-in zoom-in hover:bg-red-50 hover:text-red-500 transition-colors">
                    {c}
                  </button>
                ))}
             </div>

             <div className="flex flex-wrap justify-center gap-4">
                {shuffledChars.map((c, i) => (
                  <button key={i} onClick={() => {
                    setUserOrder([...userOrder, c]);
                    setShuffledChars(shuffledChars.filter((_, idx) => idx !== i));
                  }} className="w-16 h-20 bg-indigo-400 hover:bg-white hover:text-indigo-900 text-white rounded-2xl text-4xl font-black shadow-lg transition-all flex items-center justify-center active:scale-90">
                    {c}
                  </button>
                ))}
             </div>

             {feedback && (
               <div className={`p-8 rounded-3xl text-center text-3xl font-black animate-bounce shadow-2xl ${feedback.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                 {feedback.msg}
               </div>
             )}

             <div className="flex gap-6 max-w-2xl mx-auto">
                <button onClick={() => { setUserOrder([]); setShuffledChars([...currentLine.chinese.replace(/\s+/g,'')].sort(() => Math.random()-0.5)) }} className="flex-1 py-6 bg-white/10 rounded-3xl font-black hover:bg-white/20 transition-all">清空重来</button>
                <button onClick={() => checkOrder(currentLine)} disabled={shuffledChars.length > 0} className={`flex-[2] py-6 rounded-3xl font-black text-2xl shadow-2xl transition-all ${shuffledChars.length > 0 ? 'bg-white/20 cursor-not-allowed opacity-50' : 'bg-yellow-400 text-black hover:scale-105 active:scale-95'}`}>确认提交</button>
             </div>
          </div>
        )}

        {gameState === 'finalChallenge' && (
          <div className="space-y-12 animate-in slide-in-from-bottom duration-700">
             <div className="text-center">
                <h2 className="text-6xl font-black mb-4 tracking-tighter">终极填空大挑战</h2>
                <p className="text-indigo-200 text-xl font-bold opacity-80">回顾整段视频内容，为缺失的台词选择正确的词语</p>
             </div>
             
             <div className="bg-white p-14 rounded-[4rem] text-slate-800 space-y-14 shadow-2xl">
                {homeworkLines.map((line, lIdx) => {
                  const gap = finalGaps.find(g => g.lineId === line.id);
                  if (!gap) return null;
                  
                  return (
                    <div key={line.id} className="pb-10 border-b-4 border-slate-50 last:border-0">
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-10 text-5xl font-black leading-tight">
                         {Array.from(line.chinese.replace(/\s+/g,'')).map((c, ci) => {
                           if (c === gap.vocabChar) {
                             return (
                               <div key={ci} className="relative inline-flex flex-col">
                                 {gap.userChoice ? (
                                   <span className={`pb-2 border-b-4 ${gap.userChoice === gap.vocabChar ? 'text-indigo-600 border-indigo-600' : 'text-red-500 border-red-500 animate-pulse'}`}>
                                     {gap.userChoice}
                                   </span>
                                 ) : (
                                   <div className="flex gap-3 bg-slate-50 p-2 rounded-2xl shadow-inner border border-slate-100">
                                     {gap.options.map(opt => (
                                       <button key={opt} onClick={() => handleFinalChoice(finalGaps.indexOf(gap), opt)} className="bg-white hover:bg-indigo-600 hover:text-white px-5 py-3 rounded-xl text-2xl transition-all border-2 border-slate-100 hover:border-indigo-600 shadow-sm">
                                         {opt}
                                       </button>
                                     ))}
                                   </div>
                                 )}
                               </div>
                             );
                           }
                           return <span key={ci} className="text-slate-300 opacity-60">{c}</span>;
                         })}
                      </div>
                      <p className="text-xl italic text-slate-400 mt-6 font-medium">"{line.english}"</p>
                    </div>
                  );
                })}

                <button 
                  onClick={() => setGameState('completed')}
                  disabled={finalGaps.some(g => !g.userChoice)}
                  className={`w-full py-8 rounded-[2rem] font-black text-3xl shadow-2xl transition-all ${finalGaps.some(g => !g.userChoice) ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:scale-105 active:scale-95'}`}
                >
                  查看最终评分
                </button>
             </div>
          </div>
        )}

        {gameState === 'completed' && (
           <div className="text-center space-y-12 py-20 animate-in zoom-in duration-500">
              <div className="w-56 h-56 bg-yellow-400 rounded-full flex items-center justify-center mx-auto shadow-[0_20px_60px_-15px_rgba(250,204,21,0.5)] ring-8 ring-white/20 animate-bounce">
                 <i className="fa-solid fa-trophy text-9xl text-black"></i>
              </div>
              <div className="space-y-4">
                <h2 className="text-7xl font-black tracking-tighter">太牛了！复习完成</h2>
                <p className="text-2xl text-indigo-200 font-bold opacity-80 italic">恭喜你！今天也向着母语者的水平迈进了一大步。</p>
              </div>
              <div className="bg-white/10 p-14 rounded-[4rem] inline-block border-4 border-white/20 shadow-2xl backdrop-blur-sm">
                <p className="text-[12px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-4 opacity-70">本次练习得分 FINAL SCORE</p>
                <p className="text-9xl font-black tabular-nums">{score}</p>
              </div>
              <button onClick={() => setActiveLesson(null)} className="block mx-auto bg-white text-indigo-600 px-16 py-6 rounded-[2rem] font-black text-3xl shadow-2xl hover:scale-110 active:scale-95 transition-all">返回课程列表</button>
           </div>
        )}
      </div>
    </div>
  );
};

export default StudentView;