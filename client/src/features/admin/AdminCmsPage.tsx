import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { MovieEntity, EpisodeEntity } from '../../types';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../stores/useAuthStore';
import { uploadVideoChunks, CHUNK_SIZE } from '../../utils/chunkUploader';

interface SystemUser {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  verified?: boolean;
  roles?: string[];
  permissions?: string[];
  createdAt?: string;
}

interface MovieItem {
  id: string;
  title: string;
  originalTitle?: string;
  slug: string;
  synopsis: string;
  poster: string;
  backdrop: string;
  genres: string[];
  imdbRating: number;
  releaseYear: number;
  ageRating: string;
  badge?: string;
  qualityBadge: string;
  audioBadge?: string;
  director?: string;
  cast?: string[];
  type: string;
  status: string; // 'DRAFT' | 'PUBLISHED'
  streamUrl?: string;
  views?: number;
  subtitleUrl?: string;
  subtitleLabel?: string;
}

interface EpisodeItem {
  id: string;
  movieId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  duration: string;
  thumbnail: string;
  synopsis?: string;
  videoMasterUrl?: string;
  hlsMasterUrl?: string;
  processStatus: string; // 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  subtitleUrl?: string;
  subtitleLang?: string;
}

const POPULAR_GENRES = [
  'Hành Động',
  'Khoa Học Viễn Tưởng',
  'Tâm Lý',
  'Kinh Dị',
  'Hoạt Hình',
  'Hài Hước',
  'Lãng Mạn',
  'Phiêu Lưu',
  'Bí Ẩn',
  'Chiến Tranh',
  'Lịch Sử',
  'Gia Đình',
  'Giả Tưởng',
  'Võ Thuật',
  'Tài Liệu',
  'Âm Nhạc'
];

