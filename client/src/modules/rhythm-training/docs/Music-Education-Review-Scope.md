# Music Education Review Scope — Rhythm Training V1

**Trạng thái tài liệu:** cập nhật phạm vi nội dung đã được duyệt; chỉ là tài liệu review, chưa triển khai.

**Phạm vi được ghi nhận:** curriculum V1 gồm **6 Level chính + 1 Bonus**, tương ứng **7 meter V1 được hỗ trợ về mặt nội dung**: 2/4, 3/4, 4/4, 3/8, 6/8, 9/8 và Bonus 2/2. Tài liệu này không coi 7 meter là “6 meter”, không giữ cấu trúc tám level cũ, và không coi bốn meter hiện có trong code là phạm vi curriculum đã hoàn tất.

**Ranh giới công việc:** đây là bản cập nhật documentation-only. Không có source, test, TypeScript/TSX/JavaScript/CSS/JSON/database/infrastructure/dependency/shared architecture/Note Reading nào được sửa. Không kích hoạt UI hoặc catalog, không thêm audio, metronome, MIDI, microphone, Phase 3, deploy, project mới hay repository mới. Không có Git operation trong công việc này.

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

| Meter | Bản chất nhạc lý và pulse kỹ thuật | Teaching grouping/accent string | Điều không được suy ra |
|---|---|---|---|
| 3/8 | **Simple triple**: 3 eighth-note pulses, mỗi pulse 240 ticks; bar 720 ticks; pulse starts 0, 240, 480 | `Sww` | Không coi toàn bộ 720 ticks là một pulse compound; không đổi thành một phách kỹ thuật chỉ vì một bảng cũ ghi group count là 1 |
| 6/8 | **Compound duple**: 2 dotted-quarter pulses, mỗi pulse 720 ticks; bar 1440 ticks; group 3+3 | `Sww\|Sww` | Không đọc thành sáu quarter-like pulses; hai group không phải ba group |
| 9/8 | **Compound triple**: 3 dotted-quarter pulses, mỗi pulse 720 ticks; bar 2160 ticks; group 3+3+3 | `Sww\|Sww\|Sww` | Không gộp thành một 2160-tick pulse; ba teaching groups không làm mất compound-triple identity |

Trong các chuỗi teaching ở trên, `S` là đầu nhóm đang được nhấn trong overlay giảng dạy và `w` là các đơn vị nhẹ hơn trong nhóm. Đây là teaching accent pattern, không phải toàn bộ relative metrical hierarchy. Với 6/8 và 9/8, pulse đầu ô nhịp phải mạnh hơn các group start nội bộ theo hierarchy tương đối; các group start sau đó được dạy là yếu hơn theo cấu trúc compound. Cách biểu diễn gain, velocity hoặc mức nhấn cụ thể không được tự suy diễn: cần copy/relative-gain review và educator confirmation trước khi đưa vào runtime.

Với 3/8, ba pulse eighth-note là ba phách đơn độc lập và giữ identity `Sww`. Mô hình group ba là cách tổ chức nội dung giảng dạy chung, không được dùng để chuyển 3/8 sang pulse 720 hoặc compound meter. Với 6/8 và 9/8, 3+3 và 3+3+3 là subdivision bên trong lần lượt hai và ba dotted-quarter pulses.

### Ghi chú về bảng nguồn “phách chính”

Bảng dữ liệu nguồn trước đây có thể được trích dẫn với dòng 3/8 ghi “phách chính: 1”. Dòng này chỉ được giữ lại nếu cần đối chiếu lịch sử, và phải kèm chú thích sau:

> “1” trong cột đó được hiểu là **số group ba móc đơn dùng cho teaching grouping**, không phải số technical pulse của 3/8. Contract V1 sử dụng **3 technical eighth pulses**, mỗi pulse 240 ticks. Không được áp dụng cách đọc “1 phách kỹ thuật” cho 3/8 nếu chưa có phê duyệt mới; cũng không được chuyển pulse 3/8 sang 720 ticks.

## 3. Meter registry nội dung V1 và PPQ = 480

