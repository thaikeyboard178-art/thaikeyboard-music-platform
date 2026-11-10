# Music Education Review Scope — Rhythm Training V1

> **Nguồn quyết định đã chốt:** đính chính trực tiếp của chủ sản phẩm ngày2026-11-11 lúc02:48:29 +07:00. Xem [Decision Review](./Decision-Review.md). Không sử dụng phương án accent hierarchy trước đây của Manus/ChatGPT. Đây là quyết định nội dung, không phải giáo viên signoff do Manus tự nhận hoặc quyền triển khai code.

**Trạng thái tài liệu:** cập nhật phạm vi nội dung đã được duyệt; chỉ là tài liệu review, chưa triển khai.

**Phạm vi được ghi nhận:** curriculum V1 gồm **6 Level chính + 1 Bonus**, tương ứng **7 meter V1 được hỗ trợ về mặt nội dung**: 2/4, 3/4, 4/4, 3/8, 6/8, 9/8 và Bonus 2/2. Tài liệu này không coi 7 meter là “6 meter”, không giữ cấu trúc tám level cũ, và không coi bốn meter hiện có trong code là phạm vi curriculum đã hoàn tất.

**Ranh giới công việc:** đây là bản cập nhật documentation-only. Không có source, test, TypeScript/TSX/JavaScript/CSS/JSON/database/infrastructure/dependency/shared architecture/Note Reading nào được sửa. Không kích hoạt UI hoặc catalog, không thêm audio, metronome, MIDI, microphone, Phase 3, deploy, project mới hay repository mới. Chỉ có thể lưu các Markdown/review bằng commit thường trong GitHub hiện hữu; không rewrite history hoặc deploy. Tài liệu này không cấp quyền sửa runtime.

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

## 5. Ba đề xuất presentation riêng — chưa chốt, chưa triển khai

Ba mục dưới đây chỉ là **PROPOSED** cho cách trình bày; không phải quyết định music semantics và không được dùng để thay đổi meter, pulse, timing, duration, attack, tie, rest hoặc scoring.

### PROPOSED 1 — Beam notation

- **Đề xuất ngắn:** cho 3/8 phép hai presentation option: beam toàn ô `3` hoặc beam theo từng pulse-first; cả hai đều phải hiển thị đúng **3 phách đơn**. Với compound, giữ group `3+3` cho 6/8 và `3+3+3` cho 9/8.
- **Lý do:** beam cần giúp người học nhìn thấy cấu trúc mà không biến 3/8 thành compound parent; compound cần cho thấy phách phức và ba phách đơn bên trong.
- **Guardrail:** option 3/8 không đổi 3 simple beats, pulse starts hoặc PPQ. Secondary sixteenth-beam convention trong 6/8 và 9/8 chưa chốt; không tự suy ra implementation.
- **Trạng thái:** **PROPOSED**.

### PROPOSED 2 — Cách đếm bằng tiếng Việt

- **Đề xuất ngắn:** dùng phương án Việt rõ nghĩa, không chỉ dùng chuỗi “la-li” hoặc số tiếng Anh. Simple meter có thể nói `1–2–3`; compound có thể thử `Một-và-a / Hai-và-a / Ba-và-a` hoặc nhãn `phách 1, phần 1/2/3` tùy mục tiêu bài.
- **Lý do:** cần phân biệt `simple 1-2-3` với một phách phức được chia thành ba phách đơn; người học phải nghe và nói được tầng phách đang đếm.
- **Guardrail:** các syllable tiếng Việt cụ thể chưa được duyệt; không đưa vào audio/count-in/runtime, không gọi một phách compound là ba phách ngang hàng. Giữ đúng distinction giữa phách đơn và phách phức.
- **Trạng thái:** **PROPOSED**.

### PROPOSED 3 — Cách thể hiện trọng âm trên UI

