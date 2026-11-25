import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAiStore } from '../../stores/useAiStore';

export const CineBotSection: React.FC = () => {
  const [promptInput, setPromptInput] = useState('');
  const [selectedMood, setSelectedMood] = useState('🍿 Phim trinh thám xoắn não kết thúc bất ngờ');
  const { sendMessage } = useAiStore();
  const navigate = useNavigate();

  const moodPills = [
    '🍿 Phim trinh thám xoắn não kết thúc bất ngờ',
    '🔥 Phim hành động mãn nhãn cuối tuần',
    '✨ Hoạt hình ấm áp chữa lành gia đình',
    '❤️ Lãng mạn nhẹ nhàng mưa bay',
    '🌌 Du hành vũ trụ đa chiều không gian'
  ];

  const aiCards = [
    {
      id: 'knives-out',
      title: 'Kẻ Đâm Lén: Kính Vạn Hoa',
      category: 'Trinh Thám • Hài Kịch Bí Ẩn',
      match: 'Khớp 98%',
      badge: '4K DOLBY',
      poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCqD5mBvo-8xMtw9T5A4ttfg7Dc_wIaDELXBJ6usym-PS0P8KoPSNCBGEys7sV5QAwBvKvCR_M42Vs6y71xOFWifdk_3SJ9ixtyhayHIQ-fvx71hjw2WlBigHyhXqZcTAZtJsSyHijTu2A28cq2R4OHo2xpDw2GA76ZxGusy91pELLIpqs59brlJPshx33guSRmaD2nv7kLW60GRjkUKfGmK9QYZmQZNmY_xgIZ3r5HjY6qLY-HWEXgsA',
      quote: '"Vì bạn đã thích thể loại suy luận sắc sảo cùng dàn diễn viên thượng thừa."'
    },
    {
      id: 'parasite',
      title: 'Ký Sinh Trùng (Parasite)',
      category: 'Tâm Lý • Xoắn Não Giật Gân',
      match: 'Khớp 96%',
      badge: 'OSCAR BEST PICTURE',
      poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANB1hgvbgmX1IiaCUXSQXwprdQHl54AHGQyb-k0R-vycd--ICgpPIDcojYzPL92MvVQOPg8N5CfvY8dR9CYvRFxLyrVWj4sYU-Vyt6eWF4o_PK-5L_txH01iM1e7GJ0cjCOyUKwuCJ-4dUp0XzC5PbXfNy3UWAqaj-_tKSKMx50yMZxRyeZK_XJuvCEmJ79JhsU_hMMDNUG2TNug5q_b_0PokRvJCR4hwd-x4r_no4dAORJPy_7X6gKw',
      quote: '"Cốt truyện kịch tính nhiều lớp lang xã hội và cú ngoặt gây chấn động."'
    },
    {
      id: 'gone-girl',
      title: 'Cô Gái Mất Tích (Gone Girl)',
      category: 'Hồi Hộp • Tội Phạm Tinh Vi',
      match: 'Khớp 95%',
      badge: 'FHD VIETSUB',
      poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmiuu7NkeIqnXOaAFr8OAdnHeH_d4szTNbLZ5UOHSlpVCR-9MPRpkk5_R07RKwIfeNzVK9Et__HhHpJl9FdrRYECK9gFOVFHUNZVftvHMS5glbDXeLllyHxWeB9-7uqy8yrTK00afPtYptBwd--bVg86IUwMWc3gSiSaJ-MaZm22S9rk6PhWtzIk1OvRhEpAYCVXNzItt9O1GLqf45gSK0ZKAfbJvhwXfr3YAb0uMPq3gjbPxPHv3QnA',
      quote: '"Dựa trên chỉ số yêu thích các tác phẩm của đạo diễn David Fincher."'
    },
    {
      id: 'interstellar',
      title: 'Hố Đen Tử Thần (Interstellar)',
      category: 'Khoa Học • Kỳ Ảo Đột Phá',
      match: 'Khớp 94%',
      badge: 'IMAX 4K HDR',
      poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnB9UbJQbm94dJuOkoFNoKxx3OSR4SDeJ-prhePQxGn5W77KRfTfBbVDdPloCv7srRBBdTR2YL4SaS46mAj2yK4s1NV_eZWcuh7pplUhpL9F5k3HpFJBmcgWw1s2ZacllfT8jo7OGJ8orxEJYuTQIs58QQWzG7SUL1gLwBZnl_CbWCDcOIeGIpHKuX7SxGcKRjqgoo3LXqu09Lwzxb5-QQWNd0Mw9IGr6sG32ZV3yKPla4x-KiXlM_kg',
      quote: '"Được cộng đồng CineStreams đánh giá 9.9 điểm cho nhạc phim và cảm xúc."'
    }
  ];

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    sendMessage(promptInput);
    navigate('/tro-ly-phim-ai');
  };

  return (
    <section className="w-full px-gutter-mobile md:px-gutter lg:px-margin mt-space-xl">
      <div className="p-space-md lg:p-space-lg rounded-2xl bg-gradient-to-br from-surface-container-low via-surface-container to-surface-container-low relative overflow-hidden shadow-2xl border border-surface-variant/30">
        {/* AI Glow Effect */}
        <div className="absolute -right-24 -top-24 w-72 h-72 bg-tertiary-container/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-primary-container/10 rounded-full blur-[100px] pointer-events-none" />

        {/* CineBot Header & Omni Search Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md mb-space-lg relative z-10">
          <div>
            <div className="flex items-center gap-space-xs mb-1">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-tertiary-container/20 text-tertiary">
                <span className="material-symbols-outlined text-lg">psychology</span>
              </span>
              <span className="text-tertiary font-label-caps text-label-caps uppercase tracking-wider font-bold">
                CineAI RAG Engine v2.0 • Vector Semantic Recommender
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-sm lg:text-headline-lg font-bold text-on-surface">
              Bạn Đang Muốn Xem Phim Gì Hôm Nay?
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Hệ thống phân tích ngữ nghĩa sở thích cá nhân, tâm trạng và thời tiết hiện tại để đề xuất tác phẩm hoàn hảo.
            </p>
          </div>

          {/* Natural Language AI Prompt Box */}
          <form
            onSubmit={handleAiSubmit}
            className="w-full lg:w-96 flex items-center bg-surface-container-lowest/80 rounded-xl px-space-sm py-2 shadow-inner border border-surface-variant/40 focus-within:border-tertiary transition-colors"
          >
            <span className="material-symbols-outlined text-tertiary text-lg mr-2 animate-pulse">
              auto_awesome
            </span>
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Mô tả cảm xúc hoặc bối cảnh phim muốn tìm..."
              className="bg-transparent border-none outline-none w-full text-on-surface placeholder:text-outline font-body-sm text-body-sm"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-tertiary-container text-on-tertiary-container font-label-md text-label-md hover:bg-tertiary transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap active:scale-95"
            >
              <span>Gợi ý</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </form>
        </div>

        {/* Quick Mood Filter Chips (Interactive Pills) */}
        <div className="flex items-center gap-space-xs overflow-x-auto pb-space-sm mb-space-md relative z-10 scrollbar-none">
          {moodPills.map((pill) => {
            const isSelected = selectedMood === pill;
            return (
              <button
                key={pill}
                onClick={() => {
                  setSelectedMood(pill);
                  sendMessage(pill);
                }}
                className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md shadow-sm whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-primary-container text-on-primary-container shadow-md scale-105'
                    : 'bg-surface-container-high/90 hover:bg-surface-variant text-on-surface'
                }`}
                type="button"
              >
                <span>{pill}</span>
              </button>
            );
          })}
        </div>

        {/* Curated CineAI Recommendation Reel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md relative z-10">
          {aiCards.map((card) => (
            <div
              key={card.id}
              onClick={() => navigate('/tro-ly-phim-ai')}
              className="group flex flex-col bg-surface-container-lowest/90 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border border-surface-variant/30 hover:border-tertiary/50 cursor-pointer"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden">
                <div
                  className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                  style={{ backgroundImage: `url('${card.poster}')` }}
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-tertiary-container text-on-tertiary-container font-label-caps text-label-caps flex items-center gap-1 shadow-sm">
                  <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                  <span>{card.match}</span>
                </div>
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-on-surface text-[11px] font-label-caps font-mono">
                  {card.badge}
                </div>
              </div>

              <div className="p-space-sm flex flex-col justify-between flex-grow">
                <div>
                  <p className="font-headline-sm text-body-md text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                    {card.title}
                  </p>
                  <p className="text-xs text-outline line-clamp-1 mt-0.5">{card.category}</p>
                </div>

                <div className="mt-2 pt-2 bg-surface-variant/30 rounded p-1.5 border border-tertiary/15">
                  <p className="text-[11px] text-tertiary line-clamp-2 italic leading-relaxed">
                    {card.quote}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
