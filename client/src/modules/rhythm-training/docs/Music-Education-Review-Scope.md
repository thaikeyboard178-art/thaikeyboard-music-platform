# Music Education Review Scope — Rhythm Training V1

> **Presentation APPROVED — 2026-11-11 lúc 03:04:52 +07:00:** chủ sản phẩm đã chốt P-01/P-02/P-03. Quyết định nhạc lý trước đó giữ nguyên; không cần hỏi lại và không cấp quyền triển khai runtime.

> **Nguồn quyết định đã chốt:** đính chính trực tiếp của chủ sản phẩm ngày 2026-11-11. Xem [Decision Review](./Decision-Review.md). Không sử dụng phương án accent hierarchy trước đây của Manus/ChatGPT. Đây là quyết định nội dung, không phải giáo viên signoff do Manus tự nhận hoặc quyền triển khai code.

> **D-07 APPROVED OWNER DECISION:** latest owner Curriculum Decision Update received **2026-11-11 14:14 +07**; xem [Decision Review §2.2](./Decision-Review.md). Multiple Choice remains core for notation/values/theory but is insufficient alone for practical rhythm training; Tap Rhythm starts at Level 3. Chưa có runtime/implementation approval.

**Trạng thái tài liệu:** cập nhật phạm vi nội dung đã được duyệt; chỉ là tài liệu review, chưa triển khai.

**Phạm vi được ghi nhận:** curriculum V1 gồm **6 Level chính + 1 Bonus**, tương ứng **7 meter V1 được hỗ trợ về mặt nội dung**: 2/4, 3/4, 4/4, 3/8, 6/8, 9/8 và Bonus 2/2. Tài liệu này không coi 7 meter là “6 meter”, không giữ cấu trúc tám level cũ, và không coi bốn meter hiện có trong code là phạm vi curriculum đã hoàn tất.

**Ranh giới công việc:** đây là bản cập nhật documentation-only. Không có source, test, TypeScript/TSX/JavaScript/CSS/JSON/database/infrastructure/dependency/shared architecture/Note Reading nào được sửa. Không kích hoạt UI hoặc catalog, không thêm audio, metronome, MIDI, microphone, Phase 3, deploy, project mới hay repository mới. Tài liệu này không cấp quyền sửa runtime.

## 1. Quyết định curriculum và trạng thái phê duyệt

### Đã chốt về thứ tự và vị trí

Thứ tự dưới đây là thứ tự curriculum đã được duyệt và phải được dùng làm khung biên tập. **Thứ tự và placement đã approved, không còn pending theo các đề xuất cũ như 3/8 ở L3 hoặc 2/2 ở L4.** Các bản mô tả cũ về Level 7/8 không được tiếp tục như hai level mới; nội dung cần thiết của chúng chỉ được consolidation có kiểm soát trong Level 5 theo bảng này.

| Mục | Nội dung đã duyệt | Cấu phần bắt buộc |
|---|---|---|
| Level 1 | Nốt đen, nốt trắng, nốt tròn, **dấu lặng đen** trong phạm vi quarter rest | Lessons, Practice, Assessment |
| Level 2 | Nốt móc đơn, dấu lặng đơn, chia đôi phách theo binary quarter subdivision | Lessons, Practice, Assessment |
| Level 3 | Simple meter: 2/4, 3/4, 4/4 | Lessons, Practice, Assessment |
| Level 4 | Dấu chấm, nối trường độ; dotted eighth **chưa dạy ở đây**, hoãn đến lưới sixteenth của Level 5 theo duration policy đã giữ | Lessons, Practice, Assessment |
| Level 5 | Nốt móc kép, tổ hợp tiết tấu, tiết tấu nâng cao; consolidation có kiểm soát của nội dung cũ L7/L8, **không tạo L7/L8 mới** | Lessons, Practice, Assessment |
| Level 6 | Một nhóm kiến thức thống nhất **Grouping in Threes**: 3/8, 6/8, 9/8; không tách thành ba khóa độc lập | Lessons, Practice, Assessment |
| Bonus | 2/2 Alla Breve: hai half-note pulses; progression tùy chọn nhưng vẫn là feature được hỗ trợ trong V1 | Lessons, Practice, Assessment |

### Nội dung chi tiết theo cấu phần học

| Mục | Lessons | Practice | Assessment |
|---|---|---|---|
| Level 1 | Nhận diện nốt đen, trắng, tròn; hiểu quarter rest là thời lượng im lặng; chỉ dùng quarter rest trong vocabulary của Level 1 | Đếm và lấp đầy mẫu cơ bản với quarter notes/rests, half notes và whole notes; ưu tiên bar arithmetic rõ ràng | Nhận diện giá trị/thời lượng, chọn mẫu đúng và hoàn thành mẫu có quarter rest; không chấm kỹ năng ngoài vocabulary của Level 1 |
| Level 2 | Chia một quarter pulse thành hai eighth subdivisions; nhận diện eighth notes và eighth rests; dùng binary counting | Luyện các tổ hợp quarter/eighth/eighth rest trong simple pulse; giữ nguyên tổng thời lượng và phân biệt onset với rest | Nhận diện vị trí subdivision, đọc pattern và phân biệt eighth rest; không đưa dots, ties hoặc sixteenths vào nội dung lõi |
| Level 3 | Cùng một nhóm kiến thức Simple Meter: 2/4 có 2 quarter pulses, 3/4 có 3, 4/4 có 4; nhận diện time signature, phách, trọng âm và độ dài ô nhịp | So sánh bar capacity, đếm phách, đọc pattern và phân tích trọng âm trong 2/4, 3/4, 4/4 | Tổng hợp cả ba simple meters: nhận diện signature, pulse count, accent và pattern hợp lệ; không đưa 3/8 vào Level 3 |
| Level 4 | Dấu chấm và nối trường độ; phân biệt duration kéo dài với onset; dotted eighth deferred | Mẫu có dots/ties trong vocabulary được duyệt, giữ quy tắc mỗi lần mở một nguồn khó; tie continuation không tạo attack mới | Nhận diện duration, tie group, rest và attack; dotted eighth chỉ xuất hiện sau khi chính sách lưới sixteenth của Level 5 được duyệt và triển khai |
| Level 5 | Sixteenth grid, các tổ hợp quarter/eighth/sixteenth/rest/dot/tie; tiết tấu nâng cao; ôn có kiểm soát các khó khăn cũ của L7/L8 | Tăng dần mật độ và interaction budget; consolidation của syncopation/advanced combinations chỉ trong phạm vi được cấu hình, không ngầm tạo hai level mới | Bài tổng hợp cũ-mới trên sixteenth grid, dots, ties, rests và advanced combinations; độ khó phải minh bạch và không được gọi là L7/L8 mới |
| Level 6 | Dạy một progression thống nhất từ một nhóm ba móc đơn đến cả ba signatures; luôn giữ khác biệt simple/compound | Luyện 3/8, 6/8, 9/8 theo cùng một nhóm khái niệm nhưng với pulse và accent đúng meter; có notes, rests, dots, ties ở bước phù hợp | Một assessment tổng hợp cả 3/8, 6/8, 9/8; kiểm tra group count, pulse meaning, accent và pattern analysis, không tách thành ba khóa độc lập |
| Bonus 2/2 | Half-note pulse, hai phách chính, phân biệt 2/2 với 4/4; placement là optional learner progression | Đếm theo hai half pulses, so sánh cảm nhận tempo và bar capacity, thực hành mẫu hợp lệ | Kiểm tra nhận diện 2/2, half-pulse và phân biệt với 4/4; kết quả không bắt buộc để đi qua progression chính |

### D-07 — exercise progression và Tap Rhythm contract (APPROVED OWNER DECISION)

