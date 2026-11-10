# Rhythm Training V1 — Curriculum V1

> **Đính chính Level 6 đã chốt bởi chủ sản phẩm — 2026-11-11:** 3/8 là Simple Triple với3 phách đơn móc đơn, **Mạnh – Nhẹ – Nhẹ**; không có một phách phức. 6/8 có2 phách phức, **Mạnh – Nhẹ – Nhẹ | Vừa – Nhẹ – Nhẹ**. 9/8 có3 phách phức, **Mạnh – Nhẹ – Nhẹ | Vừa – Nhẹ – Nhẹ | Vừa – Nhẹ – Nhẹ**. Mỗi phách phức=đen chấm dôi720 ticks gồm3 phách đơn/subdivisions móc đơn240 ticks. Bar-level accent=Mạnh đầu ô; secondary beat accent=Vừa đầu các phách phức sau; Mạnh > Vừa > Nhẹ là quan hệ đã được xác nhận, không còn chờ hỏi lại. `S`=Mạnh, `M`=Vừa, `w`=Nhẹ: `Sww`, `Sww\|Mww`, `Sww\|Mww\|Mww`; cấp phách phức `S-M`, `S-M-M`. Trong3/8, mỗi móc đơn là một phách đơn độc lập, không phải subdivision của một phách phức giả. Beam notation, lời đếm tiếng Việt và UI presentation là ba đề xuất riêng chưa chốt; xem [Decision Review](./Decision-Review.md). Đính chính này chỉ sửa tài liệu, không sửa code/runtime hoặc tự triển khai gain/velocity/UI.

**Trạng thái:** Curriculum authoritative, đã chốt khung nội dung; chi tiết ngưỡng sẵn sàng, tempo, quota và cách hiển thị vẫn là đề xuất coaching chờ pilot/giáo viên xác nhận. Tài liệu này chỉ mô tả nội dung và đặc tả giảng dạy; chưa triển khai code, UI, audio, generator, database, test hay route.

**Phạm vi:** V1 có sáu level chính và một Bonus. Sáu level chính là đường học được khuyến nghị; Bonus 2/2 là phần tùy chọn, vẫn phải được hỗ trợ trong V1 nhưng không phải điều kiện để hoàn thành đường chính. Các mức sẵn sàng trong tài liệu là tín hiệu hướng dẫn, không phải khóa cứng, không phải paywall và không tự động ngăn người học mở bài tiếp theo.

## A. Mục tiêu và nguyên tắc chung

Curriculum đưa người học từ cảm nhận phách đen và các trường độ cơ bản, qua chia đôi phách, nhận diện nhịp đơn, dấu chấm dôi/nối trường độ, lưới móc kép và cuối cùng là một nhóm kiến thức thống nhất về nhóm ba móc đơn. Mục tiêu là người học có thể đọc, nghe, đếm và tái tạo **vị trí onset** của tiết tấu, đồng thời hiểu **trường độ** của nốt và dấu lặng.

Hai năng lực này phải được theo dõi riêng:

- **Onset:** thời điểm bắt đầu phát âm. Tap Rhythm chỉ chấm các thời điểm bắt đầu; không yêu cầu người học giữ chuột, phím Space hay ngón tay trong suốt trường độ.
- **Trường độ:** thời gian nốt/dấu lặng chiếm trong ô nhịp, gồm cả trường hợp nốt đi qua phách hoặc vạch nhịp. Năng lực này được kiểm tra bằng đọc ký âm, đếm, nghe–nhận diện và câu hỏi về dot/tie; không suy ra chỉ từ thao tác tap.

Mọi bài phải giữ đúng tổng trường độ của ô nhịp. Dấu lặng chiếm thời gian nhưng không tạo onset. Nốt nối tiếp trong cùng một tie group không tạo attack thứ hai. Coaching có thể chỉ ra lỗi sớm, muộn, thiếu, thừa, sai trường độ, sai nhóm phách hoặc nhầm dot/tie; các chẩn đoán này không thay đổi quy tắc điểm dùng chung.

### Quy tắc bất biến được giữ lại

- Giữ PPQ = 480 và số tick hiện có: quarter = 480, half = 960, whole = 1920, eighth = 240, sixteenth = 120; dotted quarter = 720.
- Giữ duration-authority, exact bar fill, tie group, rest duration, whole-exercise scoring `+10` đúng / `+0` sai, và một kết quả dùng chung cho mỗi bài hoàn thành.
- Giữ Tap Rhythm là onset-only; giữ mốc thời gian thực `currentTime`, confidence, matching windows và quy trình chuẩn hóa/matching đã được phê duyệt trước đó.
- Giữ bốn exercise kind cục bộ: Multiple Choice, Tap Rhythm, Listen & Identify, Count the Beat; Free và Challenge vẫn là hai shared session wrapper duy nhất.
- Giữ ranh giới: không sửa Note Reading, shared architecture, database, WordPress, Audio Scheduler, MIDI, microphone, deployment hoặc route sản phẩm trong tài liệu này.
- Chuẩn bị test/acceptance trong tài liệu chỉ là đề xuất chờ phê duyệt; không được diễn giải là test đã chạy. Con số lịch sử `436/436` không phải kết quả chạy mới và không xác nhận các meter mới.

## B. Cấu trúc bài học

Bảng curriculum chính thức phải được đọc đúng như sau, không tự ý đổi thứ tự hoặc phân bổ nội dung:

| Cấp độ | Nội dung dự kiến |
|---|---|
| Level 1 | Nốt đen, nốt trắng, nốt tròn, dấu lặng đen |
| Level 2 | Nốt móc đơn, dấu lặng đơn, chia đôi phách |
| Level 3 | Nhịp đơn: 2/4, 3/4, 4/4 |
| Level 4 | Dấu chấm dôi, nối trường độ |
| Level 5 | Nốt móc kép, tổ hợp tiết tấu, tiết tấu nâng cao |
| Level 6 | Nhóm nhịp theo cấu trúc 3 móc đơn: 3/8, 6/8, 9/8 |
| Bonus | Nhịp 2/2 (Alla Breve): hai phách chính, mỗi phách tương ứng một nốt trắng |

Mỗi mục trên đều có đủ **Lessons**, **Practice** và **Assessment**. Mỗi mục cũng có phần mở đầu, phần giới thiệu khái niệm, phần củng cố và một chính sách coaching. “Assessment” là đánh giá trong curriculum, không phải tuyên bố về test kỹ thuật hay chuẩn giáo dục đã được kiểm chứng.

Cấu trúc một bài học thống nhất:

1. **Mở đầu:** nghe/nhìn một pulse rõ ràng, nêu mục tiêu bằng tiếng Việt, cho một ví dụ mẫu có đánh dấu phách và nói rõ người học cần tap onset hay chỉ tiếp tục đếm.
2. **Lessons:** giới thiệu từng khái niệm từ đơn giản đến hoàn chỉnh: ký hiệu riêng lẻ, ô nhịp ngắn, rồi mẫu đầy đủ. Giáo viên có thể giữ beat marker và count-in ở giai đoạn đầu.
3. **Practice:** lặp lại có scaffold, sau đó giảm dần beat marker; trộn note/rest có kiểm soát; cho phép replay và retry không chấm lại điểm dùng chung.
4. **Assessment:** bộ bài ngắn cân bằng bốn exercise kind, đánh giá cả nhận diện/trường độ và onset khi phù hợp. Mỗi câu chỉ tạo một kết quả bài tập dùng chung.
5. **Củng cố:** phân loại lỗi theo onset, duration, rest, meter, tie hoặc accent; đề xuất bài ôn tương ứng thay vì khóa level.

## C. Curriculum chi tiết

### Level 1 — Nốt đen, nốt trắng, nốt tròn, dấu lặng đen

**Mục tiêu.** Người học cảm nhận pulse quarter ổn định, nhận diện quarter/half/whole note và hiểu một quarter rest là một phách im lặng. Người học đếm được ô 4/4 cơ bản, phân biệt số onset với trường độ kéo dài, và không tap trong thời gian dấu lặng.

**Điều kiện đầu vào.** Không có prerequisite âm nhạc bắt buộc. Có thể có một calibration không chấm điểm để nghe pulse và thử một onset mỗi phách.

**Giới hạn ký hiệu và dấu lặng.** Chỉ dùng nốt đen, nốt trắng, nốt tròn và **dấu lặng đen (quarter rest) duy nhất** trong phần scored core. Không đưa dấu lặng trắng, dấu lặng tròn, móc đơn, móc kép, dấu chấm dôi, nối trường độ hoặc syncopation vào Level 1. Whole-measure rest không phải mục tiêu của level này.

**Mở đầu và Lessons.**

- Lesson 1: nghe và đếm `1 2 3 4` trong 4/4; xác định vạch nhịp và phách đầu.
- Lesson 2: nốt đen = một pulse, nốt trắng = hai pulse, nốt tròn = bốn pulse.
- Lesson 3: quarter rest = một pulse im lặng nhưng vẫn phải đếm; so sánh `note–note` với `note–rest`.
- Mỗi khái niệm xuất hiện trước ở dạng một ký hiệu, sau đó trong một ô 4/4 hoàn chỉnh. Ví dụ chuẩn gồm một whole note lấp đầy ô và các tổ hợp half/quarter đúng 4 quarter.

**Practice.** Bắt đầu bằng nhận diện biểu tượng và đếm trường độ; tiếp theo là hoàn thành ô 4/4 với quarter, half, whole hoặc quarter rest. Tap chỉ đặt tại các onset trên quarter grid; whole/half note chỉ yêu cầu một onset rồi giữ im lặng theo trường độ, không yêu cầu giữ phím. Một ô không nên có quá nhiều khoảng im lặng liên tiếp ở lần đầu.

**Assessment.**

- Multiple Choice: chọn giá trị phách của quarter/half/whole hoặc chọn vị trí quarter rest.
- Count the Beat: chỉ ra phách có onset và phách có silence trong 4/4.
- Listen & Identify: phân biệt một onset kéo dài với nhiều onset ngắn.
- Tap Rhythm: một ô 4/4 có onset trên quarter grid; dấu lặng không có target.

**Củng cố và coaching.** Gợi ý “ôn pulse” nếu onset không ổn định; gợi ý “ôn trường độ” nếu người học tap đúng onset nhưng gọi half/whole note là nhiều lần tap. Có thể khuyến nghị khoảng 80% nhận diện/đếm và khoảng 80% onset trong hai set ngắn, nhưng đây không phải khóa chuyển level.

### Level 2 — Móc đơn, dấu lặng đơn, chia đôi phách

