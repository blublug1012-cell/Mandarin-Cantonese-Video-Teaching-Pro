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
  const [selectedVocab, setSelectedVocab] = useState<Vocab | null>(null);

  const [gameState, setGameState] = useState<'learning' | 'ordering' | 'finalChallenge' | 'completed'>('learning');
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [shuffledChars, setShuffledChars] = useState<string[]>([]);
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [finalGaps, setFinalGaps] = useState<{lineId: string, vocabChar: string, options: string[], userChoice: string | null}[]>([]);
  
  const [seekTarget, setSeekTarget] = useState<number | undefined>(undefined);
  const [videoPlaying, setVideoPlaying] = useState(true);

  const fetchCloudData = async () => {
    if (!cloudBaseUrl) {
      setError("链接中缺少同步配置信息。");
      return;
    }
    setIsSyncing(true);
    setError(null);
    const baseUrl = cloudBaseUrl.endsWith('/') ? cloudBaseUrl : cloudBaseUrl + '/';
    try {
      const response = await fetch(`${baseUrl}${studentId}.json`, { cache: 'no-store' });
      if (!response.ok) throw new Error("Fetch failed");
      const imported = await response.json();
      
      const newDb = { lessons: {...db.lessons, ...imported.lessons}, students: imported.students };
      setDb(newDb);
      localStorage.setItem('teaching_db', JSON.stringify(newDb));
      localStorage.setItem('teacher_cloud_url', cloudBaseUrl);
      
      const foundStudent = imported.students.find((s: any) => s.id === studentId);
      if (foundStudent) setStudent(foundStudent);
      else throw new Error("Student not found");
    } catch (err) { 
      setError("无法同步作业。请确保老师已上传作业文件并公开部署。");
    } finally { setIsSyncing(false); }
  };

  useEffect(() => {
    if (!student) fetchCloudData();
  }, [studentId, cloudBaseUrl]);

  const homeworkLines = activeLesson?.lyrics.filter(l => l.isHomework) || [];
  const currentLine = homeworkLines[currentLineIdx];

  const startOrderingGame = (line: LyricLine) => {
    const chars = Array.from(line.chinese.replace(/\s+/g, ''));
    setShuffledChars([...chars].sort(() => Math.random() - 0.5));
    setUserOrder([]);
    setGameState('ordering');
    setFeedback(null);
    setVideoPlaying(true);
    setSeekTarget(line.startTime);
  };

  const checkOrder = (line: LyricLine) => {
    const original = line.chinese.replace(/\s+/g, '');
    const user = userOrder.join('');
    if (user === original) {
      setFeedback({ msg: '真棒！顺序完全正确 ✨', type: 'success' });
      setScore(s => s + 10);
      setTimeout(() => {
        const nextIdx = currentLineIdx + 1;
        if (nextIdx < homeworkLines.length) {
          setCurrentLineIdx(nextIdx);
          setGameState('learning');
          setSeekTarget(homeworkLines[nextIdx].startTime);
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
        setSeekTarget(line.startTime);
      }, 2500);
    }
  };

  const setupFinalChallenge = () => {
    const gaps: typeof finalGaps = [];
    const distractors = ['的', '了', '不', '是', '有', '在', '我', '你', '大', '小', '好', '人'];
    
    homeworkLines.forEach(l => {
      let targetChar = '';
      if (l.vocabs && l.vocabs.length > 0) {
        targetChar = l.vocabs[Math.floor(Math.random() * l.vocabs.length)].char;
      } else if (l.chinese.length > 0) {
        // 如果没有重点词，随机选一个汉字
        const chars = Array.from(l.chinese.replace(/\s+/g, ''));
        targetChar = chars[Math.floor(Math.random() * chars.length)];
      }

      if (targetChar) {
        gaps.push({
          lineId: l.id,
          vocabChar: targetChar,
          options: [targetChar, distractors[Math.floor(Math.random()*distractors.length)]].sort(() => Math.random() - 0.5),
          userChoice: null
        });
      }
    });
    setFinalGaps(gaps);
    setGameState('finalChallenge');
    if (homeworkLines.length > 0) {
      setSeekTarget(homeworkLines[0].startTime);
      setVideoPlaying(true);
    }
  };

  const handleFinalChoice = (index: number, choice: string) => {
    const newGaps = [...finalGaps];
    if(newGaps[index].userChoice) return;
    newGaps[index].userChoice = choice;
    setFinalGaps(newGaps);
    if (choice === newGaps[index].vocabChar) {
      setScore(s => s + 20);
    }
  };

  if (isSyncing) return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-600 text-white"><p className="animate-pulse font-black text-xl">同步作业中...</p></div>
  );

  if (!activeLesson) {
    return (
      <div className="min-h-screen bg-slate-50 p-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-black mb-12">你好, {student?.name || '同学'}!</h1>
          <div className="grid grid-cols-2 gap-8">
            {student?.assignedLessons.map(id => (
              <div key={id} onClick={() => { setActiveLesson(db.lessons[id]); setGameState('learning'); setVideoPlaying(true); setSeekTarget(db.lessons[id]?.lyrics.filter(l => l.isHomework)[0]?.startTime); }} className="bg-white p-10 rounded-[3rem] shadow-xl hover:border-indigo-400 border-4 border-transparent cursor-pointer transition-all">
                <h3 className="text-2xl font-black">{db.lessons[id]?.title || '未命名'}</h3>
                <p className="text-indigo-400 font-bold mt-4 uppercase text-[10px]">点击开始挑战</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-600 p-8 font-sans text-white relative">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-12">
           <button onClick={() => setActiveLesson(null)} className="bg-white/10 px-8 py-3 rounded-2xl font-black flex items-center gap-2"><i className="fa-solid fa-chevron-left"></i> 返回</button>
           <div className="text-right">
             <p className="text-xs uppercase font-black text-indigo-200">总分</p>
             <p className="text-5xl font-black">{score}</p>
           </div>
        </header>

        {(gameState === 'learning' || gameState === 'ordering') && currentLine && (
          <div className="space-y-12">
            <div className="bg-black rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white/10 aspect-video max-w-3xl mx-auto">
              <YouTubePlayer url={activeLesson.videoUrl} playing={videoPlaying} playbackRate={1} onProgress={(s) => {
                if (s.playedSeconds > currentLine.endTime) setSeekTarget(currentLine.startTime);
              }} seekTo={seekTarget} />
            </div>
            <div className="bg-white text-slate-800 p-12 rounded-[4rem] shadow-2xl relative">
              {gameState === 'learning' ? (
                <>
                  <div className="absolute top-[-1.5rem] left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-10 py-3 rounded-full font-black text-sm uppercase">第一步：仔细听、跟着读</div>
                  <LyricLineDisplay line={currentLine} onVocabClick={(v) => { setSelectedVocab(v); setVideoPlaying(false); }} />
                  <button onClick={() => startOrderingGame(currentLine)} className="w-full mt-12 bg-indigo-600 text-white py-7 rounded-[2rem] font-black text-2xl">学完了，开始句序挑战！</button>
                </>
              ) : (
                <div className="space-y-8">
                  <div className="text-center"><h2 className="text-3xl font-black mb-4">挑战：语序还原</h2></div>
                  <div className="bg-slate-50 border-4 border-dashed border-slate-100 p-8 rounded-[3rem] min-h-[150px] flex flex-wrap justify-center items-center gap-4">
                    {userOrder.map((c, i) => <button key={i} onClick={() => { setUserOrder(userOrder.filter((_, idx) => idx !== i)); setShuffledChars([...shuffledChars, c]); }} className="w-16 h-20 bg-indigo-600 text-white rounded-2xl text-4xl font-black shadow-lg">{c}</button>)}
                  </div>
                  <div className="flex flex-wrap justify-center gap-4">
                    {shuffledChars.map((c, i) => <button key={i} onClick={() => { setUserOrder([...userOrder, c]); setShuffledChars(shuffledChars.filter((_, idx) => idx !== i)); }} className="w-14 h-16 bg-white text-slate-800 rounded-2xl text-3xl font-black border-2">{c}</button>)}
                  </div>
                  {feedback && <div className={`p-6 rounded-2xl text-center text-xl font-black ${feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>{feedback.msg}</div>}
                  <button onClick={() => checkOrder(currentLine)} disabled={shuffledChars.length > 0} className="w-full py-6 bg-yellow-400 text-black rounded-[2rem] font-black text-2xl disabled:opacity-30">确认提交</button>
                </div>
              )}
            </div>
          </div>
        )}

        {gameState === 'finalChallenge' && (
          <div className="space-y-12 animate-in slide-in-from-bottom duration-500">
             <div className="bg-black rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white/10 aspect-video max-w-3xl mx-auto sticky top-4 z-50">
                <YouTubePlayer url={activeLesson.videoUrl} playing={videoPlaying} playbackRate={1} onProgress={() => {}} seekTo={seekTarget} />
             </div>
             <div className="bg-white p-14 rounded-[4rem] text-slate-800 space-y-14">
                <h2 className="text-4xl font-black text-center mb-10">终极填空大挑战</h2>
                {finalGaps.map((gap, gIdx) => {
                  const line = homeworkLines.find(l => l.id === gap.lineId);
                  if(!line) return null;
                  return (
                    <div key={line.id} onClick={() => { setSeekTarget(line.startTime); setVideoPlaying(true); }} className="pb-8 border-b cursor-pointer hover:bg-slate-50 p-6 rounded-3xl transition-all">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-10 text-4xl font-black">
                         {Array.from(line.chinese.replace(/\s+/g,'')).map((c, ci) => {
                           if (c === gap.vocabChar) {
                             return (
                               <div key={ci} className="relative inline-flex gap-2" onClick={e => e.stopPropagation()}>
                                 {gap.userChoice ? (
                                   <span className={gap.userChoice === gap.vocabChar ? 'text-indigo-600 underline' : 'text-red-500 underline'}>{gap.userChoice}</span>
                                 ) : (
                                   <div className="flex gap-2 bg-slate-100 p-2 rounded-xl">
                                     {gap.options.map(opt => <button key={opt} onClick={() => handleFinalChoice(gIdx, opt)} className="bg-white hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg text-xl transition-all">{opt}</button>)}
                                   </div>
                                 )}
                               </div>
                             );
                           }
                           return <span key={ci} className="text-slate-300">{c}</span>;
                         })}
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => setGameState('completed')} disabled={finalGaps.some(g => !g.userChoice)} className="w-full py-8 bg-indigo-600 text-white rounded-[2rem] font-black text-3xl disabled:opacity-30">完成练习</button>
             </div>
          </div>
        )}

        {gameState === 'completed' && (
           <div className="text-center py-20 space-y-12">
              <div className="w-56 h-56 bg-yellow-400 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce"><i className="fa-solid fa-trophy text-9xl text-black"></i></div>
              <h2 className="text-7xl font-black">太牛了！练习完成</h2>
              <div className="bg-white/10 p-14 rounded-[4rem] border-4 border-white/20"><p className="text-9xl font-black">{score}</p></div>
              <button onClick={() => setActiveLesson(null)} className="bg-white text-indigo-600 px-16 py-6 rounded-[2rem] font-black text-3xl">返回课程列表</button>
           </div>
        )}
      </div>

      {selectedVocab && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6" onClick={() => setSelectedVocab(null)}>
          <div className="bg-white text-slate-900 rounded-[3rem] p-12 max-w-lg w-full shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className="text-8xl font-black mb-4 text-indigo-600">{selectedVocab.char}</div>
            <div className="text-2xl font-black text-slate-300 mb-10">{selectedVocab.pinyin}</div>
            <p className="text-3xl text-slate-700 font-black">{selectedVocab.explanation}</p>
            <button onClick={() => { setSelectedVocab(null); setVideoPlaying(true); }} className="w-full mt-12 bg-indigo-600 py-5 rounded-[1.5rem] text-white font-black">继续学习</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentView;