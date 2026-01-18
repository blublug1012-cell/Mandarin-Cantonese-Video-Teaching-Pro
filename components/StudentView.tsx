
import React, { useState, useEffect } from 'react';
import YouTubePlayer from './YouTubePlayer';
import LyricLineDisplay from './LyricLineDisplay';
import { LessonData, Database, Student } from '../types';

interface Props {
  studentId: string;
}

const StudentView: React.FC<Props> = ({ studentId }) => {
  const [db, setDb] = useState<Database>(() => {
    const saved = localStorage.getItem('teaching_db');
    return saved ? JSON.parse(saved) : { lessons: {}, students: [] };
  });
  
  const [student, setStudent] = useState<Student | null>(null);
  const [activeLesson, setActiveLesson] = useState<LessonData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取老师配置的云端地址
  const cloudBaseUrl = localStorage.getItem('teacher_cloud_url') || '';

  useEffect(() => {
    const found = db.students.find(s => s.id === studentId);
    if (found) {
      setStudent(found);
    } else if (cloudBaseUrl) {
      // 如果本地找不到学生，且有云端地址，则尝试自动同步
      fetchCloudData();
    }
  }, [studentId, db]);

  const fetchCloudData = async () => {
    if (!cloudBaseUrl) {
      setError("未找到课程同步源。请联系老师配置云端地址。");
      return;
    }

    setIsSyncing(true);
    setError(null);

    // 标准化 URL
    const baseUrl = cloudBaseUrl.endsWith('/') ? cloudBaseUrl : cloudBaseUrl + '/';
    const targetUrl = `${baseUrl}${studentId}.json`;

    try {
      const response = await fetch(targetUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error("无法从云端获取作业包。请确认老师已上传文件。");
      
      const imported = await response.json();
      
      // 合并逻辑
      const mergedLessons = { ...db.lessons, ...imported.lessons };
      let mergedStudents = [...db.students];
      const impStudent = (imported.students || []).find((s: Student) => s.id === studentId);
      
      if (impStudent) {
        const existingIdx = mergedStudents.findIndex(s => s.id === studentId);
        if (existingIdx >= 0) {
          mergedStudents[existingIdx] = {
            ...mergedStudents[existingIdx],
            assignedLessons: Array.from(new Set([...mergedStudents[existingIdx].assignedLessons, ...impStudent.assignedLessons]))
          };
        } else {
          mergedStudents.push(impStudent);
        }
      }

      const newDb = { lessons: mergedLessons, students: mergedStudents };
      setDb(newDb);
      localStorage.setItem('teaching_db', JSON.stringify(newDb));
      alert("✅ 课程同步成功！");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "同步失败。");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isSyncing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">正在同步课程数据...</h2>
        <p className="text-slate-400 font-medium">请稍候，我们正在为您拉取最新的学习计划。</p>
      </div>
    );
  }

  if (error && (!student || student.assignedLessons.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-[3rem] p-12 max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
             <i className="fa-solid fa-cloud-bolt text-3xl"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-800">同步出错</h2>
          <p className="text-slate-400 font-medium leading-relaxed">{error}</p>
          <button onClick={fetchCloudData} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">
             重试同步
          </button>
        </div>
      </div>
    );
  }

  if (!student || student.assignedLessons.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-[3rem] p-12 max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
             <i className="fa-solid fa-user-clock text-3xl"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-800">暂无课程</h2>
          <p className="text-slate-400 font-medium leading-relaxed">老师尚未为您指派作业，或者云端文件尚未就绪。</p>
          <button onClick={fetchCloudData} className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all">
             刷新同步状态
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6 font-sans">
       <div className="max-w-4xl mx-auto">
          <header className="mb-12 flex justify-between items-end border-b pb-8">
             <div>
                <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">你好, {student.name}! 👋</h1>
                <p className="text-slate-500 font-bold">你有 {student.assignedLessons.length} 节课可供复习。</p>
             </div>
             <button onClick={fetchCloudData} className="bg-white border-2 border-slate-100 text-slate-400 px-6 py-3 rounded-2xl font-black text-xs hover:text-indigo-600 hover:border-indigo-100 transition-all flex items-center gap-2">
                <i className="fa-solid fa-sync"></i> 检查新课件
             </button>
          </header>

          {activeLesson ? (
             <div className="space-y-8 animate-in fade-in zoom-in duration-500">
                <button onClick={() => setActiveLesson(null)} className="bg-white border-2 border-slate-100 px-8 py-3 rounded-2xl font-black text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-2 shadow-sm">
                  <i className="fa-solid fa-arrow-left"></i> 返回列表
                </button>
                <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border-4 border-white">
                   <h2 className="text-4xl font-black text-slate-800 mb-10 text-center tracking-tight">{activeLesson.title}</h2>
                   <div className="max-w-2xl mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-slate-50 mb-12">
                      <YouTubePlayer url={activeLesson.videoUrl} playing={false} playbackRate={1} onProgress={() => {}} />
                   </div>
                   <div className="space-y-16 mt-20">
                      {activeLesson.lyrics.filter(l => l.isHomework).map((line, idx) => (
                         <div key={line.id} className="pb-12 border-b-2 border-slate-50 last:border-0">
                            <LyricLineDisplay line={line} />
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {student.assignedLessons.slice().reverse().map(lessonId => {
                   const lesson = db.lessons[lessonId];
                   if (!lesson) return null;
                   return (
                      <div key={lessonId} onClick={() => setActiveLesson(lesson)} className="bg-white p-10 rounded-[3rem] shadow-md border-2 border-transparent hover:border-indigo-400 cursor-pointer transition-all group hover:-translate-y-2 hover:shadow-2xl">
                         <div className="flex justify-between items-start mb-10">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                               <i className="fa-solid fa-play text-xl"></i>
                            </div>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full group-hover:bg-indigo-50 group-hover:text-indigo-400">复习回顾</span>
                         </div>
                         <h3 className="text-2xl font-black text-slate-800 mb-6 leading-tight group-hover:text-indigo-600">{lesson.title}</h3>
                         <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-widest">
                            <span>开始学习</span>
                            <i className="fa-solid fa-arrow-right-long transition-transform group-hover:translate-x-2"></i>
                         </div>
                      </div>
                   );
                })}
             </div>
          )}
       </div>
    </div>
  );
};

export default StudentView;