**Mục tiêu.** Người học chia một quarter pulse thành hai vị trí eighth bằng nhau, đọc nốt móc đơn và dấu lặng đơn, đồng thời giữ nhịp qua silence. Level 2 đặt binary subdivision trên pulse đã học; chưa dạy phân loại nhịp đơn như một đơn vị kiến thức riêng của Level 3.

**Điều kiện đầu vào.** Biết quarter/half/whole và quarter rest của Level 1; hiểu rest chiếm thời gian dù không có onset.

**Giới hạn ký hiệu và dấu lặng.** Được dùng nốt móc đơn/eighth note, dấu lặng đơn/eighth rest cùng các giá trị đã học và quarter rest. Chưa dùng dấu chấm dôi, tie, móc kép, triplet, 6/8 hoặc 9/8. Các pattern vẫn là binary quarter subdivision.

**Mở đầu và Lessons.**

- Lesson 1: chia mỗi quarter thành hai eighth; đếm `1 và 2 và` hoặc hệ đếm tương đương đã được giáo viên chọn.
- Lesson 2: ghép hai eighth trong một beat; đặt một eighth rest ở vị trí đầu hoặc cuối của cell.
- Lesson 3: giữ bài học và worked example trong scaffold 4/4; formal 2/4 và 3/4 được deferred đến Level 3 cùng với simple-meter identity, còn trọng tâm Level 2 vẫn là chia đôi quarter.

**Practice.** Dùng cell hai eighth trước, sau đó ghép thành ô hoàn chỉnh. So sánh quarter note với hai eighth; so sánh eighth note với eighth rest. Tap bắt đầu bằng beat-start, rồi thêm off-beat eighth đơn sau khi count-in ổn định. Dấu lặng phải được thể hiện bằng tiếp tục đếm và không tap.

**Assessment.**

- Multiple Choice: chọn pattern có cùng tổng trường độ hoặc chọn vị trí eighth rest.
- Count the Beat: xác định `1`, `và`, phách cuối hoặc vị trí silence.
- Listen & Identify: phân biệt một quarter onset với hai eighth onset và khoảng lặng tương ứng.
- Tap Rhythm: tap các onset trên eighth grid trong scaffold 4/4; 2/4 và 3/4 chỉ được đưa vào sau khi Level 3 giới thiệu formal simple meter; không chấm việc giữ nút.

**Củng cố và coaching.** Nếu người học hiểu ký hiệu nhưng dồn hai eighth thành một beat, quay về cell một beat với beat marker. Nếu tap every subdivision thay vì onset, cho bài phân biệt quarter/eighth/rest. Có thể dùng khoảng 75–80% cho onset và nhận diện như tín hiệu “nên luyện tiếp”, không phải hard gate.

### Level 3 — Một đơn vị Nhịp đơn: 2/4, 3/4, 4/4

**Mục tiêu.** Đây là **một unit kiến thức thống nhất về simple meter**, không phải ba khóa học riêng. Người học nhận diện time signature, đếm số phách, hiểu trọng âm cơ bản, phân biệt độ dài ô nhịp và chuyển kỹ năng eighth subdivision giữa 2/4, 3/4, 4/4.

- 2/4: hai phách chính, mỗi phách là quarter.
- 3/4: ba phách chính, mỗi phách là quarter.
- 4/4: bốn phách chính, mỗi phách là quarter.

Level 3 là phần **transfer formal** của meter, không phải Level 2 mở rộng ngầm. Level 2 dạy chia đôi phách; Level 3 dạy ý nghĩa của time signature, số phách, trọng âm, độ dài bar và chuyển đổi giữa ba nhịp đơn.

**Điều kiện đầu vào.** Nắm quarter/half/whole, quarter rest, eighth/eighth rest và binary subdivision của Level 1–2.

**Giới hạn ký hiệu và dấu lặng.** Dùng các giá trị đã học: whole, half, quarter, eighth cùng quarter/eighth rests. Không dùng dot, tie, sixteenth, 3/8, 6/8, 9/8 hay 2/2 trong core Level 3. Có thể dùng một ô 2/4, 3/4 hoặc 4/4 trong mỗi item; không đổi meter giữa chừng trừ khi đó là câu hỏi transfer được ghi nhãn rõ.

**Mở đầu và Lessons.**

- Lesson 1: đọc tử số/mẫu số như thông tin meter, không như phép chia số học; dựng 2/4 và so sánh bar length.
- Lesson 2: dựng 3/4, cảm nhận ba quarter pulses và mô hình mạnh–nhẹ–nhẹ.
- Lesson 3: dựng 4/4, nhận diện bốn quarter pulses và trọng âm giáo học có thể dùng mạnh–nhẹ–vừa–nhẹ.
- Lesson 4: chuyển cùng một binary subdivision qua ba meter; xác định barline, beat position và onset/rest.

**Practice.** Mỗi bài chọn một trong ba meter, hiển thị tên meter và bar capacity, rồi giảm dần trợ giúp. So sánh hai pattern có cùng tổng trường độ nhưng khác onset; luyện rest mà vẫn giữ count; dùng hai-bar phrase chỉ khi bar thứ hai củng cố bar thứ nhất. Không yêu cầu người học đồng nhất 3/4 với ba nhóm móc đơn của Level 6.

**Assessment.**

- Multiple Choice: nhận diện 2/4, 3/4, 4/4 từ bar length, pulse count và accent.
- Count the Beat: xác định phách đầu, phách cuối, onset, silence và vị trí `và`.
- Listen & Identify: nghe pattern trong một meter rồi chọn notation hoặc meter phù hợp.
- Tap Rhythm: tap onset trên eighth grid trong từng meter; bộ tổng hợp phải có chuyển giữa 2/4, 3/4, 4/4 nhưng mỗi item chỉ một meter.

