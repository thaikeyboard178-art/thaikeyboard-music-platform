# Tap Rhythm V1 — Technical Specification, Phase 4A

**Trạng thái: PROPOSED — CHỜ OWNER APPROVAL.** Tài liệu này không phê duyệt formula, windows, threshold, calibration hoặc reference policy; không cho phép bắt đầu Phase 4B. Các thông số lịch sử trong specification cũ vẫn là giả thuyết, không phải defaults. Tác giả: Manus AI. Baseline đã audit: `99da0de1a0ff77cfa84ae4acee9be67f447241fd`.

## 1. Audit và phạm vi tái sử dụng

`curriculum/curriculum.ts` đã có bốn exercise kinds và placement Tap: Level 1–2 không có Tap; Levels 3–6 có Tap trong sections hiện hữu; Bonus 2/2 có Tap optional trong Practice, không tự thêm vào Lessons/Assessment. `generation/levels.ts` có đúng vocabulary: Level 3 eighth-grid trong 2/4, 3/4, 4/4; Level 4 dotted values và ties; Level 5 sixteenth-grid và tổ hợp nâng cao; Level 6 3/8, 6/8, 9/8; Bonus half-note pulse. Quota Assessment Level 6 chưa được duyệt. Không đổi curriculum, meters hoặc exercise allocation.

Tái sử dụng `deriveRhythmTimeline`, `soundingSpans`, `ticksToSeconds`, generator/policies và `audio/plan.ts`. Phase 3 `RhythmAudioTransport.getReferenceTiming()` trả `generation`, `anchorTime`, `expectedOnsets[{id,tick,audioTime}]` khi đang playing; targets vẫn có khi chỉ bật metronome lane. Rest và tie continuation không tạo target. Phase 3 đã có state/abort reason và hủy generation khi stop/replay/interruption; chưa có Tap capture, clock bridge hoặc matcher.

`exercises/scoring.ts` hiện chỉ nhận Multiple Choice/Count the Beat; `features/training/session.ts` đã giữ +10/+0 và duplicate guard. Sau approval chỉ cần mở rộng Rhythm-owned exercise union/evaluator dispatch cho Tap và dùng shared session như cũ; không viết lại shared scoring. Timing Accuracy không đưa vào `TrainingResult.accuracy` hoặc `averageResponseTimeMs`. 632 tests của Phase 3 là bằng chứng lịch sử, không phải fresh Tap tests.

## 2. Clock architecture và timestamp capture đề xuất

Trong native `pointerdown` hoặc `keydown` Space không-repeat, ghi ngay raw `event.timeStamp`, `performance.now()` tại handler entry, capture sequence, source và attempt/generation ID. Dùng event timestamp làm input time; handler time chỉ là arrival diagnostic. Không dùng React render/setState, `Date.now()` hoặc thời điểm phát monitor click. `Event.timeStamp` là thời gian tạo event, không phải phép đo chính xác lúc ngón tay chạm thiết bị; độ phân giải có thể bị browser giảm [1] [2].

Với cùng document/global, chuẩn hóa về performance origin của document. Input chuyển từ worker/window khác cần chuyển origin bằng `performance.timeOrigin`; không so sánh trực tiếp hai origin [3]. Giữ sequence để xử lý timestamps bằng nhau do precision reduction; không sửa timestamp bằng cách cộng epsilon. Timestamp không hữu hạn, origin không xác định hoặc đảo thứ tự vượt precision uncertainty làm attempt technical/ungraded theo policy cần duyệt, không âm thầm sort/sửa để cứu điểm.

**Clock bridge khuyến nghị:** lấy các cặp hợp lệ từ `AudioContext.getOutputTimestamp()`. Với `C=contextTime` giây, `P=performanceTime` ms, target audio time `A` và tap performance time `T`:

```text
expectedPerformanceMs(A) = P + 1000 × (A − C)
tapAudioSeconds(T)        = C + (T − P) / 1000
signedErrorMs            = T − expectedPerformanceMs(A)
```

Hai cách so sánh tương đương khi dùng cùng sample. `currentTime` tiếp tục là clock scheduling; không lấy handler-time currentTime làm tap time vì clock này tiến theo render blocks và dừng khi context suspended [4]. Output timestamp liên hệ output-frame time với performance time, nhưng vẫn là estimate; extrapolation càng xa sample càng kém chính xác. Không coi `currentTime − contextTime` là phép đo output latency [5] [6].

Một Tap-owned wrapper có thể cung cấp `contextFactory` cho transport và giữ reference tới **chính Rhythm AudioContext đó** để đọc clock APIs; không tạo context thứ hai, không dùng context của Note Reading, không cần đổi Phase 3 API hiện có. Lưu reference snapshot khi armed/playing vì `getReferenceTiming()` trả null sau completed/aborted. Refresh output samples gần events, lưu sample được dùng để evaluation tái lập; không đổi kết quả đã chốt bằng sample thu sau feedback. Cặp zero/zero lúc graph chưa render không được dùng làm bằng chứng mapping [6].

