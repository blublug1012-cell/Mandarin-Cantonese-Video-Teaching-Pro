
import React, { useState, useEffect } from 'react';
import { LessonData, LyricLine, Question, Language, Vocab, StudentResult } from '../types';

interface Props {
  onOpenClassroom: (lesson: LessonData) => void;
}

const TeacherEditor: React.FC<Props> = ({ onOpenClassroom }) => {
  const [lesson, setLesson] = useState<LessonData>(() => {
    const saved = localStorage.getItem('currentLesson');
    return saved ? JSON.parse(saved) : {
      id: Date.now().toString(),
      title: '我的中文课',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      language: 'Mandarin',
      lyrics: [],
      questions: []
    };
  });

  const [activeTab, setActiveTab] = useState<'info' | 'lyrics' | 'questions' | 'students'>('info');
  const [mockResults, setMockResults] = useState<StudentResult[]>([]);

  useEffect(() => {
    localStorage.setItem('currentLesson', JSON.stringify(lesson));
  }, [lesson]);

  const addLyricLine = () => {
    const lastLine = lesson.lyrics[lesson.lyrics.length - 1];
    const newLine: LyricLine = {
      id: Math.random().toString(36).substr(2, 9),
      startTime: lastLine ? lastLine.endTime : 0,
      endTime: lastLine ? lastLine.endTime + 5 : 5,
      chinese: '',
      pinyin: '',
      english: '',
      vocabs: [],
      isHomework: true
    };
    setLesson({ ...lesson, lyrics: [...lesson.lyrics, newLine] });
  };

  const updateLyric = (id: string, field: keyof LyricLine, value: any) => {
    setLesson({
      ...lesson,
      lyrics: lesson.lyrics.map(l => l.id === id ? { ...l, [field]: value } : l)
    });
  };

  const addQuestion = () => {
    const newQ: Question = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: 0,
      question: '这是一个什么问题？',
      options: ['选项A', '选项B', '选项C', '选项D'],
      correctIndex: 0
    };
    setLesson({ ...lesson, questions: [...lesson.questions, newQ] });
  };

  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setLesson({
      ...lesson,
      questions: lesson.questions.map(q => q.id === id ? { ...q, [field]: value } : q)
    });
  };

  const addVocabToLine = (lyricId: string) => {
    const char = prompt("输入要解释的汉字 (e.g. 老师):");
    if (!char) return;
    const pinyin = prompt("输入拼音/粤拼 (e.g. lǎo shī):");
    const explanation = prompt("输入解释 (e.g. teacher):");
    
    setLesson({
      ...lesson,
      lyrics: lesson.lyrics.map(l => {
        if (l.id === lyricId) {
          return { ...l, vocabs: [...l.vocabs, { char, pinyin: pinyin || '', explanation: explanation || '' }] };
        }
        return l;
      })
    });
  };

  const exportJSON = (studentId?: string) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lesson, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", studentId ? `${studentId}_homework.json` : `lesson_config.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <h2 className="text-xl font-bold flex items-center gap-3 text-indigo-600">
          <div className="bg-indigo-100 p-2 rounded-xl">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
          </div>
          教师课程管理系统
        </h2>
        <div className="flex gap-3">
          <button 
            onClick={() => onOpenClassroom(lesson)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            <i className="fa-solid fa-chalkboard"></i> 进入上课模式
          </button>
          <button 
            onClick={() => window.print()}
            className="bg-white border-2 border-slate-200 hover:border-indigo-200 hover:text-indigo-600 px-5 py-2.5 rounded-xl font-bold transition-all"
          >
            <i className="fa-solid fa-file-pdf mr-1"></i> 导出PDF讲义
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto mt-8 px-6">
        <nav className="flex gap-2 mb-8 bg-slate-200/50 p-1.5 rounded-2xl w-fit mx-auto">
          {(['info', 'lyrics', 'questions', 'students'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-2.5 rounded-xl font-bold transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab === 'info' && '1. 课堂信息'}
              {tab === 'lyrics' && '2. 歌词与作业选择'}
              {tab === 'questions' && '3. 视频互动题'}
              {tab === 'students' && '4. 布置作业'}
            </button>
          ))}
        </nav>

        <div className="bg-white rounded-[2rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[600px]">
          {activeTab === 'info' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-1">课程标题</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-400 focus:bg-white focus:outline-none transition-all text-lg font-bold"
                    value={lesson.title}
                    onChange={(e) => setLesson({...lesson, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-1">教学语言</label>
                  <div className="flex gap-4">
                    {['Mandarin', 'Cantonese'].map(lang => (
                      <button
                        key={lang}
                        onClick={() => setLesson({...lesson, language: lang as Language})}
                        className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-all ${lesson.language === lang ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                      >
                        {lang === 'Mandarin' ? '普通话' : '粤语'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-1">YouTube 视频 ID 或完整链接</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                    <i className="fa-brands fa-youtube text-xl"></i>
                  </div>
                  <input 
                    type="text" 
                    placeholder="例如: dQw4w9WgXcQ"
                    className="w-full pl-14 pr-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-400 focus:bg-white focus:outline-none transition-all"
                    value={lesson.videoUrl}
                    onChange={(e) => setLesson({...lesson, videoUrl: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'lyrics' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
              <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-6">
                <p className="text-sm text-indigo-600 font-bold"><i className="fa-solid fa-info-circle mr-2"></i>勾选 "布置作业" 即可将该行加入学生的练习内容。</p>
              </div>
              {lesson.lyrics.map((line, idx) => (
                <div key={line.id} className="group p-8 rounded-[2rem] bg-slate-50 hover:bg-white hover:shadow-lg border-2 border-transparent hover:border-indigo-100 transition-all relative">
                  <div className="flex gap-8">
                    <div className="w-32 space-y-4 pt-1 flex flex-col items-center">
                      <div className="text-center font-bold text-indigo-300 text-3xl mb-2 italic">#{idx+1}</div>
                      <div className="flex flex-col gap-2 w-full">
                        <input 
                          type="number" step="0.1"
                          className="w-full px-2 py-1.5 rounded-lg border text-center text-xs font-bold"
                          value={line.startTime}
                          onChange={(e) => updateLyric(line.id, 'startTime', parseFloat(e.target.value))}
                        />
                        <input 
                          type="number" step="0.1"
                          className="w-full px-2 py-1.5 rounded-lg border text-center text-xs font-bold"
                          value={line.endTime}
                          onChange={(e) => updateLyric(line.id, 'endTime', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="mt-4 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase">布置作业</span>
                        <button 
                          onClick={() => updateLyric(line.id, 'isHomework', !line.isHomework)}
                          className={`w-12 h-6 rounded-full relative transition-all ${line.isHomework ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${line.isHomework ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <input 
                        type="text" placeholder="输入中文字幕..."
                        className="w-full text-2xl font-bold bg-transparent border-b-2 border-slate-200 focus:border-indigo-500 focus:outline-none py-2"
                        value={line.chinese}
                        onChange={(e) => updateLyric(line.id, 'chinese', e.target.value)}
                      />
                      <input 
                        type="text" placeholder="拼音对照 (对应每个字，空格分隔)"
                        className="w-full text-lg font-medium text-slate-400 bg-transparent border-b-2 border-slate-100 focus:border-indigo-300 focus:outline-none py-1"
                        value={line.pinyin}
                        onChange={(e) => updateLyric(line.id, 'pinyin', e.target.value)}
                      />
                      <input 
                        type="text" placeholder="英文翻译..."
                        className="w-full text-slate-400 italic bg-transparent focus:outline-none"
                        value={line.english}
                        onChange={(e) => updateLyric(line.id, 'english', e.target.value)}
                      />
                      <div className="pt-4 flex flex-wrap gap-2">
                        {line.vocabs.map((v, vIdx) => (
                          <div key={vIdx} className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 group/v">
                            {v.char} <span className="opacity-50 font-normal">({v.pinyin})</span>
                            <button onClick={() => {
                              updateLyric(line.id, 'vocabs', line.vocabs.filter((_, i) => i !== vIdx));
                            }} className="hover:text-red-500"><i className="fa-solid fa-circle-xmark"></i></button>
                          </div>
                        ))}
                        <button 
                          onClick={() => addVocabToLine(line.id)}
                          className="px-4 py-1.5 rounded-full text-sm font-bold border-2 border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all"
                        >
                          + 添加单词解释
                        </button>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setLesson({...lesson, lyrics: lesson.lyrics.filter(l => l.id !== line.id)})}
                    className="absolute -right-3 -top-3 w-10 h-10 bg-white shadow-lg text-red-500 rounded-full flex items-center justify-center border hover:bg-red-50 transition-all scale-0 group-hover:scale-100"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              ))}
              <button 
                onClick={addLyricLine}
                className="w-full py-10 border-4 border-dashed border-slate-100 rounded-[2rem] text-slate-300 hover:text-indigo-400 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all flex flex-col items-center gap-2"
              >
                <i className="fa-solid fa-plus-circle text-4xl"></i>
                <span className="text-xl font-bold">添加新句子</span>
              </button>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-6">
                <p className="text-slate-400 text-sm">上课过程中，视频运行到指定秒数会自动暂停并弹出题目。</p>
                <button onClick={addQuestion} className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-all">+ 新增课堂互动题</button>
              </div>
              {lesson.questions.map((q, idx) => (
                <div key={q.id} className="p-8 rounded-3xl bg-slate-50 border-2 border-slate-100 space-y-4">
                  <div className="flex gap-4 items-center">
                    <div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">{idx + 1}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-400 uppercase">触发时间(秒):</span>
                      <input 
                        type="number" step="1" 
                        className="w-20 px-3 py-1 rounded-lg border font-bold"
                        value={q.timestamp}
                        onChange={(e) => updateQuestion(q.id, 'timestamp', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  <input 
                    type="text" 
                    placeholder="输入问题内容..."
                    className="w-full text-xl font-bold bg-white px-5 py-3 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={q.question}
                    onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="relative group">
                        <input 
                          type="text" 
                          className={`w-full pl-12 pr-4 py-3 rounded-xl border focus:outline-none transition-all ${q.correctIndex === oIdx ? 'border-emerald-500 bg-emerald-50' : 'bg-white'}`}
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...q.options];
                            newOpts[oIdx] = e.target.value;
                            updateQuestion(q.id, 'options', newOpts);
                          }}
                        />
                        <button 
                          onClick={() => updateQuestion(q.id, 'correctIndex', oIdx)}
                          className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 ${q.correctIndex === oIdx ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-10">
              <div className="grid grid-cols-2 gap-8">
                <div className="p-8 bg-indigo-50 rounded-[2rem] border border-indigo-100">
                  <h3 className="text-xl font-bold text-indigo-900 mb-2">生成学生专属作业</h3>
                  <p className="text-indigo-600/70 text-sm mb-6">作业将包含您在第二步中勾选的所有句子。下载后请放置在 GitHub 仓库的 `public/data/` 目录下。</p>
                  <div className="flex gap-4">
                    <input id="studentIdInput" type="text" placeholder="输入学生拼音 (如: lilei)" className="flex-1 px-5 py-3 rounded-2xl border-2 border-indigo-200 focus:outline-none focus:border-indigo-500" />
                    <button 
                      onClick={() => {
                        const sid = (document.getElementById('studentIdInput') as HTMLInputElement).value;
                        if (!sid) return alert("请输入学生ID");
                        exportJSON(sid);
                      }} 
                      className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                    >
                      点击下载 JSON
                    </button>
                  </div>
                </div>

                <div className="p-8 bg-slate-50 rounded-[2rem] border">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">批改与提交记录</h3>
                  <div className="mt-4 space-y-3 max-h-[200px] overflow-y-auto">
                    {mockResults.length === 0 ? (
                      <div className="text-center py-10">
                        <i className="fa-solid fa-clipboard-list text-slate-200 text-4xl mb-2"></i>
                        <p className="text-slate-400 text-sm italic">学生完成作业后会向您反馈成绩</p>
                      </div>
                    ) : (
                      mockResults.map((r, i) => (
                        <div key={i} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                           <span className="font-bold">{r.studentId}</span>
                           <span className="text-emerald-500 font-black">{r.score} 分</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TeacherEditor;