Phạm vi review là **6 meter core + 1 meter Bonus**. Bảng dưới đây là contract nội dung/định nghĩa để review, không phải bằng chứng rằng code đã hỗ trợ.

| Meter | Phân loại | Bar capacity | Pulse unit | Pulse ticks | Số technical pulses | Pulse starts | Teaching/grouping |
|---|---|---:|---|---:|---:|---|---|
| 2/4 | Simple duple | 960 | quarter | 480 | 2 | 0, 480 | S-W |
| 3/4 | Simple triple | 1440 | quarter | 480 | 3 | 0, 480, 960 | S-W-W |
| 4/4 | Simple quadruple | 1920 | quarter | 480 | 4 | 0, 480, 960, 1440 | S-W-M-W nếu dùng medium stress; tối thiểu S-W |
| 3/8 | Simple triple | 720 | eighth | 240 | 3 | 0, 240, 480 | 1 teaching group of 3; `Sww` |
| 6/8 | Compound duple | 1440 | dotted quarter | 720 | 2 | 0, 720 | 2 groups of 3; `Sww\|Sww` |
| 9/8 | Compound triple | 2160 | dotted quarter | 720 | 3 | 0, 720, 1440 | 3 groups of 3; `Sww\|Sww\|Sww` |
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

## 5. Các quyết định nội dung vẫn đang pending xác nhận chi tiết

Các mục dưới đây **không làm thay đổi thứ tự hoặc placement đã approved**. Chúng chỉ là chi tiết nội dung/pilot cần xác nhận trước khi biến curriculum thành runtime behavior.

| Hạng mục pending | Câu hỏi cần xác nhận | Ranh giới tạm thời trong tài liệu này |
|---|---|---|
| Nhãn “3/8 phách chính 1” | Nhãn “1” có phải group count trong bảng nguồn hay có ý nghĩa khác? | Mặc định tài liệu này là group count; technical contract vẫn là 3 eighth pulses × 240 ticks. Cần teacher confirmation label. |
| Accent tương đối giữa các bar/group | Dạy sự lặp `Sww` như teaching overlay thế nào mà vẫn giữ first-bar-pulse hierarchy? | Giữ exact strings `Sww`, `Sww\|Sww`, `Sww\|Sww\|Sww`; gain/velocity/relative hierarchy cần educator confirmation. |
| Beam và secondary-beam convention | 3/8 có beam cả bar hay tách theo từng pulse? 6/8 và 9/8 dùng secondary break nào? | Beam là presentation convention, không thay đổi pulse coordinates, duration, onset hay meter identity. Chưa chọn convention cuối. |
| Spoken Vietnamese labels/counting | Dùng tên gọi nào cho pulse, group, “móc đơn”, “phách”, dotted-quarter và subdivision? | Vietnamese-first copy là yêu cầu; chuỗi nói cụ thể cần content/educator review trước audio/count-in. |
| Tempo ranges và pilot | Khoảng BPM nào phù hợp từng pulse unit và learner cohort? | Chỉ dùng meter-labeled tempo hypotheses trong content review; chưa coi là validated standard hoặc hard gate. |
| Lesson/Practice/Assessment density | Mỗi level/Bonus cần bao nhiêu bài, pattern diversity và mức interaction? | Mỗi mục phải có đủ ba cấu phần; quotas/density/thresholds chờ pilot và content confirmation. |
| Dotted eighth | Đưa dotted eighth vào thời điểm nào sau khi sixteenth grid đã được dạy? | Không có dotted eighth trong Level 4; giữ deferred-until-Level-5 policy. |
| Relative difficulty của Level 5 consolidation | Bao nhiêu nội dung cũ L7/L8 được ôn mà không tạo level mới? | Chỉ consolidation có kiểm soát, cấu hình bằng difficulty budget; không công bố L7/L8 mới. |
| Optional Bonus progression | Có hiện Bonus trong learner path mặc định hay chỉ sau khi hoàn thành điều kiện nội dung? | Bonus là optional; placement không chuyển thành Level 4 và không thay thế Level 6. |

