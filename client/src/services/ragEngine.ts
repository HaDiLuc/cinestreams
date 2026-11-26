/**
 * CineStreams RAG Engine (Retrieval-Augmented Generation) v2.5
 * 
 * Kiến trúc RAG thông minh:
 * 1. Intent Detection: Nhận diện ý định câu hỏi (Chào hỏi, Hỏi thông tin đạo diễn/diễn viên, Tóm tắt kịch bản, So sánh, Hỏi tính năng nền tảng, Gợi ý theo tâm trạng).
 * 2. Knowledge Ingestion & Chunking: Thu thập, phân mảnh tri thức từ kho phim, kịch bản chuyên sâu và tính năng CineStreams.
 * 3. Semantic Vector Indexing & Hybrid Search: Vector hóa n-gram, tính Cosine Similarity và kết hợp thưởng điểm từ khóa thực thể.
 * 4. Context-Aware Dynamic Generation: Sinh câu trả lời riêng biệt, chính xác theo từng câu hỏi, loại bỏ hoàn toàn lỗi lặp lại 1 câu trả lời chung chung.
 */

import { Movie } from '../types';
import { ALL_MOVIES, HERO_MOVIES, VIP_EXCLUSIVE_SERIES, TOP_10_TRENDING_MOVIES, LATEST_CINEMA_MOVIES } from '../data/moviesData';

export type RagSourceType = 'movies' | 'deep_explainer' | 'platform';

export interface RagChunk {
  id: string;
  sourceType: RagSourceType;
  sourceTitle: string;
  title: string;
  content: string;
  keywords: string[];
  metadata: {
    movieId?: string;
    genres?: string[];
    year?: number;
    director?: string;
    cast?: string[];
    rating?: number;
    duration?: string;
    qualityBadge?: string;
    audioBadge?: string;
    category?: string;
    url?: string;
  };
}

export interface RagRetrievalResult {
  chunk: RagChunk;
  similarity: number; // 0.0 - 1.0
  matchedTerms: string[];
}

export interface RagAugmentedPrompt {
  userQuery: string;
  cleanQuery: string;
  augmentedContext: string;
  retrievedChunks: RagRetrievalResult[];
  recommendedMovies: Movie[];
  intent: QueryIntent;
}

export interface RagConfig {
  topK: number;
  similarityThreshold: number;
  enableSources: {
    movies: boolean;
    deepExplainer: boolean;
    platform: boolean;
  };
  geminiApiKey?: string;
}

export type QueryIntent =
  | 'GREETING'
  | 'SPECIFIC_FACT'
  | 'SUMMARY_PLOT'
  | 'COMPARE'
  | 'PLATFORM_SUPPORT'
  | 'RECOMMENDATION'
  | 'GENERAL';

// =========================================================================
// 1. KHO TRI THỨC KỊCH BẢN CHUYÊN SÂU & NỀN TẢNG CINESTREAMS
// =========================================================================

