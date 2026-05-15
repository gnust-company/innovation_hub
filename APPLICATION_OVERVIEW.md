
# 🚀 ĐẶC TẢ ỨNG DỤNG: INNOVATION HUB
## Nền tảng Đổi mới Sáng tạo Nội bộ (Web App)

---

## 1. TỔNG QUAN SẢN PHẨM

**Innovation Hub** là ứng dụng web nội bộ cho phép bộ phận:
- **Thu thập vấn đề** một cách có cấu trúc (thay vì chat lung tung)
- **Thảo luận tập trung** với threading comment
- **Brainstorming giải pháp** trong không gian riêng biệt nhưng liên kết chặt chẽ với vấn đề

**Mục tiêu OKR:** Trực tiếp phục vụ KR3 năm (*50 ý tưởng, 70% tương tác, 20% thành dự án thử nghiệm*) bằng cách số hóa quy trình "Đăng → Bàn → Làm".

---

## 2. KIẾN TRÚC NGƯỜI DÙNG

| Vai trò | Quyền hạn |
|:--------|:----------|
| **Thành viên Bộ phận** | Đăng vấn đề, Comment, Tạo ý tưởng Brainstorm, Vote, Xem Dashboard, Tham gia Event (tạo/zg đội, submit idea) |
| **Team Lead (Event)** | Duyệt thành viên, Giải tán đội, Chấm điểm idea (nếu được gán), Quản lý FAQ |
| **Admin (Trưởng nhóm)** | Quản lý tài khoản, Ghim/Đóng bài, Chuyển trạng thái ý tưởng, Export báo cáo, **Tạo/Quản lý Event, Gán chấm điểm, Đóng Event** |

---

## 3. MODULE CHỨC NĂNG CHI TIẾT

### 🔐 Module 1: Xác thực & Tài khoản (Đơn giản như yêu cầu)

| Chức năng | Mô tả |
|:----------|:------|
| **Đăng nhập** | Username/Password cơ bản (có thể tích hợp SSO công ty sau này) |
| **Quản lý Profile** | Đổi mật khẩu, Upload avatar, Chọn Ban/Team |
| **Phân quyền** | Phân biệt User thường và Admin ngay từ đầu |

---

### 📝 Module 2: Trung tâm Vấn đề (Problem Feed)

**Đây là "Newsfeed" của những điểm nghẽn/thách thức trong bộ phận:**

| Tính năng | Chi tiết |
|:----------|:---------|
| **Tạo Post Vấn đề** | - Tiêu đề rõ ràng<br>- Mô tả chi tiết (hỗ trợ nhiều loại Typing như Markdown hay Quill,...)<br>- Tag/Category: *Quy trình, Kỹ thuật, Con người, Công cụ, Patent...*<br>|
| **Trạng thái Vấn đề** | *Mở → Đang thảo luận → Chuyển sang Brainstorming → Đã có giải pháp → Đóng*<br>**Tự động chuyển:** Mở→Đang thảo luận (khi có comment từ người khác), Mở/Đang thảo luận→Brainstorming (khi tạo phòng brainstorm).<br>**Thủ công:** Đã có giải pháp, Đóng (do tác giả hoặc Admin chuyển). |
| **Tương tác Cơ bản** | - **Comment** threaded (trả lời lồng nhau)<br>- **Reaction** đơn giản: 👍 👎 💡 (Ý hay)<br>- **@mention** để tag đồng nghiệp vào thảo luận *(chưa implement)* |
| **Tìm kiếm/Lọc** | Tìm theo từ khóa, Lọc theo Category, Sắp xếp theo: Mới nhất / Nhiều bình luận nhất / Reaction |
| **Quyền riêng tư** | - **Public** (mặc định): Tất cả mọi người đều thấy<br>- **Private**: Chỉ tác giả, người được chia sẻ (`shared_user_ids`), và Admin mới thấy<br>- Khi thêm người được chia sẻ, tự động chuyển sang Private<br>- **Độc lập**: Room có quyền riêng biệt với Problem. Idea kế thừa quyền từ Room. |

---

### 💡 Module 3: Phòng Brainstorming (Idea Lab) - **Liên kết chặt chẽ**

**Đây là "không gian sáng tạo" riêng biệt nhưng không tách rời:**