**Củng cố và coaching.** Phân biệt “sai onset” với “đếm sai bar length”. Nếu người học tap tốt nhưng gọi 3/4 là 3 nhóm compound, quay lại pulse quarter và trọng âm của simple triple. Tín hiệu gợi ý khoảng 80% trên nhận diện/đếm và khoảng 80% onset qua các set ngắn; không khóa Level 4.

### Level 4 — Dấu chấm dôi và nối trường độ

**Mục tiêu.** Người học phân biệt dot với tie: dot thay đổi trường độ của một ký hiệu; tie nối các note segments và triệt tiêu attack ở segment tiếp theo. Người học đếm xuyên qua phách/vạch nhịp và hiểu rằng một duration dài không đồng nghĩa với nhiều onset.

**Điều kiện đầu vào.** Level 3 fluency trên 2/4, 3/4, 4/4 và eighth grid; biết rest chiếm thời gian và onset không phải toàn bộ duration.

**Giới hạn ký hiệu và dấu lặng.** Introduce dotted half và dotted quarter trước; dot của eighth/dotted eighth **được hoãn đến khi có sixteenth grid ở Level 5**, theo retained-duration policy. Tie có thể trong bar và qua barline, nhưng chỉ nối các note segments hợp lệ, cùng vai trò pitch trung tính và liền kề. Không dùng sixteenth, compound meter hay tie phức tạp trong phần nhập môn.

**Mở đầu và Lessons.**

- Lesson 1: dot = giá trị gốc cộng một nửa giá trị gốc; đọc dotted quarter như ba eighth units.
- Lesson 2: tie trong bar; nghe một attack kéo dài và không attack lại ở segment tiếp theo.
- Lesson 3: tie qua barline; đếm qua vạch nhịp và phân biệt với hai note rời.
- Lesson 4: so sánh cùng tổng duration giữa dotted value, note + rest/note rời và tie; nêu rõ khác biệt về onset.

**Practice.** Trước hết chỉ một dot hoặc một tie trong một bar. Sau đó luyện pattern có rest và tie ở beat boundary; Tap chỉ target tie-group start. Listen & Identify phải cho nghe sustain có duration-aware gate; một tied continuation không phát lại attack. Không ghép dot + tie + sixteenth trong bài nhập môn.

**Assessment.**

- Multiple Choice: chọn dotted quarter tương đương, phân biệt dotted note với tied pair, chọn beat mà tie tiếp tục.
- Count the Beat: chỉ ra các beat vẫn đang có âm dù không có onset mới.
- Listen & Identify: phân biệt rearticulation với sustained tied sound.
- Tap Rhythm: tap onset đầu tie group và giữ im lặng ở tied-to segment; rest cũng không có target.

**Củng cố và coaching.** Feedback phải nói “attack tiếp theo bị triệt tiêu” thay vì “bạn bỏ sót một nốt” khi lỗi là tie continuation. Có thể gợi ý khoảng 75–80% dot/tie comprehension và khoảng 80% onset, nhưng không khóa Level 5. Dotted eighth chỉ được nhắc như nội dung deferred, không được tạo thành topic độc lập ở Level 4.

### Level 5 — Móc kép, tổ hợp tiết tấu và tiết tấu nâng cao

**Mục tiêu.** Người học chia mỗi quarter thành bốn sixteenth positions, đọc móc kép/sixteenth rest, ghép quarter–eighth–sixteenth và rest, rồi củng cố có kiểm soát các kỹ năng cũ. “Tiết tấu nâng cao” ở đây là tổ hợp trong vocabulary V1 đã duyệt, không phải mở thêm tuplets, swing, mixed meter hay khóa Level 7/8 mới.

**Điều kiện đầu vào.** Level 3 simple-meter fluency, Level 4 dot/tie distinction và khả năng giữ count qua rest. Người học chưa cần tốc độ cao; cần hiểu binary four-part grid.

**Giới hạn ký hiệu và dấu lặng.** Dùng sixteenth notes và sixteenth rests, cùng các note/rest và dot/tie đã được phép. Dotted eighth chỉ bắt đầu ở level này khi sixteenth grid đã được giới thiệu. Không thêm tuplets, swing, polyrhythm, mixed meter hoặc arbitrary cross-pulse ties. Các tổ hợp phải giữ exact bar fill và readable beam.

**Mở đầu và Lessons.**

- Lesson 1: bốn vị trí sixteenth trong một quarter; dùng hệ đếm `1 e và a` hoặc hệ được giáo viên xác nhận.
- Lesson 2: cell một beat: eighth + hai sixteenths và hai sixteenths + eighth.
- Lesson 3: ghép cell thành 2/4, 3/4, 4/4; đặt rest trên lưới và xác định onset.
- Lesson 4: advanced combinations có kiểm soát: thêm dot, tie hoặc rest từ level cũ, từng nguồn khó một lần.
- Lesson 5: consolidation của nội dung syncopation cũ thuộc old L7 và integrated reading cũ thuộc old L8, chỉ trong khung V1 đã duyệt.

