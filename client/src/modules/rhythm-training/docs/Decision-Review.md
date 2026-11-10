# Decision Review — THAIKEYBOARD Rhythm Training V1

**Ngày quyết định owner:** 2026-11-11
**Phạm vi:** music semantics của 3/8, 6/8, 9/8 và ba đề xuất presentation liên quan.
**Tính chất:** documentation-only; chưa triển khai source, test, runtime, UI, audio hoặc schema.

## 1. Trạng thái và nguyên tắc đọc

- **APPROVED OWNER DECISION:** quyết định semantics đã chốt từ product owner và là contract nội dung cho review/implementation planning sau này.
- **SUPERSEDED:** cách diễn đạt cũ chỉ được trích dẫn để ghi lịch sử; không còn là semantic đang chờ xác nhận.
- **PROPOSED:** đề xuất trình bày riêng, chưa chốt và chưa triển khai.

Không sử dụng phương án accent hierarchy Manus/ChatGPT trước đây. Tài liệu này không tự nhận teacher expert signoff, educator signoff, pilot result hoặc runtime approval.

## 2. Decision log — music semantics đã chốt

| ID | Quyết định | Trạng thái | Hệ quả bắt buộc |
|---|---|---|---|
| D-01 | `3/8` là **Simple Triple** gồm **3 phách đơn** độc lập. Mỗi phách là một móc đơn/eighth 240 ticks; không dựng một phách phức/compound parent. | **APPROVED OWNER DECISION** | Bar có 3 technical pulses; không diễn giải thành một phách 720 ticks. |
| D-02 | `6/8` là **Compound Duple** gồm **2 phách phức**. Mỗi phách phức là một dotted-quarter 720 ticks và gồm 3 phách đơn/eighth subdivisions. | **APPROVED OWNER DECISION** | Compound beats là `0, 720`; không đọc thành sáu phách phức hoặc sáu quarter-like pulses. |
| D-03 | `9/8` là **Compound Triple** gồm **3 phách phức**. Mỗi phách phức là một dotted-quarter 720 ticks và gồm 3 phách đơn/eighth subdivisions. | **APPROVED OWNER DECISION** | Compound beats là `0, 720, 1440`; không gộp cả bar thành một pulse. |
| D-04 | Tách rõ **subdivision/phách đơn**, **compound beat/phách phức** và accent ở cấp ô nhịp. Trong compound, mỗi eighth là một phách đơn/subdivision; trong `3/8`, mỗi eighth là một phách đơn độc lập. | **APPROVED OWNER DECISION** | Cấu trúc teaching grouping không được làm đổi meter identity hoặc pulse semantics. |
| D-05 | Hierarchy là **Mạnh > Vừa > Nhẹ**. `S` = Mạnh, `M` = Vừa, `w` = Nhẹ. `S` là bar-level accent ở đầu ô; `M` là secondary beat accent ở đầu các phách phức sau; không coi mọi đầu nhóm ngang Mạnh. | **APPROVED OWNER DECISION** | Accent structural tách khỏi explicit note articulation. Không tự suy diễn gain/velocity/numerical runtime. |
| D-06 | Chuỗi chính xác: `3/8 = Sww`; `6/8 = Sww\|Mww`; `9/8 = Sww\|Mww\|Mww`. Pulse-level: `6/8 = S-M`; `9/8 = S-M-M`. | **APPROVED OWNER DECISION** | Các chuỗi này là shorthand structural accent, không phải yêu cầu sửa binary `segment.accent`. |

### 2.1. Bảng semantics và timing contract

| Meter | Loại | Bar | Đơn vị phách kỹ thuật | Phách/phách phức | Pulse starts |
|---|---|---:|---|---|---|
| `3/8` | Simple Triple | `720` ticks | eighth/móc đơn = `240` ticks | `3` phách đơn độc lập; `Sww` | `[0, 240, 480]` |
| `6/8` | Compound Duple | `1440` ticks | dotted-quarter/phách phức = `720` ticks | `2` phách phức, mỗi phách gồm `3` phách đơn; `Sww\|Mww` | compound `[0, 720]` |
| `9/8` | Compound Triple | `2160` ticks | dotted-quarter/phách phức = `720` ticks | `3` phách phức, mỗi phách gồm `3` phách đơn; `Sww\|Mww\|Mww` | compound `[0, 720, 1440]` |

PPQ giữ nguyên là `480`; eighth giữ nguyên là `240`; dotted-quarter giữ nguyên là `720`. Các quyết định này không thay đổi duration, attack, tie, rest, onset-only matching hoặc scoring `+10/+0`.

## 3. Lịch sử bị thay thế

| Nội dung cũ | Trạng thái | Cách ghi trong review |
|---|---|---|
| Chuỗi accent kiểu cũ coi mọi đầu group là `S`, ví dụ `Sww\|Sww` và `Sww\|Sww\|Sww` | **SUPERSEDED** | Chỉ quoting lịch sử; không dùng làm hierarchy hiện tại. Chuỗi approved hiện tại dùng `M` cho compound beat sau đầu ô. |
| Quote “3/8 phách chính: 1” hoặc cách hiểu `3/8 = 1 phách` | **SUPERSEDED** | Chỉ quoting lịch sử; không còn là câu hỏi semantic. Contract hiện tại là 3 phách đơn/eighth pulses, mỗi pulse 240 ticks. |
| Phương án accent hierarchy Manus/ChatGPT trước đây | **SUPERSEDED** | Không dùng, không phục hồi và không làm cơ sở cho implementation. |

