const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  ShadingType,
  PageBreak
} = require('docx');

// Colors
const COLOR_PRIMARY = '8B0000';      // Dark Red / CineStreams Brand
const COLOR_SECONDARY = '1A202C';    // Dark Navy / Gray
const COLOR_TEXT = '2D3748';         // Charcoal Body Text
const COLOR_MUTED = '718096';        // Muted Gray
const COLOR_LIGHT_BG = 'F7FAFC';     // Light table zebra
const COLOR_BORDER = 'CBD5E0';       // Table border
const COLOR_CALLOUT_BG = 'FFF5F5';   // Callout background light red
const COLOR_CALLOUT_BORDER = 'FEB2B2'; // Callout border red

function createCoverPage() {
  return [
    new Paragraph({ spacing: { before: 800, after: 200 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'VIỆN ĐÀO TẠO CÔNG NGHỆ THÔNG TIN VTI ACADEMY',
          bold: true,
          size: 26,
          color: COLOR_SECONDARY,
          font: 'Segoe UI'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'BỘ MÔN CÔNG NGHỆ PHẦN MỀM & FULLSTACK WEB DEVELOPMENT',
          size: 20,
          color: COLOR_MUTED,
          font: 'Segoe UI'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 400 },
      children: [
        new TextRun({
          text: '------------------------ ★★★ ------------------------',
          bold: true,
          color: COLOR_PRIMARY,
          size: 20
        })
      ]
    }),
    new Paragraph({ spacing: { before: 600, after: 200 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 100 },
      children: [
        new TextRun({
          text: 'TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM',
          bold: true,
          size: 40,
          color: COLOR_PRIMARY,
          font: 'Segoe UI'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 200 },
      children: [
        new TextRun({
          text: 'SOFTWARE REQUIREMENTS SPECIFICATION (SRS)',
          bold: true,
          size: 26,
          color: COLOR_SECONDARY,
          font: 'Segoe UI'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 300 },
      children: [
        new TextRun({
          text: 'DỰ ÁN: NỀN TẢNG XEM PHIM TRỰC TUYẾN TỐC ĐỘ CAO CINESTREAMS',
          bold: true,
          size: 24,
          color: COLOR_PRIMARY,
          font: 'Segoe UI'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 50, after: 400 },
      children: [
        new TextRun({
          text: '(Mã Dự Án: PRJ-CINESTREAMS-2026 — Phiên Bản: 1.0 Final Release)',
          italics: true,
          size: 20,
          color: COLOR_MUTED,
          font: 'Segoe UI'
        })
      ]
    }),
    new Paragraph({ spacing: { before: 600, after: 200 } }),
    createCallout(
      'MÔ TẢ NGẮN GỌN HỆ THỐNG',
      'CineStreams là nền tảng OTT Streaming hiện đại xây dựng theo kiến trúc Client-Server Monorepo (Spring Boot 3 + React 18). Nền tảng sở hữu các công nghệ lõi đột phá: Truyền phát video thích ứng băng thông HLS Adaptive Bitrate (ABR), Chuyển mã đa độ phân giải FFmpeg ngầm, Tải lên tệp dung lượng lớn phân đoạn (Chunked Resumable Upload 5GB+), Xác thực đa tầng OTP Email bất đồng bộ & 2FA, cùng Cổng thanh toán gói VIP tự động VietQR 24/7.'
    ),
    new Paragraph({ spacing: { before: 800, after: 200 } }),
    new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [
        new TextRun({ text: 'Thành viên thực hiện dự án:', bold: true, size: 21, color: COLOR_SECONDARY, font: 'Segoe UI' })
      ]
    }),
    createBulletPoint('Hà Đình Lực — Project Manager & Backend Lead', 'PM / Tech Lead'),
    createBulletPoint('Triệu Văn Sơn — Backend Engineer & Transcoding Specialist', 'Core Backend'),
    createBulletPoint('Đỗ Phạm Thanh Tùng — Frontend Lead & UI/UX Specialist', 'Core Frontend'),
    new Paragraph({
      spacing: { before: 140, after: 60 },
      children: [
        new TextRun({ text: 'Đơn vị nghiệm thu: ', bold: true, size: 21, color: COLOR_SECONDARY, font: 'Segoe UI' }),
        new TextRun({ text: 'Hội đồng Khoa học & Ban Giám khảo Đồ án VTI Academy', size: 21, color: COLOR_TEXT, font: 'Segoe UI' })
      ]
    }),
    new Paragraph({
      spacing: { before: 60, after: 200 },
      children: [
        new TextRun({ text: 'Thời gian hoàn thành: ', bold: true, size: 21, color: COLOR_SECONDARY, font: 'Segoe UI' }),
        new TextRun({ text: 'Tháng 11/2026 — Hà Nội, Việt Nam', size: 21, color: COLOR_TEXT, font: 'Segoe UI' })
      ]
    }),
    new Paragraph({ children: [new PageBreak()] })
  ];
}

function createHeading1(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 30, // 15pt
        color: COLOR_PRIMARY,
        font: 'Segoe UI'
      })
    ]
  });
}

function createHeading2(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 120 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 24, // 12pt
        color: COLOR_SECONDARY,
        font: 'Segoe UI'
      })
    ]
  });
}

function createHeading3(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 21, // 10.5pt
        color: '4A5568',
        font: 'Segoe UI'
      })
    ]
  });
}

function createParagraph(text, options = {}) {
  const runs = Array.isArray(text) ? text : [new TextRun({ text, font: 'Segoe UI', size: 21, color: COLOR_TEXT, ...options })];
  return new Paragraph({
    spacing: { before: 70, after: 110, line: 280 },
    children: runs
  });
}

function createBulletPoint(text, boldPrefix = '') {
  const children = [];
  if (boldPrefix) {
    children.push(new TextRun({ text: boldPrefix + ': ', bold: true, color: COLOR_SECONDARY, font: 'Segoe UI', size: 21 }));
  }
  children.push(new TextRun({ text: text, color: COLOR_TEXT, font: 'Segoe UI', size: 21 }));

  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 60, line: 260 },
    children: children
  });
}

function createCallout(title, text) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: COLOR_CALLOUT_BG, type: ShadingType.CLEAR },
            borders: {
              top: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_PRIMARY }
            },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                spacing: { after: 50 },
                children: [
                  new TextRun({ text: '📌 ' + title, bold: true, color: COLOR_PRIMARY, size: 21, font: 'Segoe UI' })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: text, color: COLOR_TEXT, size: 20, font: 'Segoe UI', italics: true })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function createStyledTable(headers, rowsData, colWidths = []) {
  const tableRows = [];

  // Header Row
  const headerCells = headers.map((headerText, index) => {
    const cellConfig = {
      shading: { fill: COLOR_PRIMARY, type: ShadingType.CLEAR },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_PRIMARY },
        bottom: { style: BorderStyle.SINGLE, size: 12, color: '500000' },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'A02020' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'A02020' }
      },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: headerText, bold: true, color: 'FFFFFF', size: 20, font: 'Segoe UI' })
          ]
        })
      ]
    };
    if (colWidths[index]) {
      cellConfig.width = { size: colWidths[index], type: WidthType.PERCENTAGE };
    }
    return new TableCell(cellConfig);
  });

  tableRows.push(new TableRow({ children: headerCells, tableHeader: true }));

  // Data Rows
  rowsData.forEach((row, rowIndex) => {
    const isEven = rowIndex % 2 === 1;
    const cells = row.map((cellText, cellIndex) => {
      const isBold = cellIndex === 0 && (String(cellText).startsWith('FR-') || String(cellText).startsWith('TASK-') || String(cellText).startsWith('REQ-') || String(cellText).startsWith('RISK-'));
      const cellConfig = {
        shading: { fill: isEven ? COLOR_LIGHT_BG : 'FFFFFF', type: ShadingType.CLEAR },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
          left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
          right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER }
        },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        children: [
          new Paragraph({
            spacing: { line: 240 },
            children: [
              new TextRun({
                text: String(cellText),
                color: COLOR_TEXT,
                size: 19,
                font: 'Segoe UI',
                bold: isBold
              })
            ]
          })
        ]
      };
      if (colWidths[cellIndex]) {
        cellConfig.width = { size: colWidths[cellIndex], type: WidthType.PERCENTAGE };
      }
      return new TableCell(cellConfig);
    });
    tableRows.push(new TableRow({ children: cells }));
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  });
}