const DEEP_EXPLAINER_KNOWLEDGE: Omit<RagChunk, 'id' | 'sourceType'>[] = [
  {
    sourceTitle: 'Giải mã Kịch bản: Dune - Hành Tinh Cát (Phần 1 & 2)',
    title: 'Bi kịch của Paul Atreides và Thuyết Đấng Cứu Thế Giả Mạo',
    content: `Dune: Part Two (Đạo diễn Denis Villeneuve) khắc họa bước chuyển định mệnh của Paul Atreides (Timothée Chalamet) từ người kế thừa gia tộc thành vị đấng cứu thế Muad'Dib cuồng tín.
Sau khi uống Nước Sự Sống (Water of Life), Paul mở khóa ký ức tổ tiên và nhìn thấy tương lai: chỉ có một con đường duy nhất để giải cứu người Fremen là châm ngòi cho một cuộc Thánh chiến (Jihad) vũ trụ đẫm máu.
Hội Chị Em Bene Gesserit đã gieo rắc truyền thuyết cứu thế giả mạo suốt hàng thiên niên kỷ tại hành tinh Arrakis. Paul đã dùng chính niềm tin cuồng tín này để biến người Fremen thành đội quân cảm tử vô địch đánh bại Gia tộc Harkonnen và ép Hoàng đế Shaddam IV thoái vị.
Cái kết bi kịch: Paul chọn cưới Công chúa Irulan vì toan tính quyền lực chính trị, khiến Chani (Zendaya) đau đớn cưỡi sâu cát quay về sa mạc, mở đầu cho cuộc thánh chiến nuốt chửng hàng tỷ sinh mạng khắp thiên hà.`,
    keywords: ['dune', 'hành tinh cát', 'paul atreides', 'chani', 'fremen', 'muad dib', 'sâu cát', 'arrakis', 'harkonnen', 'bene gesserit', 'thánh chiến', 'denis villeneuve'],
    metadata: {
      movieId: 'dune-2',
      genres: ['Khoa Học Viễn Tưởng', 'Sử Thi', 'Hành Động'],
      year: 2024,
      director: 'Denis Villeneuve',
      cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Javier Bardem']
    }
  },
  {
    sourceTitle: 'Giải mã Kịch bản: Interstellar (Hố Đen Tử Thần)',
    title: 'Chiều không gian thứ 5 Tesseract và Định lượng của Tình Yêu',
    content: `Interstellar của đạo diễn Christopher Nolan giải quyết bài toán sinh tồn của nhân loại qua thuyết tương đối và vật lý lượng tử.
Khi Cooper (Matthew McConaughey) lao vào tâm hố đen siêu nặng Gargantua, anh rơi vào Tesseract - một chiều không gian 5 chiều được tạo ra bởi con người tương lai ("They are Us"). Tại đây, thời gian được hiển thị như một chiều không gian vật lý, cho phép Cooper nhìn vào phòng ngủ của con gái Murph ở mọi thời điểm trong quá khứ.
Cooper dùng lực hấp dẫn - lực duy nhất có thể xuyên qua các chiều không gian - để truyền mã Morse chứa dữ liệu kỳ dị lượng tử lên kim giây chiếc đồng hồ Hamilton trao cho Murph. Nhờ dữ liệu này, Murph trưởng thành đã giải mã phương trình trọng lực, đưa loài người rời khỏi Trái Đất đang chết dần.
Thông điệp cốt lõi: Tình yêu không phải là một ảo ảnh cảm xúc ủy mị, mà là một thực thể định lượng duy nhất có thể vượt qua mọi giới hạn của không gian và thời gian.`,
    keywords: ['interstellar', 'hố đen', 'gargantua', 'tesseract', 'cooper', 'murph', 'nolan', 'lỗ đen', 'vũ trụ', 'thời gian', 'chiều không gian thứ 5', 'nghịch lý'],
    metadata: {
      movieId: 'oppenheimer',
      genres: ['Khoa Học Viễn Tưởng', 'Vũ Trụ', 'Tâm Lý'],
      year: 2014,
      director: 'Christopher Nolan',
      cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain']
    }
  },
  {
    sourceTitle: 'Giải mã Kịch bản: Oppenheimer (2023)',
    title: 'Dự án Manhattan, Khoảnh khắc Thử nghiệm Trinity & Phản ứng Dây chuyền',
    content: `Oppenheimer của Christopher Nolan tái hiện cuộc đời của J. Robert Oppenheimer, cha đẻ của bom nguyên tử trong Dự án Manhattan tại Los Alamos.
Bộ phim xoay quanh hai mảng màu: màu sắc (góc nhìn chủ quan của Oppenheimer) và đen trắng (góc nhìn khách quan của Lewis Strauss).
Khoảnh khắc thử nghiệm Trinity thành công là đỉnh cao khoa học nhưng cũng là vực thẳm đạo đức. Oppenheimer nhớ lại câu kinh Hindu: "Giờ đây tôi trở thành Thần Chết, kẻ hủy diệt các thế giới".
Phiên điều trần kín năm 1954 tước quyền an ninh của ông là đòn trả thù chính trị tàn nhẫn thời kỳ McCarthyism. Cuộc đối thoại then chốt giữa Oppenheimer và Albert Einstein bên bờ hồ kết luận rằng: dù vụ nổ không thiêu rụi bầu khí quyển vật lý, nhưng phản ứng dây chuyền chính trị và chạy đua vũ trang hạt nhân do con người tạo ra đã thực sự bắt đầu phá hủy thế giới từ ngày đó.`,
    keywords: ['oppenheimer', 'bom nguyên tử', 'manhattan', 'trinity', 'nolan', 'cillian murphy', 'einstein', 'chiến tranh', 'lịch sử', 'hạt nhân'],
    metadata: {
      movieId: 'oppenheimer',
      genres: ['Tiểu Sử', 'Lịch Sử', 'Chính Kịch', 'Chiến Tranh'],
      year: 2023,
      director: 'Christopher Nolan',
      cast: ['Cillian Murphy', 'Robert Downey Jr.', 'Emily Blunt', 'Matt Damon']
    }
  },
  {
    sourceTitle: 'Giải mã Kịch bản: Ký Sinh Trùng (Parasite)',
    title: 'Ẩn dụ Mùi Hương, Căn hầm Boong-ke và Lằn ranh Giai cấp',
    content: `Parasite của đạo diễn Bong Joon-ho thắng 4 giải Oscar là một bức tranh châm biếm sâu sắc về sự phân hóa giàu nghèo trong xã hội hiện đại.
Gia đình họ Kim nghèo khó mưu mô thâm nhập từng vị trí gia sư, trị liệu, lái xe, quản gia trong gia đình giàu có họ Park.
Nút thắt bất ngờ (plot twist): Căn hầm ngầm trú ẩn dưới căn biệt thự nơi người chồng của nữ quản gia cũ lẩn trốn bọn đòi nợ suốt nhiều năm. Thay vì tương trợ nhau, hai gia đình nghèo lại tàn sát lẫn nhau để tranh giành sự bảo bọc của người giàu.
Biểu tượng mùi hương: "Mùi củ cải thối hay mùi của người đi tàu điện ngầm" là lằn ranh bất biến phân chia giai cấp. Khi ông Park bịt mũi trước mùi cơ thể của người đàn ông dưới hầm, giọt nước tràn ly khiến ông Kim đâm chết ông Park. Cái kết đau xót: Ước mơ kiếm tiền mua lại căn nhà của người con trai chỉ là bức thư vô vọng trong tâm tưởng.`,
    keywords: ['parasite', 'ký sinh trùng', 'bong joon-ho', 'mùi hương', 'căn hầm', 'giai cấp', 'hàn quốc', 'giật gân', 'tâm lý', 'oscar'],
    metadata: {
      genres: ['Tâm Lý', 'Giật Gân', 'Xoắn Não', 'Hàn Quốc'],
      year: 2019,
      director: 'Bong Joon-ho',
      cast: ['Song Kang-ho', 'Choi Woo-shik', 'Park So-dam']
    }
  },
  {
    sourceTitle: 'Giải mã Kịch bản: Arcane: Mùa 1 & Mùa 2',
    title: 'Xung đột Piltover - Zaun, Bi kịch Tinh thần của Jinx và Công nghệ Hextech',
    content: `Arcane (Riot Games & Fortiche Production) chuyển thể từ vũ trụ Liên Minh Huyền Thoại kể về hai chị em Vi và Powder (sau này là Jinx).
Powder vì mặc cảm yếu ớt đã vô tình gây ra cái chết của bạn bè và người cha nuôi Vander bằng viên ngọc Hextech, bị chị gái Vi ruồng bỏ trong cơn giận dữ và được trùm tội phạm Silco cưu mang.
Silco nuôi dưỡng Powder trở thành Jinx - một sát thủ loạn thần với những vết thương tâm lý sâu sắc. Cuộc xung đột giữa thành phố thượng tầng Piltover giàu sang và thế giới ngầm Zaun nghèo khổ bị ô nhiễm hóa chất leo thang đỉnh điểm khi Hextech bị vũ khí hóa.
Cái kết Mùa 1: Jinx phóng quả tên lửa Super Mega Death Rocket thẳng vào phòng họp Hội đồng Piltover đúng lúc họ vừa biểu quyết trao độc lập cho Zaun, biến hòa bình thành biển máu.`,
    keywords: ['arcane', 'jinx', 'vi', 'piltover', 'zaun', 'hextech', 'silco', 'liên minh huyền thoại', 'anime', 'hoạt hình', 'vander'],
    metadata: {
      movieId: 'arcane-s2',
      genres: ['Hoạt Hình', 'Kỳ Ảo', 'Hành Động', 'Khoa Học Viễn Tưởng'],
      year: 2024,
      director: 'Christian Linke, Alex Yee',
      cast: ['Hailee Steinfeld', 'Ella Purnell', 'Katie Leung']
    }
  },
  {
    sourceTitle: 'Giải mã Kịch bản: Shōgun (2024)',
    title: 'Nghệ thuật Chiến thuật Bàn Cờ Thần Tốc và Tinh thần Samurai Của Toranaga',
    content: `Shōgun chuyển thể từ tiểu thuyết của James Clavell là siêu phẩm lịch sử đạt kỷ lục 18 giải Emmy 2024.
Lãnh chúa Yoshii Toranaga (Hiroyuki Sanada) lấy nguyên mẫu từ Tokugawa Ieyasu - vị Shōgun đã thống nhất Nhật Bản thời kỳ Sengoku.
Toranaga không dùng sức mạnh đối đầu trực diện mà chơi trò cờ vây chính trị tinh vi: ngài lợi dụng sự xuất hiện của viên hoa tiêu Anh John Blackthorne cùng đại bác phương Tây để làm phân rã Hội đồng Nhiếp chính của Ishido.
Kế hoạch bí mật "Thứ Tám Sắc Lệnh Hoàng Gia": Toranaga sẵn sàng để những bề tôi trung thành nhất như Hiromatsu và phu nhân Mariko hy sinh tính mạng nhằm kích hoạt sự phản trắc của các đối thủ mà không cần đổ máu quân mình trước trận Sekigahara.`,
    keywords: ['shogun', 'tướng quân', 'toranaga', 'samurai', 'nhật bản', 'lịch sử', 'emmy', 'mariko', 'blackthorne', 'chiến thuật'],
    metadata: {
      movieId: 'shogun',
      genres: ['Lịch Sử', 'Chiến Thuật Samurai', 'Chính Kịch'],
      year: 2024,
      director: 'Rachel Kondo, Justin Marks',
      cast: ['Hiroyuki Sanada', 'Cosmo Jarvis', 'Anna Sawai']
    }
  },
  {
    sourceTitle: 'Giải mã Kịch bản: Lật Mặt 7: Một Điều Ước',
    title: 'Tình cảm Gia đình, Nỗi lòng Người mẹ Già và Văn hóa Dân gian Việt',
    content: `Lật Mặt 7: Một Điều Ước của đạo diễn Lý Hải đạt doanh thu hơn 480 tỷ VNĐ tại phòng vé Việt Nam.
Tác phẩm xoay quanh bà Hai (73 tuổi) sống đơn độc tại ngôi nhà vùng cao Lạc Dương (Lâm Đồng) sau khi các con đều lập nghiệp nơi xa xôi.
Khi bà Hai gặp tai nạn gãy chân, năm người con tổ chức cuộc họp trực tuyến tranh cãi xem ai sẽ chịu trách nhiệm chăm sóc mẹ, phơi bày những vết nứt và áp lực kinh tế của từng gia đình nhỏ.
Chuyến đi luân phiên của bà Hai qua từng căn nhà của các con không mang màu sắc oán trách mà tràn ngập tình yêu thương bao dung, nhấn mạnh thông điệp: "Cha mẹ nuôi con bằng trời bằng bể, con nuôi cha mẹ tính tháng tính ngày".`,
    keywords: ['lật mặt 7', 'lý hải', 'một điều ước', 'bà hai', 'gia đình', 'việt nam', 'chữa lành', 'xúc động', 'phim chiếu rạp'],
    metadata: {
      movieId: 'lat-mat-7',
      genres: ['Gia Đình', 'Chữa Lành', 'Tâm Lý', 'Hài Hước'],
      year: 2024,
      director: 'Lý Hải',
      cast: ['Thanh Hiền', 'Trương Minh Cường', 'Đinh Y Nhung', 'Quách Ngọc Tuyên']
    }
  },
  {
    sourceTitle: 'Giải mã Kịch bản: Furiosa: Câu Chuyện Mad Max',
    title: 'Hành trình Phục thù Sa mạc Hoang tàn và Sự Ra đời của Nữ Chiến Binh Bất Diệt',
    content: `Furiosa: A Mad Max Saga của đạo diễn George Miller là phần tiền truyện về quá khứ bi tráng của Furiosa (Anya Taylor-Joy).
Bị bắt cóc từ Vùng Xanh trù phú bởi băng đảng Warlord Dementus (Chris Hemsworth), Furiosa tận mắt chứng kiến mẹ ruột bị hành hình tàn khốc. Cô phải giả câm và sống sót trong thành lũy Citadel của Immortan Joe.
Bên cạnh Praetorian Jack, cô rèn giũa kỹ năng lái xe chiến đấu và sinh tồn sa mạc. Đỉnh cao bộ phim là trận truy kích 40 ngày và màn đối đầu triết học giữa Furiosa và Dementus: bạo lực không thể chữa lành nỗi đau mất mát, nhưng sự công lý sa mạc phải được thực thi.`,
    keywords: ['furiosa', 'mad max', 'anya taylor-joy', 'chris hemsworth', 'sa mạc', 'hành động', 'george miller', 'citadel', 'hậu tận thế'],
    metadata: {
      movieId: 'furiosa',
      genres: ['Hành Động', 'Hậu Tận Thế', 'Phiêu Lưu'],
      year: 2024,
      director: 'George Miller',
      cast: ['Anya Taylor-Joy', 'Chris Hemsworth', 'Tom Burke']
    }
  }
];

