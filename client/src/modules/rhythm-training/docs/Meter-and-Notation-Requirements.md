# Rhythm Training V1 — Yêu cầu Nhịp và Ký hiệu

**Trạng thái:** đặc tả tài liệu, chờ duyệt chi tiết giáo dục và chưa triển khai.
**Phạm vi:** bảy meter V1 được hỗ trợ (sáu meter cốt lõi và Bonus 2/2), toán học nhịp, ánh xạ ký hiệu, beam và các ví dụ kiểm tra tính hợp lệ. Tài liệu này không thay đổi source code, test, database, UI, audio, MIDI, microphone, deploy hoặc kiến trúc dùng chung.

## 1. Nguyên tắc bất biến

Rhythm Training phải giữ một mô hình thời lượng duy nhất làm nguồn sự thật. Với `PPQ = 480`, mọi thời lượng viết được quy đổi bằng số nguyên tick; `Fraction` calculation hiện có hoặc tương đương phải tiếp tục là lớp tính toán chính xác. Không được suy ra pulse chỉ từ numerator, denominator hoặc nhãn simple/compound. Meter được tra cứu bằng cặp `(numerator, denominator)` chính xác.

Một **measure/bar** phải có tổng tick đúng bằng capacity của meter. Một **pulse** là đơn vị cảm nhận dùng cho tempo và đếm; nó không nhất thiết bằng một đơn vị mẫu giáo dục duy nhất. Một **structural grouping** mô tả bản chất nhạc lý của meter. Một **teaching grouping** chỉ là lớp trình bày/giảng dạy để giúp người học nhận ra các nhóm; nó không được ghi đè pulse count, pulse starts, capacity, tempo unit hoặc identity của meter.

Các accent giảng dạy chỉ là overlay. Không tự động ghi accent mạnh vào `segment.accent` của note nếu người dùng/fixture không yêu cầu explicit accent. Accent cấu trúc và accent explicit phải được giữ tách biệt; accent chỉ thay đổi gain hoặc cách hiển thị, không thay đổi onset time.

## 2. Ma trận bảy meter V1

Các giá trị dưới đây là canonical với `PPQ = 480`. `Starts` là vị trí bắt đầu pulse trong một bar, tính bằng tick. `Structural grouping` mô tả grouping nhạc lý; `Teaching grouping/accent` là chuỗi nhấn dùng trong nội dung hướng dẫn, không phải một trường thay thế cho structural grouping.

| Meter | Vai trò | Bar capacity (ticks) | Pulse count | Pulse unit | Pulse starts (ticks) | Structural grouping | Teaching grouping / accent |
|---|---|---:|---:|---|---|---|---|
| `2/4` | Core, simple duple | 960 | 2 | quarter = 480 | `[0, 480]` | `2` quarter pulses; `S-W` | `S-W` |
| `3/4` | Core, simple triple | 1440 | 3 | quarter = 480 | `[0, 480, 960]` | `3` quarter pulses; `S-W-W` | `S-W-W` |
| `4/4` | Core, simple quadruple | 1920 | 4 | quarter = 480 | `[0, 480, 960, 1440]` | `4` quarter pulses; tối thiểu `S-W-M-W` khi dùng mức trung gian | `S-W-M-W` nếu lớp dạy cần medium; tối thiểu phải giữ downbeat mạnh |
| `3/8` | Core, simple triple | 720 | **3** | eighth = 240 | `[0, 240, 480]` | `3` independent eighth pulses; one teaching group, không phải một pulse 720 | **`Sww`**; một nhóm dạy gồm 3 móc đơn, nhưng vẫn là ba phách đơn độc lập |
| `6/8` | Core, compound duple | 1440 | 2 | dotted quarter = 720 | `[0, 720]` | `2` dotted-quarter pulses, mỗi pulse gồm `3` eighths: `3+3` | **`Sww\|Sww`**; hai nhóm dạy, mỗi nhóm 3 móc đơn |
| `9/8` | Core, compound triple | 2160 | **3** | dotted quarter = 720 | `[0, 720, 1440]` | `3` dotted-quarter pulses, mỗi pulse gồm `3` eighths: `3+3+3` | **`Sww\|Sww\|Sww`**; ba nhóm dạy, mỗi nhóm 3 móc đơn |
| `2/2` | Bonus, alla breve | 1920 | 2 | half = 960 | `[0, 960]` | `2` half-note pulses; `S-W` | `S-W`; tempo phải ghi rõ là **half-note BPM** |