- **Đề xuất ngắn:** hiển thị 3 mức bằng text label, font/weight và boundary/grouping rõ ràng: `Mạnh`, `Vừa`, `Nhẹ`; thể hiện bar boundary và compound-beat boundary trực tiếp.
- **Lý do:** learner cần thấy hierarchy `Mạnh > Vừa > Nhẹ` và ranh giới phách, kể cả khi không nghe audio hoặc có hạn chế về màu sắc.
- **Guardrail:** không dùng màu đơn độc; text labels, font và boundaries phải accessible. Đây là structural accent presentation, không phải explicit note articulation và không thay schema `segment.accent` binary.
- **Trạng thái:** **PROPOSED**.

## 6. Các quyết định nội dung vẫn đang pending xác nhận chi tiết

Các mục dưới đây **không làm thay đổi thứ tự hoặc placement đã approved**. Chúng chỉ là chi tiết nội dung/pilot cần xác nhận trước khi biến curriculum thành runtime behavior.

| Hạng mục pending | Câu hỏi cần xác nhận | Ranh giới tạm thời trong tài liệu này |
|---|---|---|
| Chi tiết beam/secondary-beam | Chọn presentation convention nào trong các phương án ở mục 5? | Chỉ là PROPOSED; không thay đổi pulse coordinates, duration, onset hoặc meter identity. |
| Chi tiết spoken Vietnamese labels/counting | Chọn syllable/label tiếng Việt nào sau content review? | Vietnamese-first là yêu cầu; syllable cụ thể vẫn PROPOSED và chưa dùng cho audio/count-in. |
| Tempo ranges và pilot | Khoảng BPM nào phù hợp từng pulse unit và learner cohort? | Chỉ dùng meter-labeled tempo hypotheses trong content review; chưa coi là validated standard hoặc hard gate. |
| Lesson/Practice/Assessment density | Mỗi level/Bonus cần bao nhiêu bài, pattern diversity và mức interaction? | Mỗi mục phải có đủ ba cấu phần; quotas/density/thresholds chờ pilot và content confirmation. |
| Dotted eighth | Đưa dotted eighth vào thời điểm nào sau khi sixteenth grid đã được dạy? | Không có dotted eighth trong Level 4; giữ deferred-until-Level-5 policy. |
| Relative difficulty của Level 5 consolidation | Bao nhiêu nội dung cũ L7/L8 được ôn mà không tạo level mới? | Chỉ consolidation có kiểm soát, cấu hình bằng difficulty budget; không công bố L7/L8 mới. |
| Optional Bonus progression | Có hiện Bonus trong learner path mặc định hay chỉ sau khi hoàn thành điều kiện nội dung? | Bonus là optional; placement không chuyển thành Level 4 và không thay thế Level 6. |

Không có expert approval, teacher signoff, pilot result hoặc job-status completion claim nào được đưa ra trong tài liệu này.

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
| Notation renderer | Beam là presentation decision pending; không được làm mất pulse identity |
| Test coverage requirements | Chỉ là test proposals/future acceptance requirements; chưa có test mới được chạy hoặc pass claim |
| Release acceptance criteria | Content approval và runtime/release approval là hai cổng riêng, xem mục 8 |

### Các contract không bị thay đổi bởi review này

Giữ nguyên các quyết định kỹ thuật đã được ghi nhận trong tài liệu trước: exact duration arithmetic với PPQ 480; rests tiêu thụ đủ duration nhưng không tạo onset; tie continuation không tạo attack mới; whole-exercise scoring `+10/+0`; tap matching là onset-only và không đo hold duration; `currentTime`/clock mapping và matching windows hiện có; bốn local exercise kinds Multiple Choice, Tap Rhythm, Listen & Identify, Count the Beat; hai shared wrappers Free và Challenge; boundaries của Free Challenge; và các policy về audio confidence, abort/ungraded attempt, replay và technical interruption.

