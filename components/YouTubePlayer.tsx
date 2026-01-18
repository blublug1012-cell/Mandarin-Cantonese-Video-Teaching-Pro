import React, { useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';

interface Props {
  url: string;
  playing: boolean;
  playbackRate: number;
  onProgress: (state: { playedSeconds: number }) => void;
  onDuration?: (duration: number) => void; // 增加 duration 回调
  seekTo?: number;
}

const YouTubePlayer: React.FC<Props> = ({ url, playing, playbackRate, onProgress, onDuration, seekTo }) => {
  const playerRef = useRef<any>(null);
  const lastSeek = useRef<number | null>(null);

  useEffect(() => {
    if (seekTo !== undefined && playerRef.current && lastSeek.current !== seekTo) {
      playerRef.current.seekTo(seekTo, 'seconds');
      lastSeek.current = seekTo;
    }
  }, [seekTo]);

  return (
    <div className="relative pt-[56.25%] rounded-2xl overflow-hidden shadow-xl bg-black">
      <ReactPlayer
        ref={playerRef}
        url={url}
        width="100%"
        height="100%"
        className="absolute top-0 left-0"
        playing={playing}
        playbackRate={playbackRate}
        onProgress={onProgress}
        onDuration={onDuration}
        progressInterval={200}
        config={{
          youtube: {
            playerVars: { 
              controls: 1, 
              rel: 0, 
              modestbranding: 1,
              origin: window.location.origin
            }
          }
        }}
      />
    </div>
  );
};

export default YouTubePlayer;