function buildDocument() {
  const content = [];

  // 1. Cover Page
  content.push(...createCoverPage());

  // 2. Revision History
  content.push(createHeading1('LỊCH SỬ THAY ĐỔI TÀI LIỆU (DOCUMENT REVISION HISTORY)'));
  content.push(createParagraph('Bảng dưới đây ghi nhận toàn bộ quá trình cập nhật, điều chỉnh và hoàn thiện tài liệu Đặc tả Yêu cầu Phần mềm (SRS) cho dự án CineStreams:'));
  
  const historyHeaders = ['Phiên bản', 'Ngày ban hành', 'Tác giả', 'Nội dung cập nhật / Ghi chú'];
  const historyData = [
    ['0.1', '24/10/2026', 'Hà Đình Lực', 'Khảo sát kiến trúc kỹ thuật ban đầu, thiết lập cấu trúc khung SRS theo chuẩn IEEE 830.'],
    ['0.4', '26/10/2026', 'Triệu Văn Sơn', 'Bổ sung đặc tả phân hệ OTP Email bất đồng bộ, cơ chế lưu trữ MongoDB TTL và Rate Limiting.'],
    ['0.7', '28/10/2026', 'Hà Đình Lực & Đỗ Phạm Thanh Tùng', 'Đặc tả chi tiết cơ chế Chunked Resumable Upload (5MB Blob.slice), FFmpeg Multi-bitrate Transcoding và Master Playlist HLS.'],
    ['0.9', '29/10/2026', 'Cả 3 thành viên', 'Hoàn thiện luồng Streaming VIP Quality Gate, Cổng thanh toán VietQR Napas 24/7, và Ma trận truy vết 65 Tasks.'],
    ['1.0', '12/11/2026', 'Hà Đình Lực (PM)', 'Nghiệm thu toàn diện toàn bộ đồ án, rà soát và phát hành bản đặc tả chính thức phục vụ bảo vệ đồ án tốt nghiệp.']
  ];
  content.push(createStyledTable(historyHeaders, historyData, [12, 18, 25, 45]));
  content.push(new Paragraph({ spacing: { after: 200 } }));

  // 3. Document Approval
  content.push(createHeading2('BẢNG KÝ DUYỆT TÀI LIỆU'));
  const signHeaders = ['Vai trò', 'Họ và tên', 'Chức danh / Nhiệm vụ', 'Trạng thái ký duyệt'];
  const signData = [
    ['Project Manager', 'Hà Đình Lực', 'Quản lý dự án & Kiến trúc sư Backend', 'ĐÃ PHÊ DUYỆT'],
    ['Backend Specialist', 'Triệu Văn Sơn', 'Lập trình viên Backend & Video Pipeline', 'ĐÃ PHÊ DUYỆT'],
    ['Frontend Specialist', 'Đỗ Phạm Thanh Tùng', 'Lập trình viên Frontend & Video Player UI', 'ĐÃ PHÊ DUYỆT'],
    ['Chủ tịch Hội đồng', 'Ban Giám Khảo VTI', 'Giảng viên hướng dẫn & Thẩm định kỹ thuật', 'CHỜ BẢO VỆ']
  ];
  content.push(createStyledTable(signHeaders, signData, [22, 25, 33, 20]));
  content.push(new Paragraph({ children: [new PageBreak()] }));

  // 4. Chapter 1: Introduction
  content.push(createHeading1('CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN (INTRODUCTION)'));
  
  content.push(createHeading2('1.1 Mục Đích Tài Liệu (Purpose)'));
  content.push(createParagraph(
    'Tài liệu Đặc tả Yêu cầu Phần mềm (Software Requirements Specification - SRS) này mô tả toàn diện, chi tiết và có hệ thống toàn bộ các yêu cầu chức năng (Functional Requirements), yêu cầu phi chức năng (Non-Functional Requirements), kiến trúc hệ thống, quy chuẩn giao diện và lược đồ cơ sở dữ liệu của Nền tảng xem phim trực tuyến tốc độ cao CineStreams (Mã dự án: PRJ-CINESTREAMS-2026).'
  ));
  content.push(createParagraph(
    'Tài liệu đóng vai trò là kim chỉ nam kỹ thuật cho đội ngũ phát triển (Developers), kiểm thử viên (QA/QC), quản lý dự án (Project Manager), đồng thời là căn cứ pháp lý để Hội đồng chuyên môn VTI Academy nghiệm thu kết quả dự án tốt nghiệp.'
  ));

  content.push(createHeading2('1.2 Phạm Vi Dự Án (Project Scope)'));
  content.push(createParagraph(
    'CineStreams là giải pháp nền tảng dịch vụ truyền thông đa phương tiện trực tuyến OTT (Over-The-Top) hoàn chỉnh, được triển khai theo mô hình Monorepo chuẩn mực gồm Backend (Spring Boot 3) và Frontend (React 18 Vite). Phạm vi dự án bao gồm:'
  ));
  content.push(createBulletPoint('Hệ thống xác thực bảo mật đa tầng: Đăng ký/đăng nhập bằng Email OTP bất đồng bộ, xác thực hai yếu tố (2FA), phân quyền động (Dynamic RBAC) dựa trên User - Role - Permission.', 'Phân hệ Bảo mật'));
  content.push(createBulletPoint('Cổng quản trị nội dung (CMS) hỗ trợ tải lên video dung lượng lớn qua cơ chế cắt lát phân đoạn (Chunked Upload 5MB/chunk), hỗ trợ tạm dừng (Pause), tiếp tục (Resume) và kiểm tra toàn vẹn mã hóa MD5.', 'Phân hệ Upload'));
  content.push(createBulletPoint('Hệ thống xử lý video ngầm bằng FFmpeg: Tự động trích xuất metadata (FFprobe), chụp thumbnail, chuyển đổi đa độ phân giải thích ứng (1080p, 720p, 480p, 360p) và khởi tạo Master Playlist HLS (.m3u8).', 'Phân hệ Transcode'));
  content.push(createBulletPoint('Máy chủ phát luồng video bảo mật: Cấp vé Stream Ticket / Signed URL chống tải lậu, hỗ trợ Byte-Range Request (HTTP 206 Partial Content), kiểm soát chất lượng VIP Gate động, đồng bộ mốc xem dở tự động sau 10s.', 'Phân hệ Streaming'));
  content.push(createBulletPoint('Cổng thanh toán tự động VietQR 24/7: Sinh mã QR chuyển khoản Napas động theo từng mã đơn hàng, tích hợp kích hoạt gói VIP tức thì không cần can thiệp thủ công.', 'Phân hệ Monetization'));
  content.push(createBulletPoint('Tính năng tương tác nâng cao: Phòng xem phim chung thời gian thực (Watch Party) và Trợ lý điện ảnh thông minh CineAI DeepSemantic.', 'Phân hệ Tiện ích'));

  content.push(createHeading2('1.3 Đối Tượng Độc Giả (Intended Audience)'));
  content.push(createBulletPoint('Nhóm Kỹ sư Phần mềm (Frontend & Backend): Sử dụng tài liệu để triển khai mã nguồn, đối chiếu API contract, tích hợp schema MongoDB và thư viện HLS.', 'Kỹ sư Phát triển'));
  content.push(createBulletPoint('Đội ngũ Kiểm thử (QA/QC): Căn cứ để xây dựng Test Plan, Test Cases, Postman Collection 9 suites và kịch bản kiểm thử End-to-End.', 'Đội ngũ Kiểm thử'));
  content.push(createBulletPoint('Quản lý Dự án (PM): Giám sát tiến độ 65 tasks, kiểm soát rủi ro kỹ thuật (Risk Register) và tiêu chí nghiệm thu.', 'Quản lý Dự án'));
  content.push(createBulletPoint('Hội đồng Nghiệm thu & Chuyên gia Đánh giá: Thẩm định chất lượng kiến trúc, mức độ hoàn thiện tính năng và tính sáng tạo kỹ thuật của sản phẩm.', 'Ban Đánh giá'));

  content.push(createHeading2('1.4 Bảng Thuật Ngữ & Từ Viết Tắt (Definitions & Acronyms)'));
  const termHeaders = ['Thuật ngữ / Ký hiệu', 'Định nghĩa & Ý nghĩa kỹ thuật trong CineStreams'];
  const termData = [
    ['OTT (Over-The-Top)', 'Dịch vụ phát trực tuyến nội dung âm thanh, hình ảnh trực tiếp qua Internet mà không qua nhà đài truyền hình cáp.'],
    ['HLS (HTTP Live Streaming)', 'Giao thức truyền thông phát trực tuyến thích ứng của Apple, chia video thành chuỗi file .ts nhỏ (4 giây) kèm file manifest .m3u8.'],
    ['ABR (Adaptive Bitrate)', 'Công nghệ thích ứng băng thông tự động điều chỉnh độ phân giải video (1080p/720p/480p) theo tốc độ mạng thực tế của người dùng.'],
    ['Master Playlist (.m3u8)', 'Tệp chỉ mục trung tâm chứa danh sách các luồng bitrate khác nhau (1080p, 720p, 480p) kèm thông số băng thông để video player lựa chọn.'],
    ['Chunked Upload', 'Kỹ thuật chia tệp tin video dung lượng lớn (1GB - 5GB) thành nhiều lát cắt nhỏ (5MB) phía Client (Blob.slice) và gửi tuần tự lên Server.'],
    ['Resumable Upload', 'Khả năng cho phép tiếp tục tải lên các phân đoạn còn thiếu khi đường truyền bị ngắt kết nối mà không phải tải lại từ đầu.'],
    ['JWT (JSON Web Token)', 'Chuỗi mã hóa thông tin xác thực phi trạng thái (Stateless) gồm Access Token (15 phút) và Refresh Token (7 ngày) lưu trong MongoDB.'],
    ['2FA (Two-Factor Auth)', 'Xác thực hai yếu tố: Đăng nhập mật khẩu thành công buộc phải nhập thêm mã xác nhận OTP 6 chữ số gửi qua Gmail.'],
    ['TTL Index (Time-To-Live)', 'Tính năng chỉ mục tự động xóa tài liệu trong MongoDB khi quá hạn (áp dụng cho collection email_otps hết hạn sau 5 phút).'],
    ['VIP Quality Gate', 'Cơ chế lọc manifest động trên Server: Chỉ tài khoản VIP mới được trả về luồng Full HD 1080p/4K; người dùng miễn phí bị chặn ở 720p.'],
    ['HTTP 206 Partial Content', 'Mã phản hồi HTTP cho phép tải một phần byte video cụ thể (Byte-Range Request), phục vụ tính năng tua phim (seek) tức thì.'],
    ['VietQR Napas 24/7', 'Chuẩn sinh mã QR thanh toán liên ngân hàng tự động kèm số tài khoản, mã đơn hàng và số tiền định sẵn để xử lý giao dịch 24/7.']
  ];
  content.push(createStyledTable(termHeaders, termData, [25, 75]));
  content.push(new Paragraph({ spacing: { after: 200 } }));

  content.push(createHeading2('1.5 Tài Liệu Tham Khảo (References)'));
  content.push(createBulletPoint('IEEE Std 830-1998 — IEEE Recommended Practice for Software Requirements Specifications.', 'Chuẩn IEEE'));
  content.push(createBulletPoint('RFC 8216 — HTTP Live Streaming Specification (Pantos & May, Apple Inc.).', 'Chuẩn HLS'));
  content.push(createBulletPoint('Spring Boot 3.3.5 & Spring Security 6 Reference Documentation (VMware Tanzu).', 'Spring Docs'));
  content.push(createBulletPoint('MongoDB 7.0 Manual — Time-To-Live (TTL) Collections and Sharded Cluster Design.', 'MongoDB Docs'));
  content.push(createBulletPoint('Bản kế hoạch quản trị 65 Tasks CineStreams 2026 (PROJECT_MANAGEMENT_CINESTREAMS_2026.csv).', 'Kế hoạch Nội bộ'));

  content.push(new Paragraph({ children: [new PageBreak()] }));

  // 5. Chapter 2: Overall Description
  content.push(createHeading1('CHƯƠNG 2: MÔ TẢ TỔNG QUAN HỆ THỐNG (OVERALL DESCRIPTION)'));

  content.push(createHeading2('2.1 Bối Cảnh Hệ Thống & Mô Hình Hoạt Động (Product Perspective)'));
  content.push(createParagraph(
    'CineStreams được thiết kế nhằm giải quyết bài toán truyền phát video chất lượng cao với chi phí hạ tầng tối ưu. Thay vì truyền phát trực tiếp toàn bộ tệp MP4 nguyên khối gây nghẽn băng thông và dễ bị đánh cắp bản quyền, hệ thống xây dựng một đường ống (pipeline) tự động hóa từ khâu tải lên, chia nhỏ, nén đa luồng đến phát thích ứng theo tiêu chuẩn công nghiệp OTT hiện đại.'
  ));

  content.push(createHeading2('2.2 Kiến Trúc Hệ Thống Đa Tầng (Multi-Tier Architecture)'));
  content.push(createParagraph('Hệ thống được tổ chức theo kiến trúc 6 tầng chặt chẽ:'));

  const archHeaders = ['Tầng kiến trúc (Tier)', 'Công nghệ chủ đạo', 'Vai trò & Nhiệm vụ chính trong CineStreams'];
  const archData = [
    ['1. Client Presentation Tier', 'React 18, Vite 6, TypeScript 5, Tailwind CSS, Zustand, Hls.js', 'Giao diện người dùng Dark/Red theme, tương tác video player, kéo-thả tải lên phân đoạn, bàn phím điều khiển và kết nối API.'],
    ['2. Gateway / Reverse Proxy Tier', 'Node.js Express Gateway, Vite HMR Proxy (Port 3000)', 'Điều hướng luồng HTTP, Reverse Proxy các request /api sang Spring Boot, cơ chế Fallback an toàn khi backend khởi động lại.'],
    ['3. Application Service Tier', 'Java 17, Spring Boot 3.3.5, Spring Security 6, ThreadPool (Port 8080/8088)', 'Xử lý logic nghiệp vụ, xác thực JWT, điều phối gửi mail @Async, quản lý phiên upload, phân quyền RBAC và kiểm soát VIP Gate.'],
    ['4. Media Processing Engine', 'ProcessBuilder, FFmpeg 9.0.1, FFprobe, FileChannel Assembler', 'Tiếp nhận phân đoạn, ghép tệp bằng FileChannel, trích xuất metadata, nén đa luồng HLS 1080p/720p/480p và tạo master.m3u8.'],
    ['5. Data Persistence Tier', 'MongoDB 7.0 Cluster (Local/Docker), TTL Collections, Storage Vault / MinIO', 'Lưu trữ tài liệu phim, tập phim, phiên upload, người dùng, quyền hạn, lịch sử xem, và hệ thống tệp video/HLS tĩnh.'],
    ['6. External Integration Tier', 'Google Gmail SMTP Server, VietQR Napas Gateway, Gemini CineAI', 'Gửi email chứa mã OTP xác thực người dùng, sinh mã thanh toán QR 24/7 và trợ lý phân tích ngữ nghĩa điện ảnh.']
  ];
  content.push(createStyledTable(archHeaders, archData, [22, 28, 50]));
  content.push(new Paragraph({ spacing: { after: 200 } }));

  content.push(createHeading2('2.3 Phân Loại Người Dùng & Tác Nhân Hệ Thống (User Classes & Actors)'));
  content.push(createParagraph('Hệ thống phân định rõ rệt 5 nhóm người dùng chính và 2 tác nhân ngoại vi:'));

  content.push(createBulletPoint('Người dùng chưa đăng nhập. Chỉ được xem trang chủ, trailer, bảng xếp hạng, tìm kiếm phim và trải nghiệm video giới hạn chất lượng 720p với watermark.', 'Khách Vãng Lai (Guest)'));
  content.push(createBulletPoint('Đã đăng ký tài khoản và kích hoạt thành công qua mã Email OTP. Được lưu lịch sử xem phim, tạo danh sách yêu thích, đánh giá phim, xem luồng chất lượng chuẩn (lên đến 720p).', 'Thành Viên Thường (Standard User)'));
  content.push(createBulletPoint('Người dùng nâng cấp gói hội viên qua cổng VietQR. Được quyền xem toàn bộ luồng độ phân giải cao nhất (1080p Full HD & 4K), âm thanh Dolby Atmos, mở phòng Watch Party và không bị quảng cáo.', 'Hội Viên VIP (VIP Cinema Member)'));
  content.push(createBulletPoint('Cán bộ kiểm duyệt nội dung. Có quyền xem danh sách phim nháp, kiểm tra chất lượng video sau khi chuyển mã, quản lý thể loại và danh mục phim.', 'Quản Duyệt Phim (Content Moderator)'));
  content.push(createBulletPoint('Có quyền hạn tối cao: Khởi tạo phim mới, tải lên video tập phim qua Chunked Upload, giám sát tiến trình FFmpeg, phê duyệt xuất bản phim ra trang chủ, quản lý người dùng và gán quyền động.', 'Quản Trị Viên (CMS / System Admin)'));
  content.push(createBulletPoint('Tác nhân ngoại vi: Máy chủ Gmail SMTP (gửi mã xác thực) và Cổng thanh toán VietQR (xử lý chuyển khoản ngân hàng 24/7).', 'Hệ Thống Ngoại Vi (External Systems)'));

  content.push(createHeading2('2.4 Môi Trường Vận Hành (Operating Environment)'));
  content.push(createBulletPoint('Hệ điều hành máy chủ: Ubuntu Server 22.04 LTS / Windows Server 2022 / Container Docker Compose.', 'Hạ Tầng Server'));
  content.push(createBulletPoint('Môi trường thực thi máy chủ: OpenJDK 17 LTS, Node.js v20 LTS, FFmpeg 6.0+, MongoDB 7.0 Community.', 'Phần Mềm Nền Tảng'));
  content.push(createBulletPoint('Hạ tầng lưu trữ: Ổ cứng SSD/NVMe tốc độ cao phục vụ phân đoạn video I/O và chuyển mã FFmpeg; tương thích MinIO Object Storage S3.', 'Hạ Tầng Lưu Trữ'));
  content.push(createBulletPoint('Thiết bị người dùng cuối: Máy tính để bàn, laptop, máy tính bảng và điện thoại di động chạy Google Chrome 90+, Safari 14+, MS Edge, Mozilla Firefox.', 'Trình Duyệt Khách Hàng'));

  content.push(createHeading2('2.5 Ràng Buộc Thiết Kế & Cài Đặt (Design Constraints)'));
  content.push(createBulletPoint('Backend bắt buộc triển khai bằng Java 17 và Spring Boot 3.3.5 theo chuẩn RESTful API không lưu trạng thái (Stateless Architecture).', 'Ràng buộc Backend'));
  content.push(createBulletPoint('Frontend phát triển bằng React 18, Vite 6 và TypeScript 5 nhằm đảm bảo Type-safe tuyệt đối và hiệu năng render nhanh.', 'Ràng buộc Frontend'));
  content.push(createBulletPoint('Cơ chế tải video lên bắt buộc chia nhỏ thành từng phân đoạn (Chunking 5MB) để vượt qua giới hạn Request Body của Proxy và chống đứt cáp mạng.', 'Ràng buộc Upload'));
  content.push(createBulletPoint('Mã OTP xác thực bắt buộc tự động hết hiệu lực sau đúng 5 phút và tự hủy khỏi cơ sở dữ liệu qua MongoDB TTL Index.', 'Ràng buộc Bảo mật'));

  content.push(new Paragraph({ children: [new PageBreak()] }));

  // 6. Chapter 3: Functional Requirements
  content.push(createHeading1('CHƯƠNG 3: CÁC YÊU CẦU CHỨC NĂNG CHI TIẾT (FUNCTIONAL REQUIREMENTS)'));
  content.push(createParagraph(
    'Hệ thống CineStreams bao gồm 6 phân hệ chức năng nòng cốt được chuẩn hóa theo mã yêu cầu FR (Functional Requirement) tương ứng với 65 đầu việc kỹ thuật đã nghiệm thu:'
  ));

  // Module 1: Auth
  content.push(createHeading2('3.1 Phân Hệ 1: Xác Thực & Quản Lý Người Dùng Đa Tầng (Auth & RBAC)'));
  
  const authFRHeaders = ['Mã Yêu Cầu', 'Tên Chức Năng', 'Tác Nhân', 'Mô Tả Nghiệp Vụ & Quy Tắc Kiểm Soát'];
  const authFRData = [
    ['FR-AUTH-01', 'Đăng ký nhận OTP Email', 'Guest', 'Người dùng nhập Username, Email, Mật khẩu. Hệ thống kiểm tra trùng lặp, băm mật khẩu BCrypt, sinh mã OTP 6 số ngẫu nhiên, lưu vào email_otps và kích hoạt @Async JavaMailSender gửi email trong vòng < 50ms.'],
    ['FR-AUTH-02', 'Xác thực OTP Đăng ký', 'Guest', 'Người dùng nhập mã OTP 6 chữ số vào giao diện rời rạc. Server kiểm tra: mã chính xác, chưa sử dụng (isUsed=false), còn hạn trong 5 phút. Nếu đúng, kích hoạt tài khoản verified=true và cấp quyền ROLE_USER.'],
    ['FR-AUTH-03', 'Đăng nhập mật khẩu & 2FA', 'User / Admin', 'Hỗ trợ đăng nhập thông thường hoặc đăng nhập bảo mật 2 bước (2FA). Khi bật 2FA, nhập mật khẩu đúng hệ thống sẽ tự động gửi mã OTP xác nhận về email mới cấp phát Token.'],
    ['FR-AUTH-04', 'Cấp & Làm mới JWT Token', 'User', 'Hệ thống cấp phát Access Token (thời hạn 15 phút) chứa Claims và Roles, cùng Refresh Token (thời hạn 7 ngày) lưu trong MongoDB. Cung cấp API /api/auth/refresh-token để làm mới phiên làm việc.'],
    ['FR-AUTH-05', 'Quên mật khẩu qua Email OTP', 'User', 'Nhập email đã đăng ký -> Nhận mã OTP 6 số -> Xác thực OTP thành công cấp resetToken tạm -> Đặt mật khẩu mới có xác thực độ phức tạp (chữ hoa, số, ký tự đặc biệt).'],
    ['FR-AUTH-06', 'Rate Limiting & Chống Spam OTP', 'System', 'Khóa nút gửi lại mã OTP tối thiểu 60 giây (Cooldown Timer). Nếu gửi yêu cầu quá 5 lần trong 1 giờ, tạm khóa địa chỉ email. Nếu nhập sai mã OTP quá 5 lần, tự động hủy bỏ mã ngay lập tức.'],
    ['FR-AUTH-07', 'Quản lý Phân quyền Động RBAC', 'Admin', 'Admin có toàn quyền quản lý Role và Permission trong database. Hỗ trợ gán quyền động cho người dùng mà không cần sửa lại mã nguồn hoặc khởi động lại máy chủ.'],
    ['FR-AUTH-08', 'Tự động dọn dẹp mã OTP hết hạn', 'System Scheduler', 'MongoDB TTL Index trên trường expireAt tự động xóa bản ghi sau 300 giây. Kết hợp Background Task @Scheduled chạy mỗi 15 phút dọn dẹp các bản ghi rác.']
  ];
  content.push(createStyledTable(authFRHeaders, authFRData, [15, 23, 12, 50]));
  content.push(new Paragraph({ spacing: { after: 200 } }));

  // Module 2: Chunked Upload
  content.push(createHeading2('3.2 Phân Hệ 2: Tải Lên Video Phân Đoạn Dung Lượng Lớn (Chunked Upload CMS)'));
  
  const uploadFRHeaders = ['Mã Yêu Cầu', 'Tên Chức Năng', 'Tác Nhân', 'Mô Tả Nghiệp Vụ & Cơ Chế Xử Lý'];
  const uploadFRData = [
    ['FR-UPLD-01', 'Khởi tạo phiên tải lên (Init Session)', 'CMS Admin', 'Gửi yêu cầu POST /api/admin/videos/upload/init kèm fileName, fileSize, totalChunks. Server tạo bản ghi UploadSession trong MongoDB và thư mục tạm uploads/temp/{uploadId}.'],
    ['FR-UPLD-02', 'Tải lên từng phân đoạn (Chunk 5MB)', 'CMS Admin', 'Client dùng Blob.slice cắt video thành các khối 5MB và gửi lên POST /api/admin/videos/upload/chunk. Server ghi tệp chunk_x vào đĩa và cập nhật danh sách uploadedChunks trong MongoDB.'],
    ['FR-UPLD-03', 'Kiểm tra trạng thái & Tiếp tục (Resume)', 'CMS Admin', 'Khi bị rớt mạng hoặc bấm Tạm dừng (Pause), Client gọi GET /api/admin/videos/upload/status/{uploadId}. Server trả về danh sách chunk đã nhận để Client tiếp tục upload các chunk còn thiếu.'],
    ['FR-UPLD-04', 'Ghép nối phân đoạn (Assemble Chunks)', 'CMS Admin / Backend', 'Sau khi tải đủ 100% chunks, Client gọi /api/admin/videos/upload/complete. Server kích hoạt FileChannel / BufferedOutputStream ghép tuần tự các chunk thành tệp video MP4 hoàn chỉnh.'],
    ['FR-UPLD-05', 'Kiểm tra tính toàn vẹn (Checksum)', 'Backend', 'So sánh kích thước tệp sau ghép và tính toán mã băm MD5/SHA256 đối chiếu với thông số ban đầu. Sau khi ghép thành công, toàn bộ thư mục tạm uploads/temp/{uploadId} được xóa sạch.'],
    ['FR-UPLD-06', 'Dọn dẹp phân đoạn mồ côi (Orphan Cleaner)', 'System Scheduler', 'Scheduled Job @Scheduled(fixedRate = 3600000) tự động quét và xóa các thư mục tạm có thời gian tạo vượt quá 24 giờ mà không hoàn tất để giải phóng dung lượng ổ đĩa.']
  ];
  content.push(createStyledTable(uploadFRHeaders, uploadFRData, [15, 23, 14, 48]));
  content.push(new Paragraph({ spacing: { after: 200 } }));

  // Module 3: Video Processing & FFmpeg
  content.push(createHeading2('3.3 Phân Hệ 3: Xử Lý Video & Chuyển Mã HLS Thích Ứng (FFmpeg Pipeline)'));
  
  const transFRHeaders = ['Mã Yêu Cầu', 'Tên Chức Năng', 'Tác Nhân', 'Mô Tả Nghiệp Vụ & Thông Số Kỹ Thuật'];
  const transFRData = [
    ['FR-TRNS-01', 'Trích xuất Metadata bằng FFprobe', 'Backend', 'Thực thi ProcessBuilder gọi ffprobe đọc: Độ phân giải gốc, Video Codec (H.264/HEVC), Audio Codec (AAC/AC3), Bitrate, Khung hình (FPS) và Thời lượng chính xác (Duration).'],
    ['FR-TRNS-02', 'Tự động chụp Thumbnail', 'Backend', 'Thực thi lệnh FFmpeg trích xuất 3 ảnh tĩnh đại diện tại các mốc thời gian 10%, 30% và 50% thời lượng phim, lưu vào thư mục phục vụ chọn ảnh bìa (Poster / Backdrop).'],
    ['FR-TRNS-03', 'Chuyển mã đa độ phân giải HLS ABR', 'Backend Engine', 'Nén video thành các luồng chuẩn: 1080p (5Mbps), 720p (2.5Mbps), 480p (1Mbps), 360p (500Kbps). Mỗi luồng chia thành các phân đoạn .ts thời lượng cố định 4 giây.'],
    ['FR-TRNS-04', 'Khởi tạo Master Playlist (master.m3u8)', 'Backend Engine', 'Tạo file chỉ mục tổng hợp master.m3u8 liên kết toàn bộ các playlist độ phân giải con kèm thông số BANDWIDTH và RESOLUTION theo đúng đặc tả Apple RFC 8216.'],
    ['FR-TRNS-05', 'Hàng đợi ngầm & Báo tiến độ Realtime', 'Backend / Admin', 'Sử dụng ThreadPoolTaskExecutor xử lý từng video ngầm. Bắt luồng stderr của FFmpeg để tính toán phần trăm tiến độ (0-100%) hiển thị trực quan lên Dashboard Admin.'],
    ['FR-TRNS-06', 'Quản lý phụ đề & Dọn dẹp video nguồn', 'CMS Admin / Backend', 'Hỗ trợ upload tệp phụ đề WebVTT/SRT đa ngôn ngữ (Vietsub, Engsub). Tự động dọn dẹp file MP4 gốc cồng kềnh sau khi hoàn tất nén HLS nếu cấu hình bật.']
  ];
  content.push(createStyledTable(transFRHeaders, transFRData, [15, 23, 14, 48]));
  content.push(new Paragraph({ spacing: { after: 200 } }));

  // Module 4: Streaming & VIP Gate
  content.push(createHeading2('3.4 Phân Hệ 4: Truyền Phát Video Trực Tuyến & Kiểm Soát VIP Gate'));
  
  const strmFRHeaders = ['Mã Yêu Cầu', 'Tên Chức Năng', 'Tác Nhân', 'Mô Tả Nghiệp Vụ & Cơ Chế Bảo Vệ'];
  const strmFRData = [
    ['FR-STRM-01', 'Cấp vé Stream bảo mật (Stream Ticket)', 'User / VIP', 'Gọi GET /api/stream/ticket kèm JWT Token. Server thẩm định quyền hạn và sinh vé stream ngẫu nhiên (UUID + Timestamp) có thời hạn 2 giờ nhằm chống đánh cắp liên kết (Hotlinking).'],
    ['FR-STRM-02', 'Truyền phát Byte-Range (HTTP 206)', 'User', 'Hỗ trợ tua phim tức thì qua giao thức HTTP 206 Partial Content. Trình phát gửi Header `Range: bytes=start-end`, Server trả về ResourceRegion tương ứng đúng phân đoạn byte.'],
    ['FR-STRM-03', 'Kiểm soát chất lượng VIP Quality Gate', 'System Gateway', 'API /api/stream/hls/{movieId}/master.m3u8 kiểm tra quyền VIP của người dùng: Nếu là tài khoản thường, server tự động lọc bỏ các luồng 1080p và 4K, giới hạn tối đa ở 720p.'],
    ['FR-STRM-04', 'Trình phát Hls.js thích ứng đa nền tảng', 'User / VIP', 'Tích hợp thư viện Hls.js trên React Player, tự động đo đạc băng thông mạng thực tế để nhảy chất lượng mượt mà không bị khựng (Buffering), hỗ trợ Safari Native HLS.'],
    ['FR-STRM-05', 'Đồng bộ mốc xem dở (Resume Playback)', 'User', 'Cứ mỗi 10 giây phát video, Client tự động gửi mốc thời gian hiện tại về API /api/user/history. Khi quay lại xem phim, hệ thống hiển thị thông báo và tự động tua đến đúng giây đã dừng.'],
    ['FR-STRM-06', 'Hệ thống phím tắt & Chế độ xem rạp', 'User', 'Hỗ trợ phím tắt tiêu chuẩn: Phím Space (Play/Pause), Mũi tên trái/phải (Tua 10s), Mũi tên lên/xuống (Âm lượng), Phím F (Toàn màn hình), Phím C (Bật/tắt phụ đề), Phím T (Rạp chiếu phim).']
  ];
  content.push(createStyledTable(strmFRHeaders, strmFRData, [15, 23, 14, 48]));
  content.push(new Paragraph({ spacing: { after: 200 } }));

  // Module 5: Discovery, VIP & WatchParty
  content.push(createHeading2('3.5 Phân Hệ 5: Khám Phá Phim, Xếp Hạng & Cổng Gói Cước VietQR'));
  
  const discFRHeaders = ['Mã Yêu Cầu', 'Tên Chức Năng', 'Tác Nhân', 'Mô Tả Nghiệp Vụ & Trải Nghiệm Người Dùng'];
  const discFRData = [
    ['FR-DISC-01', 'Trang chủ điện ảnh & Bento Grid', 'All Users', 'Hiển thị Hero Banner phim bom tấn, các hàng phim thịnh hành, phim chiếu rạp mới nhất, danh mục phân loại theo thể loại, bố cục Bento Grid hiện đại và bắt mắt.'],
    ['FR-DISC-02', 'Bộ lọc nâng cao & Tìm kiếm đa tiêu chí', 'All Users', 'Tìm kiếm phim theo từ khóa tiêu đề, diễn viên, đạo diễn. Lọc phim theo Thể loại (Hành động, Viễn tưởng,...), Quốc gia, Năm phát hành, Loại phim (Phim lẻ, Phim bộ, Anime).'],
    ['FR-DISC-03', 'Bảng xếp hạng Top 10 thịnh hành', 'All Users', 'Thống kê Top 10 phim được xem nhiều nhất tuần/tháng theo số lượt xem thực tế (views count) được cập nhật liên tục từ cơ sở dữ liệu MongoDB.'],
    ['FR-DISC-04', 'Cổng thanh toán tự động VietQR 24/7', 'User', 'Hiển thị các gói VIP (Tháng / Năm). Khi bấm nâng cấp, hệ thống tự động sinh mã VietQR Napas chuẩn kèm số tài khoản MB Bank, nội dung chuyển khoản duy nhất và kích hoạt VIP tức thì.'],
    ['FR-DISC-05', 'Phòng xem phim chung Watch Party', 'VIP Member', 'Tạo phòng xem phim đồng thời nhiều người, đồng bộ trạng thái phát/tua video và khung trò chuyện trực tiếp (Live Chat) giữa các thành viên trong phòng.'],
    ['FR-DISC-06', 'Trợ lý điện ảnh CineAI DeepSemantic', 'All Users', 'Tích hợp mô hình AI phân tích sở thích người dùng, gợi ý phim theo tâm trạng, cốt truyện hoặc cảm xúc cá nhân hóa theo ngữ nghĩa sâu.']
  ];
  content.push(createStyledTable(discFRHeaders, discFRData, [15, 23, 14, 48]));
  content.push(new Paragraph({ spacing: { after: 200 } }));

  // Module 6: CMS Admin
  content.push(createHeading2('3.6 Phân Hệ 6: Quản Trị Nội Dung (CMS) & Xuất Bản Phim'));
  
  const cmsFRHeaders = ['Mã Yêu Cầu', 'Tên Chức Năng', 'Tác Nhân', 'Mô Tả Nghiệp Vụ & Quy Trình'];
  const cmsFRData = [
    ['FR-CMS-01', 'Quản lý siêu dữ liệu phim (CRUD Movie)', 'CMS Admin', 'Thêm mới, chỉnh sửa, xóa phim: Tiêu đề, Tên gốc, Slug URL duy nhất, Tóm tắt nội dung, Năm phát hành, Đạo diễn, Diễn viên, Điểm IMDb, Nhãn lứa tuổi (18+, 16+, 13+, K).'],
    ['FR-CMS-02', 'Quản lý Mùa và Tập phim (Episodes)', 'CMS Admin', 'Đối với phim bộ: Khởi tạo các mùa (Season 1, 2) và tạo danh sách tập phim (Tập 1, 2,...). Mỗi tập có tiêu đề riêng, thời lượng và ảnh đại diện thumbnail.'],
    ['FR-CMS-03', 'Gắn kết Video vào tập phim (Attach Video)', 'CMS Admin', 'Liên kết kết quả chuyển mã HLS (hlsMasterUrl) từ VideoProcess vào bản ghi EpisodeEntity tương ứng trong cơ sở dữ liệu MongoDB.'],
    ['FR-CMS-04', 'Phê duyệt & Xuất bản phim (Publish Gate)', 'CMS Admin', 'Kiểm tra điều kiện xuất bản: Phim phải có ít nhất 1 tập đã hoàn tất chuyển mã HLS thành công. Chỉ khi Admin bấm "Xuất bản", trạng thái mới chuyển sang PUBLISHED ra trang chủ.']
  ];
  content.push(createStyledTable(cmsFRHeaders, cmsFRData, [15, 23, 14, 48]));

  content.push(new Paragraph({ children: [new PageBreak()] }));

  // 7. Chapter 4: External Interfaces
  content.push(createHeading1('CHƯƠNG 4: YÊU CẦU GIAO DIỆN HỆ THỐNG (SYSTEM INTERFACES)'));

  content.push(createHeading2('4.1 Giao Diện Người Dùng (User Interfaces)'));
  content.push(createParagraph(
    'Giao diện người dùng CineStreams được thiết kế theo phong cách Dark Mode chuyên nghiệp chuẩn rạp chiếu phim (Cinema Aesthetics) với tông màu chủ đạo Đỏ Bordeaux (#8B0000 / #E50914) và Nền Đen sâu (#0F1014), tạo cảm giác tập trung và thoải mái cho thị giác.'
  ));

  const uiHeaders = ['Màn hình / Trang (View)', 'Đường dẫn (URL Route)', 'Mô tả thành phần giao diện & Tương tác'];
  const uiData = [
    ['Trang Chủ (Home)', '/', 'Hero Banner phim nổi bật, thanh điều hướng Navbar mờ (Glassmorphism), hàng danh mục phim kéo ngang mượt mà, chân trang thông tin.'],
    ['Danh Mục & Bộ Lọc', '/phim-le, /phim-bo, /hoat-hinh', 'Thanh bộ lọc đa chiều (Thể loại, Năm, Quốc gia, Độ nét), lưới hiển thị phim (Movie Grid) responsive 2 đến 6 cột.'],
    ['Bảng Xếp Hạng Top 10', '/bang-xep-hang', 'Danh sách Top 10 phim thịnh hành với số thứ tự phóng to cách điệu, hiển thị lượt xem và điểm đánh giá IMDb.'],
    ['Chi Tiết Phim', '/phim/:id', 'Backdrop kích thước đầy đủ, thông tin chi tiết, trailer nổi bật, danh sách tập phim theo mùa, danh sách diễn viên và phim tương tự.'],
    ['Trình Phát Video (Player)', '/xem-phim/:id', 'Khung phát video 100% màn hình, thanh điều khiển thông minh tự ẩn, menu chọn chất lượng HLS, chọn phụ đề, phím tắt nhanh.'],
    ['Gói Cước & VietQR', '/vip-goi-cuoc', 'Bảng so sánh gói dịch vụ Thường vs VIP, nút chọn chu kỳ thanh toán Tháng/Năm, Modal hiển thị mã VietQR 24/7 tự động kích hoạt.'],
    ['Phòng Xem Chung', '/watch-party', 'Khung video đồng bộ thời gian thực, danh sách thành viên trong phòng, khung chat trực tiếp kèm biểu cảm emoji.'],
    ['Trợ Lý Điện Ảnh AI', '/tro-ly-phim-ai', 'Khung hội thoại tương tác với CineAI, gợi ý câu hỏi mẫu, phân tích ngữ nghĩa và đưa ra thẻ phim đề xuất xem ngay.'],
    ['Đăng Nhập & Đăng Ký', '/dang-nhap, /dang-ky', 'Biểu mẫu nhập thông tin, Modal nhập mã xác thực OTP 6 ô rời rạc tự động nhảy focus, đồng hồ đếm ngược 60s.'],
    ['Cổng Quản Trị (CMS)', '/quan-tri-phim', 'Bảng quản lý phim, bộ lọc trạng thái, form thêm/sửa phim, vùng kéo thả tệp tải lên video phân đoạn kèm thanh tiến độ realtime.']
  ];
  content.push(createStyledTable(uiHeaders, uiData, [20, 25, 55]));
  content.push(new Paragraph({ spacing: { after: 200 } }));

  content.push(createHeading2('4.2 Giao Diện Phần Mềm (Software Interfaces)'));
  content.push(createBulletPoint('Kết nối qua MongoDB Java Driver & Spring Data MongoDB bằng chuỗi kết nối an toàn URI, hỗ trợ Connection Pooling và TTL Index tự động.', 'MongoDB Interface'));
  content.push(createBulletPoint('Giao tiếp trực tiếp với bộ nhị phân FFmpeg / FFprobe thông qua lớp ProcessBuilder của Java, quản lý luồng xuất dữ liệu stdout và stderr.', 'FFmpeg Interface'));
  content.push(createBulletPoint('Tích hợp máy chủ Google Gmail SMTP (Port 587 STARTTLS) thông qua thư viện Spring Boot Starter Mail kết hợp @Async ThreadPool.', 'Mail SMTP Interface'));
  content.push(createBulletPoint('Tích hợp chuẩn mã QR thanh toán ngân hàng Napas VietQR theo quy chuẩn của Ngân hàng Quân Đội (MB Bank).', 'VietQR Interface'));

  content.push(createHeading2('4.3 Giao Diện Truyền Thông (Communications Interfaces)'));
  content.push(createBulletPoint('Toàn bộ giao tiếp giữa Client và Server sử dụng giao thức HTTPS / HTTP/1.1 và HTTP/2 nhằm đảm bảo an toàn dữ liệu truyền tải.', 'Giao thức Mạng'));
  content.push(createBulletPoint('Cung cấp tài nguyên video tĩnh dưới dạng các phân đoạn HLS (.ts) và playlist (.m3u8) với MIME Type application/vnd.apple.mpegurl và video/mp2t.', 'Định dạng Streaming'));
  content.push(createBulletPoint('Cấu hình CORS (Cross-Origin Resource Sharing) chặt chẽ, hỗ trợ Cache-Control max-age=86400 cho các phân đoạn video tĩnh để giảm tải đĩa cứng.', 'Chính sách CORS & Cache'));

  content.push(new Paragraph({ children: [new PageBreak()] }));

  // 8. Chapter 5: Non-Functional Requirements
  content.push(createHeading1('CHƯƠNG 5: YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)'));

  content.push(createHeading2('5.1 Yêu Cầu Về Hiệu Năng (Performance Requirements)'));
  const perfHeaders = ['Chỉ tiêu đo lường', 'Mục tiêu thiết kế (KPI)', 'Giải pháp công nghệ áp dụng trong CineStreams'];
  const perfData = [
    ['Thời gian phản hồi API Auth/Data', '< 150 mili-giây', 'Spring Boot 3 không lưu trạng thái, tối ưu MongoDB Index trên các trường tìm kiếm chính (slug, email, username).'],
    ['Thời gian gửi phản hồi mã OTP', '< 50 mili-giây', 'Tách riêng luồng gửi email ra mailTaskExecutor bất đồng bộ (@Async ThreadPool: 5-20 threads, queue 100).'],
    ['Thời gian khởi chạy video (Time to First Frame)', '< 1.5 giây', 'Phân đoạn HLS 4 giây tải trước (Pre-buffering) phân đoạn đầu tiên tại độ phân giải tối ưu theo băng thông.'],
    ['Tốc độ tải lên phân đoạn (Chunk Upload)', 'Tối đa băng thông mạng Client', 'Client chia nhỏ 5MB gửi qua luồng HTTP POST tuần tự hoặc song song 3 chunks; server ghi trực tiếp FileChannel.'],
    ['Thời gian chuyển mã FFmpeg', 'Gần bằng thời lượng thực', 'Tối ưu lệnh nén với preset fast/veryfast, nén song song đa luồng âm thanh AAC và hình ảnh H.264 qua ProcessBuilder.'],
    ['Khả năng phục vụ đồng thời (Concurrency)', '1,000+ người xem đồng thời', 'Các phân đoạn HLS tĩnh được phục vụ qua Spring ResourceHandler có Cache-Control, không giữ kết nối DB.']
  ];
  content.push(createStyledTable(perfHeaders, perfData, [25, 25, 50]));
  content.push(new Paragraph({ spacing: { after: 200 } }));

  content.push(createHeading2('5.2 Yêu Cầu Về Độ Tin Cậy & Tính Sẵn Sàng (Reliability & Availability)'));
  content.push(createBulletPoint('Đảm bảo hệ thống hoạt động liên tục 24/7 với độ sẵn sàng đạt 99.9% (cho phép bảo trì định kỳ ngoài giờ cao điểm).', 'Tính Sẵn Sàng'));
  content.push(createBulletPoint('Khi xảy ra ngắt quãng kết nối Internet trong quá trình tải lên video 2GB - 5GB, hệ thống đảm bảo 100% không làm mất dữ liệu các phân đoạn đã tải.', 'Độ Tin Cậy Tải Lên'));
  content.push(createBulletPoint('Dữ liệu phim, người dùng và quyền hạn trong MongoDB được sao lưu định kỳ tự động (Backup Strategy).', 'An Toàn Dữ Liệu'));

  content.push(createHeading2('5.3 Yêu Cầu Về An Ninh & Bảo Mật (Security Requirements)'));
  content.push(createBulletPoint('Mật khẩu người dùng được băm một chiều an toàn bằng thuật toán BCrypt với độ muối (Salt Factor) tiêu chuẩn 10 rounds.', 'Mã Hóa Mật Khẩu'));
  content.push(createBulletPoint('Access Token ký bằng thuật toán HMAC-SHA256 với khóa bí mật 256-bit có thời hạn 15 phút; Refresh Token được lưu trong DB và vô hiệu hóa ngay khi Logout.', 'Bảo Mật JWT'));
  content.push(createBulletPoint('Mã OTP xác thực gồm 6 chữ số sinh ngẫu nhiên bảo mật (SecureRandom), chỉ có hiệu lực 5 phút và tự hủy khi nhập sai quá 5 lần.', 'Bảo Mật OTP'));
  content.push(createBulletPoint('Liên kết phát video được bảo vệ bằng Stream Ticket / Signed URL kiểm tra quyền hạn, chặn tuyệt đối việc nhúng phát lậu trên website khác.', 'Bảo Vệ Luồng Video'));
  content.push(createBulletPoint('Kiểm soát chất lượng theo gói cước (VIP Quality Gate) tại tầng máy chủ, đảm bảo không thể bẻ khóa phía Client để xem luồng 1080p trái phép.', 'Kiểm Soát Bản Quyền'));

  content.push(createHeading2('5.4 Khả Năng Bảo Trì & Mở Rộng (Maintainability & Scalability)'));
  content.push(createBulletPoint('Cấu trúc mã nguồn Monorepo phân tách rõ ràng giữa Frontend (/client) và Backend (/server), quản lý phụ thuộc đồng nhất.', 'Kiến Trúc Module Hóa'));
  content.push(createBulletPoint('Backend Stateless cho phép dễ dàng nhân rộng theo chiều ngang (Horizontal Scaling) bằng cách đặt sau Nginx Load Balancer hoặc Kubernetes Pods.', 'Khả Năng Mở Rộng'));
  content.push(createBulletPoint('Hỗ trợ chuyển đổi linh hoạt hạ tầng lưu trữ video từ ổ đĩa cục bộ (Local Storage) sang MinIO S3 Object Storage qua tham số cấu hình.', 'Khả Năng Thích Ứng'));

  content.push(new Paragraph({ children: [new PageBreak()] }));

  // 9. Chapter 6: Database Specifications
  content.push(createHeading1('CHƯƠNG 6: THIẾT KẾ CƠ SỞ DỮ LIỆU & LƯỢC ĐỒ THỰC THỂ (DATABASE SPECIFICATIONS)'));
  content.push(createParagraph(
    'Cơ sở dữ liệu CineStreams được thiết kế trên hệ quản trị MongoDB 7.0 (NoSQL) với 11 collections có cấu trúc tối ưu cho đọc nhanh và mở rộng linh hoạt:'
  ));

  // DB 1: users
  content.push(createHeading2('6.1 Collection: `users` (Quản Lý Tài Khoản Người Dùng)'));
  const userFieldsHeaders = ['Tên Trường', 'Kiểu Dữ Liệu', 'Ràng Buộc', 'Mô Tả Ý Nghĩa'];
  const userFieldsData = [
    ['_id', 'ObjectId / String', 'Primary Key', 'Định danh duy nhất của người dùng trong hệ thống.'],
    ['username', 'String', 'Indexed, Unique', 'Tên đăng nhập duy nhất của người dùng.'],
    ['email', 'String', 'Indexed, Unique', 'Địa chỉ email duy nhất, dùng nhận mã xác thực OTP.'],
    ['password', 'String', 'Not Null', 'Mật khẩu đã được mã hóa bằng thuật toán BCrypt.'],
    ['fullName', 'String', 'Optional', 'Họ và tên đầy đủ của người dùng.'],
    ['roles', 'DBRef (Set<Role>)', 'Foreign Keys', 'Danh sách vai trò được gán (ROLE_USER, ROLE_ADMIN,...).'],
    ['permissions', 'DBRef (Set<Permission>)', 'Foreign Keys', 'Danh sách quyền hạn động được cấp phát trực tiếp cho người dùng.'],
    ['verified', 'Boolean', 'Default: false', 'Trạng thái xác thực email: true nếu đã nhập đúng OTP.'],
    ['createdAt', 'Instant (ISODate)', 'Default: Now', 'Thời điểm đăng ký tài khoản.']
  ];
  content.push(createStyledTable(userFieldsHeaders, userFieldsData, [20, 22, 20, 38]));
  content.push(new Paragraph({ spacing: { after: 150 } }));

  // DB 2: movies
  content.push(createHeading2('6.2 Collection: `movies` (Danh Mục Phim)'));
  const movieFieldsHeaders = ['Tên Trường', 'Kiểu Dữ Liệu', 'Ràng Buộc', 'Mô Tả Ý Nghĩa'];
  const movieFieldsData = [
    ['_id', 'ObjectId / String', 'Primary Key', 'Mã định danh phim duy nhất.'],
    ['title', 'String', 'Not Null', 'Tên phim hiển thị tiếng Việt (VD: Hành Tinh Cát 2).'],
    ['originalTitle', 'String', 'Optional', 'Tên gốc tiếng Anh (VD: Dune: Part Two).'],
    ['slug', 'String', 'Indexed, Unique', 'Chuỗi đường dẫn tĩnh thân thiện SEO (VD: dune-part-two).'],
    ['synopsis', 'String', 'Text', 'Tóm tắt nội dung cốt truyện của bộ phim.'],
    ['poster', 'String', 'URL / Path', 'Đường dẫn ảnh bìa đứng phục vụ hiển thị thẻ phim.'],
    ['backdrop', 'String', 'URL / Path', 'Đường dẫn ảnh nền ngang phục vụ Hero Banner.'],
    ['genres', 'List<String>', 'Array', 'Danh sách thể loại phim (Hành Động, Viễn Tưởng,...).'],
    ['imdbRating', 'Double', 'Default: 8.5', 'Điểm đánh giá chất lượng phim trên thang điểm 10.'],
    ['releaseYear', 'Integer', 'Not Null', 'Năm sản xuất / phát hành bộ phim.'],
    ['ageRating', 'String', 'Optional', 'Phân loại độ tuổi: 18+, 16+, 13+, P (Mọi lứa tuổi).'],
    ['type', 'String', 'movie | series | anime', 'Phân loại định dạng: Phim lẻ, Phim bộ hoặc Hoạt hình.'],
    ['status', 'String', 'DRAFT | PUBLISHED', 'Trạng thái xuất bản: Bản nháp hoặc Đã phát hành ra trang chủ.'],
    ['views', 'Long', 'Default: 0', 'Tổng số lượt người dùng đã xem phim.']
  ];
  content.push(createStyledTable(movieFieldsHeaders, movieFieldsData, [20, 22, 20, 38]));
  content.push(new Paragraph({ spacing: { after: 150 } }));

  // DB 3: episodes
  content.push(createHeading2('6.3 Collection: `episodes` (Tập Phim & Luồng Phát)'));
  const epFieldsHeaders = ['Tên Trường', 'Kiểu Dữ Liệu', 'Ràng Buộc', 'Mô Tả Ý Nghĩa'];
  const epFieldsData = [
    ['_id', 'ObjectId / String', 'Primary Key', 'Định danh tập phim.'],
    ['movieId', 'String', 'Indexed, Foreign Key', 'Liên kết tới mã phim trong collection movies.'],
    ['seasonNumber', 'Integer', 'Default: 1', 'Mùa phim (áp dụng cho phim nhiều mùa).'],
    ['episodeNumber', 'Integer', 'Not Null', 'Số thứ tự tập phim (Tập 1, 2, 3,...).'],
    ['title', 'String', 'Not Null', 'Tên gọi của tập phim.'],
    ['hlsMasterUrl', 'String', 'URL Path', 'Đường dẫn tới tệp Master Playlist master.m3u8.'],
    ['mp4FallbackUrl', 'String', 'URL Path', 'Đường dẫn video MP4 dự phòng cho thiết bị không hỗ trợ HLS.'],
    ['durationSeconds', 'Double', 'Numeric', 'Thời lượng tập phim tính theo giây chính xác.'],
    ['processStatus', 'String', 'Enum', 'Trạng thái xử lý: PENDING, PROCESSING, COMPLETED, FAILED.']
  ];
  content.push(createStyledTable(epFieldsHeaders, epFieldsData, [20, 22, 20, 38]));
  content.push(new Paragraph({ spacing: { after: 150 } }));

  // DB 4: upload_sessions & video_processes & email_otps
  content.push(createHeading2('6.4 Các Collections Bổ Trợ Quản Trị & Vận Hành'));
  content.push(createBulletPoint('Collection `email_otps`: Lưu trữ email, otpCode, type (REGISTER/LOGIN/FORGOT), attempts, isUsed, expireAt (TTL Index 300s).', 'email_otps'));
  content.push(createBulletPoint('Collection `upload_sessions`: Lưu trữ uploadId (Unique), fileName, fileSize, totalChunks, chunkSize, uploadedChunks (Set<Integer>), status.', 'upload_sessions'));
  content.push(createBulletPoint('Collection `video_processes`: Lưu trữ videoId, stage (Metadata/1080p/720p/Master), percent (0-100%), duration, width, height, bitrate.', 'video_processes'));
  content.push(createBulletPoint('Collection `watch_histories`: Lưu trữ userId, movieId, episodeId, lastPositionSeconds, isCompleted, updatedAt.', 'watch_histories'));
  content.push(createBulletPoint('Collection `roles` & `permissions`: Lưu trữ danh sách quyền động (USER_READ, ROLE_MANAGE, CATEGORY_CREATE,...) theo chuẩn Dynamic RBAC.', 'roles & permissions'));

  content.push(new Paragraph({ children: [new PageBreak()] }));

  // 10. Chapter 7: Traceability Matrix (65 Tasks mapping)
  content.push(createHeading1('CHƯƠNG 7: MA TRẬN TRUY VẾT YÊU CẦU (TRACEABILITY MATRIX)'));
  content.push(createParagraph(
    'Bảng dưới đây ánh xạ 6 giai đoạn lớn và 65 Tasks công việc thực tế trong dự án PRJ-CINESTREAMS-2026 với các yêu cầu chức năng (FR) và bộ kiểm thử (Postman Suite Test Cases):'
  ));

  const rtmHeaders = ['Mã Giai Đoạn / Nhóm', 'Phạm Vi Công Việc', 'Mã Tasks Tương Ứng', 'Ánh Xạ Yêu Cầu Chức Năng', 'Bộ Ca Kiểm Thử (Test Suite)'];
  const rtmData = [
    ['Giai đoạn 1: Auth & OTP Email', 'Cấu hình Async Mail, Template OTP, Entity OTP, API Register/Verify, Login 2FA, Forgot Pwd, Rate Limit, UI OTP 6 ô.', 'TASK-001 đến TASK-015', 'FR-AUTH-01 đến FR-AUTH-08', 'Suite 1 & 6 (9 Test Cases trong Postman)'],
    ['Giai đoạn 2: Chunked Upload', 'Config Multipart 5GB, Thư mục temp/videos, Chunk 5MB, Init/Chunk/Resume/Merge API, Dropzone, Progress Bar.', 'TASK-016 đến TASK-030', 'FR-UPLD-01 đến FR-UPLD-06', 'Suite 7: Chunked Upload API & Resume Check'],
    ['Giai đoạn 3: Video Transcoding', 'Môi trường FFmpeg, FFprobe metadata, Auto Thumbnail, HLS 1080p/720p/480p, master.m3u8, Video Processing Queue.', 'TASK-031 đến TASK-045', 'FR-TRNS-01 đến FR-TRNS-06', 'Suite 7: Transcoding Status & Master Verify'],
    ['Giai đoạn 4: Streaming & VIP Gate', 'ResourceHandler HLS, Byte-Range 206, Stream Ticket bảo mật, VIP Quality Gate, Hls.js Player, Resume 10s.', 'TASK-046 đến TASK-055', 'FR-STRM-01 đến FR-STRM-06', 'Suite 8: Stream Ticket & Dynamic Master Filter'],
    ['Giai đoạn 5: CMS Quản Trị Phim', 'Schema Movie & Episode, CRUD Movie Metadata, Gắn Video vào tập, Duyệt xuất bản, Bảng Admin CMS, Nối Trang chủ.', 'TASK-056 đến TASK-064', 'FR-CMS-01 đến FR-CMS-04', 'Suite 9: Movie CMS & Publish Verification'],
    ['Giai đoạn 6: E2E Testing & Nghiệm Thu', 'Kiểm thử toàn trình End-to-End từ Đăng ký nhận OTP -> Đăng tải phim 2GB -> Nén HLS -> Mua VIP -> Xem phim 4K.', 'TASK-065 (Toàn bộ nhóm)', 'Toàn bộ FR-01 đến FR-32', 'Toàn bộ 9 Suites Postman & MockMvc Test Suite']
  ];
  content.push(createStyledTable(rtmHeaders, rtmData, [20, 32, 16, 16, 16]));
  content.push(new Paragraph({ spacing: { after: 200 } }));

  // 11. Chapter 8: Test Plan & Acceptance Criteria
  content.push(createHeading1('CHƯƠNG 8: KẾ HOẠCH KIỂM THỬ & TIÊU CHÍ NGHIỆM THU (TEST PLAN & ACCEPTANCE)'));

  content.push(createHeading2('8.1 Chiến Lược Kiểm Thử (Testing Strategy)'));
  content.push(createBulletPoint('Kiểm thử từng tầng dịch vụ (UserService, VideoTranscodeService, EmailService) sử dụng JUnit 5, Mockito và MockMvc.', 'Unit & Integration Testing'));
  content.push(createBulletPoint('Bộ sưu tập 9 thư mục Postman Collection (CineStreams_Postman_Collection.json) tự động hóa kiểm tra mã phản hồi HTTP, cấu trúc JSON và JWT assertions.', 'Automated API Testing'));
  content.push(createBulletPoint('Kiểm thử tính năng tiếp tục tải lên khi ngắt kết nối mạng bất ngờ (Network Throttling / Offline Simulation) và kiểm tra tệp video đích sau ghép nối.', 'Stress & Network Testing'));
  content.push(createBulletPoint('Kiểm thử luồng phát video trên nhiều trình duyệt: Google Chrome, Apple Safari (iOS/macOS), Microsoft Edge và Mozilla Firefox.', 'Cross-Browser Testing'));

  content.push(createHeading2('8.2 Kịch Bản Kiểm Thử Toàn Trình Nghiệm Thu (End-to-End Acceptance Scenarios)'));
  const uatHeaders = ['Mã Kịch Bản', 'Tên Kịch Bản Nghiệm Thu', 'Các Bước Thực Hiện Chính', 'Kết Quả Mong Đợi (Pass Criteria)'];
  const uatData = [
    ['UAT-01', 'Đăng ký tài khoản qua OTP', '1. Nhập email mới\n2. Bấm nhận mã\n3. Nhập mã OTP từ Gmail vào form\n4. Bấm Kích hoạt', 'Email nhận mã trong < 5s; OTP hợp lệ kích hoạt tài khoản verified=true; tự động chuyển sang trang chủ.'],
    ['UAT-02', 'Tải lên phim dung lượng lớn & Nén HLS', '1. Đăng nhập Admin\n2. Vào CMS kéo thả video 2GB\n3. Bấm Tạm dừng rồi Tiếp tục\n4. Chờ ghép file & FFmpeg xử lý', 'Chunked upload mượt mà, resume chính xác 100%; server ghép file thành công; FFmpeg nén ra master.m3u8 và 3 luồng độ phân giải.'],
    ['UAT-03', 'Phát video & Kiểm soát VIP Gate', '1. Dùng tài khoản thường mở xem phim\n2. Kiểm tra menu chất lượng\n3. Nâng cấp VIP qua VietQR\n4. Tải lại trang xem phim', 'Tài khoản thường chỉ chọn tối đa 720p; sau khi thanh toán VietQR tài khoản kích hoạt VIP tức thì mở khóa luồng 1080p và 4K.'],
    ['UAT-04', 'Lưu mốc xem dở & Phím tắt', '1. Xem phim đến phút 12:35\n2. Tắt trình duyệt\n3. Mở lại trang xem phim\n4. Dùng phím Space, F, Mũi tên', 'Hệ thống gợi ý phát tiếp từ phút 12:35 chính xác; phím tắt phản hồi tức thì mượt mà không có độ trễ.']
  ];
  content.push(createStyledTable(uatHeaders, uatData, [14, 22, 34, 30]));
  content.push(new Paragraph({ spacing: { after: 200 } }));

  content.push(createHeading2('8.3 Tiêu Chí Ký Duyệt & Nghiệm Thu (Sign-Off Criteria)'));
  content.push(createParagraph(
    'Dự án CineStreams chính thức được công nhận đạt chuẩn nghiệm thu khi thỏa mãn toàn bộ các điều kiện tiên quyết sau:'
  ));
  content.push(createBulletPoint('100% (65/65 tasks) công việc được đánh dấu HOÀN THÀNH và không có lỗi nghiêm trọng (Critical/Blocker) tồn đọng.', 'Tiêu chí 1'));
  content.push(createBulletPoint('Toàn bộ 9 Test Suites trong Postman Collection chạy thành công và trả về mã HTTP hợp lệ (200 OK / 201 Created / 206 Partial Content).', 'Tiêu chí 2'));
  content.push(createBulletPoint('Quy trình xử lý video FFmpeg HLS hoạt động độc lập, mượt mà trên hệ thống máy chủ và không làm tắc nghẽn luồng xử lý web.', 'Tiêu chí 3'));
  content.push(createBulletPoint('Tài liệu SRS, Architecture Design và Source Code được đóng gói đầy đủ, đúng quy cách theo quy định của VTI Academy.', 'Tiêu chí 4'));

  // Document Footer Sign-off box
  content.push(new Paragraph({ spacing: { before: 400, after: 100 } }));
  content.push(createCallout(
    'KẾT LUẬN & XÁC NHẬN NGHIỆM THU',
    'Tài liệu Đặc tả Yêu cầu Phần mềm (SRS) cho dự án CineStreams đã được biên soạn đầy đủ, chính xác, phản ánh trung thực toàn bộ kiến trúc và tính năng sản phẩm thực tế. Dự án đã sẵn sàng 100% cho buổi lễ bảo vệ đồ án tốt nghiệp chính thức!'
  ));

  return content;
}

