import React, { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';

interface Props {
  url: string;
  playing: boolean;
  playbackRate: number;
  onProgress: (state: { playedSeconds: number }) => void;
  onDuration?: (duration: number) => void;
  seekTo?: number;
}

const YouTubePlayer: React.FC<Props> = ({ url, playing, playbackRate, onProgress, onDuration, seekTo }) => {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const lastSeek = useRef<number | null>(null);

  useEffect(() => {
    // 只有在播放器准备就绪且 seekTo 发生变化时才执行
    if (isReady && seekTo !== undefined && playerRef.current && lastSeek.current !== seekTo) {
      // 增加防御性检查，确保 seekTo 是一个函数
      if (typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(seekTo, 'seconds');
        lastSeek.current = seekTo;
      }
    }
  }, [seekTo, isReady]);

  // 当 URL 改变时重置就绪状态
  useEffect(() => {
    setIsReady(false);
    lastSeek.current = null;
  }, [url]);

  return (
    <div className="relative pt-[56.25%] rounded-2xl overflow-hidden shadow-xl bg-black">
      <ReactPlayer
        ref={playerRef}
        url={url}
        width="100%"
        height="100%"
        className="absolute top-0 left-0"
        playing={isReady && playing} // 只有就绪后才开始播放，防止 play() 被 interrupt
        playbackRate={playbackRate}
        onProgress={onProgress}
        onDuration={onDuration}
        onReady={() => setIsReady(true)}
        progressInterval={200}
        config={{
          youtube: {
            playerVars: { 
              controls: 1, 
              rel: 0, 
              modestbranding: 1,
              origin: window.location.origin,
              autoplay: 0
            }
          }
        }}
      />
    </div>
  );
};

export default YouTubePlayer;