### 2.1. Phân biệt 3/8, 6/8 và 9/8

`3/8` là simple triple: có **một nhóm giảng dạy** gồm ba móc đơn, nhưng ba móc đơn đó là **ba pulse độc lập**, lần lượt ở tick `0`, `240`, `480`. Không được chuyển `3/8` thành một pulse 720 tick hoặc đưa nó vào compound-meter policy chỉ vì denominator là `8`. Dòng dữ liệu nguồn có thể mô tả “một nhóm gồm 3 móc đơn”; trong đặc tả kỹ thuật, “một nhóm” ở đây là số nhóm dạy, không phải số pulse. Nếu dùng bảng nguồn có cách ghi phách chính là `1`, phải chú thích rõ `1` là group count trong ngữ cảnh bảng, không phải một technical pulse; nhãn này cần giáo viên xác nhận trước khi đưa vào UI hoặc count-in.

`6/8` là compound duple: có hai pulse dotted-quarter, mỗi pulse dài `720` tick và chứa ba eighths (`3+3`). `9/8` là compound triple: có ba pulse dotted-quarter dài `720` tick ở `0`, `720`, `1440`, với grouping `3+3+3`. Teaching accent phải giữ nguyên các chuỗi `Sww`, `Sww|Sww` và `Sww|Sww|Sww`; không dùng chuỗi này để làm mất sự khác nhau giữa simple triple và compound meter.

Trong quan hệ trọng âm tương đối, pulse đầu bar mạnh hơn các group start bên trong. Do đó `9/8` có downbeat đầu bar mạnh nhất, còn group start ở `720` và `1440` là các điểm bắt đầu nhóm yếu hơn tương đối. Gain/âm lượng cụ thể và việc copy accent vào educator-facing overlay cần teacher/educator confirmation; không tự ý biến mọi group start thành explicit note accent.

### 2.2. Đếm và tempo

Đếm nền của `3/8` có thể bắt đầu bằng `1 2 3`, tương ứng ba eighth pulses. Với `9/8`, count minh họa được giữ là `1-la-li 2-la-li 3-la-li`; các syllable `la-li` và cách phát âm cuối cùng vẫn **pending teacher confirmation**. Cách đếm này chỉ là teaching convention, không thay đổi canonical pulse count là `3` và pulse unit là dotted quarter.

`2/2` là Bonus tùy chọn trong progression. Pulse của nó là half note `960` tick; BPM phải được hiển thị và giải thích là **half-note BPM**, không được dùng quarter-BPM mà không đổi nhãn. Hai pulse bắt đầu tại `0` và `960`, với accent tương đối `S-W`. Việc `2/2` có cùng bar capacity với `4/4` không làm hai meter có cùng pulse semantics.

## 3. Canonical duration và validation

Công thức duration phải tiếp tục dùng integer/Fraction arithmetic:

- quarter = `480` tick;
- half = `960` tick;
- whole = `1920` tick;
- eighth = `240` tick;
- sixteenth = `120` tick;
- dotted duration = duration gốc cộng một nửa duration gốc, ví dụ dotted quarter = `720`, dotted half = `1440`, dotted eighth = `360`.

Validator phải kiểm tra đúng cặp meter, duration descriptor, dot policy, tie adjacency và tổng tick. Không được sửa hoặc làm tròn dữ liệu để vừa bar. Rests tiêu thụ đầy đủ duration nhưng không tạo onset. Tie continuation không tạo attack mới; tie tự nó **không bắt buộc beam phải tách**. Tie chỉ hợp lệ giữa các note segment kề nhau theo tie policy đã duyệt; tie vào rest hoặc tie member không kề nhau là invalid.

