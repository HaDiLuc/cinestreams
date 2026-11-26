import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAiStore } from '../../stores/useAiStore';
import { RagCitation } from '../../types';

export const CineAiPage: React.FC = () => {
  const {
    messages,
    isThinking,
    isStreaming,
    activeMode,
    activeMood,
    chatHistory,
    currentChatId,
    ragConfig,
    totalIndexedDocs,
    isRagActive,
    sendMessage,
    selectMood,
    stopStreaming,
    setActiveMode,
    newChat,
    loadChat,
    deleteChat,
    togglePinChat,
    clearChat,
    updateRagConfig,
    reindexKnowledge,
    syncKnowledgeWithApi
  } = useAiStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [searchHistory, setSearchHistory] = useState('');
  const [antiSpoiler, setAntiSpoiler] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // RAG UI State
  const [showRagModal, setShowRagModal] = useState(false);
  const [activeCitation, setActiveCitation] = useState<RagCitation | null>(null);
  const [isReindexing, setIsReindexing] = useState(false);
  const [reindexSuccess, setReindexSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  // Đồng bộ tri thức RAG từ Backend API khi trang được tải
  useEffect(() => {
    syncKnowledgeWithApi();
  }, []);

  /*
  // Tự động cuộn xuống khi đang stream phản hồi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, isThinking]);
*/
  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isThinking || isStreaming) return;

    const promptToSend = inputPrompt.trim();
    sendMessage(promptToSend, activeMode, { antiSpoiler });
    setInputPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    reindexKnowledge();
    await syncKnowledgeWithApi();
    setIsReindexing(false);
    setReindexSuccess(true);
    setTimeout(() => setReindexSuccess(false), 2500);
  };

  // Danh mục tâm trạng điện ảnh
  const moodPresets = [
    { key: 'exciting', label: '⚡ Hào hứng & Kịch tính', color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30' },
    { key: 'healing', label: '☕ Thư giãn & Chữa lành', color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30' },
    { key: 'mind-bending', label: '🧠 Xoắn não & Bí ẩn', color: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30' },
    { key: 'emotional', label: '😭 Xúc động & Lắng đọng', color: 'from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30' },
    { key: 'romantic', label: '💖 Lãng mạn & Ngọt ngào', color: 'from-pink-500/20 to-rose-500/20 text-pink-400 border-pink-500/30' },
    { key: 'horror', label: '👻 Rùng rợn & Giật gân', color: 'from-red-500/20 to-stone-500/20 text-red-400 border-red-500/30' },
    { key: 'comedy', label: '🍿 Hài hước & Xả stress', color: 'from-yellow-500/20 to-amber-500/20 text-yellow-400 border-yellow-500/30' }
  ];

  // Đề tài xu hướng Cine Prompts được thiết kế để khai thác tối đa RAG
  const trendingPrompts = [
    { icon: '🍿', text: 'Tóm tắt kịch bản Dune: Part Two trong 3 phút không spoil' },
    { icon: '⏳', text: 'Giải thích ý nghĩa cái kết Interstellar và chiều không gian thứ 5' },
    { icon: '🗡️', text: 'Nghệ thuật chiến thuật bàn cờ của Toranaga trong Shōgun' },
    { icon: '💥', text: 'Xung đột Piltover - Zaun và bi kịch tinh thần của Jinx trong Arcane' },
    { icon: '👑', text: 'Quyền lợi và bảng giá của gói hội viên VIP Diamond 4K là gì?' },
    { icon: '👥', text: 'Tính năng phòng xem chung WatchParty hoạt động như thế nào?' }
  ];

  // Lọc lịch sử trò chuyện
  const filteredHistory = chatHistory.filter((c) =>
    c.title.toLowerCase().includes(searchHistory.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      {/* 1. Header & Mode Switcher */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl bg-surface-container/70 backdrop-blur-xl border border-surface-variant/30 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-container via-surface-container-highest to-primary flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-surface-container-lowest"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface">
                  Trợ Lý Điện Ảnh CineAI Studio
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold tracking-wider uppercase border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  RAG Engine v2.0
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold tracking-wider uppercase border border-primary/30">
                  CineModel-4o
                </span>
              </div>
              <p className="text-xs text-outline flex items-center gap-2 mt-0.5">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">database</span>
                  Vector Retrieval Active ({totalIndexedDocs.total} Documents)
                </span>
                <span>•</span>
                <span>Vercel AI SDK Low-Latency Streaming</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút mở cấu hình RAG */}
            <button
              onClick={() => setShowRagModal(true)}
              className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-xs text-on-surface border border-primary/30 flex items-center gap-1.5 transition-all shadow-sm hover:border-primary"
              title="Cấu hình & Tinh chỉnh RAG Engine"
            >
              <span className="material-symbols-outlined text-primary text-base">tune</span>
              <span className="font-semibold text-primary">Cấu hình RAG</span>
            </button>

            <button
              onClick={newChat}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary-container to-primary text-on-secondary text-xs font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              <span>Cuộc trò chuyện mới</span>
            </button>
            <button
              onClick={clearChat}
              className="px-3 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-xs text-outline hover:text-on-surface border border-surface-variant/40 transition-colors"
              title="Làm mới hội thoại"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setActiveMode('mood')}
            className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 whitespace-nowrap transition-all border ${activeMode === 'mood'
              ? 'bg-surface-container-high text-primary border-primary/50 shadow-sm shadow-primary/20'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-transparent'
              }`}
          >
            <span className="material-symbols-outlined text-base">forum</span>
            <span>💬 Trò Chuyện & Gợi Ý Cảm Xúc</span>
          </button>
          <button
            onClick={() => setActiveMode('explainer')}
            className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 whitespace-nowrap transition-all border ${activeMode === 'explainer'
              ? 'bg-surface-container-high text-primary border-primary/50 shadow-sm shadow-primary/20'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-transparent'
              }`}
          >
            <span className="material-symbols-outlined text-base">psychology_alt</span>
            <span>🧠 Tóm Tắt & Giải Mã Kịch Bản (RAG Deep Explainer)</span>
          </button>
          <button
            onClick={() => setActiveMode('compare')}
            className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 whitespace-nowrap transition-all border ${activeMode === 'compare'
              ? 'bg-surface-container-high text-primary border-primary/50 shadow-sm shadow-primary/20'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-transparent'
              }`}
          >
            <span className="material-symbols-outlined text-base">compare_arrows</span>
            <span>⚖️ So Sánh Phim & Vũ Trụ Điện Ảnh</span>
          </button>
        </div>
      </section>

      {/* 2. Main 2-Column Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT SIDEBAR (lg:col-span-4 xl:col-span-3) */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 sticky top-24">
          {/* RAG Knowledge Base Stats Card */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-surface-container/80 to-surface-container-high/60 backdrop-blur-xl border border-primary/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">storage</span>
                Kho Tri Thức RAG Vector
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                ĐÃ SẴN SÀNG
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-surface-container-lowest/60 border border-surface-variant/30">
                <p className="text-sm font-bold text-primary">{totalIndexedDocs.movies}</p>
                <p className="text-[10px] text-outline mt-0.5">Kho Phim</p>
              </div>
              <div className="p-2 rounded-xl bg-surface-container-lowest/60 border border-surface-variant/30">
                <p className="text-sm font-bold text-emerald-400">{totalIndexedDocs.explainer}</p>
                <p className="text-[10px] text-outline mt-0.5">Kịch Bản</p>
              </div>
              <div className="p-2 rounded-xl bg-surface-container-lowest/60 border border-surface-variant/30">
                <p className="text-sm font-bold text-cyan-400">{totalIndexedDocs.platform}</p>
                <p className="text-[10px] text-outline mt-0.5">Nền Tảng</p>
              </div>
            </div>

            <button
              onClick={handleReindex}
              disabled={isReindexing}
              className="w-full py-2 px-3 rounded-xl bg-surface-container-highest hover:bg-surface-variant text-xs text-on-surface font-semibold flex items-center justify-center gap-1.5 border border-surface-variant/40 transition-all active:scale-98"
            >
              <span className={`material-symbols-outlined text-sm ${isReindexing ? 'animate-spin text-primary' : ''}`}>
                {reindexSuccess ? 'check_circle' : 'cached'}
              </span>
              <span>{reindexSuccess ? 'Đã cập nhật vector store!' : isReindexing ? 'Đang index lại...' : 'Đồng bộ & Re-index'}</span>
            </button>
          </div>

          {/* Quick Mood Selector Chips */}
          <div className="p-4 rounded-3xl bg-surface-container/70 backdrop-blur-xl border border-surface-variant/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">mood</span>
                Tâm Trạng Điện Ảnh
              </span>
              <span className="text-[10px] text-primary">Chạm để chọn</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {moodPresets.map((m) => (
                <button
                  key={m.key}
                  onClick={() => selectMood(m.key, m.label)}
                  disabled={isStreaming}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border bg-gradient-to-r transition-all ${m.color} ${activeMood === m.key ? 'ring-2 ring-primary scale-105' : 'hover:scale-102 hover:brightness-110'
                    }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar within History */}
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-lg">search</span>
            <input
              type="text"
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              placeholder="Tìm lịch sử hội thoại..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container/70 text-on-surface placeholder:text-outline text-xs outline-none focus:ring-1 focus:ring-primary border border-surface-variant/30 transition-all"
            />
          </div>

          {/* Recent Chat Sessions Card */}
          <div className="p-4 rounded-3xl bg-surface-container/70 backdrop-blur-xl border border-surface-variant/30 space-y-2.5">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">history</span>
                Phiên Trò Chuyện ({filteredHistory.length})
              </span>
            </div>
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto scrollbar-none">
              {filteredHistory.map((s) => (
                <div
                  key={s.id}
                  onClick={() => loadChat(s.id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${currentChatId === s.id
                    ? 'bg-surface-container-high border-primary/50 text-on-surface shadow-sm'
                    : 'hover:bg-surface-container-high/60 border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinChat(s.id);
                      }}
                      className={`material-symbols-outlined text-sm shrink-0 cursor-pointer ${s.isPinned ? 'text-primary' : 'text-outline group-hover:text-primary'
                        }`}
                      style={{ fontVariationSettings: s.isPinned ? "'FILL' 1" : "'FILL' 0" }}
                      title={s.isPinned ? 'Bỏ ghim' : 'Ghim hội thoại'}
                    >
                      push_pin
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-medium truncate">{s.title}</p>
                      <p className="text-[10px] text-outline mt-0.5">{s.timestamp}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-container text-outline hover:text-error transition-all"
                    title="Xóa phiên này"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Cine Prompts (RAG Powered) */}
          <div className="p-4 rounded-3xl bg-surface-container/70 backdrop-blur-xl border border-surface-variant/30 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">trending_up</span>
              <h3 className="text-xs font-bold text-outline uppercase tracking-wider">Đề Tài Xu Hướng (RAG Prompts)</h3>
            </div>
            <div className="flex flex-col gap-1.5">
              {trendingPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(p.text, 'explainer')}
                  disabled={isStreaming}
                  className="text-left p-2 rounded-xl bg-surface-container-low hover:bg-surface-container-high/80 text-on-surface-variant hover:text-primary text-xs flex items-start gap-2 transition-all"
                >
                  <span className="text-sm select-none shrink-0">{p.icon}</span>
                  <span className="leading-snug line-clamp-2">{p.text}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* RIGHT CHAT STREAMING CANVAS (lg:col-span-8 xl:col-span-9) */}
        <main className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
          <div className="flex flex-col gap-6 p-4 sm:p-6 rounded-3xl bg-surface-container-low/80 backdrop-blur-2xl border border-surface-variant/30 shadow-xl min-h-[640px] justify-between">
            {/* Messages Feed */}
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-3">
                  {msg.sender === 'user' ? (
                    /* User Bubble */
                    <div className="flex items-start justify-end gap-3 max-w-3xl ml-auto">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-outline">Hội viên VIP • {msg.timestamp}</span>
                          <span className="text-xs font-bold text-primary">Bạn</span>
                        </div>
                        <div className="p-3.5 sm:p-4 rounded-2xl rounded-tr-none bg-surface-container-high text-on-surface text-xs sm:text-sm shadow-md leading-relaxed border border-surface-variant/30">
                          {msg.text}
                        </div>
                      </div>
                      <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xs shrink-0 ring-1 ring-primary/40 mt-1">
                        U
                      </div>
                    </div>
                  ) : (
                    /* CineAI Assistant Bubble */
                    <div className="flex items-start gap-3 max-w-4xl">
                      <div className="relative shrink-0 mt-1">
                        <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-2xl bg-gradient-to-tr from-primary-container via-surface-container-highest to-surface-container flex items-center justify-center shadow-[0_0_16px_rgba(245,158,11,0.3)]">
                          <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                            auto_awesome
                          </span>
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-surface-container-lowest"></span>
                      </div>

                      <div className="flex-1 space-y-4">
                        {/* CineAI Header Info */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-on-surface">CineAI Studio</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px]">bolt</span>
                            RAG AUGMENTED
                          </span>
                          <span className="px-2 py-0.5 rounded bg-surface-container-high text-tertiary text-[10px] font-bold border border-tertiary/30">
                            VERCEL AI SDK STREAMING
                          </span>
                          <span className="text-[10px] text-outline ml-auto">{msg.timestamp}</span>
                        </div>

                        {/* RAG Retrieved Citations Pill Hub */}
                        {msg.ragCitations && msg.ragCitations.length > 0 && (
                          <div className="p-3 rounded-2xl bg-surface-container/60 border border-emerald-500/20 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm">find_in_page</span>
                                Nguồn Dữ Liệu RAG Đã Truy Xuất ({msg.ragCitations.length} tài liệu)
                              </span>
                              <span className="text-[10px] text-outline">Bấm để xem trích đoạn</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.ragCitations.map((cit, cIdx) => (
                                <button
                                  key={cIdx}
                                  onClick={() => setActiveCitation(cit)}
                                  className="group flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-container-high hover:bg-surface-variant border border-surface-variant/40 text-on-surface text-xs transition-all hover:border-emerald-500/50"
                                >
                                  <span className="text-[11px]">
                                    {cit.sourceType === 'movies' ? '🎬' : cit.sourceType === 'deep_explainer' ? '🧠' : '⚙️'}
                                  </span>
                                  <span className="font-medium truncate max-w-[150px] sm:max-w-[220px]">
                                    {cit.title}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                    {Math.round(cit.similarity * 100)}%
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Executive Summary Callout Box */}
                        {msg.executiveSummary && (
                          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-container/20 via-surface-container to-surface-container-high text-on-surface shadow-sm relative overflow-hidden border border-primary/20">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                            <div className="flex items-start gap-2.5 pl-1">
                              <span className="material-symbols-outlined text-primary text-xl mt-0.5 shrink-0">
                                lightbulb
                              </span>
                              <div className="space-y-1">
                                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                                  Tóm Tắt Cốt Lõi (RAG Executive Summary)
                                </h4>
                                <p className="text-xs sm:text-sm text-on-surface leading-relaxed">
                                  {msg.executiveSummary}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Main Response Text with Live Streaming Cursor */}
                        <div className="p-4 rounded-2xl bg-surface-container/70 border border-surface-variant/30 text-on-surface text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                          {msg.isStreaming && (
                            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 align-middle" />
                          )}
                        </div>

                        {/* Deep Breakdown Multi-Point Cards */}
                        {msg.analysisPoints && msg.analysisPoints.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm text-primary">account_tree</span>
                              Phân Tích Đa Tầng Cốt Truyện & Luận Điểm:
                            </h4>
                            <div className="space-y-2.5">
                              {msg.analysisPoints.map((pt) => (
                                <div
                                  key={pt.index}
                                  className="p-3.5 rounded-2xl bg-surface-container/60 border border-surface-variant/30 space-y-1.5"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                      {pt.index}
                                    </span>
                                    <h5 className="text-xs sm:text-sm font-bold text-on-surface">{pt.title}</h5>
                                  </div>
                                  <p className="text-xs text-on-surface-variant pl-7 leading-relaxed">
                                    {pt.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Interactive Movie Recommendation Cards Embedded in Chat */}
                        {msg.recommendedMovies && msg.recommendedMovies.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm">local_movies</span>
                                Đề Xuất Phim Khớp Ngữ Nghĩa RAG
                              </span>
                              <span className="text-[10px] text-outline">Chuẩn 4K Dolby Vision</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {msg.recommendedMovies.map((m) => (
                                <div
                                  key={m.id}
                                  className="group flex flex-col justify-between p-3 rounded-2xl bg-surface-container border border-surface-variant/30 hover:border-primary/50 transition-all shadow-md"
                                >
                                  <div>
                                    <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden mb-2 bg-surface-container-highest">
                                      <img
                                        src={m.backdrop || m.poster}
                                        alt={m.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold shadow">
                                        {m.matchPercent || 96}% MATCH
                                      </span>
                                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-primary text-[10px] font-bold backdrop-blur-md">
                                        {m.qualityBadge || '4K UHD'}
                                      </span>
                                    </div>
                                    <h5 className="text-xs sm:text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                                      {m.title}
                                    </h5>
                                    <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-1">
                                      {m.matchReason || m.synopsis}
                                    </p>
                                  </div>
                                  <div className="pt-3 flex items-center gap-1.5">
                                    <button
                                      onClick={() => navigate(`/xem-phim/${m.slug || m.id}`)}
                                      className="flex-1 py-1.5 px-2 rounded-lg bg-gradient-to-r from-primary-container to-primary text-on-secondary text-xs font-bold flex items-center justify-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-sm"
                                    >
                                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        play_arrow
                                      </span>
                                      <span>Xem Phim</span>
                                    </button>
                                    <button
                                      onClick={() => navigate(`/phim/${m.slug || m.id}`)}
                                      className="py-1.5 px-2 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-medium transition-colors"
                                    >
                                      Chi tiết
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action buttons (Copy, Share, Like) */}
                        <div className="flex items-center justify-between text-outline text-xs pt-1">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCopyText(msg.id, msg.text)}
                              className="p-1.5 rounded-lg hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-1"
                              title="Sao chép nội dung"
                            >
                              <span className="material-symbols-outlined text-sm">
                                {copiedId === msg.id ? 'check' : 'content_copy'}
                              </span>
                              {copiedId === msg.id && <span className="text-[10px] text-emerald-400">Đã chép</span>}
                            </button>
                            <button
                              className="p-1.5 rounded-lg hover:bg-surface-container hover:text-primary transition-colors"
                              title="Thích phản hồi này"
                            >
                              <span className="material-symbols-outlined text-sm">thumb_up</span>
                            </button>
                            <button
                              className="p-1.5 rounded-lg hover:bg-surface-container hover:text-error transition-colors"
                              title="Chưa hài lòng"
                            >
                              <span className="material-symbols-outlined text-sm">thumb_down</span>
                            </button>
                          </div>
                          {msg.isStreaming && (
                            <div className="flex items-center gap-1.5 text-primary text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                              <span>Đang stream phản hồi qua Vercel AI SDK...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isThinking && !isStreaming && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-tertiary-container/30 text-tertiary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-base animate-spin">sync</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-surface-container text-xs text-outline flex items-center gap-2 border border-surface-variant/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>RAG Engine đang quét vector và đối chiếu ngữ nghĩa trong {totalIndexedDocs.total} tài liệu...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Floating Prompt Input Bar Hub */}
            <div className="relative w-full p-3 sm:p-4 rounded-3xl bg-surface-container/90 backdrop-blur-2xl border border-surface-variant/40 shadow-[0_12px_40px_rgba(0,0,0,0.6)] space-y-3">
              {/* Top Utility Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-lg bg-surface-container-high text-primary font-medium flex items-center gap-1 border border-primary/20">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      bolt
                    </span>
                    <span>RAG Semantic Context Injected</span>
                  </div>
                </div>

                {/* Anti-Spoiler Toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-on-surface-variant text-xs">Chống Spoilers Tuyệt Đối</span>
                  <input
                    type="checkbox"
                    checked={antiSpoiler}
                    onChange={(e) => setAntiSpoiler(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                  />
                </label>
              </div>

              {/* Main Textarea & Actions */}
              <div className="relative flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Hỏi bất kỳ điều gì về phim trong kho CineStreams, kịch bản, cái kết hoặc các tính năng nền tảng..."
                  rows={2}
                  className="w-full bg-surface-container-lowest/80 text-on-surface placeholder:text-outline text-xs sm:text-sm rounded-2xl p-3 outline-none resize-none focus:ring-1 focus:ring-primary shadow-inner border border-surface-variant/30"
                />

                <div className="flex items-center gap-1.5 pb-1 shrink-0">
                  {isStreaming ? (
                    <button
                      onClick={stopStreaming}
                      className="px-3.5 py-3 rounded-xl bg-error/20 hover:bg-error/30 text-error border border-error/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      title="Dừng sinh phản hồi"
                    >
                      <span className="material-symbols-outlined text-base">stop_circle</span>
                      <span className="hidden sm:inline">Dừng</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSend()}
                      disabled={isThinking || !inputPrompt.trim()}
                      className="p-3 rounded-xl bg-gradient-to-r from-secondary-container to-primary-container text-on-secondary shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_28px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                      title="Gửi câu hỏi"
                    >
                      <span className="material-symbols-outlined text-lg font-bold">arrow_upward</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Footer Footnote */}
              <div className="flex items-center justify-between text-outline text-[11px]">
                <p className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-emerald-400">verified</span>
                  <span>CineAI RAG v2.0 • Cosine Similarity Vector Retrieval • Vercel AI SDK Low-Latency Streaming</span>
                </p>
                <span className="hidden sm:inline">Enter để gửi • Shift + Enter xuống dòng</span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* 3. Modal Xem Chi Tiết Trích Đoạn RAG Citation */}
      {activeCitation && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-surface-container border border-surface-variant/40 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-surface-variant/30 pb-3">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                  {activeCitation.sourceType === 'movies' ? 'Kho Phim Bản Quyền' : activeCitation.sourceType === 'deep_explainer' ? 'Giải Mã Kịch Bản Chuyên Sâu' : 'Tính Năng Nền Tảng'}
                </span>
                <h3 className="text-base font-bold text-on-surface mt-1">{activeCitation.title}</h3>
                <p className="text-xs text-outline mt-0.5">{activeCitation.sourceTitle}</p>
              </div>
              <button
                onClick={() => setActiveCitation(null)}
                className="p-1 rounded-xl bg-surface-container-high hover:bg-surface-variant text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-outline">Độ tương đồng ngữ nghĩa:</span>
                <span className="font-bold text-emerald-400">{Math.round(activeCitation.similarity * 100)}% Match</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: `${Math.round(activeCitation.similarity * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-lowest/80 border border-surface-variant/30 text-xs text-on-surface-variant leading-relaxed max-h-[220px] overflow-y-auto">
              <p className="font-semibold text-primary mb-1 text-[11px] uppercase tracking-wider">Trích đoạn ngữ cảnh:</p>
              <p className="whitespace-pre-wrap">{activeCitation.snippet}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {activeCitation.metadata?.movieId && (
                <button
                  onClick={() => {
                    navigate(`/phim/${activeCitation.metadata?.movieId}`);
                    setActiveCitation(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:brightness-110 transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">movie</span>
                  <span>Xem Chi Tiết Phim</span>
                </button>
              )}
              <button
                onClick={() => setActiveCitation(null)}
                className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Cấu Hình RAG Engine */}
      {showRagModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-surface-container border border-surface-variant/40 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-surface-variant/30 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-2xl">tune</span>
                  <h3 className="text-lg font-bold text-on-surface">Cấu Hình RAG Engine (Vector Retrieval)</h3>
                </div>
                <p className="text-xs text-outline mt-0.5">
                  Tùy chỉnh thông số truy xuất ngữ nghĩa, độ nhạy Cosine Similarity và nguồn tri thức.
                </p>
              </div>
              <button
                onClick={() => setShowRagModal(false)}
                className="p-1 rounded-xl bg-surface-container-high hover:bg-surface-variant text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Top-K Chunks */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="text-on-surface">Số lượng tài liệu truy xuất (Top-K):</span>
                  <span className="text-primary font-bold">{ragConfig.topK} Chunks</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={ragConfig.topK}
                  onChange={(e) => updateRagConfig({ topK: parseInt(e.target.value) })}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-outline">
                  <span>1 (Chính xác cao)</span>
                  <span>4 (Tối ưu)</span>
                  <span>8 (Toàn diện)</span>
                </div>
              </div>

              {/* Similarity Threshold */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="text-on-surface">Ngưỡng tương đồng tối thiểu (Threshold):</span>
                  <span className="text-primary font-bold">{Math.round(ragConfig.similarityThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={Math.round(ragConfig.similarityThreshold * 100)}
                  onChange={(e) => updateRagConfig({ similarityThreshold: parseInt(e.target.value) / 100 })}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-outline">
                  <span>5% (Nới lỏng ngữ cảnh)</span>
                  <span>12% (Mặc định chuẩn)</span>
                  <span>40% (Chỉ khớp cao)</span>
                </div>
              </div>

              {/* Nguồn tri thức */}
              <div className="space-y-2">
                <span className="font-semibold text-on-surface">Các nguồn tri thức được phép truy xuất:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-surface-variant/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ragConfig.enableSources.movies}
                      onChange={(e) =>
                        updateRagConfig({
                          enableSources: { ...ragConfig.enableSources, movies: e.target.checked }
                        })
                      }
                      className="w-4 h-4 accent-primary"
                    />
                    <div>
                      <p className="font-medium text-on-surface">Kho Phim</p>
                      <p className="text-[10px] text-outline">{totalIndexedDocs.movies} docs</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-surface-variant/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ragConfig.enableSources.deepExplainer}
                      onChange={(e) =>
                        updateRagConfig({
                          enableSources: { ...ragConfig.enableSources, deepExplainer: e.target.checked }
                        })
                      }
                      className="w-4 h-4 accent-primary"
                    />
                    <div>
                      <p className="font-medium text-on-surface">Kịch Bản</p>
                      <p className="text-[10px] text-outline">{totalIndexedDocs.explainer} docs</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-surface-variant/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ragConfig.enableSources.platform}
                      onChange={(e) =>
                        updateRagConfig({
                          enableSources: { ...ragConfig.enableSources, platform: e.target.checked }
                        })
                      }
                      className="w-4 h-4 accent-primary"
                    />
                    <div>
                      <p className="font-medium text-on-surface">Nền Tảng</p>
                      <p className="text-[10px] text-outline">{totalIndexedDocs.platform} docs</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Gemini API Key */}
              <div className="space-y-1.5 pt-2 border-t border-surface-variant/30">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-primary">key</span>
                    Google Gemini API Key (Tùy chọn)
                  </span>
                  <span className="text-[10px] text-outline">Để trống sẽ dùng Built-in RAG</span>
                </div>
                <input
                  type="password"
                  value={ragConfig.geminiApiKey || ''}
                  onChange={(e) => updateRagConfig({ geminiApiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline text-xs outline-none focus:ring-1 focus:ring-primary border border-surface-variant/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-variant/30">
              <button
                onClick={() => {
                  reindexKnowledge();
                  setShowRagModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-container to-primary text-on-secondary text-xs font-bold hover:brightness-110 transition-all shadow-md"
              >
                Lưu Cấu Hình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