Event đến handler trễ vẫn dùng timestamp gốc; `arrival − eventTime` không phải physical input latency và không được trừ vào signed error. Chỉ nhận event cùng generation trong capture interval đã duyệt. Event sau technical abort/stale generation bị loại, không làm sống lại attempt. Collection start/end, khoảng tiếp nhận early tap và bounded drain cho delayed delivery cần owner chốt; chưa đặt giới hạn ms. Audio completed tự nhiên không đồng nghĩa technical abort: wrapper có thể finalize dữ liệu hợp lệ bằng snapshot đã lưu sau khi đóng collection.

## 3. Latency strategy và calibration

Browser scheduling: tái sử dụng absolute currentTime scheduling; missed horizon là technical abort, không dồn late sources. Input path: quan sát được event creation và handler arrival, không đo được hardware contact-to-event delay. Output path: `baseLatency` mô tả xử lý graph-to-host; `outputLatency` là estimate host-to-device và có thể đổi theo route. Chúng không đo acoustic latency tới tai hoặc toàn bộ input/output fairness [7] [8].

**Khuyến nghị chưa duyệt:** ưu tiên output-timestamp bridge, không cộng thêm base/output latency lên mapping đó. Không tự trừ một device offset vào learner taps. Khi mapping thiếu/stale/không ổn định, chỉ cho practice diagnostic hoặc technical/ungraded, không cho graded software fallback mặc định. Fallback ghép `currentTime` với `performance.now()` có thể dùng để mô tả software timing, nhưng không thể giả định output latency bằng zero; graded fallback và mọi estimated compensation cần approval riêng.

Không bắt buộc learner calibration trong V1 là phương án khuyến nghị: median self-tap offset lẫn learner bias với device delay, không chứng minh physical latency. Phương án khác là optional calibration ngoài graded attempt, giữ offset cố định cho attempt sau và invalidate khi đổi route; vẫn phải gắn estimated, không measured. Không fit offset từ chính bài đang chấm. Muốn xác nhận physical latency phải có external/device measurement; không dùng browser automation làm bằng chứng đó. Freshness, clock stability và confidence criteria đều chưa có numeric thresholds.

## 4. Ordered one-to-one matching đề xuất

Inputs là ordered expected onsets và accepted taps trong cùng clock/generation. Không lấy notation segments, pulse ticks, rest hoặc tie continuation làm additional targets; không chấm hold duration. Định nghĩa `Wpass(i)` là cửa sổ chấp nhận timing và `Wassoc(i)` là cửa sổ rộng hơn để liên kết diagnostic near-miss; cả hai pending.

Khuyến nghị sequence-alignment dynamic programming với ba transitions: pair một target/tap đủ điều kiện association, bỏ một target thành missing, hoặc bỏ một tap thành extra. Assignment không giao chéo thứ tự và không tái dùng event. Objective đề xuất theo thứ tự: tối đa số pair trong Wpass; sau đó tối đa diagnostic pairs trong Wassoc; sau đó tối thiểu tổng absolute error; hòa thì target index/capture sequence. Cách này không ép match xa chỉ để giảm missing, và không cho greedy match lấy tap tốt của target kế tiếp. Boundary inclusive/exclusive và tie-break vẫn cần approval.

Năm statuses đề xuất: `matched` khi pair trong Wpass; `early`/`late` khi pair ngoài Wpass nhưng trong Wassoc theo dấu error; `missing` cho target không có pair; `extra` cho tap không có pair. Matched vẫn giữ signed error/direction để feedback được một tap hơi sớm/muộn nhưng được chấp nhận. Near-miss tiêu thụ đúng một target và một tap nhưng không được tính là on-time hit. Ngoài Wassoc, báo missing target và extra tap riêng; không cưỡng ép chọn target gần nhất.

Không tính compatibility click sau pointerdown; bỏ Space `repeat`; chống duplicate capture của cùng native event, không deduplicate hai physical taps chỉ vì timestamps bằng nhau. Multi-pointer behavior cần chốt. Pause/resume/replay/tempo change của graded Tap phải invalidate attempt và re-arm với generation mới; không nối hai audio anchors để tiếp tục chấm như một attempt. Pointercancel, blur/hidden, context interruption, observable route change hoặc starvation không thành wrong answer. Replay/retry là ungraded và không rescore shared exercise.

