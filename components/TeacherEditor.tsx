import React, { useState, useRef, useEffect } from 'react';
import { LessonData, LyricLine, Vocab, Database, Student, Question } from '../types';

interface Props {
  onOpenClassroom: (lesson: LessonData) => void;
}

const TeacherEditor: React.FC<Props> = ({ onOpenClassroom }) => {
  // 安全解析数据库
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

  // 安全解析当前课程
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
    return `${baseUrl}#/student/${id}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('链接已复制到剪贴板');
  };

  const exportStudentPackage = (studentId: string) => {
    const student = db.students.find(s => s.id === studentId);
    if (!student) return;
    const filteredLessons: Record<string, LessonData> = {};
    student.assignedLessons.forEach(id => {
      if (db.lessons[id]) filteredLessons[id] = db.lessons[id];
    });
    const pkg = { lessons: filteredLessons, students: [student] };
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${studentId}.json`;
    link.click();
    alert(`【导出成功】请将 ${studentId}.json 上传到您的 GitHub 仓库中。`);
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

  const addQuestion = () => {
    const newQ: Question = {
      id: Date.now().toString(),
      timestamp: 0,
      question: '请在此输入问题内容',
      options: ['', ''],
      correctIndex: 0
    };
    setLesson({ ...lesson, questions: [...lesson.questions, newQ] });
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
          <button onClick={handlePrint} className="bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all flex items-center gap-2">
            <i className="fa-solid fa-file-pdf"></i> 导出 PDF 讲义
          </button>
          <button onClick={handleManualSave} className="bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-emerald-600 transition-all text-sm">
            <i className="fa-solid fa-save"></i> 保存课程
          </button>
          <button onClick={() => { saveToDb(lesson); onOpenClassroom(lesson); }} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all text-sm">
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
                <i className="fa-solid fa-pencil text-indigo-500"></i>
                <p className="text-indigo-600 text-sm font-medium">在此编辑视频句段。勾选右侧“选为作业”后，该句将出现在学生的复习练习中。</p>
                <button onClick={() => setShowBatchModal(true)} className="ml-auto bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold">批量导入文本</button>
              </div>

              {lesson.lyrics.map((line, idx) => (
                <div key={line.id} className="flex gap-8 relative pb-10 border-b border-slate-50 last:border-0 group">
                  <div className="w-24 flex flex-col items-center gap-3">
                    <span className="text-4xl font-black text-slate-100 italic group-hover:text-indigo-100 transition-colors">#{idx + 1}</span>
                    <div className="space-y-1.5 w-full">
                      <input type="number" step="0.1" className="w-full bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-center text-[11px] font-bold outline-none" value={line.startTime} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, startTime: Number(e.target.value)} : l)})} />
                      <input type="number" step="0.1" className="w-full bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-center text-[11px] font-bold outline-none" value={line.endTime} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, endTime: Number(e.target.value)} : l)})} />
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
                    <input className="w-full text-lg text-slate-400 placeholder-slate-100 focus:outline-none font-medium" placeholder="拼音..." value={line.pinyin} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, pinyin: e.target.value} : l)})} />
                    <input className="w-full text-slate-400 italic text-sm placeholder-slate-100 focus:outline-none" placeholder="英文翻译..." value={line.english} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, english: e.target.value} : l)})} />
                    
                    <div className="flex flex-wrap gap-2 pt-2">
                      {line.vocabs.map((v, vIdx) => (
                        <div key={vIdx} className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl flex gap-2 items-center text-xs shadow-sm">
                          <input placeholder="字" className="w-8 font-bold border-r outline-none bg-transparent" value={v.char} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, vocabs: l.vocabs.map((v_old, i) => i === vIdx ? {...v_old, char: e.target.value} : v_old)} : l)})} />
                          <input placeholder="拼音" className="w-14 border-r outline-none bg-transparent" value={v.pinyin} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, vocabs: l.vocabs.map((v_old, i) => i === vIdx ? {...v_old, pinyin: e.target.value} : v_old)} : l)})} />
                          <input placeholder="释义" className="w-24 outline-none bg-transparent" value={v.explanation} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, vocabs: l.vocabs.map((v_old, i) => i === vIdx ? {...v_old, explanation: e.target.value} : v_old)} : l)})} />
                          <button onClick={() => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, vocabs: l.vocabs.filter((_, i) => i !== vIdx)} : l)})} className="text-slate-300 hover:text-red-400"><i className="fa-solid fa-times"></i></button>
                        </div>
                      ))}
                      <button onClick={() => addVocab(line.id)} className="px-4 py-2 border-2 border-dashed border-slate-100 rounded-xl text-slate-300 text-[10px] font-bold hover:text-indigo-400">+ 添加重点词汇</button>
                    </div>
                  </div>
                  <button onClick={() => setLesson({...lesson, lyrics: lesson.lyrics.filter(l => l.id !== line.id)})} className="absolute top-0 right-[-3rem] text-slate-100 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-trash-can"></i></button>
                </div>
              ))}
              <button onClick={() => setLesson({...lesson, lyrics: [...lesson.lyrics, { id: Date.now().toString(), startTime: 0, endTime: 0, chinese: '', pinyin: '', english: '', vocabs: [], isHomework: true }]})} className="w-full py-10 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-slate-200 font-black text-xl hover:bg-slate-50 hover:text-indigo-400 transition-all">+ 添加新句段</button>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">课堂互动练习</h3>
                <button onClick={addQuestion} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all">+ 新增题目</button>
              </div>
              {lesson.questions.map((q, qIdx) => (
                <div key={q.id} className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100 space-y-6">
                  <div className="flex gap-4">
                    <div className="w-24">
                       <label className="text-[10px] font-black text-slate-400 block mb-1">触发秒数</label>
                       <input type="number" className="w-full p-3 rounded-xl border outline-none focus:border-indigo-400 font-mono" value={q.timestamp} onChange={(e) => setLesson({...lesson, questions: lesson.questions.map(item => item.id === q.id ? {...item, timestamp: Number(e.target.value)} : item)})} />
                    </div>
                    <div className="flex-1">
                       <label className="text-[10px] font-black text-slate-400 block mb-1">问题内容</label>
                       <input className="w-full p-3 rounded-xl border outline-none focus:border-indigo-400 font-bold" value={q.question} onChange={(e) => setLesson({...lesson, questions: lesson.questions.map(item => item.id === q.id ? {...item, question: e.target.value} : item)})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input type="radio" checked={q.correctIndex === oIdx} onChange={() => setLesson({...lesson, questions: lesson.questions.map(item => item.id === q.id ? {...item, correctIndex: oIdx} : item)})} className="w-5 h-5 accent-emerald-500" />
                        <input className="flex-1 p-3 rounded-xl border text-sm outline-none focus:border-indigo-400" value={opt} onChange={(e) => {
                          const newOpts = [...q.options];
                          newOpts[oIdx] = e.target.value;
                          setLesson({...lesson, questions: lesson.questions.map(item => item.id === q.id ? {...item, options: newOpts} : item)});
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-12">
               <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100">
                 <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><i className="fa-solid fa-cloud text-indigo-500"></i> 云端同步设置</h3>
                 <p className="text-xs text-slate-400 mb-4">填入您的 GitHub Pages 部署地址，以便学生端自动拉取最新课件。</p>
                 <input className="w-full p-4 rounded-xl border-2 border-white outline-none font-mono text-xs shadow-inner" placeholder="例如: https://yourusername.github.io/repo-name/" value={cloudBaseUrl} onChange={(e) => setCloudBaseUrl(e.target.value)} />
               </div>
               <div className="grid grid-cols-2 gap-8">
                 {db.students.map(s => (
                   <div key={s.id} className="bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] group hover:border-indigo-200 transition-all shadow-sm">
                     <div className="flex justify-between items-start mb-6">
                        <h4 className="text-2xl font-black text-slate-800">{s.name}</h4>
                        <span className="text-[10px] font-mono text-slate-300">ID: {s.id}</span>
                     </div>
                     <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">专属学生链接</p>
                        <div className="flex gap-2">
                           <input readOnly className="flex-1 bg-transparent text-[11px] font-mono text-indigo-600 outline-none overflow-hidden text-ellipsis" value={getStudentUrl(s.id)} />
                           <button onClick={() => copyToClipboard(getStudentUrl(s.id))} className="text-indigo-600 hover:text-indigo-800"><i className="fa-solid fa-copy"></i></button>
                        </div>
                     </div>
                     <div className="space-y-3">
                       <button onClick={() => {
                          const newDb = {...db};
                          const student = newDb.students.find(item => item.id === s.id);
                          if(student && !student.assignedLessons.includes(lesson.id)) { student.assignedLessons.push(lesson.id); setDb(newDb); localStorage.setItem('teaching_db', JSON.stringify(newDb)); alert("当前课程已指派给该学生"); } else { alert("该学生已有此课程"); }
                       }} className="w-full bg-indigo-50 text-indigo-600 py-4 rounded-2xl font-black text-sm hover:bg-indigo-100 transition-all">指派当前课程</button>
                       <button onClick={() => exportStudentPackage(s.id)} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm shadow-md hover:bg-emerald-600">导出作业 JSON</button>
                       <button onClick={() => {
                          if(confirm("确定要删除该学生吗？")) {
                            const newDb = {...db, students: db.students.filter(item => item.id !== s.id)};
                            setDb(newDb); localStorage.setItem('teaching_db', JSON.stringify(newDb));
                          }
                       }} className="w-full text-slate-300 py-2 text-xs hover:text-red-400">删除学生</button>
                     </div>
                   </div>
                 ))}
                 <button onClick={() => {
                    const name = prompt("输入学生姓名:");
                    if (name) {
                      const id = name.toLowerCase().replace(/\s+/g,'_') + '_' + Math.floor(Math.random()*90+10);
                      const newDb = {...db, students: [...db.students, {id, name, assignedLessons: []}]};
                      setDb(newDb); localStorage.setItem('teaching_db', JSON.stringify(newDb));
                    }
                 }} className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-12 text-slate-200 font-black text-xl hover:text-indigo-400 hover:bg-slate-50 transition-all group">
                    <i className="fa-solid fa-plus-circle text-4xl mb-4 group-hover:scale-110 transition-transform"></i><br/>添加新学生
                 </button>
               </div>
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

      {/* 打印专用区域 */}
      <div className="print-section p-10">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">{lesson.title}</h1>
          <p className="text-slate-400 text-xl font-medium tracking-widest uppercase">学习讲义 / STUDY HANDOUT</p>
        </div>
        {lesson.lyrics.map((line, idx) => (
          <div key={line.id} className="lyric-item mb-12 pb-8">
            <div className="flex flex-wrap gap-x-12 gap-y-16 mb-10">
              {Array.from(line.chinese.replace(/\s/g,'')).map((c, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-lg text-slate-400 font-bold mb-2 uppercase tracking-tighter">{line.pinyin.split(/\s+/)[i] || ''}</span>
                  <span className="text-6xl font-bold pb-2">{c}</span>
                </div>
              ))}
            </div>
            <p className="italic text-slate-500 text-3xl mb-8">"{line.english}"</p>
            {line.vocabs.length > 0 && (
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-8 rounded-3xl">
                {line.vocabs.map((v, vi) => (
                  <div key={vi} className="text-xl">
                    <span className="font-bold text-indigo-600 text-2xl">{v.char}</span>
                    <span className="text-slate-400 ml-3">({v.pinyin})</span>
                    <span className="ml-6 text-slate-700 font-medium">{v.explanation}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white rounded-[3rem] p-12 max-w-2xl w-full shadow-2xl">
              <h3 className="text-3xl font-black text-slate-800 mb-2">批量导入文本</h3>
              <p className="text-slate-400 mb-8 font-medium">每行文字自动生成一个句段。</p>
              <textarea className="w-full h-72 p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100 focus:outline-none focus:border-indigo-400 font-medium text-lg" placeholder="在此粘贴多行文本..." value={batchText} onChange={(e) => setBatchText(e.target.value)}></textarea>
              <div className="flex gap-4 mt-10">
                 <button onClick={() => setShowBatchModal(false)} className="flex-1 py-5 bg-slate-100 rounded-2xl font-bold text-slate-500">取消</button>
                 <button onClick={() => {
                   const lines = batchText.split('\n').filter(l => l.trim().length > 0);
                   const newLyrics: LyricLine[] = lines.map((text, idx) => ({ id: Math.random().toString(36).substr(2, 9), startTime: idx * 5, endTime: (idx + 1) * 5, chinese: text.trim(), pinyin: '', english: '', vocabs: [], isHomework: true }));
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