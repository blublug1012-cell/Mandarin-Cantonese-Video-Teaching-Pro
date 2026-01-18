
import React, { useEffect, useRef } from 'react';
import ReactPlayer from 'react-player/youtube';

interface Props {
  url: string;
  playing: boolean;
  playbackRate: number;
  onProgress: (state: { playedSeconds: number }) => void;
  onReady?: (player: any) => void;
  seekTo?: number;
}

const YouTubePlayer: React.FC<Props> = ({ url, playing, playbackRate, onProgress, onReady, seekTo }) => {
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (seekTo !== undefined && playerRef.current) {
      playerRef.current.seekTo(seekTo, 'seconds');
    }
  }, [seekTo]);

  return (
    <div className="relative pt-[56.25%] rounded-2xl overflow-hidden shadow-xl bg-black">
      <ReactPlayer
        ref={(p) => { playerRef.current = p; if (onReady) onReady(p); }}
        url={url}
        width="100%"
        height="100%"
        className="absolute top-0 left-0"
        playing={playing}
        playbackRate={playbackRate}
        onProgress={onProgress}
        config={{
          youtube: {
            playerVars: { controls: 1, rel: 0, modestbranding: 1 }
          }
        }}
      />
    </div>
  );
};

export default YouTubePlayer;
