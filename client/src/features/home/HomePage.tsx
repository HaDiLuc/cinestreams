import React, { useEffect } from 'react';
import { HeroBanner } from './HeroBanner';
import { ContinueWatching } from './ContinueWatching';
import { CineBotSection } from './CineBotSection';
import { Top10Trending } from './Top10Trending';
import { LatestMovies } from './LatestMovies';
import { SeriesVip } from './SeriesVip';
import { StreamingTechBento } from './StreamingTechBento';
import { useMovieStore } from '../../stores/useMovieStore';

export const HomePage: React.FC = () => {
  const { fetchDynamicMovies } = useMovieStore();

  useEffect(() => {
    fetchDynamicMovies();
  }, [fetchDynamicMovies]);

  return (
    <div className="flex flex-col w-full text-on-surface">
      {/* 1. HERO BANNER: Phim Nổi Bật Mới Nhất */}
      <HeroBanner />

      {/* 2. TIẾP TỤC XEM (WATCH PROGRESS) */}
      <ContinueWatching />

      {/* 3. CINEBOT AI SMART RECOMMENDATION */}
      <CineBotSection />

      {/* 4. TOP 10 THỊNH HÀNH HÔM NAY */}
      <Top10Trending />

      {/* 5. PHIM CHIẾU RẠP MỚI NHẤT */}
      <LatestMovies />

      {/* 6. PHIM BỘ ĐỘC QUYỀN VIP */}
      <SeriesVip />

      {/* 7. USP BENTO & VIETQR PROMO BANNER */}
      <StreamingTechBento />
    </div>
  );
};
