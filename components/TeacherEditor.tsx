import React, { useState, useEffect } from 'react';
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
  const [newStudentName, setNewStudentName] = useState('');

  const saveToDb = (updatedLesson: LessonData, updatedDb?: Database) => {
    const finalDb = updatedDb || { ...db, lessons: { ...db.lessons, [updatedLesson.id]: updatedLesson } };
    setDb(finalDb);
    localStorage.setItem('teaching_db', JSON.stringify(finalDb));
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

  const addStudent = () => {
    if (!newStudentName.trim()) return;
    const newStudent: Student = {
      id: Math.random().toString(36).substr(2, 9),
      name: newStudentName.trim(),
      assignedLessons: [lesson.id]
    };
    const updatedDb = { ...db, students: [...db.students, newStudent] };
    saveToDb(lesson, updatedDb);
    setNewStudentName('');
  };

  const toggleLessonForStudent = (studentId: string, lessonId: string) => {
    const updatedDb = {
      ...db,
      students: db.students.map(s => {
        if (s.id === studentId) {
          const isAssigned = s.assignedLessons.includes(lessonId);
          return {
            ...s,
            assignedLessons: isAssigned 
              ? s.assignedLessons.filter(id => id !== lessonId)
              : [...s.assignedLessons, lessonId]
          };
        }
        return s;
      })
    };
    saveToDb(lesson, updatedDb);
  };

  const addQuestion = () => {
    const newQ: Question = {
      id: Date.now().toString(),
      timestamp: 0,
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0
    };
    setLesson({ ...lesson, questions: [...(lesson.questions || []), newQ] });
  };

  const getStudentUrl = (id: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const cloudParam = cloudBaseUrl ? `?c=${encodeURIComponent(btoa(cloudBaseUrl))}` : '';
    return `${baseUrl}#/student/${id}${cloudParam}`;
  };

  const deleteLyricLine = (id: string) => {
    if (confirm('确定要删除这一行吗？')) {
      setLesson({
        ...lesson,
        lyrics: lesson.lyrics.filter(l => l.id !== id)
      });
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans relative">
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm no-print">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
             <i className="fa-solid fa-chalkboard-user"></i>
          </div>
          <h1 className="font-black text-slate-800 tracking-tight">Mandarin/Cantonese Teaching Pro</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={handleManualSave} className="bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-emerald-600 text-sm transition-colors">
            <i className="fa-solid fa-save"></i> 保存
          </button>
          <button onClick={() => { saveToDb(lesson); onOpenClassroom(lesson); }} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 text-sm transition-colors">
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
              <div className="flex justify-between items-center bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-lightbulb text-indigo-400"></i>
                  <p className="text-indigo-600 text-xs font-bold uppercase tracking-wider">设置视频时间段（秒），勾选作业即会同步给学生。</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleAllHomework(true)} className="bg-white border border-indigo-200 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-50 transition-colors">全选作业</button>
                  <button onClick={() => toggleAllHomework(false)} className="bg-white border border-slate-200 text-slate-400 px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-50 transition-colors">取消全选</button>
                  <button onClick={() => setShowBatchModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-colors">批量导入</button>
                </div>
              </div>

              {lesson.lyrics.map((line, idx) => (
                <div key={line.id} className="flex gap-8 relative pb-10 border-b border-slate-50 last:border-0 group transition-all">
                  <div className="w-32 flex flex-col items-center gap-4">
                    <span className="text-4xl font-black text-slate-100 italic">#{idx + 1}</span>
                    <div className="space-y-4 w-full">
                      <div className="relative">
                        <label className="text-[9px] font-black text-slate-400 absolute -top-4 left-1 uppercase">开始秒数</label>
                        <input type="number" step="0.1" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-center text-sm font-black" value={line.startTime} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, startTime: Number(e.target.value)} : l)})} />
                      </div>
                      <div className="relative">
                        <label className="text-[9px] font-black text-slate-400 absolute -top-4 left-1 uppercase">结束秒数</label>
                        <input type="number" step="0.1" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-center text-sm font-black" value={line.endTime} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, endTime: Number(e.target.value)} : l)})} />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <input className="flex-1 text-3xl font-black text-slate-800 placeholder-slate-100 focus:outline-none" placeholder="输入中文句子..." value={line.chinese} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, chinese: e.target.value} : l)})} />
                      <div className="flex items-center gap-2">
                        <label className={`flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer transition-all border-2 ${line.isHomework ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                          <input type="checkbox" checked={line.isHomework} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, isHomework: e.target.checked} : l)})} className="w-5 h-5 accent-indigo-600" />
                          <span className="text-xs font-black uppercase whitespace-nowrap">选为作业</span>
                        </label>
                        <button 
                          onClick={() => deleteLyricLine(line.id)} 
                          className="bg-red-50 text-red-400 p-2.5 rounded-2xl border-2 border-red-100 hover:bg-red-100 hover:text-red-600 transition-all flex items-center justify-center"
                          title="删除此句"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </div>
                    <input className="w-full text-lg text-slate-400 placeholder-slate-200 focus:outline-none font-medium" placeholder="Pinyin/Jyutping (空格分隔)..." value={line.pinyin} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, pinyin: e.target.value} : l)})} />
                    
                    <div className="flex flex-wrap gap-2 pt-2">
                      {line.vocabs.map((v, vIdx) => (
                        <div key={vIdx} className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl flex gap-2 items-center text-xs shadow-sm">
                          <input placeholder="字" className="w-8 font-bold border-r outline-none bg-transparent" value={v.char} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, vocabs: l.vocabs.map((v_old, i) => i === vIdx ? {...v_old, char: e.target.value} : v_old)} : l)})} />
                          <input placeholder="拼音" className="w-14 border-r outline-none bg-transparent" value={v.pinyin} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, vocabs: l.vocabs.map((v_old, i) => i === vIdx ? {...v_old, pinyin: e.target.value} : v_old)} : l)})} />
                          <input placeholder="释义" className="w-24 outline-none bg-transparent" value={v.explanation} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, vocabs: l.vocabs.map((v_old, i) => i === vIdx ? {...v_old, explanation: e.target.value} : v_old)} : l)})} />
                          <button onClick={() => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, vocabs: l.vocabs.filter((_, i) => i !== vIdx)} : l)})} className="text-slate-300 hover:text-red-400 transition-colors"><i className="fa-solid fa-times"></i></button>
                        </div>
                      ))}
                      <button onClick={() => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, vocabs: [...l.vocabs, { char: '', pinyin: '', explanation: '' }]} : l)})} className="px-4 py-2 border-2 border-dashed border-slate-100 rounded-xl text-slate-300 text-[10px] font-bold hover:text-indigo-400 transition-colors">+ 添加重点词</button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => setLesson({...lesson, lyrics: [...lesson.lyrics, { id: Date.now().toString(), startTime: 0, endTime: 0, chinese: '', pinyin: '', english: '', vocabs: [], isHomework: false }]})} className="w-full py-10 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-slate-200 font-black text-xl hover:bg-slate-50 transition-all">+ 添加新句段</button>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-8 py-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-800">视频互动习题</h3>
                <button onClick={addQuestion} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-md hover:bg-indigo-700 transition-all">添加习题</button>
              </div>
              <div className="grid gap-6">
                {(lesson.questions || []).map((q, idx) => (
                  <div key={q.id} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6 relative group transition-all">
                    <div className="flex gap-6">
                      <div className="w-24">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">触发时间(秒)</label>
                        <input type="number" className="w-full p-4 bg-white border border-slate-100 rounded-2xl font-black text-center" value={q.timestamp} onChange={(e) => setLesson({...lesson, questions: lesson.questions.map(item => item.id === q.id ? {...item, timestamp: Number(e.target.value)} : item)})} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">问题内容</label>
                        <input className="w-full p-4 bg-white border border-slate-100 rounded-2xl font-bold" placeholder="例如：刚才视频里提到了什么？" value={q.question} onChange={(e) => setLesson({...lesson, questions: lesson.questions.map(item => item.id === q.id ? {...item, question: e.target.value} : item)})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-3">
                          <button onClick={() => setLesson({...lesson, questions: lesson.questions.map(item => item.id === q.id ? {...item, correctIndex: oIdx} : item)})} className={`w-10 h-10 rounded-xl font-black border-2 flex items-center justify-center transition-all ${q.correctIndex === oIdx ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-300 border-slate-100 hover:border-indigo-200'}`}>
                            {String.fromCharCode(65 + oIdx)}
                          </button>
                          <input className="flex-1 p-4 bg-white border border-slate-100 rounded-2xl text-sm font-medium" placeholder={`选项 ${oIdx + 1}`} value={opt} onChange={(e) => setLesson({...lesson, questions: lesson.questions.map(item => item.id === q.id ? {...item, options: item.options.map((o, i) => i === oIdx ? e.target.value : o)} : item)})} />
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setLesson({...lesson, questions: lesson.questions.filter(item => item.id !== q.id)})} className="absolute -top-3 -right-3 w-10 h-10 bg-white shadow-lg rounded-full text-red-400 hover:text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <i className="fa-solid fa-trash-can text-sm"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-12 py-6">
              <div className="bg-indigo-50 p-8 rounded-[3rem] border border-indigo-100">
                <h3 className="text-xl font-black text-indigo-900 mb-6">新增学生</h3>
                <div className="flex gap-4">
                  <input className="flex-1 p-5 bg-white rounded-[1.5rem] border-2 border-transparent focus:border-indigo-400 outline-none font-bold" placeholder="输入学生姓名..." value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
                  <button onClick={addStudent} className="bg-indigo-600 text-white px-10 py-5 rounded-[1.5rem] font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">添加并同步</button>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-2xl font-black text-slate-800">学生列表</h3>
                <div className="grid gap-6">
                  {db.students.map(s => (
                    <div key={s.id} className="bg-white border border-slate-100 p-8 rounded-[3rem] shadow-sm hover:shadow-md transition-all space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-2xl font-black uppercase">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-slate-800">{s.name}</h4>
                            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">ID: {s.id}</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => {
                            navigator.clipboard.writeText(getStudentUrl(s.id));
                            alert('专属链接已复制，请发送给学生！');
                          }} className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-indigo-100 transition-all">
                            <i className="fa-solid fa-link"></i> 复制专属链接
                          </button>
                          <button onClick={() => {
                             if(confirm(`确定删除学生 ${s.name} 吗？`)) {
                               const updatedDb = { ...db, students: db.students.filter(std => std.id !== s.id) };
                               saveToDb(lesson, updatedDb);
                             }
                          }} className="text-slate-300 hover:text-red-400 p-3 transition-all">
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-slate-50">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">当前课程作业分配</p>
                        <label className="flex items-center gap-3 cursor-pointer group">
                           <div onClick={() => toggleLessonForStudent(s.id, lesson.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${s.assignedLessons.includes(lesson.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 group-hover:border-indigo-400'}`}>
                             {s.assignedLessons.includes(lesson.id) && <i className="fa-solid fa-check text-[10px]"></i>}
                           </div>
                           <span className={`text-sm font-bold ${s.assignedLessons.includes(lesson.id) ? 'text-slate-800' : 'text-slate-400'}`}>
                             {lesson.title}
                           </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-8 max-w-xl mx-auto py-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">课程标题</label>
                <input className="w-full p-5 bg-slate-50 rounded-2xl text-xl font-black outline-none border-2 border-transparent focus:border-indigo-400" value={lesson.title} onChange={(e) => setLesson({...lesson, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">YouTube 视频 URL</label>
                <input className="w-full p-5 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-400 font-mono text-indigo-600" value={lesson.videoUrl} onChange={(e) => setLesson({...lesson, videoUrl: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">GitHub Pages 同步地址</label>
                <input className="w-full p-5 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-400 font-mono text-xs" placeholder="https://username.github.io/repo-name/" value={cloudBaseUrl} onChange={(e) => setCloudBaseUrl(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </main>

      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 no-print">
           <div className="bg-white rounded-[3rem] p-12 max-w-2xl w-full shadow-2xl">
              <h3 className="text-3xl font-black text-slate-800 mb-2">批量导入文本</h3>
              <p className="text-slate-400 mb-8 font-medium">每行文字自动生成一个句段。</p>
              <textarea className="w-full h-72 p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100 focus:outline-none focus:border-indigo-400 font-medium text-lg" placeholder="在此粘贴多行文本..." value={batchText} onChange={(e) => setBatchText(e.target.value)}></textarea>
              <div className="flex gap-4 mt-10">
                 <button onClick={() => setShowBatchModal(false)} className="flex-1 py-5 bg-slate-100 rounded-2xl font-bold text-slate-500 transition-colors">取消</button>
                 <button onClick={() => {
                   const lines = batchText.split('\n').filter(l => l.trim().length > 0);
                   const newLyrics: LyricLine[] = lines.map((text) => ({ id: Math.random().toString(36).substr(2, 9), startTime: 0, endTime: 0, chinese: text.trim(), pinyin: '', english: '', vocabs: [], isHomework: false }));
                   setLesson({ ...lesson, lyrics: [...lesson.lyrics, ...newLyrics] });
                   setBatchText(''); setShowBatchModal(false);
                 }} className="flex-1 py-5 bg-indigo-600 rounded-2xl font-bold text-white transition-colors">确认导入</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TeacherEditor;