Theo latest owner Curriculum Decision Update received **2026-11-11 14:14 +07**, Multiple Choice là core để dạy rhythmic notation, nhận diện note/rest values, hiểu rhythmic structures và củng cố theory, nhưng không đủ một mình cho practical rhythm training. Tap Rhythm là một trong **bốn exercise kinds hiện có** (Multiple Choice, Tap Rhythm, Listen & Identify, Count the Beat); không thêm exercise kind thứ năm. Giữ nguyên sáu Level chính + Bonus optional và cấu trúc Lessons, Practice, Assessment. D-07 không thay đổi bảy meter đã duyệt, PPQ 480, duration/pulse semantics, accent hierarchy, beam rules, English-default app voice counting, visual counting hoặc metronome tick semantics.

| Mục | Curriculum content | Exercise direction đã duyệt |
|---|---|---|
| Level 1 | Basic notes: quarter note, half note, whole note; quarter rest | Multiple Choice + Listen & Identify |
| Level 2 | Eighth notes, eighth rests, binary subdivision | Multiple Choice + Listen & Identify |
| Level 3 | 2/4, 3/4, 4/4 | Giới thiệu practical Tap Rhythm lần đầu |
| Level 4 | Dotted notes và ties | Tap Rhythm + Multiple Choice |
| Level 5 | Sixteenth notes và advanced rhythmic combinations | Advanced Tap Rhythm |
| Level 6 | Một unit gồm 3/8, 6/8, 9/8 | Tap Rhythm với simple và compound pulse structures; không chia Level 6 thành course riêng |
| Bonus | 2/2 Alla Breve | Optional Tap Rhythm progression |

Không có Tap exercise, Tap worked example hoặc Tap assessment trước Level 3. Counting có thể giữ vai trò conceptual activity tại Level 1/2, nhưng không thêm compulsory exercise kind ở đó. Quyết định này không làm thay đổi Lessons/Practice/Assessment hoặc các cấu phần curriculum đã duyệt.

Tap Rhythm là bài thực hành performance: người học xem rhythmic pattern, theo metronome/reference timing của exercise và tap tại intended rhythmic onsets. Evaluator dùng actual tap timestamps so với expected onset timestamps, ghi nhận early/late taps, matched/missing/extra taps và áp dụng **ordered one-to-one tap-to-onset matching**. Không coi Tap Rhythm là multiple-choice question; số tap bằng số onset không tự nó chứng minh kết quả đúng.

Hiển thị **Timing Accuracy (%)** riêng với **Exercise Points**; shared scoring vẫn là correct completion `+10`, incorrect `+0`, và shared accuracy/average-response handling hiện có không đổi. Exact accuracy formula, matching windows/tolerances và performance grades là **PENDING TECHNICAL DETAIL**. Cũng để **PENDING**: continuous metronome trong mọi Tap exercise hay không; bỏ continuous guidance ở advanced exercises hay không; count-in/replay limits; separate reference performance cho mỗi exercise; device latency compensation/calibration. Matching-window và calibration hypotheses hiện có không phải final approved formula/parameters. Các mục này không chặn placement D-07 đã APPROVED.

## 2. Level 6 — một nhóm kiến thức thống nhất “Grouping in Threes”

Level 6 không phải ba khóa 3/8, 6/8 và 9/8. Đây là một learning group duy nhất, trong đó người học mở rộng cùng một ý niệm nhóm ba qua một, hai rồi ba nhóm, đồng thời học rằng cách nhóm giảng dạy không xóa bản chất meter.

### Tiến trình học bắt buộc

1. **Nhận diện một nhóm 3 móc đơn:** bắt đầu với 3/8 và nhận ra ba đơn vị móc đơn liên tiếp.
2. **Mở rộng thành hai nhóm:** chuyển sang 6/8, nhận ra hai nhóm 3+3 và hai dotted-quarter pulses.
3. **Mở rộng thành ba nhóm:** chuyển sang 9/8, nhận ra ba nhóm 3+3+3 và ba dotted-quarter pulses.
4. **So sánh số lượng nhóm và vị trí trọng âm:** đối chiếu một, hai, ba nhóm; không thay group count bằng pulse meaning.
5. **Phân tích notes, rests, dots và ties:** kiểm tra duration, onset, rest silence, tie continuation và vị trí trong group/pulse.
6. **Combined practice và assessment:** một bộ luyện và một assessment tổng hợp cả 3/8, 6/8, 9/8, có phân biệt simple/compound và không biến thành ba course độc lập.

