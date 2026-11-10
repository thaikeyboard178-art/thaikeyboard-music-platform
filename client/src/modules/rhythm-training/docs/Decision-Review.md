# Decision Review — THAIKEYBOARD Rhythm Training V1

> **Presentation APPROVED — 2026-11-11 lúc 03:04:52 +07:00:** chủ sản phẩm đã chốt P-01/P-02/P-03. Quyết định nhạc lý trước đó giữ nguyên; không cần hỏi lại và không cấp quyền triển khai runtime.

**Ngày quyết định owner:** 2026-11-11
**Phạm vi:** music semantics của 3/8, 6/8, 9/8 và ba quyết định presentation liên quan.
**Tính chất:** documentation-only; chưa triển khai source, test, runtime, UI, audio hoặc schema.

## 1. Trạng thái và nguyên tắc đọc

- **APPROVED OWNER DECISION:** quyết định đã được chủ sản phẩm chốt và là contract nội dung cho review/implementation planning sau này.
- **SUPERSEDED:** cách diễn đạt cũ chỉ được trích dẫn để ghi lịch sử; không còn là semantic hoặc presentation đang chờ xác nhận.
- **PENDING TECHNICAL DETAIL:** chi tiết chưa đủ để triển khai, không được dùng để mở lại quyết định đã APPROVED.

Không sử dụng phương án accent hierarchy Manus/ChatGPT trước đây. Tài liệu này không tự nhận teacher expert signoff, educator signoff, pilot result, test pass hoặc runtime approval.

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
| Quote “3/8 phách chính: 1” hoặc cách hiểu `3/8 = 1 phách` | **SUPERSEDED** | Chỉ quoting lịch sử; contract hiện tại là 3 phách đơn/eighth pulses, mỗi pulse 240 ticks. |
| Ba presentation proposal P-01/P-02/P-03 trước đây | **SUPERSEDED** | Lịch sử proposal; các ID được giữ để truy vết nhưng không còn active. Quyết định owner mới ở mục 4 là bản hiện hành. |
| Phương án accent hierarchy Manus/ChatGPT trước đây | **SUPERSEDED** | Không dùng, không phục hồi và không làm cơ sở cho implementation. |

Các quote lịch sử không được chuyển thành status pending hoặc dùng để hỏi lại quy ước đã chốt.

## 4. Ba quyết định presentation đã được owner APPROVED

Ba ID P-01/P-02/P-03 được giữ nguyên cho history, nhưng trạng thái hiện hành của cả ba là **APPROVED OWNER DECISION**. Đây là quyết định về cách trình bày, không tự cấp runtime/implementation approval.

### P-01 — Beam notation

| Nội dung | Quyết định đã chốt |
|---|---|
| `3/8` | Ba móc đơn/eighth được trình bày **riêng từng nốt với flag**, không beam ba nốt với nhau; giữ rõ 3 phách đơn độc lập. Không còn bar-wide beam `3/8` và không còn optional beam proposal active. |
| `6/8` | Beam theo nhóm `3+3`, không beam xuyên ranh giới hai phách phức. |
| `9/8` | Beam theo nhóm `3+3+3`, không beam xuyên ranh giới các phách phức. |
| Sixteenths, rests, mixed-duration | Tuân theo notation rules phù hợp, giữ ranh giới phách/phách phức. Các secondary-beam case chưa quy định là **PENDING TECHNICAL DETAIL**, không reopen approved eighth rule. |
| Trạng thái | **APPROVED OWNER DECISION**; chưa phải runtime approval. |

### P-02 — Counting presentation

| Phương thức | Quyết định đã chốt |
|---|---|
| **App Voice Counting** | App tự đọc số tiếng Anh mặc định: `One, Two, Three...`. Đây là voice mặc định, không phải yêu cầu Vietnamese-first. |
| **Visual Counting** | Hiện con số tương ứng tại vị trí đếm; người học tự đếm bằng ngôn ngữ họ muốn, không ép tiếng Anh. Không đồng nhất numeric display với ngôn ngữ voice. |
| **Metronome TICK** | Âm tick, tick, tick... theo contract metronome hiện có; không cần số hoặc syllable, không thay technical pulse/subdivision. |
| Trạng thái | **APPROVED OWNER DECISION**; đây là ba phương thức trình bày, không phải ba exercise/session modes. |