**Practice.** Hiển thị lưới `1 e và a`, sau đó ẩn syllable nhưng giữ beat marker. Bắt đầu một onset sixteenth đơn trong cell rỗng, đến hai-event cell, rồi full bar. Sau khi isolated skill ổn định, luyện pattern có dot/tie/rest và controlled syncopation cũ. Không tự động tạo “Level 7 syncopation” hay “Level 8 integrated” mới; các bài nâng cao chỉ là consolidation được gắn vào Level 5 hoặc Assessment Level 6 theo framework này.

**Assessment.**

- Multiple Choice: nhận diện vị trí sixteenth, so sánh eighth với hai sixteenths, nhận diện dot/tie trong tổ hợp.
- Count the Beat: chọn vị trí onset/rest trong four-part cell và xác định trường độ bar.
- Listen & Identify: phân biệt tổ hợp sixteenth và eighth có cùng tổng duration nhưng khác onset.
- Tap Rhythm: tap trên sixteenth grid, sau đó bài tổng hợp giới hạn một hoặc hai nguồn khó; không chấm giữ duration.

**Củng cố và coaching.** Nếu mất pulse, quay về eighth cells ở cùng tempo. Nếu đọc đúng nhưng tap thêm ở tied continuation, route sang tie review; nếu tap đúng nhưng sai dot arithmetic, route sang duration review. Khoảng 75–80% là coaching signal. “Advanced” không được dùng để hợp thức hóa topic, course hoặc meter mới ngoài khung đã duyệt.

### Level 6 — Một nhóm kiến thức thống nhất: Grouping in Threes

**Mục tiêu.** Level 6 là **một course/unit duy nhất**, không tách thành ba khóa 3/8, 6/8, 9/8. Người học đi từ một nhóm ba móc đơn đến hai rồi ba nhóm, so sánh số nhóm và trọng âm, sau đó phân tích note/rest/dot/tie và làm practice/assessment tổng hợp cả ba signature.

**Phân biệt nhạc lý bắt buộc.**

- **3/8** là simple triple: ba eighth pulses độc lập, mỗi pulse 240 ticks; bản chất là ba phách móc đơn, không phải một pulse 720 ticks.
- **6/8** là compound duple:2 phách phức nốt đen chấm dôi720 ticks; mỗi phách gồm3 phách đơn móc đơn240 ticks, grouping3+3; trọng âm Mạnh–Nhẹ–Nhẹ | Vừa–Nhẹ–Nhẹ.
- **9/8** là compound triple:3 phách phức nốt đen chấm dôi720 ticks; mỗi phách gồm3 phách đơn móc đơn240 ticks, grouping3+3+3; trọng âm Mạnh–Nhẹ–Nhẹ | Vừa–Nhẹ–Nhẹ | Vừa–Nhẹ–Nhẹ.

Mô hình nhóm ba chỉ là cách tổ chức dạy học chung; không được xóa sự khác nhau giữa time signature, pulse, tempo label hoặc metrical hierarchy.

**Điều kiện đầu vào.** Level 5 đã biết lưới binary và các note/rest/dot/tie trong V1. Có thể dùng một ô mẫu 3/8 rất đơn giản để chuyển tiếp, nhưng không giả định người học đã học compound meter.

**Giới hạn ký hiệu và dấu lặng.** Bắt đầu bằng ba eighth notes/rests trong một nhóm; sau đó cho phép note/rest combinations, dotted values và ties khi người học đã hiểu pulse của từng signature. Không đưa tuplets ngoài ba-eighth grouping, không gọi 3/8 là compound, không đổi 3/8 sang pulse 720 và không biến 6/8/9/8 thành sáu/chín quarter-like primary beats.

**Mở đầu và Lessons — tiến trình bắt buộc.**

1. **Nhận diện một nhóm 3 móc đơn:** nhận diện ba eighth positions và chuỗi giảng dạy `Sww` của 3/8; đếm ba pulse riêng biệt.
2. **Mở rộng thành hai nhóm:** chuyển sang 6/8, hai nhóm `Sww|Mww`; dạy hai dotted-quarter pulses 720 ticks và điểm bắt đầu nhóm thứ hai ở 720.
3. **Mở rộng thành ba nhóm:** chuyển sang 9/8, ba nhóm `Sww|Mww|Mww`; dạy ba dotted-quarter pulses bắt đầu ở 0, 720, 1440.
4. **So sánh số lượng nhóm và vị trí trọng âm:** so sánh một/ba eighth pulses của 3/8 với hai/ba compound pulses của 6/8/9/8. Thể hiện khác nhau giữa “số nhóm ba” và “số technical pulse”.
5. **Phân tích note, rest, dot, tie:** đặt rest trong từng nhóm, kiểm tra duration; sau đó thêm dot/tie theo vocabulary đã học. Tied continuation không phải onset; rest không phải onset.
6. **Combined practice và assessment:** một bộ tổng hợp có đủ 3/8, 6/8, 9/8, đủ bốn exercise kind theo quota được phê duyệt, và câu hỏi phân biệt simple/compound.

**Quy ước trọng âm đã xác nhận.** Chủ sản phẩm đã chốt 3/8 `Sww`; 6/8 `Sww|Mww`; 9/8 `Sww|Mww|Mww`. Phách đơn là một móc đơn; phách phức của6/8 và9/8 là nốt đen chấm dôi chứa3 phách đơn. Tại cấp phách phức,6/8 có Mạnh–Vừa và9/8 có Mạnh–Vừa–Vừa. Đầu ô là bar-level accent Mạnh; đầu các phách phức tiếp theo là secondary beat accent Vừa; các phách đơn còn lại Nhẹ. Không đồng nhất phách đơn/phách phức và không gán Mạnh ngang nhau cho tất cả nhóm3. Bỏ phương án hierarchy trước đây; chỉ encoding/UI/cách đếm/beam còn là đề xuất, không hỏi lại quy ước nhạc lý.