const PLATFORM_KNOWLEDGE: Omit<RagChunk, 'id' | 'sourceType'>[] = [
  {
    sourceTitle: 'Tính năng CineStreams: Phòng Xem Chung WatchParty',
    title: 'Cơ chế Xem Chung Thời Gian Thực, Voice Chat & Đồng Bộ Khung Hình',
    content: `WatchParty là tính năng biểu tượng của nền tảng CineStreams cho phép hội viên xem phim cùng bạn bè từ xa.
1. Đồng bộ khung hình miligiây: Hệ thống sử dụng công nghệ WebSocket / Server-Sent Events tự động đồng bộ trạng thái Play, Pause, Seek theo người chủ phòng (Host).
2. Tương tác đa kênh: Tích hợp phòng chat văn bản, voice chat đàm thoại trực tiếp độ trễ thấp và hệ thống thả reaction emoji nổi bật trên màn hình.
3. Chế độ Host Control: Chủ phòng có quyền khóa quyền điều khiển (Host Lock) để chống tua phim ngoài ý muốn hoặc cấp quyền mở cho mọi người cùng tương tác.
4. Sức chứa: Phòng thường hỗ trợ tối đa 20 thành viên; Phòng VIP Private Room hỗ trợ đến 50 người với âm thanh Dolby Atmos đa kênh.`,
    keywords: ['watchparty', 'xem chung', 'phòng xem', 'đồng bộ', 'voice chat', 'host', 'bạn bè', 'tính năng', 'emoji', 'realtime'],
    metadata: {
      category: 'Tính năng nền tảng',
      url: '/watchparty'
    }
  },
  {
    sourceTitle: 'Tính năng CineStreams: Gói Hội Viên VIP & Quyền Lợi',
    title: 'Bảng Giá Gói VIP Standard, VIP Diamond & Quyền Lợi Đặc Quyền',
    content: `CineStreams cung cấp các gói dịch vụ linh hoạt cho khán giả:
- Gói Miễn Phí (Free): Thưởng thức phim chất lượng Full HD 1080p, có quảng cáo chọn lọc ở đầu phim.
- Gói VIP Standard (79.000đ/tháng hoặc 790.000đ/năm): Xem phim không quảng cáo, độ phân giải 2K QHD, xem đồng thời trên 2 thiết bị.
- Gói VIP Diamond 4K (129.000đ/tháng hoặc 1.190.000đ/năm - Khuyên dùng): Trải nghiệm chất lượng 4K Ultra HD đỉnh cao, Dolby Vision, âm thanh Dolby Atmos 7.1, xem đồng thời 4 thiết bị, tải phim offline không giới hạn và quyền truy cập sớm các bom tấn độc quyền.
Hỗ trợ thanh toán qua VNPay, Momo, ZaloPay, Thẻ ATM nội địa và Thẻ Quốc tế Visa/MasterCard.`,
    keywords: ['vip', 'gói cước', 'giá tiền', 'diamond', 'standard', '4k', 'dolby atmos', 'thanh toán', 'quảng cáo', 'thiết bị', 'offline'],
    metadata: {
      category: 'Chính sách hội viên & Bảng giá',
      url: '/vip'
    }
  },
  {
    sourceTitle: 'Tính năng CineStreams: Công Nghệ Truyền Tải & Âm Thanh',
    title: 'Chuẩn Phát 4K Ultra HD, Dolby Vision, Dolby Atmos & Adaptive Bitrate',
    content: `CineStreams ứng dụng hạ tầng công nghệ phát trực tuyến tối tân:
1. Chuẩn HLS (HTTP Live Streaming) thích ứng: Tự động điều chỉnh bitrate phù hợp với tốc độ đường truyền mạng, đảm bảo không giật lag ngay cả trên mạng 4G/5G.
2. Hình ảnh chuẩn 4K HDR10+ và Dolby Vision: Độ tương phản động cao, màu sắc điện ảnh trung thực tái hiện trọn vẹn ý đồ của đạo diễn.
3. Âm thanh vòm Dolby Atmos: Âm thanh định vị không gian 3 chiều sống động như trong rạp chiếu phim chuyên nghiệp.
4. Đa ngôn ngữ: Hỗ trợ chuyển đổi tức thì giữa Lồng Tiếng, Thuyết Minh và Phụ đề tiếng Việt / tiếng Anh chuẩn xác.`,
    keywords: ['chất lượng', '4k', 'dolby atmos', 'dolby vision', 'hls', 'bitrate', 'âm thanh', 'hình ảnh', 'phụ đề', 'thuyết minh', 'lồng tiếng'],
    metadata: {
      category: 'Công nghệ truyền phát'
    }
  },
  {
    sourceTitle: 'Tính năng CineStreams: Chế Độ Bảo Vệ Chống Spoilers (Anti-Spoiler AI)',
    title: 'Thuật Toán Lọc Spoiler Thông Minh Khi Thảo Luận Phim',
    content: `CineStreams tích hợp công nghệ Anti-Spoiler bảo vệ trải nghiệm của người xem:
1. Trong CineAI: Tùy chọn 'Chống Spoilers Tuyệt Đối' tự động định vị và ẩn các nút thắt cốt truyện then chốt (plot twists, nhân vật phản diện thật sự, kết cục sinh tử) để người xem tự khám phá khi xem phim.
2. Trong Phòng Xem Chung WatchParty: Tin nhắn chứa nội dung tiết lộ kịch bản sẽ được che mờ kèm cảnh báo spoiler, chỉ hiển thị khi người dùng chủ động nhấn 'Xem nội dung'.`,
    keywords: ['anti-spoiler', 'chống spoil', 'spoilers', 'bảo vệ', 'nút thắt', 'tiết lộ cốt truyện', 'tính năng'],
    metadata: {
      category: 'Trải nghiệm người dùng'
    }
  }
];

// =========================================================================
// 2. VECTORIZER & SIMILARITY UTILITIES
// =========================================================================

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeToTerms(text: string): string[] {
  const clean = normalizeText(text);
  const words = clean.split(' ').filter((w) => w.length > 1);
  const terms: string[] = [...words];

  // Thêm 2-grams
  for (let i = 0; i < words.length - 1; i++) {
    terms.push(`${words[i]} ${words[i + 1]}`);
  }

  return terms;
}

function computeTermFrequency(terms: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const term of terms) {
    tf.set(term, (tf.get(term) || 0) + 1);
  }
  return tf;
}

function computeCosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const count of vecA.values()) {
    normA += count * count;
  }
  for (const count of vecB.values()) {
    normB += count * count;
  }

  if (normA === 0 || normB === 0) return 0;

  for (const [term, valA] of vecA.entries()) {
    const valB = vecB.get(term);
    if (valB) {
      const weight = term.includes(' ') ? 1.8 : 1.0;
      dotProduct += valA * valB * weight;
    }
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Loại bỏ tiền tố / hậu tố hệ thống khỏi câu hỏi người dùng
 */
export function cleanUserQuery(rawQuery: string): string {
  return rawQuery
    .replace(/\(Yêu cầu giữ bí mật[^)]*\)/gi, '')
    .replace(/không spoil/gi, '')
    .replace(/anti-spoiler/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Nhận diện ý định câu hỏi (Intent Classification)
 */
export function detectQueryIntent(query: string, mode: 'mood' | 'explainer' | 'compare'): QueryIntent {
  const q = normalizeText(query);

  // 1. Chào hỏi & giới thiệu bản thân
  if (
    /^(xin chào|chào bạn|chào|hello|hi|hey|halo|bạn là ai|giới thiệu về bạn|cineai là ai|bạn giúp được gì|bạn có thể làm gì|hướng dẫn sử dụng)/i.test(
      q
    ) ||
    q === 'xin chao' ||
    q === 'chao' ||
    q === 'hello'
  ) {
    return 'GREETING';
  }

  // 2. So sánh phim / Đạo diễn
  if (
    mode === 'compare' ||
    q.includes('so sánh') ||
    q.includes('đối chiếu') ||
    q.includes('khác nhau thế nào') ||
    q.includes('giống nhau thế nào') ||
    q.includes('hay hơn') ||
    /\bvs\b/i.test(q)
  ) {
    return 'COMPARE';
  }

  // 3. Hỏi tính năng nền tảng (VIP, WatchParty, Âm thanh, Giá tiền)
  if (
    q.includes('vip') ||
    q.includes('gói cước') ||
    q.includes('giá bao nhiêu') ||
    q.includes('bao nhiêu tiền') ||
    q.includes('đăng ký gói') ||
    q.includes('watchparty') ||
    q.includes('xem chung') ||
    q.includes('voice chat') ||
    q.includes('anti spoiler') ||
    q.includes('chống spoil') ||
    q.includes('tải phim') ||
    q.includes('xem offline')
  ) {
    return 'PLATFORM_SUPPORT';
  }

  // 4. Hỏi thông số cụ thể: Đạo diễn, diễn viên, điểm IMDb, năm, thời lượng
  if (
    q.includes('đạo diễn') ||
    q.includes('ai làm đạo diễn') ||
    q.includes('diễn viên') ||
    q.includes('ai đóng') ||
    q.includes('ai thủ vai') ||
    q.includes('điểm imdb') ||
    q.includes('rating') ||
    q.includes('đánh giá mấy sao') ||
    q.includes('phát hành năm nào') ||
    q.includes('năm bao nhiêu') ||
    q.includes('thời lượng') ||
    q.includes('dài bao lâu') ||
    q.includes('mấy tập')
  ) {
    return 'SPECIFIC_FACT';
  }

  // 5. Tóm tắt kịch bản, giải thích cái kết, nút thắt
  if (
    mode === 'explainer' ||
    q.includes('tóm tắt') ||
    q.includes('cốt truyện') ||
    q.includes('kịch bản') ||
    q.includes('nội dung phim') ||
    q.includes('nói về cái gì') ||
    q.includes('nói về gì') ||
    q.includes('kể về') ||
    q.includes('cái kết') ||
    q.includes('kết cục') ||
    q.includes('kết thúc') ||
    q.includes('plot twist') ||
    q.includes('nút thắt') ||
    q.includes('ẩn dụ') ||
    q.includes('ý nghĩa') ||
    q.includes('giải thích')
  ) {
    return 'SUMMARY_PLOT';
  }

  // 6. Gợi ý phim theo tâm trạng
  if (
    mode === 'mood' ||
    q.includes('gợi ý') ||
    q.includes('đề xuất') ||
    q.includes('nên xem phim gì') ||
    q.includes('hôm nay xem') ||
    q.includes('phim hay') ||
    q.includes('tâm trạng') ||
    q.includes('hào hứng') ||
    q.includes('thư giãn') ||
    q.includes('chữa lành') ||
    q.includes('xoắn não') ||
    q.includes('lãng mạn') ||
    q.includes('kinh dị') ||
    q.includes('hài hước')
  ) {
    return 'RECOMMENDATION';
  }

  return 'GENERAL';
}

// =========================================================================
// 3. RAG ENGINE SINGLETON
// =========================================================================

export class CineStreamsRagEngine {
  private chunks: RagChunk[] = [];
  private chunkVectors: Map<string, Map<string, number>> = new Map();
  private catalogMovies: Movie[] = [];
  private isInitialized = false;

  private config: RagConfig = {
    topK: 4,
    similarityThreshold: 0.12,
    enableSources: {
      movies: true,
      deepExplainer: true,
      platform: true
    }
  };

  constructor() {
    this.init();
  }

  /**
   * Khởi tạo toàn bộ tri thức: Luôn kết hợp ALL_MOVIES với dynamicMovies
   */
  public init(dynamicMovies: Movie[] = []): void {
    const allChunks: RagChunk[] = [];

    // 1. Ingest Deep Explainer
    DEEP_EXPLAINER_KNOWLEDGE.forEach((item, idx) => {
      allChunks.push({
        ...item,
        id: `chunk-explainer-${idx}`,
        sourceType: 'deep_explainer'
      });
    });

    // 2. Ingest Platform Knowledge
    PLATFORM_KNOWLEDGE.forEach((item, idx) => {
      allChunks.push({
        ...item,
        id: `chunk-platform-${idx}`,
        sourceType: 'platform'
      });
    });

    // 3. Ingest All Movies (Đảm bảo luôn có ít nhất 20+ phim mẫu từ ALL_MOVIES)
    const combinedMoviesMap = new Map<string, Movie>();
    [
      ...ALL_MOVIES,
      ...HERO_MOVIES,
      ...TOP_10_TRENDING_MOVIES,
      ...LATEST_CINEMA_MOVIES,
      ...VIP_EXCLUSIVE_SERIES,
      ...dynamicMovies
    ].forEach((m) => {
      if (m && m.id && !combinedMoviesMap.has(m.id)) {
        combinedMoviesMap.set(m.id, m);
      }
    });

    this.catalogMovies = Array.from(combinedMoviesMap.values());

    this.catalogMovies.forEach((movie) => {
      const genresStr = movie.genres?.join(', ') || 'Đang cập nhật';
      const castStr = movie.cast?.join(', ') || 'Dàn diễn viên tài năng';
      const directorStr = movie.director ? `Đạo diễn: ${movie.director}. ` : '';
      const ratingStr = movie.imdbRating ? `Điểm IMDb: ${movie.imdbRating}/10. ` : '';
      const durationStr = movie.duration ? `Thời lượng: ${movie.duration}. ` : '';
      const qualityStr = movie.qualityBadge ? `Chất lượng: ${movie.qualityBadge}. ` : '';
      const audioStr = movie.audioBadge ? `Âm thanh: ${movie.audioBadge}. ` : '';

      const content = `Tác phẩm [${movie.title}] (Tên gốc: ${movie.originalTitle || movie.title}), phát hành năm ${movie.releaseYear}.
${directorStr}${castStr ? `Diễn viên: ${castStr}. ` : ''}${ratingStr}${durationStr}${qualityStr}${audioStr}Thể loại: ${genresStr}.
Tóm tắt nội dung: ${movie.synopsis}
Phân loại độ tuổi: ${movie.ageRating || 'Mọi lứa tuổi'}.`;

      const keywords = [
        movie.title.toLowerCase(),
        (movie.originalTitle || '').toLowerCase(),
        movie.id.toLowerCase(),
        ...(movie.genres || []).map((g) => g.toLowerCase()),
        (movie.director || '').toLowerCase(),
        ...(movie.cast || []).map((c) => c.toLowerCase())
      ].filter(Boolean);

      allChunks.push({
        id: `chunk-movie-${movie.id}`,
        sourceType: 'movies',
        sourceTitle: `Kho Phim CineStreams: ${movie.title}`,
        title: `${movie.title} (${movie.releaseYear}) - ${genresStr}`,
        content,
        keywords,
        metadata: {
          movieId: movie.id,
          genres: movie.genres,
          year: movie.releaseYear,
          director: movie.director,
          cast: movie.cast,
          rating: movie.imdbRating,
          duration: movie.duration,
          qualityBadge: movie.qualityBadge,
          audioBadge: movie.audioBadge,
          category: movie.type,
          url: `/phim/${movie.slug || movie.id}`
        }
      });
    });

    this.chunks = allChunks;

    // Lập chỉ mục Vector
    this.chunkVectors.clear();
    for (const chunk of this.chunks) {
      const combinedText = `${chunk.title} ${chunk.content} ${chunk.keywords.join(' ')}`;
      const terms = tokenizeToTerms(combinedText);
      const tf = computeTermFrequency(terms);
      this.chunkVectors.set(chunk.id, tf);
    }

    this.isInitialized = true;
  }

  public updateConfig(newConfig: Partial<RagConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): RagConfig {
    return { ...this.config };
  }

  public getTotalIndexedDocuments(): { total: number; movies: number; explainer: number; platform: number } {
    let movies = 0;
    let explainer = 0;
    let platform = 0;

    for (const c of this.chunks) {
      if (c.sourceType === 'movies') movies++;
      else if (c.sourceType === 'deep_explainer') explainer++;
      else if (c.sourceType === 'platform') platform++;
    }

    return { total: this.chunks.length, movies, explainer, platform };
  }

  public getCatalogMovies(): Movie[] {
    return this.catalogMovies;
  }

  /**
   * BƯỚC 2: RETRIEVAL & RE-RANKING
   */
  public retrieve(query: string, options?: { topK?: number; filterSource?: RagSourceType }): RagRetrievalResult[] {
    if (!this.isInitialized || this.chunks.length === 0) {
      this.init();
    }

    const clean = cleanUserQuery(query);
    const queryTerms = tokenizeToTerms(clean);
    const queryVector = computeTermFrequency(queryTerms);
    const topK = options?.topK || this.config.topK;

    const scoredResults: RagRetrievalResult[] = [];
    const cleanLower = clean.toLowerCase();

    for (const chunk of this.chunks) {
      if (options?.filterSource && chunk.sourceType !== options.filterSource) continue;
      if (chunk.sourceType === 'movies' && !this.config.enableSources.movies) continue;
      if (chunk.sourceType === 'deep_explainer' && !this.config.enableSources.deepExplainer) continue;
      if (chunk.sourceType === 'platform' && !this.config.enableSources.platform) continue;

      const chunkVector = this.chunkVectors.get(chunk.id);
      if (!chunkVector) continue;

      let similarity = computeCosineSimilarity(queryVector, chunkVector);
      let matchedTerms: string[] = [];

      // Keyword & Entity matching bonus
      for (const kw of chunk.keywords) {
        if (kw && kw.length > 2 && cleanLower.includes(kw)) {
          similarity += 0.28;
          matchedTerms.push(kw);
        }
      }

      // Khớp trực tiếp tiêu đề
      if (chunk.title && cleanLower.includes(normalizeText(chunk.title.split('(')[0] || ''))) {
        similarity += 0.35;
      }

      similarity = Math.min(0.99, Math.max(0, similarity));

      if (similarity >= this.config.similarityThreshold) {
        scoredResults.push({
          chunk,
          similarity: Math.round(similarity * 100) / 100,
          matchedTerms: Array.from(new Set(matchedTerms))
        });
      }
    }

    scoredResults.sort((a, b) => b.similarity - a.similarity);
    return scoredResults.slice(0, topK);
  }

  /**
   * BƯỚC 3: AUGMENTATION
   */
  public augment(rawQuery: string, dynamicMovies: Movie[] = [], mode: 'mood' | 'explainer' | 'compare' = 'mood'): RagAugmentedPrompt {
    const cleanQueryText = cleanUserQuery(rawQuery);
    const intent = detectQueryIntent(cleanQueryText, mode);

    // Ghép movies
    const combined = this.catalogMovies.length > 0 ? this.catalogMovies : dynamicMovies;
    const retrieved = intent === 'GREETING' ? [] : this.retrieve(cleanQueryText);

    let contextStr = '';
    const recommendedMovies: Movie[] = [];
    const addedMovieIds = new Set<string>();

    retrieved.forEach((res, idx) => {
      const c = res.chunk;
      const typeLabel =
        c.sourceType === 'movies'
          ? '🎬 Kho Phim'
          : c.sourceType === 'deep_explainer'
          ? '🧠 Giải Mã Kịch Bản Chuyên Sâu'
          : '⚙️ Nền Tảng CineStreams';

      contextStr += `\n[Tài Liệu ${idx + 1} - ${typeLabel} | Độ Khớp: ${Math.round(res.similarity * 100)}%]\nTiêu đề: ${c.title}\nNội dung: ${c.content}\n`;

      if (c.metadata.movieId && !addedMovieIds.has(c.metadata.movieId)) {
        const found = combined.find((m) => m.id === c.metadata.movieId);
        if (found) {
          recommendedMovies.push(found);
          addedMovieIds.add(c.metadata.movieId);
        }
      }
    });

    // Bổ sung phim theo thể loại nếu chưa đủ 3 phim
    if (recommendedMovies.length < 3) {
      const qLower = cleanQueryText.toLowerCase();
      for (const m of combined) {
        if (recommendedMovies.length >= 3) break;
        if (!addedMovieIds.has(m.id)) {
          const matchGenre = m.genres?.some((g) => qLower.includes(g.toLowerCase()) || contextStr.toLowerCase().includes(g.toLowerCase()));
          if (matchGenre) {
            recommendedMovies.push(m);
            addedMovieIds.add(m.id);
          }
        }
      }
    }

    if (recommendedMovies.length === 0 && combined.length > 0) {
      recommendedMovies.push(...combined.slice(0, 3));
    }

    return {
      userQuery: rawQuery,
      cleanQuery: cleanQueryText,
      augmentedContext: contextStr.trim(),
      retrievedChunks: retrieved,
      recommendedMovies: recommendedMovies.slice(0, 3),
      intent
    };
  }

  /**
   * BƯỚC 4: CONTEXT-AWARE DYNAMIC GENERATOR (SỬA TRIỆT ĐỂ LỖI 1 CÂU TRẢ LỜI CHO NHIỀU CÂU HỎI)
   */
  public generateResponse(
    augmented: RagAugmentedPrompt,
    mode: 'mood' | 'explainer' | 'compare',
    options?: { antiSpoiler?: boolean }
  ): {
    text: string;
    executiveSummary: string;
    analysisPoints: { index: number; title: string; content: string }[];
  } {
    const { cleanQuery, retrievedChunks, recommendedMovies, intent } = augmented;
    const isAntiSpoiler = options?.antiSpoiler ?? true;

    // =========================================================================
    // CASE 1: CHÀO HỎI & GIỚI THIỆU BẢN THÂN (GREETING)
    // =========================================================================
    if (intent === 'GREETING') {
      return {
        text: `Xin chào bạn! Tôi là **CineAI Studio v4.0** – trợ lý điện ảnh AI thế hệ mới được trang bị công nghệ **RAG (Retrieval-Augmented Generation)** độc quyền của CineStreams.

Tôi đã được huấn luyện trên toàn bộ kho phim bản quyền, cơ sở dữ liệu kịch bản chuyên sâu và hệ sinh thái công nghệ streaming của CineStreams. Tôi có thể hỗ trợ bạn:
- 🍿 **Tóm tắt cốt truyện & Giải mã cái kết**: Phân tích đa tầng các kịch bản xoắn não, giải mã các nút thắt (plot twists) và biểu tượng nghệ thuật.
- 🎬 **Tra cứu thông tin chính xác**: Đạo diễn, dàn diễn viên, điểm IMDb, thời lượng, chuẩn 4K HDR và âm thanh Dolby Atmos.
- 💡 **Gợi ý phim chuẩn xác**: Phân tích tâm trạng cảm xúc để đề xuất tác phẩm điện ảnh lý tưởng cho buổi tối của bạn.
- ⚙️ **Hỗ trợ tính năng CineStreams**: Gói hội viên VIP Diamond/Standard, phòng xem chung WatchParty đồng bộ, chế độ chống Spoiler.

Bạn muốn tôi tóm tắt phim nào, hay cần gợi ý phim theo tâm trạng hôm nay?`,
        executiveSummary: 'CineAI Studio v4.0 sẵn sàng đồng hành cùng bạn khám phá thế giới điện ảnh đỉnh cao chuẩn 4K Dolby Atmos.',
        analysisPoints: [
          {
            index: 1,
            title: 'Hỏi về kịch bản & cái kết',
            content: 'Ví dụ: "Tóm tắt phim Dune 2", "Giải thích ý nghĩa cái kết Interstellar", "Căn hầm trong Parasite có ý nghĩa gì?"'
          },
          {
            index: 2,
            title: 'Tra cứu thông tin đạo diễn & diễn viên',
            content: 'Ví dụ: "Ai đạo diễn phim Oppenheimer?", "Dàn diễn viên Shōgun gồm những ai?", "Điểm IMDb của Mai là bao nhiêu?"'
          },
          {
            index: 3,
            title: 'Hỏi về gói cước & tính năng',
            content: 'Ví dụ: "Gói VIP Diamond giá bao nhiêu?", "Phòng xem chung WatchParty hoạt động thế nào?"'
          }
        ]
      };
    }

    // =========================================================================
    // CASE 2: HỎI THÔNG TIN CỤ THỂ (SPECIFIC FACT: ĐẠO DIỄN, DIỄN VIÊN, IMDB, NĂM, THỜI LƯỢNG)
    // =========================================================================
    if (intent === 'SPECIFIC_FACT' && retrievedChunks.length > 0) {
      const topChunk = retrievedChunks[0].chunk;
      const movie = recommendedMovies.find((m) => m.id === topChunk.metadata.movieId) || {
        title: topChunk.title.split('(')[0].trim(),
        director: topChunk.metadata.director || 'Đang cập nhật',
        cast: topChunk.metadata.cast || [],
        imdbRating: topChunk.metadata.rating || 8.5,
        releaseYear: topChunk.metadata.year || 2024,
        genres: topChunk.metadata.genres || ['Điện ảnh'],
        duration: topChunk.metadata.duration || 'Bản chiếu rạp tiêu chuẩn',
        qualityBadge: topChunk.metadata.qualityBadge || '4K Ultra HD',
        audioBadge: topChunk.metadata.audioBadge || 'Dolby Atmos'
      };

      const qLower = cleanQuery.toLowerCase();
      let factAnswer = '';
      let factTitle = '';

      if (qLower.includes('đạo diễn') || qLower.includes('ai làm')) {
        factTitle = `Đạo Diễn Tác Phẩm ${movie.title}`;
        factAnswer = `Đạo diễn của tác phẩm **${movie.title}** là **${movie.director}**.\n\n` +
          `Dưới sự chỉ đạo tài ba của ${movie.director}, tác phẩm gây ấn tượng mạnh mẽ với phong cách nghệ thuật độc đáo, ngôn ngữ điện ảnh chuẩn mực và khả năng khai thác chiều sâu tâm lý nhân vật xuất sắc.`;
      } else if (qLower.includes('diễn viên') || qLower.includes('ai đóng') || qLower.includes('thủ vai')) {
        factTitle = `Dàn Diễn Viên Tác Phẩm ${movie.title}`;
        const castStr = movie.cast && movie.cast.length > 0 ? movie.cast.join(', ') : 'Dàn diễn viên thực lực';
        factAnswer = `Dàn diễn viên chính tham gia tác phẩm **${movie.title}** bao gồm: **${castStr}**.\n\n` +
          `Sự hóa thân ăn ý và khả năng biểu đạt cảm xúc tinh tế của dàn diễn viên đã góp phần quan trọng mang lại thành công vang dội cho bộ phim.`;
      } else if (qLower.includes('imdb') || qLower.includes('rating') || qLower.includes('điểm') || qLower.includes('đánh giá')) {
        factTitle = `Điểm Đánh Giá IMDb: ${movie.title}`;
        factAnswer = `Tác phẩm **${movie.title}** hiện đạt điểm số ấn tượng **${movie.imdbRating}/10 trên chuyên trang IMDb**.\n\n` +
          `Đây là một trong những tác phẩm được cộng đồng người hâm mộ điện ảnh và giới phê bình quốc tế đánh giá rất cao về cả kịch bản, nghệ thuật hình ảnh lẫn hiệu ứng âm thanh vòm.`;
      } else if (qLower.includes('năm') || qLower.includes('thời lượng') || qLower.includes('mấy tập') || qLower.includes('dài bao lâu')) {
        factTitle = `Thông Số Kỹ Thuật: ${movie.title}`;
        factAnswer = `Tác phẩm **${movie.title}** được phát hành vào năm **${movie.releaseYear}**, với thời lượng **${movie.duration || 'chuẩn điện ảnh'}**.\n\n` +
          `Phim hiện có sẵn trên hệ thống CineStreams với chất lượng hình ảnh cao nhất **${movie.qualityBadge || '4K Ultra HD'}** và định dạng âm thanh **${movie.audioBadge || 'Dolby Atmos'}**.`;
      } else {
        factTitle = `Hồ Sơ Điện Ảnh: ${movie.title}`;
        factAnswer = `Thông tin chi tiết về tác phẩm **${movie.title}**:\n` +
          `- **Đạo diễn**: ${movie.director}\n` +
          `- **Dàn diễn viên chính**: ${movie.cast?.join(', ') || 'Đang cập nhật'}\n` +
          `- **Năm phát hành**: ${movie.releaseYear}\n` +
          `- **Điểm IMDb**: ${movie.imdbRating}/10\n` +
          `- **Thể loại**: ${movie.genres?.join(', ')}\n` +
          `- **Thời lượng**: ${movie.duration || 'Tiêu chuẩn'}\n` +
          `- **Chất lượng truyền phát**: ${movie.qualityBadge || '4K Ultra HD'} • ${movie.audioBadge || 'Dolby Atmos'}`;
      }

      return {
        text: factAnswer,
        executiveSummary: `Dữ liệu hồ sơ điện ảnh chính thức được CineAI RAG Engine truy xuất thành công cho tác phẩm [${movie.title}].`,
        analysisPoints: [
          {
            index: 1,
            title: 'Chỉ đạo nghệ thuật & Dàn diễn viên',
            content: `Đạo diễn: ${movie.director} • Dàn diễn viên: ${movie.cast?.slice(0, 3).join(', ') || 'Dàn sao tên tuổi'}.`
          },
          {
            index: 2,
            title: 'Chất lượng trải nghiệm rạp tại gia',
            content: `Định dạng phát: ${movie.qualityBadge || '4K Ultra HD'} kết hợp công nghệ âm thanh ${movie.audioBadge || 'Dolby Atmos'} chuẩn cinema.`
          },
          {
            index: 3,
            title: 'Đánh giá & Thể loại',
            content: `Điểm số ${movie.imdbRating}/10 IMDb • Thuộc thể loại ${movie.genres?.join(', ')}.`
          }
        ]
      };
    }

    // =========================================================================
    // CASE 3: TÍNH NĂNG NỀN TẢNG CINESTREAMS (PLATFORM SUPPORT)
    // =========================================================================
    if (intent === 'PLATFORM_SUPPORT') {
      const qLower = cleanQuery.toLowerCase();
      let pTitle = 'Hệ Sinh Thái CineStreams';
      let pContent = '';
      let pPoints: { index: number; title: string; content: string }[] = [];

      if (qLower.includes('vip') || qLower.includes('giá') || qLower.includes('gói') || qLower.includes('tiền')) {
        pTitle = 'Bảng Giá & Đặc Quyền Gói Hội Viên VIP CineStreams';
        pContent = `CineStreams hiện cung cấp 2 gói hội viên VIP tối ưu hóa theo nhu cầu xem phim của bạn:\n\n` +
          `1. 🌟 **Gói VIP Standard**:\n` +
          `   - **Giá cước**: 79.000đ/tháng (hoặc 790.000đ/năm - tiết kiệm 2 tháng).\n` +
          `   - **Quyền lợi**: Xem toàn bộ phim không quảng cáo, độ phân giải 2K QHD, xem đồng thời trên 2 thiết bị.\n\n` +
          `2. 👑 **Gói VIP Diamond 4K (Khuyên Dùng)**:\n` +
          `   - **Giá cước**: 129.000đ/tháng (hoặc 1.190.000đ/năm - ưu đãi lớn nhất).\n` +
          `   - **Quyền lợi**: Chất lượng **4K Ultra HD & Dolby Vision**, âm thanh không gian **Dolby Atmos 7.1**, phát đồng thời trên **4 thiết bị**, quyền **tải phim offline không giới hạn** và xem sớm các bom tấn chiếu rạp độc quyền.\n\n` +
          `Hệ thống hỗ trợ thanh toán an toàn, tức thì qua VNPay, MoMo, ZaloPay, Thẻ ATM nội địa và Thẻ Quốc Tế Visa/MasterCard.`;

        pPoints = [
          { index: 1, title: 'VIP Standard (79.000đ/tháng)', content: 'Không quảng cáo, chất lượng 2K, 2 thiết bị đồng thời.' },
          { index: 2, title: 'VIP Diamond 4K (129.000đ/tháng)', content: 'Chuẩn 4K Dolby Atmos, 4 thiết bị, tải xem offline không giới hạn.' },
          { index: 3, title: 'Thanh toán linh hoạt & Bảo mật', content: 'Kích hoạt ngay lập tức qua VNPay, MoMo, ZaloPay, thẻ quốc tế.' }
        ];
      } else if (qLower.includes('watchparty') || qLower.includes('xem chung') || qLower.includes('voice')) {
        pTitle = 'Tính Năng Phòng Xem Chung WatchParty';
        pContent = `**WatchParty** là tính năng độc quyền cho phép bạn xem phim cùng bạn bè từ xa với độ trễ cực thấp:\n\n` +
          `- ⏱️ **Đồng bộ khung hình từng miligiây**: Tự động khớp trạng thái Play, Pause, Tua nhanh giữa tất cả thành viên trong phòng.\n` +
          `- 🎙️ **Voice Chat thời gian thực**: Trò chuyện giọng nói trực tiếp qua micro với âm thanh trong trẻo, không làm gián đoạn tiếng phim.\n` +
          `- 🔒 **Quyền kiểm soát chủ phòng (Host Lock)**: Chủ phòng có quyền khóa hoặc mở quyền điều khiển phát phim cho các thành viên.\n` +
          `- 💬 **Tương tác đa kênh**: Khung chat văn bản nổi bật và hệ thống thả reaction emoji sống động trên màn hình.`;

        pPoints = [
          { index: 1, title: 'Đồng bộ khung hình chuẩn xác', content: 'Tự động khớp từng khung hình phát giữa các thiết bị thông qua WebSocket.' },
          { index: 2, title: 'Đàm thoại Voice Chat độ trễ thấp', content: 'Vừa xem phim vừa bàn luận sôi nổi như đang ngồi cạnh nhau tại rạp.' },
          { index: 3, title: 'Quyền điều khiển Host Lock', content: 'Chủ phòng toàn quyền quản lý thành viên, danh sách phát và bảo mật phòng.' }
        ];
      } else if (qLower.includes('spoil') || qLower.includes('chống')) {
        pTitle = 'Công Nghệ Chống Spoilers (Anti-Spoiler Protection)';
        pContent = `CineStreams thấu hiểu nỗi thất vọng khi bị tiết lộ trước các nút thắt then chốt của tác phẩm. Hệ thống tích hợp công nghệ Anti-Spoiler đa tầng:\n\n` +
          `- **Trong Trợ Lý CineAI**: Tự động nhận diện và che mờ các chi tiết bất ngờ, kết cục sinh tử và danh tính phản diện thật sự trừ khi bạn chủ động yêu cầu giải mã chi tiết.\n` +
          `- **Trong Phòng Xem Chung WatchParty**: Thuật toán tự động phát hiện tin nhắn chứa nội dung tiết lộ kịch bản và áp dụng bộ lọc mờ cảnh báo để bảo vệ trải nghiệm của cả phòng.`;

        pPoints = [
          { index: 1, title: 'Bảo vệ cảm xúc lần đầu xem', content: 'Giữ kín tuyệt đối các cú twist bất ngờ và kết cục quan trọng của bộ phim.' },
          { index: 2, title: 'Lọc thông minh đa nền tảng', content: 'Áp dụng trên cả giao diện AI, bình luận phim và phòng xem chung WatchParty.' }
        ];
      } else {
        const topChunk = retrievedChunks[0]?.chunk;
        pTitle = topChunk?.title || 'Công Nghệ & Tính Năng CineStreams';
        pContent = topChunk?.content || 'CineStreams mang đến trải nghiệm xem phim rạp tại gia với chuẩn 4K Ultra HD và âm thanh Dolby Atmos.';
        pPoints = [
          { index: 1, title: 'Hạ tầng Adaptive Bitrate HLS', content: 'Tự động thích ứng băng thông mạng 4G/5G/Wifi, không giật lag.' },
          { index: 2, title: 'Đa nền tảng & Đồng bộ đám mây', content: 'Xem tiếp liền mạch trên Smart TV, Web, Laptop và Điện thoại thông minh.' }
        ];
      }

      return {
        text: pContent,
        executiveSummary: `Dữ liệu chính thức từ cổng hỗ trợ CineStreams Platform RAG: [${pTitle}].`,
        analysisPoints: pPoints
      };
    }

    // =========================================================================
    // CASE 4: TÓM TẮT KỊCH BẢN & GIẢI MÃ CỐT TRUYỆN (SUMMARY & EXPLAINER)
    // =========================================================================
    if (intent === 'SUMMARY_PLOT' || mode === 'explainer') {
      const topChunk = retrievedChunks[0]?.chunk;
      const movieTitle = topChunk?.title.split('(')[0].trim() || 'Tác Phẩm Chọn Lọc';
      const explainerChunk = retrievedChunks.find((c) => c.chunk.sourceType === 'deep_explainer')?.chunk || topChunk;

      let summaryText = '';
      let points: { index: number; title: string; content: string }[] = [];

      if (explainerChunk && explainerChunk.content) {
        const paragraphs = explainerChunk.content.split('\n').filter((p) => p.trim().length > 0);
        
        let intro = paragraphs[0] || '';
        let body = paragraphs.slice(1, -1).join('\n\n') || paragraphs.slice(1).join('\n\n');
        let conclusion = paragraphs[paragraphs.length - 1] || '';

        if (isAntiSpoiler) {
          summaryText = `Dưới đây là phần tóm tắt kịch bản và phân tích thiết lập thế giới của tác phẩm **${movieTitle}** (🛡️ *Chế độ Chống Spoilers đang bật: Các chi tiết kết thúc bất ngờ then chốt đã được bảo vệ*):\n\n` +
            `${intro}\n\n` +
            `**Xung đột cốt lõi & Diễn biến chính**:\n${body}\n\n` +
            `*Lời khuyên từ CineAI: Tác phẩm sở hữu những cú ngoặt kịch bản (plot twists) đầy bất ngờ ở hồi 3. Bạn nên thưởng thức trực tiếp trên CineStreams với chuẩn 4K Dolby Atmos để cảm nhận trọn vẹn sự choáng ngợp!*`;

          points = [
            {
              index: 1,
              title: 'Bối cảnh khởi nguyên & Xung đột trung tâm',
              content: paragraphs[0] || 'Thiết lập thế giới độc đáo với những mâu thuẫn giai cấp, chính trị và nhân sinh sâu sắc.'
            },
            {
              index: 2,
              title: 'Sự giằng xé nội tâm nhân vật',
              content: paragraphs[1] || 'Hành trình vượt qua định mệnh cá nhân để đối đầu với các thế lực đối nghịch hùng mạnh.'
            },
            {
              index: 3,
              title: 'Thông điệp nhân sinh then chốt (Safe Preview)',
              content: 'Tác phẩm đặt ra những câu hỏi triết học sâu cay về đạo đức, quyền lực và giá trị của tình cảm con người.'
            }
          ];
        } else {
          summaryText = `Dưới đây là bản giải mã kịch bản toàn diện và phân tích chi tiết cái kết của **${movieTitle}**:\n\n` +
            `${intro}\n\n` +
            `**Diễn biến cao trào & Các bước ngoặt kịch bản**:\n${body}\n\n` +
            `**Giải mã cái kết & Ý nghĩa biểu tượng**:\n${conclusion}`;

          points = paragraphs.slice(0, 3).map((p, idx) => ({
            index: idx + 1,
            title: idx === 0 ? 'Khởi nguyên & Xung đột then chốt' : idx === 1 ? 'Nút thắt cao trào (Turning Point)' : 'Giải mã cái kết & Ẩn dụ nghệ thuật',
            content: p
          }));
        }
      } else {
        const movie = recommendedMovies[0];
        summaryText = `Tóm tắt kịch bản tác phẩm **${movie?.title || movieTitle}**:\n\n` +
          `${movie?.synopsis || 'Một câu chuyện điện ảnh đặc sắc lôi cuốn người xem vào thế giới đầy kịch tính.'}\n\n` +
          `Bộ phim thuộc thể loại **${movie?.genres?.join(', ') || 'Điện ảnh'}**, phát hành năm **${movie?.releaseYear || 2024}**, đạt điểm đánh giá **${movie?.imdbRating || 8.5}/10 IMDb**.`;

        points = [
          { index: 1, title: 'Cốt lõi nội dung', content: movie?.synopsis || 'Cốt truyện chặt chẽ với nhịp phim dồn dập.' },
          { index: 2, title: 'Nghệ thuật quay phim & Âm thanh', content: `Chất lượng ${movie?.qualityBadge || '4K Ultra HD'} cùng âm thanh ${movie?.audioBadge || 'Dolby Atmos'}.` }
        ];
      }

      return {
        text: summaryText,
        executiveSummary: `Phân tích kịch bản RAG cho tác phẩm [${movieTitle}]. Đã trích xuất cấu trúc kịch bản và luận điểm nghệ thuật then chốt.`,
        analysisPoints: points
      };
    }

    // =========================================================================
    // CASE 5: SO SÁNH PHIM HOẶC VŨ TRỤ ĐIỆN ẢNH (COMPARE)
    // =========================================================================
    if (intent === 'COMPARE' || mode === 'compare') {
      const movieA = recommendedMovies[0];
      const movieB = recommendedMovies[1] || recommendedMovies[0];

      const compareText = `CineAI RAG Studio đã tiến hành đối chiếu và so sánh đa chiều giữa hai siêu phẩm điện ảnh:\n\n` +
        `### 1. **${movieA?.title}** (${movieA?.releaseYear}) vs **${movieB?.title}** (${movieB?.releaseYear})\n` +
        `- **Thể loại & Tông màu (Tone & Mood)**: ${movieA?.title} mang phong cách *${movieA?.genres?.join(', ')}*, trong khi ${movieB?.title} tập trung vào trải nghiệm *${movieB?.genres?.join(', ')}*.\n` +
        `- **Điểm đánh giá IMDb**: ${movieA?.title} đạt **${movieA?.imdbRating}/10**, còn ${movieB?.title} đạt **${movieB?.imdbRating}/10**.\n` +
        `- **Nghệ thuật thị giác & Âm thanh**: Cả hai tác phẩm đều sở hữu chất lượng **${movieA?.qualityBadge || '4K Ultra HD'}** và công nghệ âm thanh vòm **${movieA?.audioBadge || 'Dolby Atmos'}** rực rỡ trên CineStreams.\n\n` +
        `**Đánh giá tổng quan**: Nếu bạn muốn đắm chìm vào những câu chuyện kịch tính sâu sắc, cả hai tác phẩm đều là những kiệt tác xuất sắc không thể bỏ qua.`;

      return {
        text: compareText,
        executiveSummary: `So sánh đối chiếu RAG giữa [${movieA?.title}] và [${movieB?.title}]: Khác biệt về ngôn ngữ điện ảnh, nhịp độ và cảm xúc.`,
        analysisPoints: [
          { index: 1, title: 'Phong cách đạo diễn & Nhịp phim', content: `${movieA?.title} có chiều sâu tự sự, trong khi ${movieB?.title} ghi điểm bởi tiết tấu dồn dập.` },
          { index: 2, title: 'Chất lượng hình ảnh & Âm thanh', content: 'Cả hai đều khai thác triệt để dải tương phản động 4K Dolby Vision và âm thanh định vị Dolby Atmos.' }
        ]
      };
    }

    // =========================================================================
    // CASE 6: GỢI Ý PHIM THEO TÂM TRẠNG & THỂ LOẠI (RECOMMENDATIONS)
    // =========================================================================
    if (intent === 'RECOMMENDATION' || mode === 'mood') {
      const qLower = cleanQuery.toLowerCase();
      let moodTitle = 'Phim Thịnh Hành';
      let moodDescription = '';

      if (qLower.includes('hành động') || qLower.includes('hào hứng') || qLower.includes('kịch tính')) {
        moodTitle = 'Hào Hứng & Kịch Tính Đỉnh Cao';
        moodDescription = 'Trạng thái tràn đầy năng lượng, khao khát tốc độ, kỹ xảo đỉnh cao và những màn đối đầu nghẹt thở.';
      } else if (qLower.includes('chữa lành') || qLower.includes('thư giãn') || qLower.includes('ấm áp') || qLower.includes('gia đình')) {
        moodTitle = 'Thư Giãn & Chữa Lành Tâm Hồn';
        moodDescription = 'Tâm trí muốn giải tỏa áp lực và đắm mình vào những câu chuyện ấm áp về tình cảm gia đình, tình người bao dung.';
      } else if (qLower.includes('xoắn não') || qLower.includes('bí ẩn') || qLower.includes('trinh thám')) {
        moodTitle = 'Xoắn Não & Giải Đố Kịch Bản';
        moodDescription = 'Trí óc thèm khát những cú plot twist bất ngờ, những câu đố hóc búa và bí ẩn chưa có lời giải.';
      } else if (qLower.includes('lãng mạn') || qLower.includes('ngọt ngào') || qLower.includes('tình cảm')) {
        moodTitle = 'Lãng Mạn & Lắng Đọng Cảm Xúc';
        moodDescription = 'Những rung động ngọt ngào, tinh tế, lý tưởng cho một buổi tối xem phim ấm áp cùng người thương.';
      } else if (qLower.includes('kinh dị') || qLower.includes('rùng rợn') || qLower.includes('sợ')) {
        moodTitle = 'Rùng Rợn & Giật Gân Thót Tim';
        moodDescription = 'Cảm giác hồi hộp tột độ trong bầu không khí ma mị, âm thanh vòm giật mình chuẩn rạp.';
      } else {
        moodTitle = 'Khám Phá Điện Ảnh Chọn Lọc';
        moodDescription = 'Sàng lọc kỹ lưỡng dựa trên từ khóa tìm kiếm và các tiêu chí đánh giá IMDb cao nhất trên CineStreams.';
      }

      const movieRecsText = recommendedMovies
        .map(
          (m, i) =>
            `${i + 1}. 🎬 **${m.title}** (${m.releaseYear}) • Điểm IMDb: **${m.imdbRating}/10**\n` +
            `   - **Thể loại**: ${m.genres?.join(', ')}\n` +
            `   - **Lý do đề xuất**: ${m.synopsis.slice(0, 160)}...\n` +
            `   - **Chuẩn phát**: ${m.qualityBadge || '4K Ultra HD'} • ${m.audioBadge || 'Dolby Atmos'}`
        )
        .join('\n\n');

      const responseText = `Dựa trên phân tích trạng thái và yêu cầu [**${moodTitle}**], CineAI RAG Engine đã quét toàn bộ kho phim và tuyển chọn 3 tác phẩm phù hợp nhất:\n\n${movieRecsText}\n\n*Bạn có thể bấm trực tiếp nút "Xem Phim" hoặc "Chi tiết" ở các thẻ bên dưới để thưởng thức ngay!*`;

      return {
        text: responseText,
        executiveSummary: `Tuyển chọn 3 siêu phẩm chuẩn xác cho tâm trạng [${moodTitle}]: ${recommendedMovies.map((m) => `"${m.title}"`).join(', ')}.`,
        analysisPoints: recommendedMovies.map((m, idx) => ({
          index: idx + 1,
          title: `${m.title} (${m.releaseYear}) • ${m.imdbRating}/10 IMDb`,
          content: `${m.synopsis.slice(0, 140)}... (Định dạng: ${m.qualityBadge || '4K'} ${m.audioBadge || 'Dolby'})`
        }))
      };
    }

    // =========================================================================
    // CASE 7: GENERAL FALLBACK (CÂU HỎI TỰ DO KHÁC)
    // =========================================================================
    const topChunk = retrievedChunks[0]?.chunk;
    if (topChunk) {
      return {
        text: `Chào bạn! Đối với câu hỏi về **${cleanQuery}**, hệ thống CineAI RAG Engine đã tìm thấy tài liệu liên quan trong kho tri thức:\n\n` +
          `${topChunk.content}\n\n` +
          `Nếu bạn cần làm rõ thêm khía cạnh nào (kịch bản, dàn diễn viên, cái kết hay gợi ý phim cùng thể loại), hãy cho tôi biết nhé!`,
        executiveSummary: `Truy xuất tri thức thành công cho câu hỏi: [${cleanQuery}].`,
        analysisPoints: retrievedChunks.slice(0, 3).map((res, i) => ({
          index: i + 1,
          title: res.chunk.title,
          content: res.chunk.content.slice(0, 150) + '...'
        }))
      };
    }

    // Fallback nếu không có tài liệu nào khớp
    return {
      text: `Chào bạn! Tôi là CineAI Studio v4.0. Với câu hỏi "${cleanQuery}", hiện cơ sở dữ liệu chưa có tài liệu khớp 100% về thuật ngữ này. Tuy nhiên, tôi gợi ý bạn có thể thử:\n\n` +
        `1. Tra cứu theo tên phim cụ thể (ví dụ: *Dune 2, Oppenheimer, Shōgun, Arcane, Lật Mặt 7, Mai, Furiosa, Ký Sinh Trùng*).\n` +
        `2. Hỏi thông tin diễn viên, đạo diễn, điểm số IMDb hoặc thời lượng phim.\n` +
        `3. Nhập cảm xúc để CineAI đề xuất phim phù hợp (hành động, chữa lành, xoắn não, lãng mạn, kinh dị).\n` +
        `4. Tìm hiểu về các gói cước VIP hoặc tính năng phòng xem chung WatchParty của CineStreams.`,
      executiveSummary: 'CineAI luôn sẵn sàng hỗ trợ bạn khám phá kho phim bản quyền 4K Dolby Atmos.',
      analysisPoints: [
        { index: 1, title: 'Tra cứu phim & kịch bản', content: 'Tóm tắt nội dung, giải mã cái kết và biểu tượng nghệ thuật.' },
        { index: 2, title: 'Hỏi đáp gói VIP & Tính năng', content: 'Bảng giá hội viên VIP Diamond/Standard và phòng xem chung WatchParty.' }
      ]
    };
  }
}

export const ragEngine = new CineStreamsRagEngine();