Đây là proposed Tap-wrapper handling: transport hiện không bắt pointercancel/blur và không có tempo-change API; nó bắt visibility/context/observable sink changes và scheduling failures. `pause()` chỉ hủy generation rồi chuyển paused, không đặt technical abort reason. Wrapper sau approval phải invalidate capture khi người học pause/đổi tempo; retry graded không được tự sinh thêm shared answer.

## 5. Timing Accuracy: hai formula và khuyến nghị

Gọi `N` là tổng expected targets, `K` là tổng accepted physical taps trong capture interval, `TP` là matched trong Wpass. Bỏ duplicate software delivery/stale events trước khi đếm K; không bỏ physical extra taps để tăng điểm. Tính trên **toàn exercise**, không lấy trung bình không trọng số của bar percentages.

**A — target-hit rate:** `Accuracy_A = 100 × TP / N`. Missing và early/late ngoài Wpass không có credit; extra chỉ báo riêng nên không hạ percentage. Ưu điểm: dễ hiểu “bao nhiêu onset đã tap đúng”. Nhược điểm: tap thừa nhiều nhưng hit đủ targets vẫn có thể 100%; correctness policy phải xử lý extra riêng. Early/late trong Wpass nhận full credit, không có continuous closeness credit.

**B — event F1:** `Accuracy_B = 100 × 2 × TP / (N + K)`. Tương đương F1 precision/recall: nếu Q là diagnostic near-misses, M missing và X extra thì `FN=M+Q`, `FP=X+Q`; một near-miss không nhận TP và đóng góp một thất bại ở mỗi event population, không bị trừ shared points hai lần. Missing, extras và ngoài-tolerance đều giảm kết quả. Ưu điểm: chống tap-spam trong một percentage, không cần penalty weights tùy ý. Nhược điểm: khó giải thích hơn hit rate; vẫn nhảy tại window boundary và không phân biệt mức lệch của các hits trong cùng window.

**Khuyến nghị B, chưa duyệt**, vì người học phải tap đúng onset và tránh extras. A vẫn là lựa chọn hợp lệ nếu muốn extra là metric riêng. Với `N>0, K=0`, cả hai bằng **0%**, không ungraded chỉ vì không có taps. Với `N=0`, trả not-applicable/ungraded, không 0% hay 100%; technical abort trả accuracy null và reason, không grade. Ví dụ counts tính bằng số nguyên: `N=4, K=5, TP=4` cho A=100%, B=800/9% (hiển thị rounding chỉ sau aggregate); chưa chọn quy tắc rounding display.

Timing Accuracy không tự quyết định Exercise Points. Owner cần chọn correctness gate: mọi targets trong Wpass và không extras, hoặc accuracy ≥ threshold với một extra/missing allowance đã duyệt. Chưa có pass percentage/allowance/grade nào được áp dụng. Chỉ một completed graded answer được chuyển thành correct +10 / incorrect +0; technical abort, replay và retry không tạo answer/điểm mới.

## 6. Tolerance và reference/metronome options

**Tolerance T1 — fixed milliseconds:** một Wpass cố định, với diagnostic Wassoc riêng. Dễ giải thích và test, nhưng cùng giá trị không phản ánh dense sixteenths, thay đổi BPM hoặc pulse unit; có nguy cơ association overlap. Chỉ dùng làm pilot comparator, không khuyến nghị làm policy duy nhất cho cả curriculum.

**Tolerance T2 — local-grid capped relative windows, khuyến nghị chưa duyệt:** `P=60/pulseBpm` giây; `S=P × gridTicks/pulseTicks`. Dùng eighth grid ở Level 3–4 và Level 6/Bonus, sixteenth ở Level 5 theo policies hiện hữu. Gọi G là min của S và positive adjacent target gaps có sẵn; thiếu neighbor dùng S, và long rests không làm G lớn hơn S. Đề xuất:

```text
Wpass(i)  = min(Cpass,  α × G(i))
Wassoc(i) = min(Cassoc, β × G(i))
0 < α ≤ β < 1/2 ; Cpass ≤ Cassoc
```

Đơn vị G/C/windows thống nhất là seconds, convert ms đúng một lần ở diagnostics. Pulse-quarter/eighth/dotted-quarter/half lấy từ canonical meter, không hardcode quarter BPM. T2 phản ánh tempo/density mà không mở cửa sổ chỉ vì onset cách xa qua rest. Đánh đổi: Level 5 còn bị giới hạn sixteenth grid kể cả pattern có ít sixteenths; owner có thể chọn actual-local-density thay legal-grid density nếu pilot cho thấy quá chặt. Mọi α, β, caps, symmetry/boundaries và density rule đều là **PROPOSED, chưa có số được duyệt**. Không tự nâng Level 6 lên sixteenth vocabulary.