### Các lớp nghĩa phải được tách rõ

| Meter | Bản chất nhạc lý và pulse kỹ thuật | Structural accent / shorthand | Điều không được suy ra |
|---|---|---|---|
| 3/8 | **Simple triple**: 3 phách đơn độc lập, mỗi phách là một eighth/móc đơn và dài 240 ticks; bar 720 ticks; pulse starts 0, 240, 480 | `Sww` — Mạnh–Nhẹ–Nhẹ | Không dựng một phách phức/compound parent cho cả ô; không đổi thành một phách kỹ thuật 720 ticks chỉ vì một bảng cũ ghi group count là 1 |
| 6/8 | **Compound duple**: 2 phách phức, mỗi phách là dotted-quarter và dài 720 ticks; mỗi phách phức gồm 3 phách đơn/eighths; bar 1440 ticks; group 3+3 | `Sww\|Mww` — Mạnh–Nhẹ–Nhẹ\|Vừa–Nhẹ–Nhẹ | Không đọc thành sáu phách phức hoặc sáu quarter-like pulses; phách đơn là subdivision bên trong phách phức |
| 9/8 | **Compound triple**: 3 phách phức, mỗi phách là dotted-quarter và dài 720 ticks; mỗi phách phức gồm 3 phách đơn/eighths; bar 2160 ticks; group 3+3+3 | `Sww\|Mww\|Mww` — Mạnh–Nhẹ–Nhẹ\|Vừa–Nhẹ–Nhẹ\|Vừa–Nhẹ–Nhẹ | Không gộp thành một 2160-tick pulse; ba phách phức không làm mất compound-triple identity |

Trong các chuỗi trên, `S` = **Mạnh**, `M` = **Vừa**, `w` = **Nhẹ**. Đây là structural accent của meter/teaching overlay, tách khỏi explicit note articulation; không thay đổi schema `segment.accent` binary. `S` là bar-level accent ở đầu ô; `M` là secondary beat accent ở đầu các phách phức sau; `w` là các phách đơn còn lại. Thứ bậc đã chốt là **Mạnh > Vừa > Nhẹ**; không coi mọi đầu nhóm là Mạnh. Không tự suy diễn numerical gain, velocity hoặc runtime behavior.

Với 3/8, ba eighth/móc đơn là **ba phách đơn độc lập**, giữ identity `Sww`, không phân tích thành một phách phức. Với 6/8 và 9/8, mỗi eighth là một **phách đơn/subdivision** bên trong lần lượt hai và ba **phách phức** dotted-quarter; pulse-level shorthand tương ứng là `S-M` và `S-M-M`.

Exact shorthand: `Sww`, `Sww|Mww`, `Sww|Mww|Mww`; `S` = Mạnh, `M` = Vừa, `w` = Nhẹ.

### Ghi chú về bảng nguồn “phách chính”

Bảng dữ liệu nguồn trước đây có thể được trích dẫn với dòng 3/8 ghi “phách chính: 1”. Dòng này chỉ được giữ lại nếu cần đối chiếu lịch sử, và phải kèm chú thích sau; cách diễn đạt này đã **SUPERSEDED**, không còn là câu hỏi chờ xác nhận semantic:

> “1” trong cột đó là cách ghi lịch sử đã bị thay thế. Contract V1 sử dụng **3 phách đơn/eighth pulses**, mỗi pulse 240 ticks; 3/8 không có compound parent và không chuyển sang một pulse 720 ticks. Cách đọc “3/8 phách chính 1” không còn được dùng để hỏi lại semantic đã chốt.

## 3. Meter registry nội dung V1 và PPQ = 480

Phạm vi review là **6 meter core + 1 meter Bonus**. Bảng dưới đây là contract nội dung/định nghĩa để review, không phải bằng chứng rằng code đã hỗ trợ.