**Practice.** Dùng scaffold lần lượt một group, hai groups, ba groups; hiển thị boundary và pulse label. Với 3/8, count tại 0/240/480 và giữ eighth pulse 240. Với 6/8, count hai pulse tại 0/720 với ba subdivision trong mỗi pulse. Với 9/8, count ba pulse tại 0/720/1440. Sau đó trộn note/rest/dot/tie trong từng signature, mỗi item giữ một meter. Bài transfer chỉ được hỏi khi label nói rõ đang đổi pulse semantics.

**Assessment.**

- Multiple Choice: phân biệt 3/8 simple triple với 6/8 compound duple; phân biệt 6/8 với 9/8 bằng số dotted-quarter pulses và grouping.
- Count the Beat: chọn pulse positions, subdivision positions, rest và tie continuation; câu 3/8 không được coi một bar là một pulse 720.
- Listen & Identify: nhận diện nhịp từ pattern được gắn nhãn cùng trọng âm đã chốt; phân biệt trọng âm chính Mạnh đầu ô với trọng âm Vừa đầu các phách phức sau, không dựng hai hierarchy mâu thuẫn.
- Tap Rhythm: tap onset-only trong từng signature; bộ combined assessment phải chứa cả 3/8, 6/8, 9/8, có note/rest/dot/tie ở mức đã học và giữ matching windows/currentTime policy cũ.

**Củng cố và coaching.** Nếu người học tap đúng nhưng gọi 3/8 là một pulse, giữ onset credit và route sang simple-triple explanation. Nếu người học hiểu hai dotted-quarter pulses nhưng tap thành sáu primary beats, route sang 6/8 compound practice. Nếu nhầm 9/8 với 6/8, cho bài đếm số compound pulses và vị trí group starts. Level 6 không tạo hard lock; readiness của 3/8, 6/8 và 9/8 có thể báo cáo riêng trong coaching nhưng vẫn thuộc cùng một unit.

### Bonus — 2/2 Alla Breve

**Vai trò.** Bonus là progression tùy chọn, không thuộc đường main bắt buộc; tuy vậy, 2/2 vẫn là feature được hỗ trợ trong V1. Nó không được dùng để kéo Level 4 thành một level mới hoặc tạo course chính thứ tám.

**Mục tiêu.** Người học hiểu hai half-note pulses trong một bar, mỗi pulse là 960 ticks, phân biệt 2/2 với 4/4 dù cùng capacity 1920 ticks, và hiểu tempo phải ghi theo half-note pulse.

**Điều kiện đầu vào.** Level 3 về simple meter và Level 4 về dot/tie là đủ; Level 5/6 không bắt buộc. Người học cần hiểu một nốt trắng có thể là một phách chính trong 2/2.

**Giới hạn ký hiệu và dấu lặng.** Bắt đầu với hai half notes, quarter/eighth subdivisions và rest tương ứng khi cần; không dùng để dạy topic mới ngoài half-pulse transfer. Dotted values/ties chỉ dùng nếu chúng đã được học ở level trước và câu hỏi nêu rõ mục tiêu. Một whole note có thể lấp đầy bar 1920 theo duration arithmetic; không được suy luận rằng 2/2 là 4/4 chỉ vì capacity bằng nhau.

**Mở đầu và Lessons.**

- Lesson 1: đọc ký hiệu 2/2 và đếm hai half-note pulses `1 2`.
- Lesson 2: so sánh 2/2 với 4/4: cùng 1920 ticks nhưng pulse unit, accent và cảm nhận tempo khác.
- Lesson 3: chia mỗi half pulse thành quarter/eighth subdivisions; luyện nhận diện onset/rest.

**Practice.** Bắt đầu bằng hai half notes và hai half pulses có metronome; sau đó dùng quarter/eighth patterns trong mỗi 960-tick pulse. Hiển thị rõ `pulseBpm = half-note BPM`; không copy band quarter-BPM sang Bonus mà không đổi label. Một bài không được yêu cầu người học giữ phím theo half duration.

**Assessment.**

- Multiple Choice: chọn 2/2, phân biệt hai half pulses với bốn quarter pulses của 4/4.
- Count the Beat: xác định pulse starts `[0, 960]` và subdivision bên trong mỗi pulse.
- Listen & Identify: nhận diện cảm giác half-note pulse và sửa nhầm 4/4.
- Tap Rhythm: tap các onset theo two-pulse half-note reference; onset-only, không chấm hold duration.

**Củng cố và coaching.** Nếu người học hiểu capacity nhưng đếm bốn primary beats, quay về half-pulse overlay. Bonus có thể được đánh dấu “optional review” hoặc “recommended next” tùy learner profile, nhưng không chặn Level 6, không phải graduation requirement và không đổi shared progress semantics.

## D. Đặt curriculum mới cạnh lộ trình cũ

Tài liệu lịch sử/current context từng mô tả tám level exploratory và sáu meter trong các vị trí khác nhau. Bảng này là bảng placement trước/sau để loại bỏ mâu thuẫn; nó không tuyên bố rằng code hiện tại đã triển khai curriculum mới.