Device/input uncertainty là confidence metric riêng: precision quantization, mapping freshness/residuals và delayed arrival không phải measured physical latency bounds. Khuyến nghị không tự widen Wpass để thưởng cho thiết bị kém. Nếu confidence chưa đủ hoặc uncertainty khiến kết luận ở window boundary không chắc, technical/ungraded thay vì đoán đúng/sai; cách ước tính uncertainty và ngưỡng invalidation cần approval.

**Reference choices:** continuous technical-pulse metronome; finite count-in rồi im lặng; separate ungraded reference performance; hoặc giảm guidance ở advanced items. Có thể kết hợp, nhưng count-in length, collection boundary, replay limits, pattern reference có bắt buộc không, và level-guidance matrix đều chưa chốt. Khuyến nghị pilot continuous pulse + explicit count-in cho introductory Tap, cho reference trước attempt dưới dạng ungraded; advanced removal là cấu hình thử nghiệm cần duyệt, không tự bật theo Level. Metronome vẫn tick, không voice syllables; voice assets còn unavailable từ Phase 3.

## 7. Edge cases và test strategy sau approval

Algorithm tests dùng deterministic clocks: exact/early/late, window boundaries, zero taps, zero targets, missing/extra, software duplicates và physical double taps, một tap giữa hai targets, order-preserving ties, rests, tied continuation/cross-bar tie, dotted values, dense sixteenths và multibar aggregation. Chạy cả 2/4, 3/4, 4/4, 3/8, 6/8, 9/8, 2/2 đúng pulse BPM; Tap Level 1–2 phải bị từ chối và Bonus không tự thêm vào Assessment.

Clock/lifecycle tests: cùng/cross-origin time base, coarse/equal/nonmonotonic/invalid timestamps, event arrival trễ, mapping zero/stale/drift, pending resume, natural completion với cached references, collection close/drain boundary, tempo change, generation/replay/retry, pointercancel/blur/hidden/interruption/starvation. Assert abort không answer, replay không rescore, correct +10 / incorrect +0, one shared answer và shared regression không đổi.

Browser tests sau approval dùng actual pointerdown/Space timestamp và handler entry, so sánh với real AudioContext output pairs. Browser automation có thể kiểm chứng event/clock pipeline, không chứng minh physical touch/acoustic latency. Mobile/browser/device matrix và external latency measurements chỉ được ghi PASS khi thực sự đã thử thiết bị. Không kết luận Bluetooth fairness từ fake clocks hoặc Chromium headless.

## 8. Quyết định cần owner phê duyệt và điểm dừng

1. **Clock/confidence:** primary output-timestamp bridge; có cho graded fallback không; sample validity/freshness và collection/drain boundaries; invalid timestamp behavior.
2. **Latency:** no mandatory learner calibration như khuyến nghị, hay optional calibration; estimated-compensation/fallback có được phép không và cách invalidate route changes.
3. **Matching/input:** ordered DP objective, Wpass/Wassoc semantics, early/late near-miss classification, boundaries/tie-break; native-event deduplication và multi-pointer policy.
4. **Metric/scoring:** A hay B (khuyến nghị B); rounding; no-target/ungraded presentation; strict complete-hit gate hay threshold/allowances riêng cho +10/+0.
5. **Tolerance:** T1 hay T2 (khuyến nghị T2); legal-grid hay actual-local density; α/β/caps, uncertainty estimation và technical-ungraded criteria. Chưa có numeric production parameters.
6. **Guidance:** count-in length, continuous metronome, reference playback/replay limits, advanced guidance và capture interval cho từng cấu hình; không đổi exercise-kind allocation.

**Đã thực hiện:** audit source và clock references; tạo duy nhất tài liệu đề xuất này. **Chưa thực hiện:** timestamp capture prototype, clock bridge code, matcher, timing formula/windows, Tap adapter/scoring, reference/count-in behavior hoặc runtime test mới. Không sửa Phase 1–3, source/tests/UI/routes/database/infrastructure; không deploy. Dừng trước Phase 4B và chờ approval cho các lựa chọn cùng numerical parameters thực sự cần thiết; phê duyệt hướng tiếp cận nhưng chưa có parameters không đủ để triển khai graded matcher.

## References

[1]: https://developer.mozilla.org/en-US/docs/Web/API/Event/timeStamp "Event timeStamp property"
[2]: https://www.w3.org/TR/hr-time-3/ "High Resolution Time Level 3"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/Performance/timeOrigin "Performance timeOrigin property"
[4]: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime "BaseAudioContext currentTime property"
[5]: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp "AudioContext getOutputTimestamp method"
[6]: https://webaudio.github.io/web-audio-api/#dom-audiocontext-getoutputtimestamp "Web Audio API output timestamp definition"
[7]: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/baseLatency "AudioContext baseLatency property"
[8]: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency "AudioContext outputLatency property"