| Meter | Phân loại | Bar capacity | Pulse unit | Pulse ticks | Số technical pulses | Pulse starts | Teaching/grouping |
|---|---|---:|---|---:|---:|---|---|
| 2/4 | Simple duple | 960 | quarter | 480 | 2 | 0, 480 | S-W |
| 3/4 | Simple triple | 1440 | quarter | 480 | 3 | 0, 480, 960 | S-W-W |
| 4/4 | Simple quadruple | 1920 | quarter | 480 | 4 | 0, 480, 960, 1440 | S-W-M-W nếu dùng medium stress; tối thiểu S-W |
| 3/8 | Simple triple | 720 | eighth | 240 | 3 | 0, 240, 480 | 3 simple beats; `Sww` |
| 6/8 | Compound duple | 1440 | dotted quarter | 720 | 2 | 0, 720 | 2 compound beats, each 3 simple-beat subdivisions; `Sww\|Mww`; pulse `S-M` |
| 9/8 | Compound triple | 2160 | dotted quarter | 720 | 3 | 0, 720, 1440 | 3 compound beats, each 3 simple-beat subdivisions; `Sww\|Mww\|Mww`; pulse `S-M-M` |
| Bonus 2/2 | Alla breve | 1920 | half | 960 | 2 | 0, 960 | S-W; mỗi pulse tương ứng một nốt trắng |

Các giá trị phải tiếp tục được hiểu cùng với duration, rest, tie, whole-exercise và onset-only policies đã có. Công thức thời gian tương lai vẫn là `seconds = (ticks / pulseTicks) * (60 / BPM)`, trong đó BPM phải gắn nhãn với pulse đang được dạy: quarter-note BPM cho 2/4, 3/4, 4/4; eighth-note BPM cho 3/8; dotted-quarter BPM cho 6/8 và 9/8; half-note BPM cho 2/2. Không được dùng numerator hoặc denominator đơn độc để suy ra pulse.

## 4. Bonus 2/2 và ranh giới với progression chính

2/2 là Bonus optional learner progression, không bắt buộc để hoàn thành Levels 1–6. Tuy vậy, đây vẫn là **V1-supported feature** và nằm trong phạm vi review cùng bảy meter, không phải dữ liệu ngoài scope.

| Nội dung Bonus | Quyết định |
|---|---|
| Pulse | Hai half-note pulses, mỗi pulse 960 ticks |
| Bar | 1920 ticks với PPQ 480 |
| Pulse starts | 0 và 960 |
| Accent teaching | S-W; pulse đầu bar mạnh hơn |
| So sánh bắt buộc | 2/2 với 4/4: capacity có thể giống nhưng pulse semantics và cảm nhận tempo khác |
| Placement | Optional; không chen vào Level 4 và không thay đổi thứ tự approved |
| Cấu phần | Lessons, Practice, Assessment vẫn bắt buộc nếu feature được mở cho learner |

## 5. Ba presentation decision đã được owner APPROVED

Ba ID P-01/P-02/P-03 được giữ để truy vết lịch sử, nhưng trạng thái hiện hành của cả ba là **APPROVED OWNER DECISION**. Các quyết định này chốt cách trình bày nội dung; chúng không cấp runtime/implementation approval và không cần hỏi lại.

### P-01 — Beam notation

| Phạm vi | Quyết định đã chốt |
|---|---|
| `3/8` | Mỗi móc đơn/eighth là một nốt **riêng có flag**, không beam ba nốt với nhau; giữ rõ 3 phách đơn độc lập. Không còn bar-wide beam hoặc optional beam proposal active. |
| `6/8` | Beam theo group `3+3`, không beam xuyên ranh giới phách phức. |
| `9/8` | Beam theo group `3+3+3`, không beam xuyên ranh giới các phách phức. |
| Sixteenths/rests/mixed-duration | Theo notation rules phù hợp, giữ ranh giới phách/phách phức. Các secondary-beam case chưa quy định là pending kỹ thuật, không reopen approved eighth rule. |

### P-02 — Counting presentation