Các quote lịch sử không được chuyển thành status pending hoặc dùng để hỏi lại quy ước đã chốt.

## 4. Ranh giới giữa structural accent và code/schema

Structural accent trong review này mô tả quan hệ nhạc lý và cách dạy: Mạnh, Vừa, Nhẹ; nó không phải explicit note articulation. Không thay schema `segment.accent` binary, không đặt numerical gain, velocity, amplitude hoặc runtime threshold, và không yêu cầu sửa code trong tài liệu này.

Các contract kỹ thuật không liên quan vẫn giữ nguyên: duration arithmetic với PPQ 480; rest tiêu thụ duration nhưng không tạo onset; tie continuation không tạo attack mới; tap matching là onset-only; whole-exercise scoring `+10/+0`; cùng các timing, clock, replay, abort/ungraded và technical-interruption policies đã có.

## 5. Ba đề xuất presentation riêng

Ba mục này **không phải decision semantics**. Mỗi mục chỉ là đề xuất ngắn, chưa chốt, chưa triển khai và phải giữ nguyên timing/meter/duration/attack/tie/rest/scoring.

### P-01 — Beam notation

- **Đề xuất:** với `3/8`, cho phép hai hướng trình bày để review: beam toàn ô theo nhóm `3` hoặc beam pulse-first; cả hai phải vẫn hiển thị **3 phách đơn**. Với compound, hiển thị group `3+3` cho `6/8` và `3+3+3` cho `9/8`.
- **Lý do:** beam nên làm rõ cấu trúc nhìn thấy mà không biến `3/8` thành compound parent; compound cần cho thấy phách phức và ba phách đơn bên trong.
- **Guardrail:** không đổi pulse coordinates, PPQ hoặc simple/compound identity. Secondary sixteenth-beam convention trong `6/8` và `9/8` chưa chốt.
- **Trạng thái:** **PROPOSED**.

### P-02 — Cách đếm bằng tiếng Việt

- **Đề xuất:** dùng phương án tiếng Việt rõ nghĩa, không chỉ dùng “la-li” hoặc số tiếng Anh. Simple meter có thể thử `1–2–3`; compound có thể thử `Một-và-a / Hai-và-a / Ba-và-a` hoặc `phách 1, phần 1/2/3` tùy mục tiêu bài.
- **Lý do:** phải phân biệt `simple 1-2-3` với một phách phức được chia thành ba phách đơn; người học cần biết đang đếm tầng nào.
- **Guardrail:** syllable cụ thể chưa duyệt; không đưa vào audio/count-in/runtime. Không gọi ba subdivisions của một compound beat là ba phách ngang hàng với compound beat.
- **Trạng thái:** **PROPOSED**.

### P-03 — Cách thể hiện trọng âm trên UI

- **Đề xuất:** thể hiện 3 mức bằng text label, font/weight và boundaries/grouping rõ ràng: `Mạnh`, `Vừa`, `Nhẹ`; cho thấy bar boundary và compound-beat boundary trực tiếp.
- **Lý do:** hierarchy `Mạnh > Vừa > Nhẹ` cần dễ hiểu ngay cả khi người học không nghe audio hoặc có hạn chế về màu sắc.
- **Guardrail:** không dùng màu đơn độc; text, font và boundaries phải accessible. Presentation structural accent không thay explicit note articulation và không đổi schema `segment.accent` binary.
- **Trạng thái:** **PROPOSED**.

## 6. Những việc chưa được quyết định hoặc chưa triển khai

- Ba mục P-01/P-02/P-03 ở trên vẫn **PROPOSED**; chưa có lựa chọn presentation cuối và chưa có implementation.
- Các quota lesson/practice/assessment, tempo ranges và pilot vẫn pending theo scope; không dùng chúng để hỏi lại `3/8`, compound semantics hoặc accent hierarchy đã approved.
- Current code vẫn là **8 legacy levels**; library hiện có **4 meters ở trạng thái inert/ComingSoon**. **7 V1 meters/current curriculum chưa được triển khai**.
- Không sửa code, test, runtime, UI activation, audio, metronome, MIDI, microphone, database, shared architecture, Note Reading hoặc production/deploy trong review này.
- Không có claim về teacher expert signoff, educator signoff, pilot completion, test pass hoặc runtime approval.

## 7. Kết luận

Owner decision ngày 2026-11-11 đã chốt music semantics: `3/8` là 3 phách đơn `Sww`; `6/8` là 2 phách phức với cấu tạo `3+3`, `Sww|Mww`, pulse `S-M`; `9/8` là 3 phách phức với cấu tạo `3+3+3`, `Sww|Mww|Mww`, pulse `S-M-M`. Mạnh > Vừa > Nhẹ, và structural accent tách khỏi explicit note articulation cũng như schema binary hiện có.

Các strings/hierarchy cũ chỉ còn là lịch sử **SUPERSEDED**. Beam notation, cách đếm tiếng Việt và UI accent là ba đề xuất **PROPOSED**, chưa chốt/chưa triển khai. Đây là decision review documentation-only; mọi implementation approval phải là cổng riêng.