#### Cơ chế Liên kết (Core Logic):
```
[Vấn đề trong Feed] --(1 click)--> [Tạo Brainstorm Room]
                                      ↓
                              [Không gian Ý tưởng riêng]
                                      ↓
                              [Liên kết ngược về Vấn đề gốc]
```

#### Quyền riêng tư (Privacy):
```
Problem (public/private + shared_user_ids)  ← Độc lập
  └── Room (liên kết hoặc độc lập)  ← Độc lập, KHÔNG kế thừa từ Problem
       └── Idea  ← Kế thừa từ Room
```
- **Problem và Room có quyền riêng biệt**: Room public dù Problem private (và ngược lại)
- **Idea** kế thừa quyền từ Room chứa nó
- **Edge case**: Problem private + Room public → User thấy Room nhưng không xem được Problem liên kết (403)

| Tính năng | Chi tiết |
|:----------|:---------|
| **Chuyển đổi từ Vấn đề** | Từ bài Post Vấn đề, bấm nút **"Brainstorm Giải pháp"** → Tự động tạo Room mới với link reference ngược lại |
| **Cấu trúc Ý tưởng** | Mỗi ý tưởng trong Room gồm:<br>- Tiêu đề<br>- Tóm tắt ngắn (Summary, tùy chọn — hiển thị khi listing)<br>- Mô tả chi tiết giải pháp<br>|
| **Thảo luận chuyên sâu** | - Comment riêng cho từng ý tưởng<br>- **Vote** bằng sao (1-5 sao) để đánh giá mức độ khả thi<br>- Ghim ý tưởng hay nhất lên đầu |
| **Trạng thái Ý tưởng** | *Draft → Đang hoàn thiện (Refining) → Đang xem xét (Reviewing) → Đã nộp (Submitted) / Đóng (Closed)*<br>Board view cho phép kéo thả tự do giữa Draft/Refining/Reviewing. Submitted và Closed là trạng thái kết thúc. |

#### Hai chế độ xem (View):
1. **Board View:** Kanban board kéo thả ý tưởng theo trạng thái (như Trello)
2. **List View:** Danh sách có filter theo người đề xuất, số vote, trạng thái *(chưa implement)*

---

### 🏆 Module 5: Quản lý Sự kiện Đổi mới Sáng tạo (Event Management) — **BIG FEATURE**

> **Context**: Module Event cho phép tổ chức các chương trình/cuộc thi đổi mới sáng tạo nội bộ (ví dụ: "Agentic AI in Mobile"). Đây là lớp overlay trên nền tảng hiện tại — tận dụng Problems/Rooms/Ideas có sẵn, bổ sung structured workflow cho competition.

#### Tổng quan kiến trúc:

```
┌──────────────────────────────────────────────────────────────┐
│                    INNOVATION HUB PLATFORM                    │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐│
│  │ Problem Feed │  │  Idea Lab   │  │     EVENT MODULE      ││
│  │  (Module 2)  │  │ (Module 3)  │  │     (Module 5)        ││
│  │             │  │             │  │                       ││
│  │ Problem ────┼──┼→ Room ────┼──┼→ Submit to Event ───→ ││
│  │  (vấn đề)   │  │ (brainstorm)│  │  (copy, 1 chiều)     ││
│  └─────────────┘  └─────────────┘  │                       ││
│                                      │  ┌─────────────────┐ ││
│                                      │  │ Event Structure │ ││
│                                      │  │                 │ ││
│                                      │  │ Introduction    │ ││
│                                      │  │ Teams (đội)     │ ││
│                                      │  │ Ideas (ý tưởng) │ ││
│                                      │  │ Dashboard       │ ││
│                                      │  │ FAQ             │ ││
│                                      │  └─────────────────┘ ││
│                                      └───────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

#### Cơ chế hoạt động:

| Chức năng | Mô tả |
|:----------|:------|
| **Tạo Event** | Admin tạo sự kiện với tiêu đề, nội dung giới thiệu (TipTap editor hoặc nhúng web), thời gian. Event có 3 trạng thái: Draft → Active → Closed. |
| **Tham gia** | Users tự tạo đội (name + slogan). Creator là Team Lead. Người khác xin tham gia, Team Lead duyệt. 1 user chỉ thuộc 1 team/event. |
| **Submit Idea** | 2 đường: (1) Manual form với structured fields, (2) Copy từ Brainstorming Room — bridge 1 chiều. |
| **Chấm điểm** | Admin gán đội chấm đội theo circular pattern (A→B→C→D→A). 8 tiêu chí (4 Problem + 4 Solution), 5-point Likert scale (max 12.5/criteria, tổng max 100). Điểm = Σ(score × weight). |
| **Dashboard** | Bảng xếp hạng ý tưởng theo điểm, đội theo số lượng ý tưởng. Real-time update. |
| **FAQ** | Q&A đơn giản cho mỗi sự kiện. |

#### Chi tiết 6 Tab trong Event Page:

**Tab 1 — Introduction:**
- Hiển thị nội dung giới thiệu về sự kiện
- **Dual mode**: TipTap rich text (do Admin soạn) HOẶC nhúng iframe trang web ngoài
- XOR: Chỉ dùng 1 trong 2 cách

**Tab 2 — Teams:**
- Danh sách tất cả đội với số thành viên
- "Create Team" (nếu chưa có team)
- "Join" button → gửi yêu cầu, chờ Team Lead duyệt
- "Manage" (Team Lead): Duyệt/từ chối thành viên, giải tán đội
- "Leave" (Member): Rời đội (Team Lead phải chuyển quyền hoặc giải tán)

**Tab 3 — Ideas:**
- Danh sách ý tưởng với 3 filter: "My Team" | "Team I Review" | "All"
- Submit qua 2 đường: Manual form (7 fields TipTap) hoặc từ Brainstorming Room
- Click vào idea → xem chi tiết + chấm điểm (nếu có quyền)
- Chấm điểm: 8 tiêu chí (4 Problem + 4 Solution), 5-point Likert scale (12.5/10/7.5/5/2.5), max 100 điểm

**Tab 4 — Dashboard:**
- Bảng 1: Ý tưởng xếp theo điểm (cao → thấp, chưa chấm xếp cuối)
- Bảng 2: Đội xếp theo số lượng ý tưởng
- Có filter theo team

**Tab 5 — FAQ:**
- Accordion Q&A
- User tạo câu hỏi, Admin trả lời

**Tab 6 — Awards (Bục Vinh Quang):** *(hiện tại gộp vào Dashboard tab)*
- Admin tạo các giải thưởng (Gold, Silver, Bronze...)
- Gán đội vào giải thưởng tương ứng
- Hiển thị đội chiến thắng cho tất cả users

#### Form Submit Idea (Structured):

| Field | Loại | Bắt buộc | Ghi chú |
|:------|:-----|:---------|:--------|
| Inventor | Auto-fill | ✅ | Tên đội tự động |
| Title | Input | ✅ | Tên ý tưởng |
| User Problem | TipTap | ❌ | Mô tả vấn đề người dùng |
| User Scenarios | TipTap | ❌ | Tình huống sử dụng |
| User Expectation | TipTap | ❌ | Kỳ vọng người dùng |
| Research | TipTap | ❌ | Nghiên cứu/Nền tảng |
| Solution | TipTap | ✅ | Giải pháp đề xuất |

#### Hệ thống Chấm điểm (5-point Likert Scale):

**Cơ chế:** Mỗi tiêu chí được đánh giá trên 5 mức độ đồng ý, max 12.5 điểm/criteria.

| Mức độ | Điểm |
|--------|------|
| Strongly Agree | 12.5 |
| Agree | 10 |
| Neutral | 7.5 |
| Disagree | 5 |
| Strongly Disagree | 2.5 |

**8 Tiêu chí mặc định (2 nhóm):**

**Nhóm Problem (đánh giá bài toán):**
| # | Name | Câu hỏi đánh giá |
|---|------|------------------|
| 1 | Unresolved Problem | Bài toán chưa có giải pháp hoặc giải pháp chưa triệt để? |
| 2 | Root Cause Analysis | Tác giả đã phân tích được nguyên nhân gốc rễ? |
| 3 | Problem Recognition | Bài toán có độ nhận diện cao, được nhắc nhiều? |
| 4 | Gap Evidence | Có bằng chứng gap analysis từ nguồn uy tín? |

**Nhóm Solution (đánh giá giải pháp):**
| # | Name | Câu hỏi đánh giá |
|---|------|------------------|
| 5 | Novelty | Giải pháp mới lạ, chưa từng xuất hiện? |
| 6 | Root Cause Resolution | Giải pháp giải quyết triệt để vấn đề gốc rễ? |
| 7 | Competitive Advantage | Giải pháp có ưu thế cạnh tranh? |
| 8 | Technical Feasibility | Giải pháp khả thi về mặt kỹ thuật? |

```
total_score = Σ(score_i × weight_i)
Tổng tối đa = 8 × 12.5 = 100 điểm
```

- 8 tiêu chí cố định, tự động tạo (auto-seed) khi event lần đầu được truy cập — không thể tạo/sửa/xóa qua API
- Mỗi đội chỉ chấm 1 lần cho mỗi idea
- Chỉ Team Lead (của team được gán) mới chấm được

#### Notification mở rộng:

| Hành động | Type | Người nhận |
|:----------|:-----|:-----------|
| Xin tham gia đội | `event_join_request` | Team Lead |
| Được duyệt | `event_join_approved` | Người xin |
| Bị từ chối | `event_join_rejected` | Người xin |
| Idea mới submit | `event_idea_submitted` | Admin |
| Được chấm điểm | `event_scored` | Team Lead của idea |

Thông báo được tạo trong nền tảng và có thể gửi thêm email nội bộ nếu cấu hình mail-sender được bật. Email chỉ áp dụng cho các thông báo quan trọng (`comment_added`, `event_scored`, `event_join_request`, `team_disbanded`), còn nộp ý tưởng vào Event (`event_idea_submitted`), reaction, vote và các thay đổi ít khẩn cấp khác chỉ tạo in-app notification để tránh spam. Email được gửi nền sau khi in-app notification persist thành công để không chặn request nghiệp vụ. Email là best-effort, subject có prefix `[NO_REPLY][Innovation Hub]`, nội dung ngắn gọn có icon, in nghiêng tên người nhận trong lời chào, in đậm title của object chính, nêu rõ object/context (Problem, Idea Lab, Event Idea, Event/Team) và luôn có link `nhấn vào đây` trỏ về nội dung liên quan trong Innovation Hub. Riêng comment trên Event Idea phải hiển thị rõ dạng `ý tưởng "{idea_title}" trong Event "{event_title}"`.

Email người dùng và người nhận mail nội bộ phải thuộc domain allowlist cấu hình bằng `ALLOWED_EMAIL_DOMAINS` (ví dụ `@company.com`). FE chặn sớm ở form đăng ký/cập nhật hồ sơ, BE reject trước khi lưu DB, và mail-sender client kiểm tra lần cuối để không gửi ra email ngoài công ty.

#### Quyền riêng tư & Độc lập:

```
Problem (public/private) ← Độc lập
  └── Room (public/private) ← Độc lập với Problem
       └── Room Idea ← Kế thừa từ Room
                          ↓ (copy, 1 chiều)
                       Event Idea ← Thuộc Event, hoàn toàn độc lập