| Phương thức | Quyết định đã chốt |
|---|---|
| **App Voice Counting** | Tự đọc số tiếng Anh mặc định: `One, Two, Three...`; không có yêu cầu Vietnamese-first voice. |
| **Visual Counting** | Hiện con số tương ứng tại vị trí đếm; người học tự đếm bằng ngôn ngữ họ muốn, không ép tiếng Anh. Numeric display không đồng nhất với ngôn ngữ voice. |
| **Metronome TICK** | Âm tick, tick, tick... theo contract metronome hiện có; không cần số hoặc syllable, không thay technical pulse/subdivision. |

Đây là ba phương thức trình bày, không phải ba exercise/session modes. Không tự chốt syllable `Một-và-a`, `la-li`, detailed compound spoken mapping, speech scheduling hoặc giọng bổ sung ngoài request.

### P-03 — Accent presentation

| Hình thức | Quyết định đã chốt |
|---|---|
| **Text-based** | `Mạnh–Vừa–Nhẹ` hoặc `Mạnh–Nhẹ–Nhẹ` tùy meter; có thể dùng font weight/độ đậm và group boundary. |
| **Symbol-based** | Có thể dùng gạch nối, gạch dưới hoặc đồ họa; được phép dùng màu để phân biệt. |
| Accessibility | Không bắt buộc kết hợp chữ + ký hiệu + màu. Nếu dùng màu, phải đủ contrast và khả năng nhận biết; không áp dụng blanket rule “không color-only”. |
| Structural boundary | Strong = Mạnh, Medium = Vừa, Weak = Nhẹ; hierarchy Mạnh > Vừa > Nhẹ và exact `3/8 Sww`, `6/8 Sww\|Mww`, `9/8 Sww\|Mww\|Mww` giữ nguyên. |

Structural accent không phải explicit note articulation, không tự đặt gain/velocity schema và không đổi binary `segment.accent`.

## 6. Các quyết định nội dung vẫn đang pending xác nhận chi tiết

Các mục dưới đây **không làm thay đổi thứ tự, placement hoặc ba presentation decision đã APPROVED**. Chúng chỉ là chi tiết kỹ thuật/curriculum/pilot cần xác nhận trước khi biến curriculum thành runtime behavior.

| Hạng mục pending | Câu hỏi cần xác nhận | Ranh giới tạm thời trong tài liệu này |
|---|---|---|
| Secondary-beam cases | Sixteenths và các tổ hợp mixed-duration cần secondary beam chi tiết ra sao trong từng meter? | Giữ nguyên eighth rule đã APPROVED: 3/8 từng nốt flag riêng, 6/8 là 3+3, 9/8 là 3+3+3; không beam xuyên ranh giới phách phức. |
| Rest/mixed-duration notation detail | Các tổ hợp rests, dots, ties và mixed duration cụ thể được đặt trong group/pulse thế nào? | Giữ duration, onset, rest silence, tie và ranh giới phách/phách phức; chưa tự mở rộng case chưa review. |
| Tempo ranges và pilot | Khoảng BPM nào phù hợp từng pulse unit và learner cohort? | Chỉ dùng meter-labeled tempo hypotheses trong content review; chưa coi là validated standard hoặc hard gate. |
| Lesson/Practice/Assessment quotas và density | Mỗi level/Bonus cần bao nhiêu bài, pattern diversity, mật độ và mức interaction? | Mỗi mục phải có đủ ba cấu phần; quotas/density/thresholds chờ pilot và content confirmation. |
| Dotted eighth | Đưa dotted eighth vào thời điểm nào sau khi sixteenth grid đã được dạy? | Không có dotted eighth trong Level 4; giữ deferred-until-Level-5 policy. |
| Relative difficulty của Level 5 consolidation | Bao nhiêu nội dung cũ L7/L8 được ôn mà không tạo level mới? | Chỉ consolidation có kiểm soát, cấu hình bằng difficulty budget; không công bố L7/L8 mới. |
| Optional Bonus display (không mở lại placement đã chốt) | Hiện Bonus trong learner path mặc định hay sau điều kiện nội dung nào? | Bonus là optional; placement 2/2 không chuyển thành Level 4 và không thay thế Level 6. |
| Tap Rhythm timing accuracy và matching parameters | Accuracy formula, numerical matching windows/tolerances và performance grades thế nào? | **PENDING TECHNICAL DETAIL**. Giữ ordered one-to-one matching theo thứ tự giữa actual tap timestamps và expected onset timestamps; không dùng count-only correctness. Không dùng matching-window hypotheses như ngưỡng đã approved. Shared accuracy/average-response handling không đổi. |
| Metronome, count-in, replay và reference performance cho Tap | Metronome có phát xuyên suốt mọi exercise không; advanced exercises có bỏ guidance không; count-in/replay limits là gì; có separate reference performance không? | **PENDING TECHNICAL DETAIL**; không tự quyết định trong curriculum review. |
| Tap device timing fairness | Latency compensation và calibration policy thế nào? | **PENDING TECHNICAL DETAIL**; calibration hypotheses chưa phải policy đã duyệt. |