Không có expert approval, teacher signoff, pilot result hoặc job-status completion claim nào được đưa ra trong tài liệu này.

## 6. Phạm vi ảnh hưởng đến đặc tả và những gì được giữ nguyên

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
| Release acceptance criteria | Content approval và runtime/release approval là hai cổng riêng, xem mục 7 |

### Các contract không bị thay đổi bởi review này

Giữ nguyên các quyết định kỹ thuật đã được ghi nhận trong tài liệu trước: exact duration arithmetic với PPQ 480; rests tiêu thụ đủ duration nhưng không tạo onset; tie continuation không tạo attack mới; whole-exercise scoring `+10/+0`; tap matching là onset-only và không đo hold duration; `currentTime`/clock mapping và matching windows hiện có; bốn local exercise kinds Multiple Choice, Tap Rhythm, Listen & Identify, Count the Beat; hai shared wrappers Free và Challenge; boundaries của Free Challenge; và các policy về audio confidence, abort/ungraded attempt, replay và technical interruption.

Các thay đổi curriculum này không cho phép sửa Note Reading, shared architecture, Audio Scheduler, database, WordPress, UI activation, MIDI, microphone, production deployment hay shared progress schema. Mọi điều chỉnh runtime tương lai phải được phê duyệt riêng sau content review.

## 7. Release content approval tách biệt với runtime approval

### Content approval

Content approval chỉ xác nhận rằng thứ tự, placement, learning group, terminology, meter semantics, lesson/practice/assessment coverage và pending content decisions đã đủ rõ để đưa vào implementation planning. Trong phạm vi tài liệu này, **thứ tự và placement đã approved**; các chi tiết trong mục 5 vẫn cần confirmation.

### Runtime/implementation approval

Runtime approval là cổng riêng, chưa được cấp bởi tài liệu này. Trước runtime approval, không được sửa source/test hoặc bật module. Nếu sau này được phê duyệt implementation, cần review/acceptance riêng cho canonical model, generator, notation, audio, exercise lifecycle, timing fairness, accessibility, browser/device behavior và release gate. Các test/acceptance đề xuất trong tài liệu này không phải test đã chạy và không phải pass claim.

Release gate tương lai phải kiểm tra đủ **7 V1-supported meters** theo đúng semantics, cùng curriculum coverage của 6 Level + Bonus. Không được dùng bằng chứng “4 legacy meters” để kết luận curriculum mới đã được hỗ trợ. Kết quả lịch sử **436/436 tests trên 40 files** chỉ là historical context từ tài liệu trước, không phải fresh run và không phải bằng chứng hỗ trợ 3/8, 9/8 hoặc 2/2.

## 8. Kết luận review

Bản scope này thay thế cách diễn đạt cũ về tám level và phạm vi meter cũ bằng curriculum đã duyệt: Level 1 quarter rest only trong vocabulary cơ bản; Level 2 eighth/binary subdivision; Level 3 simple meters 2/4–3/4–4/4; Level 4 dots/ties với dotted eighth deferred; Level 5 sixteenths và advanced combinations có consolidation kiểm soát; Level 6 là một learning group Grouping in Threes gồm 3/8, 6/8, 9/8; Bonus 2/2 optional nhưng V1-supported.

Các quyết định pending còn lại chỉ là detail confirmation về nhãn 3/8, accent hierarchy, beam/secondary convention, spoken Vietnamese labels, tempo pilot và lesson/assessment density. Không có thay đổi code, test, UI, catalog, audio, metronome, MIDI, microphone, Phase 3, deploy, database hoặc shared architecture được thực hiện.

**Các path đã viết:**

1. `/home/ubuntu/six-meter-review/Music-Education-Review-Scope.md`
2. `/home/ubuntu/notnhac/client/src/modules/rhythm-training/docs/Music-Education-Review-Scope.md`

**Open questions:** các mục trong bảng pending ở mục 5, đặc biệt teacher confirmation cho “3/8 phách chính 1” và xác nhận relative accent/beam/spoken-label/tempo/density. Không có Git commit hoặc trạng thái đồng bộ GitHub nào được thực hiện hay khẳng định trong update này.