| Vị trí trước đây | Mô tả cũ/legacy trong tài liệu hoặc code data-only | Placement V1 mới |
|---|---|---|
| Old L1 | Pulse, whole/half/quarter và 4/4 | Level 1: black/half/whole notes; **quarter rest only**; 4/4 là ví dụ bar, không mở rộng rest vocabulary |
| Old L2 | Simple-meter transfer và eighth subdivision | Level 2: eighth notes, eighth rests, binary quarter subdivision |
| Old L3 | Mixed simple meter, có đề xuất chuyển tiếp 3/8 | Level 3 thống nhất 2/4, 3/4, 4/4; 3/8 không còn là một nhánh phụ ở đây |
| Old L4 | Dots/ties và đề xuất 2/2 transfer | Level 4 chỉ dots/ties; dotted eighth deferred đến sixteenth grid Level 5; 2/2 chuyển thành Bonus |
| Old L5 | Sixteenth subdivision/combinations | Level 5: sixteenths, combinations, advanced rhythms trong vocabulary đã duyệt |
| Old L6 | Dedicated compound-duple 6/8 | Level 6: một unit Grouping in Threes gồm 3/8 → 6/8 → 9/8, không còn course 6/8 riêng |
| Old L7 | Controlled/simple-meter syncopation | Không tạo Old L7 mới; chọn lọc nội dung syncopation cũ để consolidation có kiểm soát trong Level 5 và/hoặc assessment Level 6 khi phù hợp framework |
| Old L8 | Integrated six-meter fluency | Không tạo Old L8 mới; chọn lọc nội dung integration cũ để consolidation/combined assessment trong Level 5 và Level 6, không tự động sinh topic/course mới |
| Previous six-meter proposal | 2/4, 3/4, 4/4, 3/8, 6/8, 2/2; 3/8 và 2/2 từng được mô tả như additions riêng | V1 hỗ trợ chính xác 7 meter pairs: 6 core gồm 2/4, 3/4, 4/4, 3/8, 6/8, 9/8; cộng Bonus 2/2. Đây là **7 V1 supported meters**, không phải “sáu supported total” |

Current code/context vẫn có tám legacy data-only levels và bốn meters trong phần đã được ghi nhận; 3/8, 9/8 và 2/2 không được coi là đã implemented chỉ vì tài liệu này mô tả chúng. Việc cập nhật curriculum không cấp quyền triển khai.

## E. Meter registry và phân biệt pulse/group

PPQ canonical là 480. Bảng dưới đây là hợp đồng nội dung/kỹ thuật cần được giữ khi implementation được phê duyệt.

| Meter | Loại nhạc lý | Bar capacity | Technical pulse | Pulse count / starts | Grouping | Teaching accent string |
|---|---|---:|---:|---|---|---|
| 2/4 | Simple duple | 960 | quarter = 480 | 2 / `[0,480]` | `1+1` | `S-W` |
| 3/4 | Simple triple | 1440 | quarter = 480 | 3 / `[0,480,960]` | `1+1+1` | `S-W-W` |
| 4/4 | Simple quadruple | 1920 | quarter = 480 | 4 / `[0,480,960,1440]` | `1+1+1+1` | `S-W-M-W` hoặc minimum strong/weak |
| 3/8 | Simple triple | 720 | eighth = 240 | 3 / `[0,240,480]` | 3 phách đơn độc lập; một nhóm minh họa không phải phách phức | **`Sww`** |
| 6/8 | Compound duple | 1440 | dotted quarter = 720 | 2 / `[0,720]` | `3+3` | **`Sww\|Mww`** |
| 9/8 | Compound triple | 2160 | dotted quarter = 720 | 3 / `[0,720,1440]` | `3+3+3` | **`Sww\|Mww\|Mww`** |
| Bonus 2/2 | Alla breve | 1920 | half = 960 | 2 / `[0,960]` | `1+1` | `S-W` |

Bảy dòng trên là **7 V1 supported meters**, trong đó **6 core + 1 Bonus**. Không gọi đây là sáu supported meters.

### Quy ước thay thế nhãn nguồn cũ — đã xác nhận

Không dùng lại “3/8 phách chính=1” như một câu hỏi nội dung còn mở. Nhãn này là lịch sử bị thay thế. Quyết định hiện hành:3/8 có3 phách đơn, mỗi phách=móc đơn240 ticks tại0,240,480, `Sww`; không phân tích thành một phách phức. Một nhóm ba trong worked example chỉ là cách sắp xếp minh họa.

### Phân biệt bốn khái niệm — đã xác nhận

| Khái niệm | Nghĩa trong Level6 |
|---|---|
| Subdivision / phách đơn | Móc đơn240 ticks; trong6/8 và9/8 là một trong3 phần của phách phức; trong3/8 là một simple beat độc lập |
| Compound beat / phách phức | Đen chấm dôi720 ticks gồm3 phách đơn;6/8 có2,9/8 có3,3/8 không có |
| Bar-level accent | Trọng âm chính Mạnh đầu ô nhịp |
| Secondary beat accent | Trọng âm Vừa đầu phách phức thứ2 của6/8 và thứ2/3 của9/8 |

Phách đơn và phách phức không đồng nhất. Các nhóm không có trọng âm Mạnh ngang nhau:6/8 `Sww|Mww`,9/8 `Sww|Mww|Mww`. Thứ tự Mạnh>Vừa>Nhẹ đã chốt; thông số gain/velocity không được tự biến thành runtime defaults. Beam/cách đếm/UI chỉ là đề xuất riêng trong Decision Review.