```

- Event Idea là bản **copy** từ Room Idea, không live link
- Thay đổi trong Room/Problem gốc KHÔNG ảnh hưởng Event Idea
- Event Ideas không có status workflow riêng (chỉ phụ thuộc Event status)
- Event Ideas hỗ trợ comments (`target_type='event_idea'`), cho phép các đội trao đổi/feedback

---

### 📊 Module 4: Dashboard & Thống kê (Phục vụ OKR)

Hệ thống có 2 giao diện Dashboard:

**User Dashboard** (cho tất cả users):
| Chỉ số hiển thị | Ý nghĩa |
|:----------------|:--------|
| **Stat Cards** | Tổng Problems, Active Brainstorms, Tổng Ideas, Active Events — với % thay đổi so kỳ trước |
| **Trending Ideas** | Ý tưởng nổi bật, sort theo engagement (vote avg → likes → comments → thời gian) |
| **Recent Activity** | Feed hoạt động gần đây (tạo problem, idea, comment, reaction, vote, room) — privacy-filtered |
| **Top Contributors** | Bảng vàng thành viên đóng góp nhiều nhất |
| **Quick Actions** | Nút tắt: Share Problem, Create Brainstorm, Join Event |

**Admin Analytics** (cho Admin, xem full data bất kể privacy):
| Chỉ số hiển thị | Ý nghĩa |
|:----------------|:--------|
| **Stats Grid** | Tổng Problems, Active Brainstorms, Ideas, Events — với % thay đổi + hints |
| **Interaction Rate** | % Problems/Ideas có ít nhất 1 comment |
| **Resolved Problems** | Problems đã giải quyết hoặc đóng |
| **Activity Over Time** | Biểu đồ đường: Problems, Ideas, Comments theo ngày |
| **Category Distribution** | Biểu đồ donut: Phân loại Problems theo danh mục |
| **Status Breakdowns** | Phân bố Problems/Ideas theo status, thanh progress |
| **Date Range Filter** | Lọc theo khoảng thời gian tùy ý |

---

## 4. LUỒNG NGƯỜI DÙNG CHÍNH (User Flow)

### Scenario 1: Từ Vấn đề đến Giải pháp
```
1. User A đăng nhập → Thấy Dashboard
2. Click "Đăng Vấn đề mới" → Mô tả: "Quy trình xin nghỉ phép phức tạp, mất 3 ngày"
3. User B vào Comment: "Đúng rồi, mình suggest dùng form online"
4. User A click "Brainstorm Giải pháp" → Tạo Room "Cải tiến quy trình nghỉ phép"
5. Trong Room: User C đề xuất ý tưởng "Auto-approval cho nghỉ <1 ngày"
6. Mọi người Vote 5 sao và Comment bổ sung → Ý tưởng được chuyển trạng thái "Sẵn sàng Pilot"
```

### Scenario 2: Brainstorm độc lập (Không từ Vấn đề)
```
1. User click tab "Brainstorming" → Tạo Room mới trực tiếp
2. Đặt tên: "Ý tưởng cải tiến OKR Tool"
3. Mọi người vào thảo luận ngay (không cần thông qua Problem Feed)
```

### Scenario 3: Từ Brainstorm Room đến Cuộc thi (Event)
```
1. Admin tạo Event "Agentic AI in Mobile" → Set introduction, mở registration
2. Users tạo Teams (Team Alpha, Beta, Gamma, Delta)
3. Trong Idea Lab, User click "Submit to Event" trên 1 Idea đã refine
4. → Chọn Event → Form điền sẵn từ Problem + Idea content
5. User chỉnh sửa và submit chính thức
6. Admin gán circular review: Alpha→Beta, Beta→Gamma, Gamma→Delta, Delta→Alpha
7. Team Leads chấm điểm theo 8 tiêu chí (4 Problem + 4 Solution), Likert 5-point, max 100 điểm
8. Dashboard xếp hạng real-time: Ideas theo điểm, Teams theo số lượng idea
```

---

## 5. YÊU CẦU KỸ THUẬT (Tech Stack đề xuất)

| Thành phần | Công nghệ đề xuất | Lý do |
|:-----------|:------------------|:------|
| **Frontend** | React.js + TipTap Editor | Tương tác nhanh, rich text editor cho Event form |
| **Backend** | Python (FastAPI) | Xử lý bất đồng bộ tốt cho comment/vote, JSONB support |
| **Database** | PostgreSQL (JSONB) | Lưu trữ quan hệ + TipTap JSON content (JSONB fields cho event_ideas) |
| **Storage** | MinIO | Lưu trữ file (avatar, attachments) |
| **Authentication** | JWT (JSON Web Token) | Đơn giản, stateless cho web app |
| **Deploy** | Docker Compose | Dễ maintain cho team nhỏ, Nginx reverse proxy |

---

## 6. RÀNG BUỘC & LƯU Ý THIẾT KẾ

1. **Đơn giản:** Không làm quá nhiều feature lạ. Tập trung vào 3 luồng chính: *Đăng - Bàn - Vote*.
2. **Notification:** Khi có comment mới hoặc ý tưởng được chuyển trạng thái, gửi email/notification đơn giản.
3. **Backup:** Export dữ liệu ý tưởng ra Excel/CSV định kỳ (phòng hệ thống lỗi, và để báo cáo sếp).