All-rest bar là dữ liệu canonical hợp lệ cho validator/notation nếu tổng duration đúng capacity, dù generator có thể tiếp tục có policy riêng không sinh pattern không có onset. Không tự động dùng whole-measure rest glyph có semantics phụ thuộc meter nếu fixture chưa định nghĩa rõ duration của glyph đó.

## 4. Ví dụ bắt buộc cho 9/8

Các ví dụ dưới đây phải được dùng làm định hướng cho validator, notation parity và tài liệu giáo dục. Chúng là yêu cầu đặc tả, không phải bằng chứng rằng code hiện tại đã hỗ trợ.

| Pattern 9/8 | Tính tick | Kết quả |
|---|---:|---|
| 9 eighth notes | `9 × 240 = 2160` | Valid; onset/pulse starts lần lượt theo grid `0..1920` bước `240` |
| 3 dotted-quarter notes | `3 × 720 = 2160` | Valid; một note trên mỗi dotted-quarter pulse |
| dotted half + dotted quarter | `1440 + 720 = 2160` | Valid; hai duration phủ đủ ba pulse về mặt tick |
| 9 eighth rests | `9 × 240 = 2160` | Valid all-rest bar; không có onset |
| one whole note | `1920 < 2160` | **Underfill, reject** |
| whole note + quarter note | `1920 + 480 = 2400 > 2160` | **Overfill, reject** |

Không phát minh hoặc ngầm hỗ trợ tuplets mới để lấp khoảng trống. Tuplets, swing, mixed meter và polyrhythm vẫn ngoài phạm vi V1 đã duyệt.

## 5. Quy tắc beam và lớp trình bày notation

Beam plan là presentation metadata độc lập với `pulseIndex`, `pulseTicks`, `pulseStarts`, structural accents và duration validation. Một notation adapter không được dùng beam để suy ra meter semantics.

| Meter / nội dung | Primary beam plan | Secondary beam plan / trạng thái |
|---|---|---|
| `3/8` eighths | Có thể dùng **optional bar-wide beam `3`** cho ba eighth liên tục; phương án pulse-first tách theo `1+1+1` | Nếu dùng sixteenths, pulse-first là `2+2+2`; bar-wide primary vẫn không được làm mất ba pulse. Lựa chọn cuối cùng pending educator review |
| `6/8` eighths | `3+3` | `12` sixteenths: primary `6+6`; secondary break policy pending educator confirmation |
| `9/8` eighths | `3+3+3` | `18` sixteenths: primary `6+6+6`; secondary break policy pending educator confirmation |
| `2/2` eighths | `4+4` theo hai half-note pulses | `16` sixteenths: primary `8+8`; secondary `4+4 \| 4+4` |

Với `3/8`, một bar-wide beam của ba continuous eighths chỉ là lựa chọn trực quan tùy chọn. Nó không được đổi ba eighth pulses thành một 720-tick pulse, không được đổi tempo unit, không được đổi accent string `Sww`, và không được làm thay đổi Count the Beat coordinates. Với sixteenths, secondary beam trong `3/8` phải phản ánh subdivision `2+2+2` nếu lựa chọn bar-wide primary được duyệt.

Rests và barlines break beams theo policy V1 được educator xác nhận; không nối beam qua rest hoặc barline nếu policy chưa cho phép. Tie tự nó không buộc beam break: các note kề nhau có tie có thể vẫn nằm trong cùng beam group được duyệt, trong khi continuation vẫn không tạo onset. Một rest luôn là rest, không biến thành note hoặc target chỉ vì beam layout.

## 6. Strict voice và VexFlow projection