Các thay đổi curriculum này không cho phép sửa Note Reading, shared architecture, Audio Scheduler, database, WordPress, UI activation, MIDI, microphone, production deployment hay shared progress schema. Mọi điều chỉnh runtime tương lai phải được phê duyệt riêng sau content review.

### Trạng thái code hiện tại

Code hiện tại vẫn ở trạng thái **8 legacy levels** và **4 meters trong library ở trạng thái inert/ComingSoon**. **7 V1-supported meters và current curriculum chưa được triển khai**; tài liệu này không claim runtime support, không mở module và không thay đổi schema.

## 8. Release content approval tách biệt với runtime approval

### Content approval

Content approval chỉ xác nhận rằng thứ tự, placement, learning group, terminology, meter semantics, lesson/practice/assessment coverage và pending content decisions đã đủ rõ để đưa vào implementation planning. Trong phạm vi tài liệu này, **thứ tự, placement và quy ước nhạc lý/trọng âm Level6 đã được chủ sản phẩm xác nhận**. Không hỏi lại3/8=3 phách đơn hoặc hierarchy Mạnh/Vừa/Nhẹ. Chỉ ba đề xuất presentation trong mục5 và các chi tiết pilot không liên quan trong mục6 còn mở.

### Runtime/implementation approval

Runtime approval là cổng riêng, chưa được cấp bởi tài liệu này. Trước runtime approval, không được sửa source/test hoặc bật module. Nếu sau này được phê duyệt implementation, cần review/acceptance riêng cho canonical model, generator, notation, audio, exercise lifecycle, timing fairness, accessibility, browser/device behavior và release gate. Các test/acceptance đề xuất trong tài liệu này không phải test đã chạy và không phải pass claim.

Release gate tương lai phải kiểm tra đủ **7 V1-supported meters** theo đúng semantics, cùng curriculum coverage của 6 Level + Bonus. Không được dùng bằng chứng “4 legacy meters” để kết luận curriculum mới đã được hỗ trợ. Kết quả lịch sử **436/436 tests trên 40 files** chỉ là historical context từ tài liệu trước, không phải fresh run và không phải bằng chứng hỗ trợ 3/8, 9/8 hoặc 2/2.

## 9. Kết luận review

Bản scope này thay thế cách diễn đạt cũ về tám level và phạm vi meter cũ bằng curriculum đã duyệt: Level 1 quarter rest only trong vocabulary cơ bản; Level 2 eighth/binary subdivision; Level 3 simple meters 2/4–3/4–4/4; Level 4 dots/ties với dotted eighth deferred; Level 5 sixteenths và advanced combinations có consolidation kiểm soát; Level 6 là một learning group Grouping in Threes gồm 3/8, 6/8, 9/8; Bonus 2/2 optional nhưng V1-supported.

Các quyết định pending còn lại chỉ là detail confirmation về beam/secondary convention, spoken Vietnamese labels, tempo pilot, lesson/assessment density và các quota/pilot không liên quan. Ba cách trình bày beam, đếm tiếng Việt và trọng âm UI chỉ ở trạng thái **PROPOSED**, chưa chốt và chưa triển khai. Không có thay đổi code, test, UI, catalog, audio, metronome, MIDI, microphone, Phase 3, deploy, database hoặc shared architecture được thực hiện.

**Các path đã viết:**

1. `/home/ubuntu/six-meter-review/Music-Education-Review-Scope.md`
2. `/home/ubuntu/notnhac/client/src/modules/rhythm-training/docs/Music-Education-Review-Scope.md`

**Open questions:** các mục trong bảng pending ở mục 6 và ba đề xuất PROPOSED ở mục 5. “3/8 phách chính 1” và accent hierarchy trước đây chỉ là lịch sử đã bị thay thế, không còn là câu hỏi semantic. Trạng thái GitHub bàn giao được ghi riêng sau push của parent; review này không tự nhận teacher signoff, test pass hoặc runtime approval.
