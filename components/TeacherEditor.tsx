
import React, { useState, useRef, useEffect } from 'react';
import { LessonData, LyricLine, Vocab, Database, Student } from '../types';

interface Props {
  onOpenClassroom: (lesson: LessonData) => void;
}

const TeacherEditor: React.FC<Props> = ({ onOpenClassroom }) => {
  const [db, setDb] = useState<Database>(() => {
    const saved = localStorage.getItem('teaching_db');
    return saved ? JSON.parse(saved) : { lessons: {}, students: [] };
  });

  // 新增：云端数据源配置
  const [cloudBaseUrl, setCloudBaseUrl] = useState(() => {
    return localStorage.getItem('teacher_cloud_url') || '';
  });

  useEffect(() => {
    localStorage.setItem('teacher_cloud_url', cloudBaseUrl);
  }, [cloudBaseUrl]);

  const [lesson, setLesson] = useState<LessonData>(() => {
    const savedId = localStorage.getItem('last_lesson_id');
    if (savedId && db.lessons[savedId]) return db.lessons[savedId];
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveToDb = (updatedLesson: LessonData) => {
    const newDb = { ...db, lessons: { ...db.lessons, [updatedLesson.id]: updatedLesson } };
    setDb(newDb);
    localStorage.setItem('teaching_db', JSON.stringify(newDb));
    localStorage.setItem('last_lesson_id', updatedLesson.id);
  };

  const handleManualSave = () => {
    saveToDb(lesson);
    alert('✅ 保存成功！');
  };

  const exportStudentPackage = (studentId: string) => {
    const student = db.students.find(s => s.id === studentId);
    if (!student) return;

    const filteredLessons: Record<string, LessonData> = {};
    student.assignedLessons.forEach(id => {
      if (db.lessons[id]) filteredLessons[id] = db.lessons[id];
    });

    const pkg = { lessons: filteredLessons, students: [student] };
    // 文件名与 studentId 绑定，方便老师直接丢进 public 文件夹
    downloadJson(JSON.stringify(pkg, null, 2), `${studentId}.json`);
    alert(`已生成 ${studentId}.json。请将其上传到您的公共文件夹中。`);
  };

  const downloadJson = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setDb(imported);
        localStorage.setItem('teaching_db', JSON.stringify(imported));
        alert("数据库导入成功！");
        window.location.reload();
      } catch (err) { alert("格式错误。"); }
    };
    reader.readAsText(file);
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

  const updateVocab = (lineId: string, vIdx: number, field: keyof Vocab, val: string) => {
    setLesson({
      ...lesson,
      lyrics: lesson.lyrics.map(l => l.id === lineId ? {
        ...l,
        vocabs: l.vocabs.map((v, i) => i === vIdx ? { ...v, [field]: val } : v)
      } : l)
    });
  };

  const addStudent = () => {
    const name = prompt("学生姓名 (如: John):");
    if (!name) return;
    // 强制使用简单的 ID 格式，方便作为文件名
    const studentId = name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 90 + 10);
    const newStudent: Student = { id: studentId, name, assignedLessons: [] };
    const newDb = { ...db, students: [...db.students, newStudent] };
    setDb(newDb);
    localStorage.setItem('teaching_db', JSON.stringify(newDb));
  };

  const assignToStudent = (studentId: string) => {
    const newDb = { ...db };
    const s = newDb.students.find(item => item.id === studentId);
    if (s && !s.assignedLessons.includes(lesson.id)) {
      s.assignedLessons.push(lesson.id);
      setDb({ ...newDb });
      localStorage.setItem('teaching_db', JSON.stringify(newDb));
      alert(`已指派课程《${lesson.title}》给 ${s.name}`);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20 no-print font-sans">
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
             <i className="fa-solid fa-chalkboard-user"></i>
          </div>
          <h1 className="font-bold text-slate-800">Mandarin Pro Editor</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => fileInputRef.current?.click()} className="bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-200">全量导入</button>
          <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
          <button onClick={() => downloadJson(JSON.stringify(db), 'full_backup.json')} className="bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-200">全量导出</button>
          <button onClick={handleManualSave} className="bg-emerald-500 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-emerald-600 text-sm">
            <i className="fa-solid fa-save"></i> 保存
          </button>
          <button onClick={() => onOpenClassroom(lesson)} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 text-sm">
            <i className="fa-solid fa-play"></i> 上课模式
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8 px-6">
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
                <p className="text-indigo-600 text-sm font-medium">在此编辑视频句段和拼音。</p>
                <button onClick={() => setShowBatchModal(true)} className="ml-auto bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold">批量导入文本</button>
              </div>

              {lesson.lyrics.map((line, idx) => (
                <div key={line.id} className="flex gap-8 relative pb-10 border-b border-slate-50 last:border-0 group">
                  <div className="w-24 flex flex-col items-center gap-3">
                    <span className="text-4xl font-black text-slate-100 italic group-hover:text-indigo-100">#{idx + 1}</span>
                    <div className="space-y-1.5 w-full">
                      <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-center text-[11px] font-bold" value={line.startTime} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, startTime: Number(e.target.value)} : l)})} />
                      <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-center text-[11px] font-bold" value={line.endTime} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, endTime: Number(e.target.value)} : l)})} />
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <input className="w-full text-3xl font-black text-slate-800 placeholder-slate-100 focus:outline-none" placeholder="中文..." value={line.chinese} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, chinese: e.target.value} : l)})} />
                    <input className="w-full text-lg text-slate-400 placeholder-slate-100 focus:outline-none font-medium" placeholder="拼音..." value={line.pinyin} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, pinyin: e.target.value} : l)})} />
                    <input className="w-full text-slate-400 italic text-sm placeholder-slate-100 focus:outline-none" placeholder="翻译..." value={line.english} onChange={(e) => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, english: e.target.value} : l)})} />
                    
                    <div className="flex flex-wrap gap-2 pt-2">
                      {line.vocabs.map((v, vIdx) => (
                        <div key={vIdx} className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl flex gap-2 items-center text-xs">
                          <input placeholder="字" className="w-8 font-bold border-r outline-none bg-transparent" value={v.char} onChange={(e) => updateVocab(line.id, vIdx, 'char', e.target.value)} />
                          <input placeholder="拼音" className="w-14 border-r outline-none bg-transparent" value={v.pinyin} onChange={(e) => updateVocab(line.id, vIdx, 'pinyin', e.target.value)} />
                          <input placeholder="释义" className="w-24 outline-none bg-transparent" value={v.explanation} onChange={(e) => updateVocab(line.id, vIdx, 'explanation', e.target.value)} />
                          <button onClick={() => setLesson({...lesson, lyrics: lesson.lyrics.map(l => l.id === line.id ? {...l, vocabs: l.vocabs.filter((_, i) => i !== vIdx)} : l)})} className="text-slate-300 hover:text-red-400"><i className="fa-solid fa-times"></i></button>
                        </div>
                      ))}
                      <button onClick={() => addVocab(line.id)} className="px-4 py-2 border-2 border-dashed border-slate-100 rounded-xl text-slate-300 text-[10px] font-bold hover:text-indigo-400">+ 词汇解释</button>
                    </div>
                  </div>
                  <button onClick={() => setLesson({...lesson, lyrics: lesson.lyrics.filter(l => l.id !== line.id)})} className="absolute top-0 right-0 text-slate-100 hover:text-red-400 opacity-0 group-hover:opacity-100"><i className="fa-solid fa-trash-can"></i></button>
                </div>
              ))}
              <button onClick={() => setLesson({...lesson, lyrics: [...lesson.lyrics, { id: Date.now().toString(), startTime: 0, endTime: 0, chinese: '', pinyin: '', english: '', vocabs: [], isHomework: true }]})} className="w-full py-10 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-slate-200 font-black text-xl hover:bg-slate-50 hover:text-indigo-400">+ 添加新句段</button>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-12">
              {/* 云端数据源设置 */}
              <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100">
                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-cloud text-indigo-500"></i> 云端同步设置 (由老师配置)
                </h3>
                <p className="text-sm text-slate-500 mb-6 font-medium">在此输入您的 GitHub Pages 或静态网站 URL。学生将从此地址自动拉取作业。</p>
                <div className="flex gap-4">
                  <input 
                    className="flex-1 p-4 rounded-xl border-2 border-white focus:border-indigo-400 outline-none font-mono text-xs shadow-inner" 
                    placeholder="https://yourname.github.io/mandarin-data/"
                    value={cloudBaseUrl}
                    onChange={(e) => setCloudBaseUrl(e.target.value)}
                  />
                  <button onClick={() => alert("配置已保存！")} className="bg-white border-2 border-indigo-100 text-indigo-600 px-6 py-4 rounded-xl font-black text-xs hover:bg-indigo-50">保存配置</button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-800">学生名册</h3>
                <button onClick={addStudent} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700">+ 新建学生</button>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {db.students.map(s => (
                  <div key={s.id} className="bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] hover:border-indigo-100 transition-all group">
                    <div className="flex justify-between mb-8">
                      <div>
                        <h4 className="text-2xl font-black text-slate-800">{s.name}</h4>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">文件名: {s.id}.json</p>
                      </div>
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <i className="fa-solid fa-user-graduate text-xl"></i>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <button onClick={() => assignToStudent(s.id)} className="w-full bg-indigo-50 text-indigo-600 py-4 rounded-2xl font-black text-sm hover:bg-indigo-100">指派当前课程</button>
                      <button onClick={() => exportStudentPackage(s.id)} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm shadow-lg hover:bg-emerald-600">
                        <i className="fa-solid fa-download"></i> 导出作业包 (准备上传)
                      </button>
                      <div className="pt-2 text-[9px] text-slate-400 font-bold leading-relaxed">
                        学生访问: <span className="text-indigo-400 select-all">{window.location.origin}/#/student/{s.id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'info' && (
             <div className="space-y-10 max-w-2xl mx-auto py-10">
               <div className="space-y-3">
                 <label className="text-xs font-black text-slate-300 uppercase tracking-widest">课程标题</label>
                 <input className="w-full p-6 bg-slate-50 rounded-[1.5rem] text-2xl font-black outline-none border-2 border-transparent focus:border-indigo-400 shadow-inner" value={lesson.title} onChange={(e) => setLesson({...lesson, title: e.target.value})} />
               </div>
               <div className="space-y-3">
                 <label className="text-xs font-black text-slate-300 uppercase tracking-widest">YouTube 链接/ID</label>
                 <input className="w-full p-6 bg-slate-50 rounded-[1.5rem] outline-none border-2 border-transparent focus:border-indigo-400 font-mono text-indigo-600 shadow-inner" value={lesson.videoUrl} onChange={(e) => setLesson({...lesson, videoUrl: e.target.value})} />
               </div>
             </div>
          )}
        </div>
      </main>

      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white rounded-[3rem] p-12 max-w-2xl w-full shadow-2xl">
              <h3 className="text-3xl font-black text-slate-800 mb-2">批量粘贴</h3>
              <textarea className="w-full h-72 p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100 focus:outline-none focus:border-indigo-400 font-medium text-lg" placeholder="在此粘贴文本..." value={batchText} onChange={(e) => setBatchText(e.target.value)}></textarea>
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
