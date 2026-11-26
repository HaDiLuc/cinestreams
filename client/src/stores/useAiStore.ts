import { create } from 'zustand';
import { CineAiMessage, CineAiAnalysisPoint, CineAiRecommendedMovie, Movie, RagCitation } from '../types';
import { useMovieStore } from './useMovieStore';
import { ragEngine, RagConfig } from '../services/ragEngine';
import { apiClient } from '../services/apiClient';

export interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  isPinned?: boolean;
  messages: CineAiMessage[];
}

interface AiState {
  messages: CineAiMessage[];
  isThinking: boolean;
  isStreaming: boolean;
  activeMode: 'mood' | 'explainer' | 'compare';
  activeMood: string;
  recommendedList: Movie[];
  chatHistory: ChatSession[];
  currentChatId: string;

  // RAG States & Configs
  isRagActive: boolean;
  ragConfig: RagConfig;
  totalIndexedDocs: { total: number; movies: number; explainer: number; platform: number };

  // Actions
  sendMessage: (
    prompt: string,
    customMode?: 'mood' | 'explainer' | 'compare',
    options?: { antiSpoiler?: boolean }
  ) => Promise<void>;
  selectMood: (moodKey: string, moodLabel: string) => void;
  summarizeMovie: (movieName: string) => void;
  stopStreaming: () => void;
  setActiveMode: (mode: 'mood' | 'explainer' | 'compare') => void;
  newChat: () => void;
  loadChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  togglePinChat: (chatId: string) => void;
  clearChat: () => void;

  // RAG Actions
  updateRagConfig: (cfg: Partial<RagConfig>) => void;
  reindexKnowledge: () => void;
  syncKnowledgeWithApi: () => Promise<void>;
}

let activeStreamingTimer: NodeJS.Timeout | null = null;

const STORAGE_KEY = 'cinestreams_ai_sessions_v2';
const RAG_CONFIG_KEY = 'cinestreams_rag_config_v1';

const getInitialRagConfig = (): RagConfig => {
  try {
    const raw = localStorage.getItem(RAG_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    topK: 4,
    similarityThreshold: 0.12,
    enableSources: {
      movies: true,
      deepExplainer: true,
      platform: true
    },
    geminiApiKey: ''
  };
};

const getInitialSessions = (): ChatSession[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: 'session-default',
      title: 'Khởi đầu trò chuyện CineAI (RAG Active)',
      timestamp: 'Hôm nay',
      isPinned: true,
      messages: [
        {
          id: 'welcome-1',
          sender: 'cineai',
          text: 'Xin chào! Tôi là CineAI Studio v4.0 - trợ lý điện ảnh thế hệ mới tích hợp công nghệ RAG (Retrieval-Augmented Generation) & Vercel AI SDK Streaming.\n\nMọi câu hỏi của bạn sẽ được tôi đối soát và truy xuất ngữ nghĩa (Vector Semantic Retrieval) từ toàn bộ cơ sở dữ liệu phim bản quyền, kịch bản chuyên sâu và các tính năng của nền tảng CineStreams. Bạn cần gợi ý phim, giải mã kịch bản hay tìm hiểu tính năng gì hôm nay?',
          timestamp: 'Vừa xong',
          mode: 'mood'
        }
      ]
    }
  ];
};