Canonical rhythm ticks là authority; strict voice ticks trong notation library chỉ là lớp kiểm tra phụ để bảo đảm renderer không nhận voice thiếu hoặc thừa. Với `9/8`, renderer phải truyền đúng time signature với **numerator `9`, denominator `8`**; không suy ra hoặc hiển thị thành `3/8` chỉ vì cùng eighth grid.

Khi strict voice dùng whole-voice resolution `16384` ticks, bar voice ticks của `9/8` là:

```text
whole voice = 16384
9/8 voice bar = 16384 × 9/8 = 18432
canonical rhythm bar = 2160 ticks
```

`18432` là giá trị của voice-resolution layer và `2160` là canonical PPQ rhythm layer; hai giá trị phải được liên kết bằng Fraction calculation chính xác, không được thay thế cho nhau và không được so sánh như cùng một đơn vị. Các meter khác cũng phải đi qua cùng generic conversion/parity layers, không tạo một công thức riêng chỉ cho `9/8`.

Notation parity fixture tương lai phải đối chiếu tối thiểu:

1. ordered written durations;
2. canonical segment start/end ticks;
3. pulse index và subdivision index;
4. time signature numerator/denominator;
5. strict voice ticks;
6. beam groups và barline/rest boundaries;
7. tie roles và onset flags.

Nếu renderer thể hiện note ở vị trí khác canonical tick, tạo thêm onset cho tie continuation, hoặc biến rest thành attack, parity phải fail. Renderer không được tự sửa pattern để strict voice vừa bar; validator phải từ chối pattern sai trước khi projection.

## 7. Tương thích với duration, tie và các lớp dùng chung

Đặc tả này giữ nguyên các policy đã có và chỉ mở rộng meter matrix:

- duration descriptors, integer PPQ `480`, dot calculation và Fraction calculation vẫn là lớp dùng chung;
- tie semantics giữ nguyên: segment đầu tie group có attack, continuation không có attack, duration/gate vẫn kéo dài theo tick;
- whole exercise exact-fill, `+10` correct / `+0` wrong, onset-only tap, `currentTime` và matching windows không được thay đổi bởi meter matrix này;
- các lớp parity generic giữa canonical rhythm, notation projection và audio projection phải tiếp tục dùng chung, không nhân bản logic theo từng meter;
- explicit segment accent không được tự động sinh chỉ từ structural accent;
- không thêm tuplet, swing, mixed meter, polyrhythm hoặc một notation semantics mới.

`3/8`, `6/8`, `9/8` phải cùng thuộc một knowledge group **Grouping in Threes**, nhưng không được biến thành ba khóa học độc lập và cũng không được xóa identity nhạc lý của từng meter. `2/2` vẫn là Bonus có hỗ trợ V1, không được tính là meter core thứ bảy.

## 8. Các điểm cần xác nhận trước khi triển khai

1. Giáo viên/educator cần xác nhận có dùng bar-wide beam `3` cho eighths liên tục trong `3/8`, hay luôn dùng pulse-first `1+1+1`.
2. Giáo viên/educator cần xác nhận secondary beam policy cho `12` sixteenths trong `6/8` (`6+6`) và `18` sixteenths trong `9/8` (`6+6+6`), đặc biệt các break nội bộ.
3. Cách phát âm và chính tả syllable `1-la-li 2-la-li 3-la-li` cho `9/8` cần teacher confirmation trước khi trở thành count-in string.
4. Mức gain tương đối giữa downbeat đầu bar và các group starts bên trong `6/8`/`9/8` cần educator confirmation; không copy thành explicit note accent mặc định.
5. Các strict-voice parity fixtures cho toàn bộ bảy meter và chính sách rest/barline beam break cần được phê duyệt trước khi có implementation hoặc test claim.

**Kết luận:** Đây là ma trận yêu cầu và notation contract cho bảy meter V1 được hỗ trợ: `2/4`, `3/4`, `4/4`, `3/8`, `6/8`, `9/8` và Bonus `2/2`. Tài liệu không tuyên bố rằng curriculum, renderer, generator, audio hoặc test hiện tại đã được cập nhật hay đã vượt qua kiểm thử.