Không có expert approval, teacher signoff, pilot result, test pass hoặc job-status completion claim nào được đưa ra trong tài liệu này. Các mục pending trên là báo cáo trạng thái thực tế, không phải kết quả thử nghiệm.

## 7. Phạm vi ảnh hưởng đến đặc tả và những gì được giữ nguyên

### Các phần cần đồng bộ khi có implementation approval sau này

| Phần đặc tả | Phạm vi review nội dung |
|---|---|
| Learning objectives | Đổi sang sáu Level + Bonus, nêu rõ Level 6 unified grouping và distinction simple/compound |
| Level progression | Dùng thứ tự L1 → L6; Bonus optional; không dùng tám-level progression cũ |
| Lesson structure | Mỗi Level/Bonus có Lessons; Level 6 đi theo sáu bước exact sequence |
| Practice structure | Mỗi Level/Bonus có Practice; Level 6 combined practice cho cả ba signatures |
| Assessment structure | Mỗi Level/Bonus có Assessment; Level 6 combined assessment cả 3/8, 6/8, 9/8 |
| Meter registry | Review đủ 6 core + Bonus 2/2 với pulseTicks và starts chính xác |
| Rhythm generator | Sau này phải chọn meter-aware vocabulary và difficulty budget theo curriculum; không fallback/coerce 3/8 thành 6/8 |
| Notation renderer | Phải giữ ba presentation decision đã APPROVED; secondary-beam cases vẫn cần chi tiết kỹ thuật riêng |
| Test coverage requirements | Chỉ là test proposals/future acceptance requirements; chưa có test mới được chạy hoặc pass claim |
| Release acceptance criteria | Content approval và runtime/release approval là hai cổng riêng, xem mục 8 |

### Các contract không bị thay đổi bởi review này

Giữ nguyên các quyết định kỹ thuật đã được ghi nhận: exact duration arithmetic với PPQ 480; rests tiêu thụ đủ duration nhưng không tạo onset; tie continuation không tạo attack mới; whole-exercise scoring `+10/+0`; existing shared accuracy/average-response handling; Tap matching là onset-only, không đo hold duration và phải theo ordered one-to-one matching; `currentTime`/clock mapping hiện có; bốn local exercise kinds Multiple Choice, Tap Rhythm, Listen & Identify, Count the Beat; hai shared wrappers Free và Challenge; boundaries của Free Challenge; và các policy về audio confidence, abort/ungraded attempt, replay và technical interruption. Không coi bất kỳ matching-window hypothesis nào là approved parameter: windows, accuracy formula, Tap replay/count-in limits và latency calibration vẫn pending theo D-07.

Các thay đổi curriculum này không cho phép sửa Note Reading, shared architecture, Audio Scheduler, database, WordPress, UI activation, MIDI, microphone, production deployment hay shared progress schema. Mọi điều chỉnh runtime tương lai phải được phê duyệt riêng sau content review.

### Trạng thái code hiện tại