Không chốt mandatory default cho syllable `Một-và-a`, `la-li` hoặc voice Vietnamese. Detailed compound spoken mapping, speech scheduling và các giọng bổ sung ngoài request hiện vẫn chưa được quy định; không tự chốt thêm.

### P-03 — Accent presentation

| Hình thức | Quyết định đã chốt |
|---|---|
| **Text-based** | Dùng `Mạnh–Vừa–Nhẹ` hoặc `Mạnh–Nhẹ–Nhẹ` tùy meter; có thể dùng font weight/độ đậm và group boundary như hỗ trợ thị giác. |
| **Symbol-based** | Có thể dùng gạch nối, gạch dưới hoặc đồ họa; được phép dùng màu để phân biệt. |
| Quy tắc accessibility | Không bắt buộc kết hợp chữ + ký hiệu + màu. Nếu dùng màu, phải đủ contrast và khả năng nhận biết; không áp dụng blanket rule “không color-only”. |
| Trạng thái | **APPROVED OWNER DECISION**; structural accent không thay explicit note articulation và không đổi schema `segment.accent` binary. |

Các nhãn vẫn giữ nguyên: `Strong = Mạnh`, `Medium = Vừa`, `Weak = Nhẹ`; hierarchy là **Mạnh > Vừa > Nhẹ**. Chuỗi chính xác vẫn là `3/8 = Sww`, `6/8 = Sww|Mww`, `9/8 = Sww|Mww|Mww`.

## 5. Các việc còn pending hoặc chưa triển khai

| Hạng mục | Trạng thái thực tế và ranh giới |
|---|---|
| Secondary beam cases | **PENDING TECHNICAL DETAIL** cho sixteenths và các tổ hợp phức tạp; không mở lại quy tắc eighth đã APPROVED. |
| Spoken counting mở rộng | Chưa quy định detailed compound mapping, speech scheduling hoặc các voice bổ sung ngoài request; không biến thành yêu cầu Vietnamese-first. |
| Tempo, quota, lesson/practice/assessment density và pilot | Vẫn pending; chưa có validated standard, quota cuối hoặc pilot result được báo cáo trong tài liệu này. |
| Curriculum placement | 6 core Levels + Bonus 2/2 và placement đã giữ nguyên; không mở lại placement. |
| Runtime/implementation | Chưa được cấp. Code hiện tại vẫn là **8 legacy levels**; library hiện có **4 meters ở trạng thái inert/ComingSoon**; curriculum mới chưa được triển khai hoặc UI approved runtime. |

Không có claim về teacher expert signoff, educator signoff, pilot completion, test pass hoặc runtime approval. Không sửa code, test, runtime, UI activation, audio, metronome, MIDI, microphone, database, shared architecture, Note Reading hoặc production/deploy trong review này.

## 6. Ranh giới giữa structural accent và code/schema

Structural accent trong review này mô tả quan hệ nhạc lý và cách dạy: Mạnh, Vừa, Nhẹ; nó không phải explicit note articulation. Không thay schema `segment.accent` binary, không đặt numerical gain, velocity, amplitude hoặc runtime threshold, và không yêu cầu sửa code trong tài liệu này.

Các contract kỹ thuật không liên quan vẫn giữ nguyên: duration arithmetic với PPQ 480; rest tiêu thụ duration nhưng không tạo onset; tie continuation không tạo attack mới; tap matching là onset-only; whole-exercise scoring `+10/+0`; cùng các timing, clock, replay, abort/ungraded và technical-interruption policies đã có.

## 7. Kết luận

Owner decision ngày 2026-11-11 đã chốt music semantics: `3/8` là 3 phách đơn `Sww`; `6/8` là 2 phách phức với cấu tạo `3+3`, `Sww|Mww`, pulse `S-M`; `9/8` là 3 phách phức với cấu tạo `3+3+3`, `Sww|Mww|Mww`, pulse `S-M-M`. Mạnh > Vừa > Nhẹ, và structural accent tách khỏi explicit note articulation cũng như schema binary hiện có.

P-01 beam, P-02 counting và P-03 accent presentation đều đã **APPROVED OWNER DECISION** theo nội dung mục 4. Các proposal cũ chỉ còn là history **SUPERSEDED**; các chi tiết kỹ thuật chưa quy định vẫn pending và không reopen ba quyết định đã chốt. Đây là decision review documentation-only; implementation/runtime approval vẫn là cổng riêng.