export const AdminCmsPage: React.FC = () => {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [genreFilter, setGenreFilter] = useState<string>('ALL');

  // Modal Create/Edit Movie (TASK-062)
  const [isMovieModalOpen, setIsMovieModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Partial<MovieItem> | null>(null);
  const [customGenreInput, setCustomGenreInput] = useState('');
  const [availableGenres, setAvailableGenres] = useState<string[]>(POPULAR_GENRES);

  // Fetch Available Genres & Categories from API
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await apiClient.get<any>('/movies/genres');
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const loaded = res.data.map((c: any) => (typeof c === 'string' ? c : c.name)).filter(Boolean);
          setAvailableGenres(Array.from(new Set([...loaded, ...POPULAR_GENRES])));
        }
      } catch {
        // Fallback to default popular genres
      }
    };
    fetchGenres();
  }, []);

  const handleAddCustomGenre = async () => {
    const trimmed = customGenreInput.trim();
    if (!trimmed) return;
    const current = editingMovie?.genres || [];
    if (!current.includes(trimmed)) {
      setEditingMovie({ ...editingMovie, genres: [...current, trimmed] });
    }
    if (!availableGenres.includes(trimmed)) {
      setAvailableGenres((prev) => [...prev, trimmed]);
      try {
        await apiClient.post('/categories', { name: trimmed, description: `Thể loại phim ${trimmed}` });
      } catch { }
    }
    setCustomGenreInput('');
  };

  // Modal Episodes & Chunked Upload (TASK-063, TASK-025 - TASK-029)
  const [selectedMovieForEpisodes, setSelectedMovieForEpisodes] = useState<MovieItem | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [isAddEpOpen, setIsAddEpOpen] = useState(false);
  const [newEpTitle, setNewEpTitle] = useState('');
  const [newEpNum, setNewEpNum] = useState(1);
  const [newEpSeason, setNewEpSeason] = useState(1);
  const [newEpSubtitleUrl, setNewEpSubtitleUrl] = useState('');

  // Edit Episode State
  const [editingEp, setEditingEp] = useState<EpisodeItem | null>(null);
  const [isEditEpOpen, setIsEditEpOpen] = useState(false);
  const [editEpTitle, setEditEpTitle] = useState('');
  const [editEpNum, setEditEpNum] = useState(1);
  const [editEpSeason, setEditEpSeason] = useState(1);
  const [editEpDuration, setEditEpDuration] = useState('45 phút');
  const [editEpSubtitleUrl, setEditEpSubtitleUrl] = useState('');

  // Chunk Upload State (TASK-025 to TASK-028)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSpeedMb, setUploadSpeedMb] = useState<number>(0);
  const [uploadEtaSecs, setUploadEtaSecs] = useState<number>(0);
  const [completedChunks, setCompletedChunks] = useState<number>(0);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Live Transcode Tracking (TASK-043)
  const [transcodeVideoId, setTranscodeVideoId] = useState<string | null>(null);
  const [transcodeProgress, setTranscodeProgress] = useState<{
    status: string;
    stage: string;
    percent: number;
  } | null>(null);

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [uploadStatusPhase, setUploadStatusPhase] = useState<'idle' | 'uploading' | 'merging' | 'completed' | 'error'>('idle');
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string>('');

  // Quyền truy cập
  const { currentUser, isAuthenticated, openAuthModal } = useAuthStore();
  const navigate = useNavigate();

  const userRoles = (currentUser?.roles || []).map((r) => String(r).toUpperCase());
  const userPerms = (currentUser?.permissions || []).map((p) => String(p).toLowerCase());

  const isSuperAdmin = Boolean(
    userRoles.some((r) => ['ROLE_ADMIN', 'ADMIN'].includes(r)) ||
    userPerms.some((p) => ['role_manage', 'role:manage'].includes(p))
  );

  const isContentEditor = Boolean(
    userRoles.some((r) => ['ROLE_CONTENT_EDITOR', 'CONTENT_EDITOR'].includes(r)) ||
    userPerms.some((p) => ['content:edit', 'subtitle:manage'].includes(p))
  );

  const canManageMovies = Boolean(
    isSuperAdmin ||
    isContentEditor ||
    userPerms.some((p) => ['movie_manage', 'upload_manage', 'user:create', 'category:create', 'content:edit'].includes(p))
  );

  // Phê duyệt xuất bản phim ra trang chủ (Quality Publish Gate): Độc quyền dành riêng cho ADMIN
  const canPublishMovie = Boolean(
    isSuperAdmin ||
    userPerms.some((p) => ['quality:publish_gate', 'role_manage'].includes(p))
  );

  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Tab chuyển đổi: Tự động mở Tab User nếu truy cập từ /quan-ly-phan-quyen hoặc ?tab=users
  const isUsersInitial =
    location.pathname === '/quan-ly-phan-quyen' || searchParams.get('tab') === 'users';
  const [activeTab, setActiveTab] = useState<'movies' | 'users'>(isUsersInitial ? 'users' : 'movies');

  useEffect(() => {
    if (location.pathname === '/quan-ly-phan-quyen' || searchParams.get('tab') === 'users') {
      setActiveTab('users');
    }
  }, [location.pathname, searchParams]);

  // Quản lý User & Cấp quyền
  const [usersList, setUsersList] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [updatingUsername, setUpdatingUsername] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await apiClient.get<SystemUser[]>('/roles/users');
      if (res.success && res.data) {
        setUsersList(res.data);
      }
    } catch (err: any) {
      setNotification({
        text: 'Lỗi khi tải danh sách người dùng: ' + (err?.message || 'Vui lòng thử lại sau'),
        type: 'error',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && activeTab === 'users') {
      fetchUsers();
    }
  }, [isSuperAdmin, activeTab]);

  const handleAssignRole = async (targetUsername: string, newRoles: string[]) => {
    setUpdatingUsername(targetUsername);
    try {
      const res = await apiClient.post('/roles/assign-user', {
        username: targetUsername,
        roles: newRoles,
      });
      if (res.success) {
        setNotification({
          text: `Đã cập nhật vai trò cho người dùng "${targetUsername}" thành công!`,
          type: 'success',
        });
        await fetchUsers();
      } else {
        setNotification({
          text: res.message || 'Lỗi khi cập nhật quyền cho người dùng',
          type: 'error',
        });
      }
    } catch (err: any) {
      setNotification({
        text: err?.message || 'Lỗi kết nối khi cập nhật quyền',
        type: 'error',
      });
    } finally {
      setUpdatingUsername(null);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<MovieItem[]>('/admin/movies');
      if (res.success && res.data) {
        setMovies(res.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchEpisodes = async (movieId: string) => {
    try {
      const res = await apiClient.get<any>(`/movies/${movieId}`);
      if (res.success && res.data?.episodes) {
        setEpisodes(res.data.episodes);
        if (res.data.episodes.length > 0) {
          setSelectedEpisodeId((prev) => {
            const exists = res.data.episodes.some((e: any) => e.id === prev);
            return exists ? prev : res.data.episodes[0].id;
          });
        }
      } else {
        setEpisodes([]);
      }
    } catch {
      setEpisodes([]);
    }
  };

  // Open Episode Manager for Movie
  const handleOpenEpisodes = async (movie: MovieItem) => {
    setSelectedMovieForEpisodes(movie);
    await fetchEpisodes(movie.id);
  };

  // Save / Update Movie (TASK-062)
  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovie?.title) {
      setNotification({ text: 'Vui lòng nhập tên phim!', type: 'error' });
      return;
    }

    const moviePayload = {
      ...editingMovie,
      genres: editingMovie?.genres && editingMovie.genres.length > 0 ? editingMovie.genres : ['Điện Ảnh'],
    };

    try {
      if (editingMovie.id) {
        await apiClient.put(`/admin/movies/${editingMovie.id}`, moviePayload);
        setNotification({ text: 'Cập nhật metadata phim thành công!', type: 'success' });
      } else {
        await apiClient.post('/admin/movies', moviePayload);
        setNotification({ text: 'Tạo bản ghi phim mới thành công!', type: 'success' });
      }
      setIsMovieModalOpen(false);
      fetchMovies();
    } catch (err: any) {
      setNotification({ text: err?.message || 'Lỗi khi lưu thông tin phim', type: 'error' });
    }
  };

  // Delete Movie
  const handleDeleteMovie = async (movieId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa phim này cùng toàn bộ các tập liên quan?')) return;
    try {
      await apiClient.delete(`/admin/movies/${movieId}`);
      setNotification({ text: 'Đã xóa phim thành công!', type: 'success' });
      fetchMovies();
    } catch (err: any) {
      setNotification({ text: err?.message || 'Lỗi xóa phim', type: 'error' });
    }
  };

  // Cleanup Demo Movies
  const handleCleanupDemoMovies = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn dọn dẹp và xóa sạch các phim demo mẫu (Dune, Gia Tộc Rồng, Ký Sinh Trùng, Hố Đen Tử Thần) khỏi cơ sở dữ liệu MongoDB?')) return;
    try {
      const res = await apiClient.delete<any>('/admin/movies/cleanup/demo');
      if (res.success) {
        setNotification({ text: res.message || 'Đã dọn dẹp các phim demo mẫu thành công!', type: 'success' });
        fetchMovies();
      } else {
        setNotification({ text: res.message || 'Lỗi khi dọn dẹp', type: 'error' });
      }
    } catch (err: any) {
      setNotification({ text: err?.message || 'Lỗi khi dọn dẹp phim demo', type: 'error' });
    }
  };

  // Publish Movie (TASK-060)
  const handlePublishMovie = async (movieId: string) => {
    try {
      const res = await apiClient.patch<any>(`/admin/movies/${movieId}/publish`);
      if (res.success) {
        setNotification({ text: 'Phê duyệt & xuất bản phim ra trang chủ thành công!', type: 'success' });
        fetchMovies();
      } else {
        setNotification({ text: res.message || 'Không thể xuất bản phim', type: 'error' });
      }
    } catch (err: any) {
      setNotification({ text: err?.message || 'Phim chưa có tập nào nén COMPLETED!', type: 'error' });
    }
  };

  // Create new episode
  const handleCreateEpisode = async () => {
    if (!selectedMovieForEpisodes || !newEpTitle) return;
    try {
      const res = await apiClient.post<EpisodeItem>(`/admin/movies/${selectedMovieForEpisodes.id}/episodes`, {
        seasonNumber: newEpSeason,
        episodeNumber: newEpNum,
        title: newEpTitle,
        duration: '45 phút',
        processStatus: 'PENDING',
        subtitleUrl: newEpSubtitleUrl.trim() || undefined,
        subtitleLang: newEpSubtitleUrl.trim() ? 'vi' : undefined,
      });
      if (res.success && res.data) {
        setEpisodes([...episodes, res.data]);
        setSelectedEpisodeId(res.data.id);
        setIsAddEpOpen(false);
        setNewEpTitle('');
        setNewEpSubtitleUrl('');
        setNotification({ text: 'Thêm tập phim thành công!', type: 'success' });
      }
    } catch (err: any) {
      setNotification({ text: err?.message || 'Lỗi tạo tập phim', type: 'error' });
    }
  };

  // Open Edit Episode Form
  const handleStartEditEpisode = (ep: EpisodeItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEp(ep);
    setEditEpTitle(ep.title);
    setEditEpNum(ep.episodeNumber);
    setEditEpSeason(ep.seasonNumber);
    setEditEpDuration(ep.duration || '45 phút');
    setEditEpSubtitleUrl(ep.subtitleUrl || '');
    setIsEditEpOpen(true);
  };

  // Update Episode
  const handleUpdateEpisode = async () => {
    if (!editingEp || !editEpTitle.trim()) return;
    try {
      const res = await apiClient.put<EpisodeItem>(`/admin/episodes/${editingEp.id}`, {
        ...editingEp,
        title: editEpTitle.trim(),
        episodeNumber: Number(editEpNum) || 1,
        seasonNumber: Number(editEpSeason) || 1,
        duration: editEpDuration || '45 phút',
        subtitleUrl: editEpSubtitleUrl.trim() || undefined,
        subtitleLang: editEpSubtitleUrl.trim() ? 'vi' : undefined,
      });
      if (res.success && res.data) {
        setEpisodes(episodes.map((ep) => (ep.id === editingEp.id ? { ...ep, ...res.data } : ep)));
        setIsEditEpOpen(false);
        setEditingEp(null);
        setNotification({ text: 'Cập nhật tập phim thành công!', type: 'success' });
      } else {
        setNotification({ text: res.message || 'Lỗi cập nhật tập phim', type: 'error' });
      }
    } catch (err: any) {
      setNotification({ text: err?.message || 'Lỗi cập nhật tập phim', type: 'error' });
    }
  };

  // Delete Episode
  const handleDeleteEpisode = async (epId: string, epTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tập [${epTitle}] khỏi phim?`)) return;
    try {
      const res = await apiClient.delete<any>(`/admin/episodes/${epId}`);
      if (res.success) {
        const remaining = episodes.filter((ep) => ep.id !== epId);
        setEpisodes(remaining);
        if (selectedEpisodeId === epId) {
          setSelectedEpisodeId(remaining.length > 0 ? remaining[0].id : null);
        }
        setNotification({ text: 'Đã xóa tập phim thành công!', type: 'success' });
      } else {
        setNotification({ text: res.message || 'Lỗi xóa tập phim', type: 'error' });
      }
    } catch (err: any) {
      setNotification({ text: err?.message || 'Lỗi xóa tập phim', type: 'error' });
    }
  };

  // ==========================================================
  // TASK-025 - TASK-029: Chunked Upload Implementation
  // ==========================================================

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validExtensions = ['.mp4', '.mkv', '.mov'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setNotification({ text: 'Chỉ chấp nhận các tệp định dạng .mp4, .mkv, .mov!', type: 'error' });
      return;
    }
    setSelectedFile(file);
    const total = Math.ceil(file.size / CHUNK_SIZE);
    setTotalChunks(total);
    setCompletedChunks(0);
    setUploadProgress(0);
    setUploadId(null);
    setUploadStatusPhase('idle');
    setUploadStatusMessage('');
  };

  const startOrResumeUpload = async () => {
    if (!selectedFile || !selectedMovieForEpisodes) return;

    const token = useAuthStore.getState().token || localStorage.getItem('cinestreams_token');
    if (!token) {
      setNotification({
        text: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập tài khoản Quản trị viên (Admin) để tải lên video!',
        type: 'error'
      });
      return;
    }

    setIsUploading(true);
    setIsPaused(false);
    setUploadStatusPhase('uploading');
    abortControllerRef.current = new AbortController();

    const targetEp = episodes.find((e) => e.id === selectedEpisodeId);
    const targetEpNum = targetEp?.episodeNumber || newEpNum || 1;
    const targetEpId = selectedEpisodeId || (episodes.length > 0 ? episodes[0].id : undefined);

    try {
      const result = await uploadVideoChunks({
        file: selectedFile,
        movieId: selectedMovieForEpisodes.id,
        episodeNumber: targetEpNum,
        episodeId: targetEpId,
        token,
        uploadId: uploadId || undefined,
        signal: abortControllerRef.current.signal,
        onProgress: (percent, info) => {
          setUploadProgress(percent);
          setCompletedChunks(info.completedChunks);
          setTotalChunks(info.totalChunks);
          setUploadSpeedMb(info.speedMb);
          setUploadEtaSecs(info.etaSecs);
        },
        onStatusChange: (status, message) => {
          setUploadStatusPhase(status);
          setUploadStatusMessage(message);
          if (status === 'merging') {
            setUploadProgress(100);
          }
        },
      });

      setUploadStatusPhase('completed');
      setNotification({
        text: 'Ghép file thành công! Đang kích hoạt nén HLS FFmpeg ngầm...',
        type: 'success',
      });

      if (result.videoId) {
        setTranscodeVideoId(result.videoId);
        pollTranscodeStatus(result.videoId);
      }

      await fetchEpisodes(selectedMovieForEpisodes.id);
      setIsUploading(false);
      setSelectedFile(null);
      setUploadId(null);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setIsPaused(true);
        setUploadStatusPhase('idle');
      } else {
        setUploadStatusPhase('error');
        setUploadStatusMessage(err.message || 'Lỗi trong quá trình upload video chunked!');
        setNotification({
          text: err.message || 'Lỗi trong quá trình upload video chunked!',
          type: 'error',
        });
      }
      setIsUploading(false);
    }
  };

  const handlePause = () => {
    abortControllerRef.current?.abort();
    setIsPaused(true);
    setIsUploading(false);
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setIsUploading(false);
    setIsPaused(false);
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadId(null);
    setUploadStatusPhase('idle');
    setUploadStatusMessage('');
  };

  // Poll Transcode Live Progress (TASK-043)
  const pollTranscodeStatus = (videoId: string) => {
    const timer = setInterval(async () => {
      try {
        const res = await apiClient.get<any>(`/admin/videos/transcode-status/${videoId}`);
        if (res.success && res.data) {
          setTranscodeProgress({
            status: res.data.status,
            stage: res.data.stage || 'Đang xử lý',
            percent: res.data.percent || 0,
          });

          if (res.data.status === 'COMPLETED') {
            clearInterval(timer);
            setNotification({ text: 'Nén video HLS thành công 100%!', type: 'success' });
            if (selectedMovieForEpisodes) {
              handleOpenEpisodes(selectedMovieForEpisodes);
            }
          } else if (res.data.status === 'FAILED') {
            clearInterval(timer);
            setNotification({ text: 'Lỗi nén video: ' + res.data.errorLog, type: 'error' });
          }
        }
      } catch {
        clearInterval(timer);
      }
    }, 2000);
  };

  // Filtered movies
  const filteredMovies = movies.filter((m) => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.originalTitle && m.originalTitle.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;
    const matchGenre = genreFilter === 'ALL' || (m.genres && m.genres.includes(genreFilter));
    return matchSearch && matchStatus && matchGenre;
  });

  // Filtered users for Tab 2
  const filteredUsers = usersList.filter((u) => {
    const q = userSearch.toLowerCase();
    const matchSearch =
      !userSearch ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.fullName && u.fullName.toLowerCase().includes(q));

    if (!matchSearch) return false;

    const roles = (u.roles || []).map((r) => r.toUpperCase());
    if (userRoleFilter === 'ADMIN') return roles.some((r) => r.includes('ADMIN'));
    if (userRoleFilter === 'FINANCE_MANAGER') return roles.some((r) => r.includes('FINANCE_MANAGER'));
    if (userRoleFilter === 'CONTENT_EDITOR') return roles.some((r) => r.includes('CONTENT_EDITOR'));
    if (userRoleFilter === 'MODERATOR') return roles.some((r) => r.includes('MODERATOR')) && !roles.some((r) => r.includes('ADMIN'));
    if (userRoleFilter === 'USER') return !roles.some((r) => r.includes('ADMIN') || r.includes('FINANCE_MANAGER') || r.includes('CONTENT_EDITOR') || r.includes('MODERATOR'));

    return true;
  });

  // 1. Kiểm tra đăng nhập
  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-container-low border border-surface-variant/40 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl">lock</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-on-surface">Yêu Cầu Đăng Nhập</h2>
            <p className="text-xs text-outline mt-2 leading-relaxed">
              Bạn cần đăng nhập tài khoản có quyền Quản trị viên (Admin) hoặc Quản lý nội dung (Moderator) để truy cập hệ thống CMS Đăng Phim CineStreams.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => openAuthModal('login')}
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">login</span>
              <span>Đăng Nhập Ngay</span>
            </button>
            <Link
              to="/"
              className="w-full py-3 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-semibold block transition-colors text-center"
            >
              Quay Về Trang Chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Kiểm tra thẩm quyền (Chỉ Admin và Moderator được cấp quyền)
  if (!canManageMovies) {
    return (
      <div className="w-full min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-container-low border border-error/30 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-error/10 text-error mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl">block</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-on-surface">Từ Chối Truy Cập (403 Forbidden)</h2>
            <p className="text-xs text-outline mt-2 leading-relaxed">
              Tài khoản <span className="text-primary font-bold">{currentUser?.name || currentUser?.email}</span> chưa được cấp quyền quản trị.
              Chỉ Quản trị viên (Admin) hoặc người được Admin cấp quyền đăng phim (Moderator) mới có thể sử dụng giao diện này.
            </p>
            <p className="text-[11px] text-outline-variant mt-2">
              Vui lòng liên hệ Admin hệ thống để được cấp quyền hoặc quay về trang xem phim.
            </p>
          </div>
          <div>
            <Link
              to="/"
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:bg-primary/90 block transition-all text-center"
            >
              Quay Về Trang Chủ CineStreams
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-surface text-on-surface p-4 lg:p-8 space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-variant/40 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-2xl">admin_panel_settings</span>
            <span className="text-xs uppercase tracking-widest text-primary font-bold">CineStreams CMS Portal</span>
            {isSuperAdmin && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                👑 Super Admin
              </span>
            )}
            {!isSuperAdmin && canManageMovies && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                🎬 Moderator
              </span>
            )}
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Hệ Thống Quản Trị & Đăng Tải Phim</h1>
          <p className="text-xs text-outline mt-1">
            Quy trình Upload Chunking 5MB, Transcoding FFmpeg Đa Độ Phân Giải HLS và Phân Quyền Thành Viên
          </p>
        </div>

        {activeTab === 'movies' && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={handleCleanupDemoMovies}
              className="px-4 py-2.5 rounded-xl bg-error/15 text-error border border-error/30 hover:bg-error/25 font-bold text-xs flex items-center gap-1.5 transition-all"
              title="Dọn dẹp các phim demo mẫu (Dune, Gia Tộc Rồng, Ký Sinh Trùng, Hố Đen Tử Thần) khỏi Database"
            >
              <span className="material-symbols-outlined text-base">auto_delete</span>
              <span>Dọn Dẹp Phim Demo</span>
            </button>

            <button
              onClick={() => {
                setEditingMovie({
                  type: 'movie',
                  status: 'DRAFT',
                  imdbRating: 8.5,
                  releaseYear: 2026,
                  ageRating: '16+',
                  qualityBadge: '4K ULTRA HD',
                  audioBadge: 'DOLBY ATMOS',
                  genres: ['Hành Động'],
                  views: 0,
                });
                setCustomGenreInput('');
                setIsMovieModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:bg-primary/90 transition-all"
            >
              <span className="material-symbols-outlined text-base">add_box</span>
              <span>Tạo Phim Mới</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs navigation for Super Admin */}
      {isSuperAdmin && (
        <div className="flex items-center gap-2 border-b border-surface-variant/40 pb-2">
          <button
            onClick={() => setActiveTab('movies')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'movies'
                ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(229,9,20,0.35)]'
                : 'bg-surface-container hover:bg-surface-variant text-outline hover:text-on-surface'
              }`}
          >
            <span className="material-symbols-outlined text-base">movie</span>
            <span>🎬 Quản Lý & Đăng Tải Phim</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('users');
              if (usersList.length === 0) fetchUsers();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'users'
                ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(229,9,20,0.35)]'
                : 'bg-surface-container hover:bg-surface-variant text-outline hover:text-on-surface'
              }`}
          >
            <span className="material-symbols-outlined text-base">manage_accounts</span>
            <span>🛡️ Phân Quyền & Quản Lý User ({usersList.length > 0 ? usersList.length : '...'})</span>
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between border ${notification.type === 'success'
              ? 'bg-primary/15 border-primary text-primary'
              : 'bg-error/20 border-error text-error'
            }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">
              {notification.type === 'success' ? 'verified' : 'error'}
            </span>
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-80">
            <span className="material-symbols-outlined text-xs">close</span>
          </button>
        </div>
      )}

      {/* ================= TAB 1: QUẢN LÝ & ĐĂNG TẢI PHIM ================= */}
      {activeTab === 'movies' && (
        <div className="space-y-6">
          {/* KPI Stats (TASK-061) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">movie</span>
              </div>
              <div>
                <p className="text-xs text-outline font-medium">Tổng số phim</p>
                <p className="text-xl font-bold font-mono">{movies.length}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">publish</span>
              </div>
              <div>
                <p className="text-xs text-outline font-medium">Đã xuất bản</p>
                <p className="text-xl font-bold font-mono text-green-400">
                  {movies.filter((m) => m.status === 'PUBLISHED').length}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">edit_document</span>
              </div>
              <div>
                <p className="text-xs text-outline font-medium">Bản nháp (Draft)</p>
                <p className="text-xl font-bold font-mono text-amber-400">
                  {movies.filter((m) => m.status === 'DRAFT').length}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">cloud_sync</span>
              </div>
              <div>
                <p className="text-xs text-outline font-medium">Video HLS Ready</p>
                <p className="text-xl font-bold font-mono text-sky-400">
                  {movies.filter((m) => m.streamUrl && m.streamUrl.includes('hls')).length}
                </p>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar (TASK-061) */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-surface-container-low p-3 rounded-2xl border border-surface-variant/30">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-lg">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm phim theo tiêu đề hoặc tên gốc..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-container text-xs text-on-surface outline-none border border-surface-variant/40 focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-10 px-3 rounded-xl bg-surface-container text-xs text-on-surface outline-none border border-surface-variant/40"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PUBLISHED">Đã xuất bản (PUBLISHED)</option>
                <option value="DRAFT">Bản nháp (DRAFT)</option>
              </select>

              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="h-10 px-3 rounded-xl bg-surface-container text-xs text-on-surface outline-none border border-surface-variant/40"
              >
                <option value="ALL">Tất cả thể loại</option>
                {availableGenres.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Movies Table (TASK-061) */}
          <div className="rounded-2xl bg-surface-container-low border border-surface-variant/30 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-on-surface">
                <thead className="bg-surface-container uppercase text-[10px] tracking-wider text-outline border-b border-surface-variant/30">
                  <tr>
                    <th className="py-3 px-4">Poster / Tên Phim</th>
                    <th className="py-3 px-3">Thể Loại</th>
                    <th className="py-3 px-3">Loại</th>
                    <th className="py-3 px-3">Năm / Điểm</th>
                    <th className="py-3 px-3">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant/20">
                  {filteredMovies.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-container/40 transition-colors">
                      <td className="py-3 px-4 flex items-center gap-3">
                        <img
                          src={m.poster || m.backdrop}
                          alt={m.title}
                          className="w-10 h-14 object-cover rounded-lg bg-zinc-800 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-sm text-white line-clamp-1">{m.title}</p>
                          <p className="text-[11px] text-outline line-clamp-1">{m.originalTitle || m.slug}</p>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[170px]">
                          {m.genres && m.genres.length > 0 ? (
                            <>
                              {m.genres.slice(0, 2).map((g) => (
                                <span key={g} className="px-2 py-0.5 rounded bg-surface-container text-[10px] text-zinc-300 font-medium">
                                  {g}
                                </span>
                              ))}
                              {m.genres.length > 2 && (
                                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold" title={m.genres.slice(2).join(', ')}>
                                  +{m.genres.length - 2}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] text-outline italic">Chưa phân loại</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="capitalize font-mono">{m.type}</span>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {m.releaseYear} • <span className="text-primary font-bold">★ {m.imdbRating}</span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${m.status === 'PUBLISHED'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                        >
                          {m.status === 'PUBLISHED' ? 'Đã xuất bản' : 'Bản nháp'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quản lý tập & Upload Video (TASK-063) */}
                          <button
                            onClick={() => handleOpenEpisodes(m)}
                            className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-variant text-primary"
                            title="Quản lý tập & Tải video"
                          >
                            <span className="material-symbols-outlined text-base">video_library</span>
                          </button>

                          {/* Phê duyệt / Xuất bản (TASK-060) */}
                          {m.status !== 'PUBLISHED' && (
                            <button
                              onClick={() => handlePublishMovie(m.id)}
                              className="p-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400"
                              title="Phê duyệt & Xuất bản ra trang chủ"
                            >
                              <span className="material-symbols-outlined text-base">check_circle</span>
                            </button>
                          )}

                          {/* Sửa (TASK-062) */}
                          <button
                            onClick={() => {
                              setEditingMovie({ ...m, genres: Array.isArray(m.genres) ? m.genres : [] });
                              setCustomGenreInput('');
                              setIsMovieModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-variant text-zinc-300"
                            title="Chỉnh sửa metadata"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>

                          {/* Xóa */}
                          <button
                            onClick={() => handleDeleteMovie(m.id)}
                            className="p-1.5 rounded-lg bg-error/15 hover:bg-error/30 text-error"
                            title="Xóa phim"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: QUẢN LÝ PHÂN QUYỀN USER (CHO ADMIN) ================= */}
      {isSuperAdmin && activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Stats KPI (6 Roles Chuẩn) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
              </div>
              <div>
                <p className="text-[10px] text-outline font-medium">👑 ADMIN</p>
                <p className="text-lg font-bold font-mono text-red-400">
                  {usersList.filter((u) => (u.roles || []).some((r) => r.toUpperCase().includes('ADMIN'))).length}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">payments</span>
              </div>
              <div>
                <p className="text-[10px] text-outline font-medium">💰 FINANCE_MANAGER</p>
                <p className="text-lg font-bold font-mono text-emerald-400">
                  {usersList.filter((u) => (u.roles || []).some((r) => r.toUpperCase().includes('FINANCE_MANAGER'))).length}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">edit_note</span>
              </div>
              <div>
                <p className="text-[10px] text-outline font-medium">✍️ CONTENT_EDITOR</p>
                <p className="text-lg font-bold font-mono text-fuchsia-400">
                  {usersList.filter((u) => (u.roles || []).some((r) => r.toUpperCase().includes('CONTENT_EDITOR'))).length}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">workspace_premium</span>
              </div>
              <div>
                <p className="text-[10px] text-outline font-medium">⭐ VIP_USER</p>
                <p className="text-lg font-bold font-mono text-amber-400">
                  {usersList.filter((u) => (u.roles || []).some((r) => {
                    const ro = r.toUpperCase();
                    return ro.includes('VIP_USER') || ro === 'ROLE_VIP' || ro === 'VIP';
                  })).length}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">person</span>
              </div>
              <div>
                <p className="text-[10px] text-outline font-medium">👤 FREE_USER</p>
                <p className="text-lg font-bold font-mono text-sky-400">
                  {usersList.filter((u) => (u.roles || []).some((r) => {
                    const ro = r.toUpperCase();
                    return ro.includes('FREE_USER') || ro === 'ROLE_USER';
                  })).length}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-variant/30 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-500/10 text-zinc-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">visibility</span>
              </div>
              <div>
                <p className="text-[10px] text-outline font-medium">👁️ GUEST</p>
                <p className="text-lg font-bold font-mono text-zinc-400">
                  {usersList.filter((u) => (u.roles || []).some((r) => r.toUpperCase().includes('GUEST'))).length}
                </p>
              </div>
            </div>
          </div>

          {/* User Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-surface-container-low p-3 rounded-2xl border border-surface-variant/30">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-lg">
                search
              </span>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Tìm kiếm theo username, email hoặc họ tên..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-container text-xs text-on-surface outline-none border border-surface-variant/40 focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="h-10 px-3 rounded-xl bg-surface-container text-xs text-on-surface outline-none border border-surface-variant/40 cursor-pointer"
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="ADMIN">👑 ADMIN (Quản trị toàn quyền)</option>
                <option value="FINANCE_MANAGER">💰 FINANCE_MANAGER (Quản lý doanh thu)</option>
                <option value="CONTENT_EDITOR">✍️ CONTENT_EDITOR (Biên tập nội dung)</option>
                <option value="VIP_USER">⭐ VIP_USER (Thành viên trả phí)</option>
                <option value="FREE_USER">👤 FREE_USER (Thành viên miễn phí)</option>
                <option value="GUEST">👁️ GUEST (Khách vãng lai)</option>
              </select>

              <Link
                to="/quan-ly-phan-quyen"
                className="h-10 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-amber-500/30 transition-all shrink-0"
                title="Mở trung tâm phân quyền chuyên sâu"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                <span>Phân Quyền Chi Tiết</span>
              </Link>

              <button
                onClick={fetchUsers}
                disabled={loadingUsers}
                className="h-10 px-4 rounded-xl bg-surface-container hover:bg-surface-variant text-xs text-on-surface flex items-center gap-1.5 transition-colors border border-surface-variant/40 shrink-0 font-semibold"
                title="Tải lại danh sách"
              >
                <span className={`material-symbols-outlined text-base ${loadingUsers ? 'animate-spin text-primary' : ''}`}>
                  refresh
                </span>
                <span>Làm Mới</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-2xl bg-surface-container-low border border-surface-variant/30 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-on-surface">
                <thead className="bg-surface-container uppercase text-[10px] tracking-wider text-outline border-b border-surface-variant/30">
                  <tr>
                    <th className="py-3 px-4">Tài Khoản / Người Dùng</th>
                    <th className="py-3 px-3">Xác Thực OTP</th>
                    <th className="py-3 px-3">Vai Trò Hiện Tại</th>
                    <th className="py-3 px-4 text-right">Phân Quyền & Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant/20">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-outline">
                        <span className="material-symbols-outlined animate-spin text-2xl text-primary inline-block">
                          sync
                        </span>
                        <p className="mt-2 text-xs">Đang tải danh sách người dùng...</p>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-outline">
                        Không tìm thấy người dùng phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const rolesUpper = (u.roles || []).map((r) => r.toUpperCase());
                      const isUserAdmin = rolesUpper.some((r) => r.includes('ADMIN'));
                      const isUserFinance = rolesUpper.some((r) => r.includes('FINANCE_MANAGER'));
                      const isUserEditor = rolesUpper.some((r) => r.includes('CONTENT_EDITOR'));
                      const isUserVip = rolesUpper.some((r) => r.includes('VIP_USER') || r === 'ROLE_VIP' || r === 'VIP');
                      const isUserFree = rolesUpper.some((r) => r.includes('FREE_USER') || r === 'ROLE_USER');
                      const isUserGuest = rolesUpper.some((r) => r.includes('GUEST'));
                      const isSelf = currentUser?.email === u.email || currentUser?.name === u.username;

                      return (
                        <tr key={u.id || u.username} className="hover:bg-surface-container/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-sm text-primary uppercase border border-surface-variant/40 shrink-0">
                                {u.username ? u.username.charAt(0) : 'U'}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-on-surface">{u.fullName || u.username}</p>
                                  {isSelf && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-bold">
                                      Bạn
                                    </span>
                                  )}
                                  {isUserVip && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                                      VIP 4K
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-outline font-mono">@{u.username} • {u.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {u.verified ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                                <span className="material-symbols-outlined text-xs">verified</span>
                                <span>Đã xác thực</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-max">
                                <span className="material-symbols-outlined text-xs">pending</span>
                                <span>Chưa xác thực</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1">
                              {isUserAdmin && (
                                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1 shadow-sm">
                                  <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
                                  <span>👑 ADMIN</span>
                                </span>
                              )}
                              {isUserFinance && (
                                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                                  <span className="material-symbols-outlined text-xs">payments</span>
                                  <span>💰 FINANCE_MANAGER</span>
                                </span>
                              )}
                              {isUserEditor && (
                                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30 flex items-center gap-1 shadow-sm">
                                  <span className="material-symbols-outlined text-xs">edit_note</span>
                                  <span>✍️ CONTENT_EDITOR</span>
                                </span>
                              )}
                              {isUserVip && (
                                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-sm">
                                  <span className="material-symbols-outlined text-xs">workspace_premium</span>
                                  <span>⭐ VIP_USER</span>
                                </span>
                              )}
                              {isUserFree && !isUserAdmin && !isUserFinance && !isUserEditor && !isUserVip && (
                                <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">person</span>
                                  <span>👤 FREE_USER</span>
                                </span>
                              )}
                              {isUserGuest && (
                                <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-surface-container-highest text-zinc-400 border border-surface-variant/40 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">visibility</span>
                                  <span>👁️ GUEST</span>
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {updatingUsername === u.username ? (
                                <span className="text-xs text-primary flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                                  <span>Đang lưu...</span>
                                </span>
                              ) : isSelf ? (
                                <span className="text-[11px] text-outline italic">Tài khoản hiện tại</span>
                              ) : (
                                <>
                                  {/* Cấp Quyền FINANCE_MANAGER */}
                                  {!isUserFinance && (
                                    <button
                                      onClick={() => handleAssignRole(u.username, ['ROLE_FINANCE_MANAGER', 'ROLE_FREE_USER'])}
                                      className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[10px] flex items-center gap-1 transition-all border border-emerald-500/30"
                                      title="Quản lý doanh thu: Theo dõi lịch sử giao dịch mua gói, báo cáo doanh số, xử lý hoàn tiền và đối soát"
                                    >
                                      <span className="material-symbols-outlined text-xs">payments</span>
                                      <span>+ Finance</span>
                                    </button>
                                  )}

                                  {/* Cấp Quyền CONTENT_EDITOR */}
                                  {!isUserEditor && (
                                    <button
                                      onClick={() => handleAssignRole(u.username, ['ROLE_CONTENT_EDITOR', 'ROLE_FREE_USER'])}
                                      className="px-2 py-1 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 font-bold text-[10px] flex items-center gap-1 transition-all border border-fuchsia-500/30"
                                      title="Biên tập nội dung: Nhập metadata phim, tải lên poster, banner, WebVTT, tạo season và quản lý tập"
                                    >
                                      <span className="material-symbols-outlined text-xs">edit_note</span>
                                      <span>+ Editor</span>
                                    </button>
                                  )}

                                  {/* Cấp Quyền VIP_USER */}
                                  {!isUserVip && (
                                    <button
                                      onClick={() => handleAssignRole(u.username, ['ROLE_VIP_USER', 'ROLE_FREE_USER'])}
                                      className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[10px] flex items-center gap-1 transition-all border border-amber-500/30"
                                      title="Thành viên trả phí: Xem phim độc quyền VIP/Originals, 1080p/4K, không quảng cáo, phòng xem chung"
                                    >
                                      <span className="material-symbols-outlined text-xs">workspace_premium</span>
                                      <span>+ VIP</span>
                                    </button>
                                  )}

                                  {/* Thăng Cấp ADMIN */}
                                  {!isUserAdmin && (
                                    <button
                                      onClick={() => handleAssignRole(u.username, ['ROLE_ADMIN', 'ROLE_FINANCE_MANAGER', 'ROLE_CONTENT_EDITOR', 'ROLE_VIP_USER', 'ROLE_FREE_USER'])}
                                      className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-[10px] flex items-center gap-1 transition-all border border-red-500/30"
                                      title="Quản trị toàn quyền: Quản lý người dùng, phân quyền vai trò, cấu hình hệ thống, audit log"
                                    >
                                      <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
                                      <span>+ Admin</span>
                                    </button>
                                  )}

                                  {/* Chuyển về FREE_USER */}
                                  {(isUserAdmin || isUserFinance || isUserEditor || isUserVip) && (
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`Bạn có chắc chắn muốn chuyển "${u.username}" về FREE_USER (Thành viên miễn phí)?`)) {
                                          handleAssignRole(u.username, ['ROLE_FREE_USER']);
                                        }
                                      }}
                                      className="px-2 py-1 rounded-lg bg-error/15 hover:bg-error/25 text-error font-medium text-[10px] flex items-center gap-1 transition-all border border-error/30"
                                      title="Chuyển về thành viên miễn phí"
                                    >
                                      <span className="material-symbols-outlined text-xs">person_remove</span>
                                      <span>Về Free</span>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CREATE / EDIT MOVIE (TASK-062) ================= */}
      {isMovieModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-surface-container-low rounded-3xl border border-surface-variant/40 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-variant/30 pb-3">
              <h2 className="text-lg font-bold">
                {editingMovie?.id ? 'Chỉnh Sửa Metadata Phim' : 'Thêm Phim Mới'}
              </h2>
              <button onClick={() => setIsMovieModalOpen(false)} className="p-1 text-outline hover:text-white">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveMovie} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Tên Phim (Tiếng Việt)</label>
                  <input
                    type="text"
                    required
                    value={editingMovie?.title || ''}
                    onChange={(e) => setEditingMovie({ ...editingMovie, title: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-variant/40 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Tên Gốc (Original Title)</label>
                  <input
                    type="text"
                    value={editingMovie?.originalTitle || ''}
                    onChange={(e) => setEditingMovie({ ...editingMovie, originalTitle: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-variant/40 outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Tóm Tắt Nội Dung</label>
                <textarea
                  rows={3}
                  value={editingMovie?.synopsis || ''}
                  onChange={(e) => setEditingMovie({ ...editingMovie, synopsis: e.target.value })}
                  className="w-full p-3 rounded-xl bg-surface-container border border-surface-variant/40 outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Loại Phim</label>
                  <select
                    value={editingMovie?.type || 'movie'}
                    onChange={(e) => setEditingMovie({ ...editingMovie, type: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-variant/40"
                  >
                    <option value="movie">Phim Lẻ (Movie)</option>
                    <option value="series">Phim Bộ (Series)</option>
                    <option value="anime">Hoạt Hình (Anime)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Năm Phát Hành</label>
                  <input
                    type="number"
                    value={editingMovie?.releaseYear || 2026}
                    onChange={(e) => setEditingMovie({ ...editingMovie, releaseYear: parseInt(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-variant/40"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Điểm IMDb</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingMovie?.imdbRating || 8.5}
                    onChange={(e) => setEditingMovie({ ...editingMovie, imdbRating: parseFloat(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-variant/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Đạo Diễn (Director)</label>
                  <input
                    type="text"
                    placeholder="VD: Denis Villeneuve, Christopher Nolan..."
                    value={editingMovie?.director || ''}
                    onChange={(e) => setEditingMovie({ ...editingMovie, director: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-variant/40 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Diễn Viên (Cách nhau bởi dấu phẩy)</label>
                  <input
                    type="text"
                    placeholder="VD: Timothée Chalamet, Zendaya, Austin Butler..."
                    value={Array.isArray(editingMovie?.cast) ? editingMovie.cast.join(', ') : (editingMovie?.cast || '')}
                    onChange={(e) => setEditingMovie({
                      ...editingMovie,
                      cast: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container border border-surface-variant/40 outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Thể Loại Phim (TASK: Bổ sung chọn & nhập thể loại phim) */}
              <div className="p-3.5 rounded-2xl bg-surface-container border border-surface-variant/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-xs flex items-center gap-1.5 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-base">category</span>
                    <span>Thể Loại Phim</span>
                    <span className="text-[10px] text-outline font-normal">
                      ({editingMovie?.genres?.length || 0} thể loại đã chọn)
                    </span>
                  </label>
                  {editingMovie?.genres && editingMovie.genres.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditingMovie({ ...editingMovie, genres: [] })}
                      className="text-[11px] text-outline hover:text-error transition-colors"
                    >
                      Xóa tất cả
                    </button>
                  )}
                </div>

                {/* Danh sách thể loại đã chọn (Active Chips) */}
                {editingMovie?.genres && editingMovie.genres.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-surface-container-low border border-surface-variant/30 min-h-[38px] items-center">
                    {editingMovie.genres.map((genre) => (
                      <span
                        key={genre}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/20 text-primary border border-primary/40 text-xs font-semibold"
                      >
                        <span>{genre}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (editingMovie.genres || []).filter((g) => g !== genre);
                            setEditingMovie({ ...editingMovie, genres: updated });
                          }}
                          className="hover:text-error text-xs flex items-center ml-0.5"
                          title="Xóa thể loại này"
                        >
                          <span className="material-symbols-outlined text-[13px]">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-outline italic">
                    Chưa chọn thể loại nào. Vui lòng bấm vào các gợi ý bên dưới hoặc tự nhập.
                  </p>
                )}

                {/* Gợi ý thể loại phổ biến 1-click toggle */}
                <div>
                  <p className="text-[11px] text-outline mb-1.5 font-medium">Danh sách thể loại khả dụng (bấm để thêm / bỏ):</p>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                    {availableGenres.map((genre) => {
                      const isSelected = (editingMovie?.genres || []).includes(genre);
                      return (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => {
                            const current = editingMovie?.genres || [];
                            const updated = isSelected
                              ? current.filter((g) => g !== genre)
                              : [...current, genre];
                            setEditingMovie({ ...editingMovie, genres: updated });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${isSelected
                              ? 'bg-primary text-white border-primary shadow-sm shadow-primary/30'
                              : 'bg-surface-container-low text-zinc-300 border-surface-variant/40 hover:border-primary/50 hover:text-white'
                            }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {isSelected ? 'check' : 'add'}
                          </span>
                          <span>{genre}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nhập thể loại tùy chỉnh */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customGenreInput}
                    onChange={(e) => setCustomGenreInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomGenre();
                      }
                    }}
                    placeholder="Nhập thể loại khác (vd: Cung Đấu, Trinh Thám, Siêu Anh Hùng...)..."
                    className="flex-1 h-9 px-3 rounded-xl bg-surface-container-low border border-surface-variant/40 outline-none text-xs text-on-surface focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomGenre}
                    className="px-3.5 h-9 rounded-xl bg-surface-variant hover:bg-surface-variant/80 text-on-surface font-semibold text-xs flex items-center gap-1 shrink-0"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Thêm</span>
                  </button>
                </div>
              </div>

              {/* Poster & Backdrop Banner Upload & Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Ảnh Poster (Dọc 2:3)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://... hoặc tải ảnh lên"
                      value={editingMovie?.poster || ''}
                      onChange={(e) => setEditingMovie({ ...editingMovie, poster: e.target.value })}
                      className="flex-1 h-10 px-3 rounded-xl bg-surface-container border border-surface-variant/40 outline-none focus:border-primary"
                    />
                    <label className="px-3 h-10 rounded-xl bg-surface-container hover:bg-surface-variant text-zinc-300 font-semibold flex items-center justify-center cursor-pointer border border-surface-variant/40 shrink-0">
                      <span className="material-symbols-outlined text-base">upload_file</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              setEditingMovie({ ...editingMovie, poster: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  {editingMovie?.poster && (
                    <div className="mt-2 w-24 h-36 rounded-xl overflow-hidden border border-surface-variant/40 shadow">
                      <img src={editingMovie.poster} alt="Poster Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-semibold block mb-1">Ảnh Banner Backdrop (Ngang 16:9)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://... hoặc tải banner lên"
                      value={editingMovie?.backdrop || ''}
                      onChange={(e) => setEditingMovie({ ...editingMovie, backdrop: e.target.value })}
                      className="flex-1 h-10 px-3 rounded-xl bg-surface-container border border-surface-variant/40 outline-none focus:border-primary"
                    />
                    <label className="px-3 h-10 rounded-xl bg-surface-container hover:bg-surface-variant text-zinc-300 font-semibold flex items-center justify-center cursor-pointer border border-surface-variant/40 shrink-0">
                      <span className="material-symbols-outlined text-base">upload_file</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              setEditingMovie({ ...editingMovie, backdrop: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  {editingMovie?.backdrop && (
                    <div className="mt-2 w-44 h-24 rounded-xl overflow-hidden border border-surface-variant/40 shadow">
                      <img src={editingMovie.backdrop} alt="Backdrop Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Subtitle WebVTT Section */}
              <div className="p-3.5 rounded-2xl bg-surface-container border border-surface-variant/40 space-y-2">
                <div className="flex items-center gap-2 text-fuchsia-400 font-bold">
                  <span className="material-symbols-outlined text-base">subtitles</span>
                  <span>Phụ Đề WebVTT (.vtt) Mặc Định</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                    Content Editor Exclusive
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-outline block mb-1">Nhãn phụ đề</label>
                    <input
                      type="text"
                      placeholder="VD: Tiếng Việt [Việt Sub], English [CC]..."
                      value={editingMovie?.subtitleLabel || ''}
                      onChange={(e) => setEditingMovie({ ...editingMovie, subtitleLabel: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl bg-surface-container-low border border-surface-variant/40 outline-none focus:border-fuchsia-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-outline block mb-1">Đường dẫn file .vtt hoặc tải lên</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="VD: /subtitles/dune2_vi.vtt..."
                        value={editingMovie?.subtitleUrl || ''}
                        onChange={(e) => setEditingMovie({ ...editingMovie, subtitleUrl: e.target.value })}
                        className="flex-1 h-9 px-3 rounded-xl bg-surface-container-low border border-surface-variant/40 outline-none focus:border-fuchsia-400"
                      />
                      <label className="px-2.5 h-9 rounded-xl bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 font-semibold flex items-center justify-center cursor-pointer border border-fuchsia-500/30 shrink-0">
                        <span className="material-symbols-outlined text-sm">attach_file</span>
                        <input
                          type="file"
                          accept=".vtt,.srt"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setEditingMovie({
                                ...editingMovie,
                                subtitleUrl: `/subtitles/${file.name}`,
                                subtitleLabel: editingMovie?.subtitleLabel || file.name.replace('.vtt', '').toUpperCase()
                              });
                              setNotification({
                                text: `Đã nạp file phụ đề: ${file.name}`,
                                type: 'success'
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Publication Control */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-surface-variant/40">
                <div>
                  <p className="font-semibold text-xs">Trạng thái phát hành</p>
                  <p className="text-[11px] text-outline">
                    {canPublishMovie
                      ? 'Admin / Moderator có thể xuất bản phim trực tiếp lên Trang Chủ.'
                      : '✍️ Vai trò Content Editor: Lưu bản nháp (DRAFT) để Moderator/Admin duyệt phát hành.'}
                  </p>
                </div>
                {canPublishMovie ? (
                  <select
                    value={editingMovie?.status || 'DRAFT'}
                    onChange={(e) => setEditingMovie({ ...editingMovie, status: e.target.value })}
                    className="h-9 px-3 rounded-xl bg-surface-container-low border border-surface-variant/40 font-bold"
                  >
                    <option value="DRAFT">Bản Nháp (DRAFT)</option>
                    <option value="PUBLISHED">Xuất Bản (PUBLISHED)</option>
                  </select>
                ) : (
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Bản Nháp (DRAFT)
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-surface-variant/30">
                <button
                  type="button"
                  onClick={() => setIsMovieModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-variant"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90"
                >
                  Lưu Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL EPISODE & CHUNKED UPLOAD (TASK-063, TASK-025 to TASK-029) ================= */}
      {selectedMovieForEpisodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-4xl bg-surface-container-low rounded-3xl border border-surface-variant/40 shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-variant/30 pb-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">video_library</span>
                  <span>Quản Lý Tập Phim & Upload Video HLS</span>
                </h2>
                <p className="text-xs text-outline mt-0.5">Phim: {selectedMovieForEpisodes.title}</p>
              </div>
              <button onClick={() => setSelectedMovieForEpisodes(null)} className="p-1 text-outline hover:text-white">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* List Existing Episodes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-outline">Danh sách tập</h3>
                <button
                  onClick={() => setIsAddEpOpen(!isAddEpOpen)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-variant text-xs text-primary font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Thêm Tập Mới</span>
                </button>
              </div>

              {isAddEpOpen && (
                <div className="p-3 rounded-xl bg-surface-container border border-surface-variant/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={newEpSeason}
                      onChange={(e) => setNewEpSeason(parseInt(e.target.value) || 1)}
                      placeholder="Mùa"
                      className="w-16 h-9 px-2 rounded-lg bg-surface-container-high border border-surface-variant/40 text-xs"
                      title="Mùa (Season)"
                    />
                    <input
                      type="number"
                      min={1}
                      value={newEpNum}
                      onChange={(e) => setNewEpNum(parseInt(e.target.value) || 1)}
                      placeholder="Tập"
                      className="w-16 h-9 px-2 rounded-lg bg-surface-container-high border border-surface-variant/40 text-xs"
                      title="Số tập (Episode)"
                    />
                    <input
                      type="text"
                      value={newEpTitle}
                      onChange={(e) => setNewEpTitle(e.target.value)}
                      placeholder="Tiêu đề tập phim..."
                      className="flex-1 h-9 px-3 rounded-lg bg-surface-container-high border border-surface-variant/40 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newEpSubtitleUrl}
                      onChange={(e) => setNewEpSubtitleUrl(e.target.value)}
                      placeholder="Đường dẫn phụ đề WebVTT (VD: /subtitles/ep1_vi.vtt)..."
                      className="flex-1 h-9 px-3 rounded-lg bg-surface-container-high border border-surface-variant/40 text-xs font-mono"
                    />
                    <label className="px-3 h-9 rounded-lg bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-300 font-semibold flex items-center gap-1 cursor-pointer border border-fuchsia-500/30 text-xs shrink-0">
                      <span className="material-symbols-outlined text-sm">attach_file</span>
                      <span>.VTT</span>
                      <input
                        type="file"
                        accept=".vtt,.srt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewEpSubtitleUrl(`/subtitles/${file.name}`);
                          }
                        }}
                      />
                    </label>
                    <button
                      onClick={handleCreateEpisode}
                      className="px-4 h-9 rounded-lg bg-primary text-on-primary text-xs font-bold shrink-0"
                    >
                      Tạo Tập
                    </button>
                  </div>
                </div>
              )}

              {/* Form Sửa Tập Phim */}
              {isEditEpOpen && editingEp && (
                <div className="p-3 rounded-xl bg-surface-container-high border border-primary/50 space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-surface-variant/30 pb-1.5">
                    <span className="font-bold text-xs text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Chỉnh Sửa Tập Phim: S{editingEp.seasonNumber}:E{editingEp.episodeNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditEpOpen(false)}
                      className="p-1 text-outline hover:text-white"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-outline block mb-0.5 font-semibold">Mùa (Season):</label>
                      <input
                        type="number"
                        min={1}
                        value={editEpSeason}
                        onChange={(e) => setEditEpSeason(parseInt(e.target.value) || 1)}
                        className="w-full h-8 px-2.5 rounded-lg bg-surface-container border border-surface-variant/40 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-outline block mb-0.5 font-semibold">Tập số (Episode):</label>
                      <input
                        type="number"
                        min={1}
                        value={editEpNum}
                        onChange={(e) => setEditEpNum(parseInt(e.target.value) || 1)}
                        className="w-full h-8 px-2.5 rounded-lg bg-surface-container border border-surface-variant/40 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-outline block mb-0.5 font-semibold">Thời lượng:</label>
                      <input
                        type="text"
                        value={editEpDuration}
                        onChange={(e) => setEditEpDuration(e.target.value)}
                        placeholder="Ví dụ: 45 phút"
                        className="w-full h-8 px-2.5 rounded-lg bg-surface-container border border-surface-variant/40 text-xs text-white"
                      />
                    </div>
                    <div className="sm:col-span-1 flex items-end gap-1.5">
                      <button
                        type="button"
                        onClick={handleUpdateEpisode}
                        className="flex-1 h-8 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-fixed-dim transition-colors"
                      >
                        Lưu Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditEpOpen(false)}
                        className="h-8 px-2.5 rounded-lg bg-surface-container hover:bg-surface-variant text-xs text-outline"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-outline block mb-0.5 font-semibold">Tiêu đề tập phim:</label>
                    <input
                      type="text"
                      value={editEpTitle}
                      onChange={(e) => setEditEpTitle(e.target.value)}
                      placeholder="Nhập tiêu đề tập phim..."
                      className="w-full h-8 px-2.5 rounded-lg bg-surface-container border border-surface-variant/40 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-fuchsia-300 block mb-0.5 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">subtitles</span>
                      Phụ đề WebVTT (.vtt) cho tập này:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editEpSubtitleUrl}
                        onChange={(e) => setEditEpSubtitleUrl(e.target.value)}
                        placeholder="VD: /subtitles/ep_master.vtt..."
                        className="flex-1 h-8 px-2.5 rounded-lg bg-surface-container border border-surface-variant/40 text-xs text-white font-mono"
                      />
                      <label className="px-2.5 h-8 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 text-xs font-semibold flex items-center gap-1 cursor-pointer border border-fuchsia-500/30 shrink-0">
                        <span className="material-symbols-outlined text-xs">upload_file</span>
                        <span>Chọn .vtt</span>
                        <input
                          type="file"
                          accept=".vtt,.srt"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setEditEpSubtitleUrl(`/subtitles/${file.name}`);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {episodes.map((ep) => {
                  const isSelected = selectedEpisodeId === ep.id;
                  return (
                    <div
                      key={ep.id}
                      onClick={() => setSelectedEpisodeId(ep.id)}
                      className={`p-3 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-all border group ${isSelected
                          ? 'bg-primary/10 border-primary ring-1 ring-primary'
                          : 'bg-surface-container border-surface-variant/30 hover:border-surface-variant'
                        }`}
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <div className="flex items-center gap-1.5 truncate">
                          {isSelected && (
                            <span className="material-symbols-outlined text-primary text-sm shrink-0">check_circle</span>
                          )}
                          <p className="font-bold text-white truncate">
                            S{ep.seasonNumber} : E{ep.episodeNumber} - {ep.title}
                          </p>
                        </div>
                        <p className="text-[11px] text-outline font-mono mt-0.5 flex items-center gap-1">
                          <span>Trạng thái:</span>
                          <span className={ep.processStatus === 'COMPLETED' ? 'text-green-400 font-bold' : ep.processStatus === 'PROCESSING' ? 'text-blue-400 font-bold' : 'text-amber-400'}>
                            {ep.processStatus}
                          </span>
                          <span>•</span>
                          <span>{ep.duration || '45 phút'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {ep.subtitleUrl && (
                          <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 font-mono text-[9px] border border-fuchsia-500/30 flex items-center gap-0.5" title={`Phụ đề: ${ep.subtitleUrl}`}>
                            <span className="material-symbols-outlined text-[10px]">subtitles</span>
                            <span>VTT</span>
                          </span>
                        )}

                        {ep.hlsMasterUrl ? (
                          <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-mono text-[10px]">
                            HLS READY
                          </span>
                        ) : isSelected ? (
                          <span className="px-2 py-0.5 rounded bg-primary text-on-primary font-bold text-[10px]">
                            ĐANG CHỌN
                          </span>
                        ) : null}

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={(e) => handleStartEditEpisode(ep, e)}
                          className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-zinc-300 hover:text-white transition-colors"
                          title="Sửa tập phim"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteEpisode(ep.id, ep.title, e)}
                          className="p-1.5 rounded-lg bg-surface-container-high hover:bg-error/20 text-zinc-300 hover:text-error transition-colors"
                          title="Xóa tập phim"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TASK-025: Dropzone Video Kéo Thả */}
            <div className="border-t border-surface-variant/30 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-outline">
                  Tải lên Video kích thước lớn (Chunking & Resumable)
                </h3>
                {selectedEpisodeId && (
                  <span className="text-[11px] text-primary font-medium">
                    Đang chọn tải cho:{' '}
                    <strong>
                      {episodes.find((e) => e.id === selectedEpisodeId)?.title || 'Tập đã chọn'}
                    </strong>
                  </span>
                )}
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('dropzoneInput')?.click()}
                className="border-2 border-dashed border-primary/40 hover:border-primary rounded-2xl p-6 text-center cursor-pointer bg-surface-container/50 hover:bg-surface-container transition-all group"
              >
                <input
                  id="dropzoneInput"
                  type="file"
                  accept=".mp4,.mkv,.mov"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                </div>
                <p className="text-xs font-bold text-white">Kéo thả tệp video .mp4, .mkv, .mov vào đây</p>
                <p className="text-[11px] text-outline mt-1">Hoặc bấm để duyệt tệp từ máy tính (Hỗ trợ tới 5GB)</p>
              </div>

              {/* Selected File Details & Progress (TASK-027, TASK-028) */}
              {selectedFile && (
                <div className="p-4 rounded-2xl bg-surface-container border border-surface-variant/30 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white line-clamp-1">{selectedFile.name}</p>
                      <p className="text-outline font-mono">
                        Dung lượng: {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • {totalChunks} Chunks (5MB/chunk)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isUploading ? (
                        <button
                          onClick={startOrResumeUpload}
                          className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1 shadow-lg"
                        >
                          <span className="material-symbols-outlined text-sm">
                            {isPaused ? 'play_arrow' : 'upload'}
                          </span>
                          <span>{isPaused ? 'Tiếp Tục (Resume)' : 'Bắt Đầu Tải Lên'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={handlePause}
                          className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">pause</span>
                          <span>Tạm Dừng (Pause)</span>
                        </button>
                      )}

                      <button
                        onClick={handleCancel}
                        className="px-3 py-2 rounded-xl bg-error/15 text-error text-xs font-semibold"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar & Real-time Speed */}
                  <div className="space-y-1.5">
                    <div className="w-full h-2.5 rounded-full bg-surface-container-high overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-primary to-orange-500 transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-outline font-mono">
                      <span>{uploadProgress}% ({completedChunks}/{totalChunks} chunks)</span>
                      {isUploading && uploadStatusPhase === 'uploading' && (
                        <span>
                          Tốc độ: <strong className="text-primary">{uploadSpeedMb} MB/s</strong> • Còn lại: ~{uploadEtaSecs}s
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Trạng thái 100% hoặc đang ghép file trên máy chủ */}
                  {uploadStatusPhase === 'merging' && (
                    <div className="p-3.5 rounded-xl bg-primary/15 border border-primary/40 flex items-center gap-3 text-xs text-primary animate-pulse shadow-lg">
                      <span className="material-symbols-outlined text-xl animate-spin text-primary">
                        progress_activity
                      </span>
                      <div>
                        <p className="font-bold text-white">Đang ghép file và xử lý HLS trên máy chủ, vui lòng đợi...</p>
                        <p className="text-[11px] text-zinc-300">Hệ thống đang kết hợp các chunks video và gửi sang hàng đợi FFmpeg</p>
                      </div>
                    </div>
                  )}

                  {/* Trạng thái tải lên và ghép file thành công */}
                  {uploadStatusPhase === 'completed' && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-start gap-2.5 text-xs text-emerald-400">
                      <span className="material-symbols-outlined text-lg mt-0.5 text-emerald-400">check_circle</span>
                      <div>
                        <p className="font-bold text-emerald-300">Tải lên & Ghép file thành công!</p>
                        <p className="text-[11px] text-zinc-300 mt-0.5">{uploadStatusMessage || 'Đã chuyển sang luồng nén HLS FFmpeg ngầm.'}</p>
                      </div>
                    </div>
                  )}

                  {/* Thông báo lỗi mạng nếu một chunk bị gián đoạn */}
                  {uploadStatusPhase === 'error' && (
                    <div className="p-3.5 rounded-xl bg-error/15 border border-error/40 flex items-start gap-2.5 text-xs text-error">
                      <span className="material-symbols-outlined text-lg mt-0.5">wifi_off</span>
                      <div>
                        <p className="font-bold">Gián đoạn kết nối tải lên video!</p>
                        <p className="text-[11px] text-zinc-300 mt-0.5">{uploadStatusMessage || 'Một chunk bị ngắt quãng do sự cố đường truyền mạng. Bạn có thể bấm Tiếp Tục (Resume) để thử lại.'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TASK-043: Live Transcode Status */}
              {transcodeProgress && (
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 space-y-2 animate-pulse-glow">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base animate-spin">
                        sync
                      </span>
                      <span className="font-bold text-white">Xử Lý FFmpeg HLS Đa Phân Giải</span>
                    </div>
                    <span className="font-mono text-primary font-bold">
                      {transcodeProgress.percent}%
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-300 font-mono">
                    Giai đoạn: {transcodeProgress.stage}
                  </p>

                  <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${transcodeProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