Baseline hiện tại vẫn có **8 legacy levels** và generator với **four-meter policies**. Riêng **seven-meter canonical-to-SVG gate đã được implement và tested previously**; điều đó không chứng minh generator đã chuyển khỏi 8 legacy levels/four-meter policies, hoặc curriculum/Tap/audio/UI đã active. Tap, audio và UI hiện chưa active. Đây là trạng thái baseline có trước review, không phải test mới hoặc test-pass claim phát sinh từ tài liệu này; tài liệu không cấp runtime support/approval, không mở module và không đổi schema.

## 8. Release content approval tách biệt với runtime approval

### Content approval

Content approval xác nhận rằng thứ tự, placement, learning group, terminology, meter semantics, lesson/practice/assessment coverage, D-07 exercise direction và ba presentation decision P-01/P-02/P-03 đã đủ rõ để đưa vào implementation planning. Trong phạm vi tài liệu này, **cả ba presentation decision đã được chủ sản phẩm xác nhận và không hỏi lại**: P-01 beam eighth/grouping, P-02 ba counting presentation methods và P-03 hai hình thức accent presentation. Không hỏi lại 3/8 = 3 phách đơn hoặc hierarchy Mạnh/Vừa/Nhẹ. Các chi tiết secondary beam, rests/mixed-duration, tempo/pilot, quotas/density, Bonus display (không mở lại placement đã chốt), và D-07 Tap accuracy formula/windows/grades, metronome guidance, count-in/replay, reference performance, latency/calibration vẫn pending; các mục Tap này không chặn placement đã duyệt.

### Runtime/implementation approval

Runtime approval là cổng riêng, chưa được cấp bởi tài liệu này. Trước runtime approval, không được sửa source/test hoặc bật module. Nếu sau này được phê duyệt implementation, cần review/acceptance riêng cho canonical model, generator, notation, audio, exercise lifecycle, timing fairness, accessibility, browser/device behavior và release gate. Các test/acceptance đề xuất trong tài liệu này không phải test đã chạy và không phải pass claim.

Release gate tương lai phải kiểm tra đủ **7 V1-supported meters** theo đúng semantics, cùng curriculum coverage của 6 Level + Bonus. Không được dùng bằng chứng “4 legacy meters” để kết luận curriculum mới đã được hỗ trợ.

## 9. Kết luận review

Bản scope này thay thế cách diễn đạt cũ về tám level và phạm vi meter cũ bằng curriculum đã duyệt: Level 1 quarter rest only trong vocabulary cơ bản; Level 2 eighth/binary subdivision; Level 3 simple meters 2/4–3/4–4/4; Level 4 dots/ties với dotted eighth deferred; Level 5 sixteenths và advanced combinations có consolidation kiểm soát; Level 6 là một learning group Grouping in Threes gồm 3/8, 6/8, 9/8; Bonus 2/2 optional nhưng V1-supported.

P-01 beam, P-02 counting và P-03 accent presentation đều đã **APPROVED OWNER DECISION**: 3/8 từng móc đơn flag riêng; 6/8 là 3+3; 9/8 là 3+3+3; counting gồm App Voice Counting, Visual Counting và Metronome TICK; accent có text-based hoặc symbol-based presentation với điều kiện màu phải accessible nếu dùng. Không có quyết định nào trong ba mục này cấp runtime approval. D-07 cũng là **APPROVED OWNER DECISION**: Level 1/2 Multiple Choice + Listen & Identify; Level 3 là điểm bắt đầu Tap thực hành; Level 4 Tap + Multiple Choice; Level 5 Advanced Tap; Level 6 là một unit Tap cho 3/8, 6/8, 9/8 với simple/compound pulse structures; Bonus 2/2 optional Tap. Timing Accuracy formula/windows/grades, metronome continuity hoặc bỏ guidance ở advanced, count-in/replay limits, separate reference performance, latency compensation/calibration vẫn **PENDING TECHNICAL DETAIL** và không chặn placement. Không có thay đổi code, test, UI, catalog, audio, metronome, MIDI, microphone, database hoặc shared architecture được thực hiện.