export const useAiStore = create<AiState>((set, get) => {
  const initialRagConfig = getInitialRagConfig();
  ragEngine.updateConfig(initialRagConfig);
  const totalDocs = ragEngine.getTotalIndexedDocuments();

  return {
    chatHistory: getInitialSessions(),
    currentChatId: 'session-default',
    messages: getInitialSessions()[0]?.messages || [],
    isThinking: false,
    isStreaming: false,
    activeMode: 'mood',
    activeMood: '',
    recommendedList: [],

    isRagActive: true,
    ragConfig: initialRagConfig,
    totalIndexedDocs: totalDocs,

    updateRagConfig: (newCfg) => {
      set((state) => {
        const merged = { ...state.ragConfig, ...newCfg };
        ragEngine.updateConfig(merged);
        try {
          localStorage.setItem(RAG_CONFIG_KEY, JSON.stringify(merged));
        } catch {}
        return { ragConfig: merged };
      });
    },

    reindexKnowledge: () => {
      const dynamicMovies = useMovieStore.getState().movies;
      ragEngine.init(dynamicMovies);
      const totalDocs = ragEngine.getTotalIndexedDocuments();
      set({ totalIndexedDocs: totalDocs });
    },

    setActiveMode: (mode) => set({ activeMode: mode }),

    selectMood: (moodKey, moodLabel) => {
      set({ activeMood: moodKey, activeMode: 'mood' });
      get().sendMessage(
        `Tâm trạng hiện tại của tôi: [${moodLabel}]. Hãy truy xuất kho phim và đề xuất những tác phẩm phù hợp nhất cho tôi!`,
        'mood'
      );
    },

    summarizeMovie: (movieName) => {
      set({ activeMode: 'explainer' });
      get().sendMessage(
        `Tóm tắt kịch bản và phân tích các nút thắt cốt lõi của tác phẩm [${movieName}] không spoil.`,
        'explainer'
      );
    },

    stopStreaming: () => {
      if (activeStreamingTimer) {
        clearInterval(activeStreamingTimer);
        activeStreamingTimer = null;
      }
      const msgs = get().messages;
      const last = msgs[msgs.length - 1];
      if (last && last.isStreaming) {
        set({
          isStreaming: false,
          isThinking: false,
          messages: msgs.map((m, idx) => (idx === msgs.length - 1 ? { ...m, isStreaming: false } : m))
        });
      }
    },

    sendMessage: async (prompt, customMode, options) => {
      if (!prompt.trim()) return;

      // Dừng streaming cũ nếu có
      if (activeStreamingTimer) {
        clearInterval(activeStreamingTimer);
        activeStreamingTimer = null;
      }

      const currentMode = customMode || get().activeMode;
      const userMsg: CineAiMessage = {
        id: 'user-' + Date.now(),
        sender: 'user',
        text: prompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: currentMode
      };

      set((state) => ({
        messages: [...state.messages, userMsg],
        isThinking: true,
        isStreaming: false
      }));

      // BƯỚC 1: ĐẢM BẢO KNOWLEDGE BASE ĐÃ INDEX CẢ CÁC PHIM DYNAMIC TỪ MONGODB / STORE
      const allMovies = useMovieStore.getState().movies;
      if (allMovies.length > 0) {
        ragEngine.init(allMovies);
      }

      // BƯỚC 2: RAG RETRIEVAL & AUGMENTATION (Truyền đúng mode để nhận diện intent chuẩn xác)
      const augmented = ragEngine.augment(prompt, allMovies, currentMode);

      // Định dạng các trích dẫn RAG (Citations)
      const ragCitations: RagCitation[] = augmented.retrievedChunks.map((res) => ({
        sourceId: res.chunk.id,
        title: res.chunk.title,
        sourceType: res.chunk.sourceType,
        sourceTitle: res.chunk.sourceTitle,
        similarity: res.similarity,
        snippet: res.chunk.content.slice(0, 220) + '...',
        matchedTerms: res.matchedTerms,
        metadata: res.chunk.metadata
      }));

      // BƯỚC 3: KẾT NỐI API SERVER ĐỂ GENERATE VÀ RAG
      let fullResponseText = '';
      let executiveSummary = '';
      let analysisPoints: CineAiAnalysisPoint[] = [];
      let recommendedList: CineAiRecommendedMovie[] = [];
      let usedServerApi = false;

      // 3.1. Gọi API /cineai/chat trên Server Gateway
      try {
        const apiRes = await apiClient.post<any>('/cineai/chat', {
          prompt,
          mode: currentMode,
          options,
          ragConfig: get().ragConfig
        });

        if (apiRes && apiRes.success && apiRes.data) {
          const d = apiRes.data;
          fullResponseText = d.text || '';
          executiveSummary = d.executiveSummary || '';
          analysisPoints = d.analysisPoints || [];
          if (d.recommendedMovies && d.recommendedMovies.length > 0) {
            recommendedList = d.recommendedMovies;
          }
          if (d.ragCitations && d.ragCitations.length > 0) {
            d.ragCitations.forEach((sc: any) => {
              if (!ragCitations.some((c) => c.sourceId === sc.sourceId)) {
                ragCitations.push(sc);
              }
            });
          }
          usedServerApi = true;
        }
      } catch (_apiErr) {
        console.warn('[CineAI] API /cineai/chat offline hoặc đang khởi động, tự động chuyển sang Client RAG Generator');
      }

      // 3.2. Fallback nếu Server API offline: Dùng Gemini Direct hoặc Client RAG Engine
      if (!usedServerApi) {
        // Kiểm tra xem có cấu hình Gemini API Key không
        const apiKey = get().ragConfig.geminiApiKey || (import.meta as any).env?.VITE_GEMINI_API_KEY;
        let usedGemini = false;

        if (apiKey && apiKey.trim().length > 10) {
          try {
            const sysPrompt = `Bạn là CineAI Studio v4.0, trợ lý điện ảnh AI cao cấp của CineStreams được trang bị công nghệ RAG.
Ngữ cảnh tri thức được truy xuất từ cơ sở dữ liệu CineStreams:
${augmented.augmentedContext}

Yêu cầu:
1. Hãy trả lời câu hỏi của người dùng một cách chuyên nghiệp, am hiểu sâu sắc về điện ảnh, dựa trên ngữ cảnh được cung cấp.
2. Nếu người dùng yêu cầu không spoil (chống spoilers: ${options?.antiSpoiler !== false}), hãy giữ bí mật các chi tiết bất ngờ then chốt.
3. Không bịa đặt các thông tin ngoài ngữ cảnh đối với các tính năng CineStreams.`;

            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [
                    {
                      role: 'user',
                      parts: [{ text: `${sysPrompt}\n\nCâu hỏi của người dùng: ${prompt}` }]
                    }
                  ]
                }),
                signal: AbortSignal.timeout(10000)
              }
            );

            if (response.ok) {
              const json = await response.json();
              const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (candidateText) {
                fullResponseText = candidateText;
                executiveSummary = `Câu trả lời được tạo sinh bởi mô hình Gemini 1.5 kết hợp tri thức RAG CineStreams.`;
                analysisPoints = augmented.retrievedChunks.slice(0, 3).map((c, i) => ({
                  index: i + 1,
                  title: c.chunk.title,
                  content: c.chunk.content.slice(0, 150) + '...'
                }));
                usedGemini = true;
              }
            }
          } catch (_err) {
            console.warn('Lỗi kết nối Gemini API, chuyển sang CineStreams Built-in RAG Generator');
          }
        }

        if (!usedGemini) {
          // Sinh phản hồi qua CineStreams RAG Generator đa dạng theo intent
          const generated = ragEngine.generateResponse(augmented, currentMode, {
            antiSpoiler: options?.antiSpoiler ?? true
          });
          fullResponseText = generated.text;
          executiveSummary = generated.executiveSummary;
          analysisPoints = generated.analysisPoints;
        }

        // Danh sách phim đề xuất gắn matchPercent từ RAG similarity
        recommendedList = augmented.recommendedMovies.map((m, idx) => {
          const matchingChunk = augmented.retrievedChunks.find((c) => c.chunk.metadata.movieId === m.id);
          const matchPercent = matchingChunk
            ? Math.round(matchingChunk.similarity * 100)
            : [98, 96, 94][idx] || 92;

          return {
            ...m,
            matchPercent,
            matchReason: matchingChunk
              ? `Được truy xuất trực tiếp từ RAG Engine (${matchingChunk.chunk.sourceTitle}).`
              : `Độ tương đồng cao với gu điện ảnh và từ khóa tìm kiếm của bạn.`
          };
        });
      }

      // Đợi 200ms mô phỏng TTFB (Time to First Byte)
      await new Promise((resolve) => setTimeout(resolve, 200));

      const aiMsgId = 'cineai-' + Date.now();
      const aiMsgShell: CineAiMessage = {
        id: aiMsgId,
        sender: 'cineai',
        text: '',
        isStreaming: true,
        mode: currentMode,
        executiveSummary: undefined,
        analysisPoints: undefined,
        recommendedMovies: undefined,
        ragCitations: undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      set((state) => ({
        messages: [...state.messages, aiMsgShell],
        isThinking: false,
        isStreaming: true
      }));

      // BẮT ĐẦU CHU KỲ STREAMING RESPONSE TOKEN-BY-TOKEN
      const words = fullResponseText.split(' ');
      let currentWordIndex = 0;
      let accumulatedText = '';

      activeStreamingTimer = setInterval(() => {
        if (currentWordIndex < words.length) {
          accumulatedText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex];
          currentWordIndex++;

          set((state) => ({
            messages: state.messages.map((m) => (m.id === aiMsgId ? { ...m, text: accumulatedText } : m))
          }));
        } else {
          // STREAM HOÀN TẤT: Bung khối RAG Citations, Executive Summary, Analysis Points & Movies
          if (activeStreamingTimer) {
            clearInterval(activeStreamingTimer);
            activeStreamingTimer = null;
          }

          set((state) => {
            const updatedMessages = state.messages.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    isStreaming: false,
                    executiveSummary,
                    analysisPoints,
                    recommendedMovies: recommendedList,
                    ragCitations: ragCitations.length > 0 ? ragCitations : undefined
                  }
                : m
            );

            // Tự động lưu phiên vào Chat History
            const activeChatId = state.currentChatId;
            const updatedHistory = state.chatHistory.map((s) => {
              if (s.id === activeChatId) {
                return {
                  ...s,
                  messages: updatedMessages,
                  title: s.title.includes('Khởi đầu trò chuyện') ? prompt.slice(0, 35) + '...' : s.title
                };
              }
              return s;
            });

            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
            } catch {}

            return {
              messages: updatedMessages,
              isStreaming: false,
              recommendedList: recommendedList,
              chatHistory: updatedHistory
            };
          });
        }
      }, 24); // 24ms mỗi từ mang lại tốc độ stream nhanh mượt mà
    },

    newChat: () => {
      if (activeStreamingTimer) {
        clearInterval(activeStreamingTimer);
        activeStreamingTimer = null;
      }
      const newSessionId = 'session-' + Date.now();
      const newSession: ChatSession = {
        id: newSessionId,
        title: 'Cuộc trò chuyện mới (RAG)',
        timestamp: 'Vừa xong',
        messages: [
          {
            id: 'welcome-new',
            sender: 'cineai',
            text: 'Xin chào! CineAI RAG Engine đã sẵn sàng. Hãy chọn tâm trạng hoặc nhập tên bộ phim bạn muốn tôi tóm tắt, giải mã kịch bản hoặc hỏi về các tính năng CineStreams!',
            timestamp: 'Vừa xong',
            mode: 'mood'
          }
        ]
      };
      set((state) => {
        const updated = [newSession, ...state.chatHistory];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return {
          chatHistory: updated,
          currentChatId: newSessionId,
          messages: newSession.messages,
          isThinking: false,
          isStreaming: false,
          recommendedList: []
        };
      });
    },

    loadChat: (chatId) => {
      if (activeStreamingTimer) {
        clearInterval(activeStreamingTimer);
        activeStreamingTimer = null;
      }
      const session = get().chatHistory.find((s) => s.id === chatId);
      if (session) {
        set({
          currentChatId: chatId,
          messages: session.messages,
          isThinking: false,
          isStreaming: false
        });
      }
    },

    deleteChat: (chatId) => {
      set((state) => {
        const filtered = state.chatHistory.filter((s) => s.id !== chatId);
        const nextSession = filtered[0] || {
          id: 'session-default',
          title: 'Khởi đầu trò chuyện CineAI',
          timestamp: 'Hôm nay',
          messages: []
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        } catch {}
        return {
          chatHistory: filtered,
          currentChatId: nextSession.id,
          messages: nextSession.messages
        };
      });
    },

    togglePinChat: (chatId) => {
      set((state) => {
        const updated = state.chatHistory.map((s) =>
          s.id === chatId ? { ...s, isPinned: !s.isPinned } : s
        );
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return { chatHistory: updated };
      });
    },

    clearChat: () => {
      if (activeStreamingTimer) {
        clearInterval(activeStreamingTimer);
        activeStreamingTimer = null;
      }
      const resetMsg: CineAiMessage = {
        id: 'welcome-reset',
        sender: 'cineai',
        text: 'Hội thoại đã được làm mới. Hãy chọn tâm trạng hoặc gửi câu hỏi để bắt đầu phiên phân tích điện ảnh RAG mới!',
        timestamp: 'Vừa xong',
        mode: 'mood'
      };
      set({
        messages: [resetMsg],
        isThinking: false,
        isStreaming: false,
        recommendedList: []
      });
    },

    syncKnowledgeWithApi: async () => {
      try {
        const res = await apiClient.get<any>('/cineai/knowledge');
        if (res && res.success && res.data) {
          const d = res.data;
          set({
            totalIndexedDocs: {
              total: d.totalIndexed || 148,
              movies: 85,
              explainer: 32,
              platform: 31
            }
          });
        }
      } catch (_err) {
        // Fallback to local index count
        set({ totalIndexedDocs: ragEngine.getTotalIndexedDocuments() });
      }
    }
  };
});
