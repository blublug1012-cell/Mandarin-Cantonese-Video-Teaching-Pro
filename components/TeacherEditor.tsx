import React, { useState, useRef, useEffect } from 'react';
import { LessonData, LyricLine, Vocab, Database, Student, Question } from '../types';

interface Props {
  onOpenClassroom: (lesson: LessonData) => void;
}

const TeacherEditor: React.FC<Props> = ({ onOpenClassroom }) => {
  const [db, setDb] = useState<Database>(() => {
    try {
      const saved = localStorage.getItem('teaching_db');
      return saved ? JSON.parse(saved) : { lessons: {}, students: [] };
    } catch (e) {
      return { lessons: {}, students: [] };
    }
  });

  const [cloudBaseUrl, setCloudBaseUrl] = useState(() => {
    return localStorage.getItem('teacher_cloud_url') || '';
  });

  useEffect(() => {
    localStorage.setItem('teacher_cloud_url', cloudBaseUrl);
  }, [cloudBaseUrl]);

  const [lesson, setLesson] = useState<LessonData>(() => {
    try {
      const savedId = localStorage.getItem('last_lesson_id');
      if (savedId && db.lessons[savedId]) return db.lessons[savedId];
    } catch (e) {}
    return {
      id: Date.now().toString(),
      title: '新课程',
      videoUrl: '',
      language: 'Mandarin',
      lyrics: [],
      questions: [],
      lastModified: Date.now()
    };
  });

  const [activeTab, setActiveTab] = useState<'info' | 'lyrics' | 'questions' | 'students'>('lyrics');
  const [batchText, setBatchText] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);

  const saveToDb = (updatedLesson: LessonData) => {
    const newDb = { ...db, lessons: { ...db.lessons, [updatedLesson.id]: updatedLesson } };
    setDb(newDb);
    localStorage.setItem('teaching_db', JSON.stringify(newDb));
    localStorage.setItem('last_lesson_id', updatedLesson.id);
    localStorage.setItem('activeLesson', JSON.stringify(updatedLesson)); 
  };

  const toggleAllHomework = (select: boolean) => {
    const updated = {
      ...lesson,
      lyrics: lesson.lyrics.map(l => ({ ...l, isHomework: select }))
    };
    setLesson(updated);
  };

  const handleManualSave = () => {
    saveToDb(lesson);
    alert('✅ 课程内容已成功保存！');
  };

  const handlePrint = () => {
    window.print();
  };

  const getStudentUrl = (id: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const cloudParam = cloudBaseUrl ? `?c=${encodeURIComponent(btoa(cloudBaseUrl))}` : '';
    return `${baseUrl}#/student/${id}${cloudParam}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('链接已复制到剪贴板。');
  };

  const addVocab = (lineId: string) => {
    setLesson({
      ...lesson,
      lyrics: lesson.lyrics.map(l => l.id === lineId ? {
        ...l,
        vocabs: [...l.vocabs, { char: '', pinyin: '', explanation: '' }]
      } : l)
    });
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans relative">
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm no-print">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
             <i className="fa-solid fa-chalkboard-user"></i>
          </div>
          <h1 className="font-black text-slate-800 tracking-tight">Mandarin Pro Editor</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-200 flex items-center gap-2">
            <i className="fa-solid fa-file-pdf"></i> PDF 讲义
          </button>
          <button onClick={handleManualSave} className="bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-emerald-600 text-sm">
            <i className="fa-solid fa-save"></i> 保存
          </button>
          <button onClick={() => { saveToDb(lesson); onOpenClassroom(lesson); }} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 text-sm">
            <i className="fa-solid fa-play"></i> 上课模式
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8 px-6 no-print">
        <nav className="flex gap-2 mb-8 justify-center bg-white p-2 rounded-3xl shadow-sm border border-slate-100 w-fit mx-auto">
          {(['info', 'lyrics', 'questions', 'students'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
              {tab === 'info' && '1. 课程设置'}
              {tab === 'lyrics' && '2. 内容编辑'}
              {tab === 'questions' && '3. 互动习题'}
              {tab === 'students' && '4. 学生管理'}
            </button>
          ))}
        </nav>

        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 min-h-[60vh]">
          {activeTab === 'lyrics' && (
            <div className="space-y-12">
              <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 flex items-center gap-4">
                <i className="fa-solid fa-info-circle text-indigo-500"></i>
                <p className="text-indigo-600 text-xs font-medium">提示：设置[开始/结束]时间（秒），视频将只播放该范围。勾选“选为作业”会出现在学生挑战中。</p>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => toggleAllHomework(true)} className="bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all">全选作业</button>
                  <button onClick={() => toggleAllHomework(false)} className="bg-white border border-slate-200 text-slate-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">全取消</button>
                  <button onClick={() => setShowBatchModal(true)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">批量导入文本</button>
                </div>
              </div>

              {lesson.lyrics.map((line, idx) => (
                <div key={line.id} className="flex gap-8 relative pb-10 border-b border-slate-50 last:border-0 group">
                  <div className="w-28 flex flex-col items-center gap-3">
                    <span className="text-4xl font-black text-slate-100 italic">#{idx + 1}</span>
                    <div className="space-y-3 w-full">
                      <div className="relative">
                        <label className="text-[9px] font-black text-slate-400 absolute -top-4 left-1 uppercase">开始秒数</label>
                        <input type="number" step="0.1" className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-center text-xs font-bold" value={line.startTime} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, startTime: Number(e.target.value)} : l)})} />
                      </div>
                      <div className="relative">
                        <label className="text-[9px] font-black text-slate-400 absolute -top-4 left-1 uppercase">结束秒数</label>
                        <input type="number" step="0.1" className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-center text-xs font-bold" value={line.endTime} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, endTime: Number(e.target.value)} : l)})} />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <input className="flex-1 text-3xl font-black text-slate-800 placeholder-slate-100 focus:outline-none" placeholder="中文内容..." value={line.chinese} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, chinese: e.target.value} : l)})} />
                      <label className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl cursor-pointer hover:bg-indigo-100 transition-all border border-indigo-100">
                        <input type="checkbox" checked={line.isHomework} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, isHomework: e.target.checked} : l)})} className="w-5 h-5 accent-indigo-600" />
                        <span className="text-xs font-black text-indigo-600 uppercase whitespace-nowrap">选为作业</span>
                      </label>
                    </div>
                    <input className="w-full text-lg text-slate-400 placeholder-slate-200 focus:outline-none font-medium" placeholder="Pinyin/Jyutping (对应汉字空格分隔)..." value={line.pinyin} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, pinyin: e.target.value} : l)})} />
                    
                    <div className="flex flex-wrap gap-2 pt-2">
                      {line.vocabs.map((v, vIdx) => (
                        <div key={vIdx} className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl flex gap-2 items-center text-xs shadow-sm">
                          <input placeholder="字" className="w-8 font-bold border-r outline-none bg-transparent" value={v.char} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, vocabs: l.vocabs.map((v_old, i) => i === vIdx ? {...v_old, char: e.target.value} : v_old)} : l)})} />
                          <input placeholder="拼音" className="w-14 border-r outline-none bg-transparent" value={v.pinyin} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, vocabs: l.vocabs.map((v_old, i) => i === vIdx ? {...v_old, pinyin: e.target.value} : v_old)} : l)})} />
                          <input placeholder="释义" className="w-24 outline-none bg-transparent" value={v.explanation} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, vocabs: l.vocabs.map((v_old, i) => i === vIdx ? {...v_old, explanation: e.target.value} : v_old)} : l)})} />
                          <button onClick={() => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, vocabs: l.vocabs.filter((_, i) => i !== vIdx)} : l)})} className="text-slate-300 hover:text-red-400"><i className="fa-solid fa-times"></i></button>
                        </div>
                      ))}
                      <button onClick={() => addVocab(line.id)} className="px-4 py-2 border-2 border-dashed border-slate-100 rounded-xl text-slate-300 text-[10px] font-bold hover:text-indigo-400">+ 重点词汇</button>
                    </div>
                  </div>
                  <button onClick={() => setLesson({...lesson, lyrics: lesson.lyrics.filter(l => l.id !== line.id)})} className="absolute top-0 right-[-3rem] text-slate-100 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-trash-can"></i></button>
                </div>
              ))}
              <button onClick={() => setLesson({...lesson, lyrics: [...lesson.lyrics, { id: Date.now().toString(), startTime: 0, endTime: 0, chinese: '', pinyin: '', english: '', vocabs: [], isHomework: false }]})} className="w-full py-10 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-slate-200 font-black text-xl hover:bg-slate-50 transition-all">+ 添加新句段</button>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-8 max-w-xl mx-auto py-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">课程名称</label>
                <input className="w-full p-5 bg-slate-50 rounded-2xl text-xl font-black outline-none border-2 border-transparent focus:border-indigo-400" value={lesson.title} onChange={(e) => setLesson({...lesson, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">YouTube 视频链接</label>
                <input className="w-full p-5 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-400 font-mono text-indigo-600" value={lesson.videoUrl} onChange={(e) => setLesson({...lesson, videoUrl: e.target.value})} />
              </div>
            </div>
          )}
        </div>
      </main>

      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 no-print">
           <div className="bg-white rounded-[3rem] p-12 max-w-2xl w-full shadow-2xl">
              <h3 className="text-3xl font-black text-slate-800 mb-2">批量导入文本</h3>
              <p className="text-slate-400 mb-8 font-medium">每行文字自动生成一个句段 (默认为不选为作业)。</p>
              <textarea className="w-full h-72 p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100 focus:outline-none focus:border-indigo-400 font-medium text-lg" placeholder="在此粘贴多行文本..." value={batchText} onChange={(e) => setBatchText(e.target.value)}></textarea>
              <div className="flex gap-4 mt-10">
                 <button onClick={() => setShowBatchModal(false)} className="flex-1 py-5 bg-slate-100 rounded-2xl font-bold text-slate-500">取消</button>
                 <button onClick={() => {
                   const lines = batchText.split('\n').filter(l => l.trim().length > 0);
                   const newLyrics: LyricLine[] = lines.map((text, idx) => ({ id: Math.random().toString(36).substr(2, 9), startTime: 0, endTime: 0, chinese: text.trim(), pinyin: '', english: '', vocabs: [], isHomework: false }));
                   setLesson({ ...lesson, lyrics: [...lesson.lyrics, ...newLyrics] });
                   setBatchText(''); setShowBatchModal(false);
                 }} className="flex-1 py-5 bg-indigo-600 rounded-2xl font-bold text-white">确认导入</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TeacherEditor;