async function run() {
  console.log('Generating SRS Document...');
  const doc = new Document({
    creator: 'CineStreams Engineering Team',
    title: 'CineStreams - Software Requirements Specification (SRS)',
    description: 'Tài liệu Đặc tả Yêu cầu Phần mềm Nền tảng Xem Phim Trực Tuyến Tốc Độ Cao CineStreams',
    styles: {
      default: {
        document: {
          run: {
            font: 'Segoe UI',
            size: 21,
            color: COLOR_TEXT
          }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              bottom: 1440, // 1 inch
              left: 1440,   // 1 inch
              right: 1440   // 1 inch
            }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 100 },
                children: [
                  new TextRun({
                    text: 'CineStreams Platform — Software Requirements Specification (SRS) | PRJ-CINESTREAMS-2026',
                    size: 16,
                    color: COLOR_MUTED,
                    font: 'Segoe UI',
                    italics: true
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 100 },
                children: [
                  new TextRun({
                    text: 'CineStreams Engineering Team — Trang ',
                    size: 17,
                    color: COLOR_MUTED,
                    font: 'Segoe UI'
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 17,
                    bold: true,
                    color: COLOR_PRIMARY,
                    font: 'Segoe UI'
                  }),
                  new TextRun({
                    text: ' / ',
                    size: 17,
                    color: COLOR_MUTED,
                    font: 'Segoe UI'
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 17,
                    bold: true,
                    color: COLOR_PRIMARY,
                    font: 'Segoe UI'
                  })
                ]
              })
            ]
          })
        },
        children: buildDocument()
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  
  const rootPath = path.resolve('SRS_CineStreams_Dac_Ta_Yeu_Cau_Phan_Mem.docx');
  const docsPath = path.resolve('cinestreams/docs/SRS_CineStreams_Dac_Ta_Yeu_Cau_Phan_Mem.docx');

  fs.writeFileSync(rootPath, buffer);
  console.log('Saved to root:', rootPath, `(${buffer.length} bytes)`);

  try {
    fs.writeFileSync(docsPath, buffer);
    console.log('Saved to docs:', docsPath);
  } catch (err) {
    console.log('Docs folder path write warning:', err.message);
  }

  console.log('SUCCESS! SRS Word Document created with excellence.');
}

run().catch(err => {
  console.error('Error generating document:', err);
  process.exit(1);
});