## F. Cấu trúc Practice/Assessment và coaching chung

Mỗi level/Bonus dùng bốn exercise kind đã quy định trong đặc tả (chưa triển khai runtime), với tỷ lệ có thể cấu hình nhưng không thêm shared session mode:

| Exercise kind | Mục tiêu curriculum | Quy tắc không đổi |
|---|---|---|
| Multiple Choice | Nhận diện note/rest, duration, meter, grouping, dot/tie | Chấm đáp án canonical identity; không chấm theo label/pixel |
| Count the Beat | Đếm pulse, subdivision, rest, tie continuation, group starts | Hiển thị technical pulse đúng meter; không biến teaching group thành pulse mới |
| Listen & Identify | Nghe duration-aware sound, rest, accent/grouping, simple/compound distinction | Rest là silence; tied continuation không phát attack mới; pattern và metronome tách lane |
| Tap Rhythm | Tái tạo onset positions | Onset-only; dùng `currentTime`, confidence và matching windows hiện hành; count-in/reference không chấm |

Trong Practice có thể replay, giảm tempo, hiện beat marker, tăng scaffold và cho retry. Trong Assessment, một graded exercise hoàn thành chỉ submit một shared answer; kết quả đúng là `+10`, sai là `+0`. Technical abort/skip không âm thầm thành wrong. Local diagnostics có thể báo missing/extra/early/late/duration/meter/tie nhưng không tạo partial shared score.

Coaching không khóa:

- Có thể đề xuất ôn lại level trước, nhưng learner vẫn được mở bài sau.
- Có thể báo riêng onset readiness, duration readiness, meter readiness và tie/dot readiness.
- Không dùng một ngưỡng phần trăm chưa pilot để ẩn nội dung, ngăn Bonus hoặc biến Level 6 thành ba khóa tuần tự.
- Khi khó khăn đến từ meter, feedback phải gọi đúng pulse unit: 3/8 eighth pulse 240; 6/8 và 9/8 dotted-quarter pulse 720; Bonus 2/2 half pulse 960.

## G. Exact technical facts cần bảo toàn khi implementation tương lai

| Meter | Bar ticks | Pulse ticks | Pulse starts | Giá trị cần dạy |
|---|---:|---:|---|---|
| 2/4 | 960 | 480 | `0,480` | 2 quarter pulses |
| 3/4 | 1440 | 480 | `0,480,960` | 3 quarter pulses |
| 4/4 | 1920 | 480 | `0,480,960,1440` | 4 quarter pulses |
| 3/8 | 720 | 240 | `0,240,480` | 3 eighth pulses, teaching group count 1 |
| 6/8 | 1440 | 720 | `0,720` | 2 dotted-quarter pulses, groups 3+3 |
| 9/8 | 2160 | 720 | `0,720,1440` | 3 dotted-quarter pulses, groups 3+3+3 |
| 2/2 | 1920 | 960 | `0,960` | 2 half-note pulses, `S-W` |

Conversion giữ nguyên: `seconds = (ticks / pulseTicks) × (60 / pulseBPM)`. Không suy pulse từ numerator/denominator một cách máy móc. Một 3/8 bar là 720 ticks nhưng kéo dài ba eighth pulses; một 6/8 bar là 1440 ticks nhưng có hai dotted-quarter pulses; một 9/8 bar là 2160 ticks nhưng có ba dotted-quarter pulses; một 2/2 bar là 1920 ticks nhưng có hai half pulses.

Các quy tắc duration, tie group, rest, whole-exercise scoring, onset-only tap, currentTime, confidence, matching windows, bốn local exercise kinds, Free/Challenge và module boundaries từ đặc tả trước đó vẫn có hiệu lực. Tài liệu curriculum này không thay thế chúng và không tự tạo ra implementation.

## H. Quyết định đã chốt và các đề xuất presentation còn mở

1. **Đã chốt, không hỏi lại:**3/8 có3 phách đơn móc đơn, không một phách phức; nhãn nguồn cũ “phách chính1” không còn là đề xuất active.
2. **Đề xuất UI riêng:** cách biểu diễn Mạnh/Vừa/Nhẹ bằng nhãn, độ nổi bật và boundary; không color-only, không gán Mạnh ngang nhau. Numerical gain/velocity thuộc encoding tương lai, không mở lại quyết định nhạc lý.
3. Cần duyệt spoken counting convention tiếng Việt cho eighth/sixteenth subdivisions trước khi làm audio/count-in. Đây không phải quyền thay đổi pulse semantics.
4. Tempo bands, quota, matching thresholds và readiness percentages chỉ là coaching proposals; cần pilot/educator review và không được hard-code thành khóa curriculum.
5. Acceptance/test proposals cho 3/8, 6/8, 9/8 và 2/2 chưa phải test đã chạy. Không dùng historical `436/436` làm bằng chứng fresh.

## I. Phạm vi thay đổi của tài liệu này

Bản curriculum này thay thế thân bài tám-level cũ trong tài liệu curriculum active. Nó không tuyên bố triển khai curriculum mới trong code; current code/data-only legacy levels và meter registry hiện hành vẫn là trạng thái riêng cần một approval/implementation task sau này. Trong update này, chỉ các Markdown được liệt kê trong change record được chỉnh; source code, test source, TypeScript/TSX/JavaScript/CSS/JSON/database/infrastructure/dependency/shared architecture/Note Reading/UI/catalog/audio/metronome/MIDI/microphone/Phase3/deploy không bị thay đổi.
