
import React, { useState, useEffect } from 'react';
import TeacherEditor from './components/TeacherEditor';
import ClassroomView from './components/ClassroomView';
import StudentView from './components/StudentView';
import { LessonData } from './types';

const TEACHER_CODE = "2110";

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'teacher' | 'classroom' | 'student'>('landing');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [activeLesson, setActiveLesson] = useState<LessonData | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;

      if (hash.startsWith('#/student/')) {
        const id = hash.replace('#/student/', '');
        setStudentId(id);
        setView('student');
      } else if (hash === '#/classroom') {
        const saved = localStorage.getItem('activeLesson');
        if (saved) {
          setActiveLesson(JSON.parse(saved));
          setView('classroom');
        } else {
          window.location.hash = '#/teacher';
        }
      } else if (hash === '#/teacher') {
        setView('teacher');
      } else {
        setView('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === TEACHER_CODE) {
      window.location.hash = '#/teacher';
    } else {
      setError('错误验证码');
    }
  };

  const loadLessonForClass = (lesson: LessonData) => {
    localStorage.setItem('activeLesson', JSON.stringify(lesson));
    setActiveLesson(lesson);
    window.location.hash = '#/classroom';
  };

  return (
    <div className="min-h-screen">
      {view === 'landing' && (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
          <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center border-4 border-white">
            <div className="mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                <i className="fa-solid fa-graduation-cap text-3xl"></i>
              </div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">1on1 语言教学系统</h1>
              <p className="text-slate-400 text-sm mt-2 font-medium">老师请登录，学生请点击您的专属链接</p>
            </div>
            
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <input 
                type="password" 
                placeholder="教师访问码" 
                className="w-full px-5 py-3 rounded-xl border-2 border-slate-100 focus:outline-none focus:border-indigo-400 text-center text-lg tracking-widest font-black"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
              />
              {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl transition-all shadow-lg active:scale-95">
                进入管理后台
              </button>
            </form>
          </div>
        </div>
      )}

      {view === 'teacher' && <TeacherEditor onOpenClassroom={loadLessonForClass} />}
      {view === 'classroom' && <ClassroomView lesson={activeLesson} />}
      {view === 'student' && studentId && <StudentView studentId={studentId} />}
    </div>
  );
};

export default App;
